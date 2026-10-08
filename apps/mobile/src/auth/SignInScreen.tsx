import { isClerkAPIResponseError, useSignIn, useSignUp } from '@clerk/expo'
import { useState } from 'react'
import { Platform, useWindowDimensions, View } from 'react-native'
import { Button, Field, Layout, Text } from '../ui'
import { Screen } from '../shell/Screen'

// Custom flow on Clerk's Core 3 sign-in/sign-up resources. Adapts to whatever factors the
// Clerk app has enabled: email code preferred, password if that's what's available.

type Step =
  | { kind: 'email' }
  | { kind: 'code'; flow: 'signIn' | 'signUp' }
  | { kind: 'password'; canUseCode: boolean }
  | { kind: 'newPassword' }
  | { kind: 'names' }

type ClerkErr = { message: string; code?: string; longMessage?: string } | null

const CAPTCHA_TIMEOUT_MS = 20_000

/** Clerk waits on its CAPTCHA (sign-up only); if Turnstile can't run, the request never settles. */
function withTimeout<T>(p: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), CAPTCHA_TIMEOUT_MS)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e: unknown) => {
        clearTimeout(t)
        reject(e instanceof Error ? e : new Error(String(e)))
      },
    )
  })
}

function errorCode(err: ClerkErr): string | undefined {
  if (!err) return undefined
  return isClerkAPIResponseError(err) ? err.errors[0]?.code : err.code
}

function errorText(err: ClerkErr): string {
  if (!err) return ''
  if (isClerkAPIResponseError(err)) return err.errors[0]?.longMessage ?? err.errors[0]?.message ?? err.message
  return err.longMessage ?? err.message
}

export function SignInScreen() {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { width } = useWindowDimensions()
  const logoSize = Math.round(Math.min(width, 500) * 0.2)

  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const fail = (err: ClerkErr) => {
    setError(errorText(err))
    return true
  }

  /** After a sign-up step: collect what Clerk still needs, else verify email, else finish. */
  async function advanceSignUp() {
    if (signUp.status === 'complete') {
      const { error: e } = await signUp.finalize()
      if (e) fail(e)
      return
    }
    if (signUp.missingFields.includes('password')) return setStep({ kind: 'newPassword' })
    if (signUp.missingFields.includes('first_name') || signUp.missingFields.includes('last_name'))
      return setStep({ kind: 'names' })
    if (signUp.unverifiedFields.includes('email_address')) {
      const { error: e } = await signUp.verifications.sendEmailCode()
      if (e) return void fail(e)
      setNotice('')
      return setStep({ kind: 'code', flow: 'signUp' })
    }
    setError('Your account needs more details. Finish signing up on the web app.')
  }

  async function finishSignIn() {
    if (signIn.status === 'complete') {
      const { error: e } = await signIn.finalize()
      if (e) fail(e)
      return
    }
    setError(
      signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust'
        ? 'Two-step verification isn’t supported in the app yet. Sign in on the web app.'
        : 'Couldn’t finish signing in. Try again.',
    )
  }

  const submitEmail = () =>
    run(async () => {
      const identifier = email.trim().toLowerCase()
      const { error: e } = await signIn.create({ identifier })
      // Only an unknown email starts sign-up (isTransferable is for OAuth transfers).
      if (errorCode(e) === 'form_identifier_not_found') {
        setNotice(`No account for ${identifier} yet. Creating one…`)
        const { error: se } = await withTimeout(
          signUp.create({ emailAddress: identifier }),
          Platform.OS === 'web'
            ? 'Couldn’t verify you’re human. On the web, open the app at http://localhost:8081 (not an IP address), or try the phone app.'
            : 'Couldn’t verify you’re human. Check your connection and try again.',
        )
        if (se) return void fail(se)
        return advanceSignUp()
      }
      if (e) return void fail(e)
      const strategies = signIn.supportedFirstFactors.map((f) => f.strategy)
      const canUseCode = strategies.includes('email_code')
      if (canUseCode) {
        const { error: ce } = await signIn.emailCode.sendCode()
        if (ce) return void fail(ce)
        return setStep({ kind: 'code', flow: 'signIn' })
      }
      if (strategies.includes('password')) return setStep({ kind: 'password', canUseCode: false })
      setError('This account signs in another way. Use the web app.')
    })

  const submitCode = (flow: 'signIn' | 'signUp') =>
    run(async () => {
      if (flow === 'signIn') {
        const { error: e } = await signIn.emailCode.verifyCode({ code: code.trim() })
        if (e) return void fail(e)
        return finishSignIn()
      }
      const { error: e } = await signUp.verifications.verifyEmailCode({ code: code.trim() })
      if (e) return void fail(e)
      return advanceSignUp()
    })

  const submitPassword = () =>
    run(async () => {
      const { error: e } = await signIn.password({ password })
      if (e) return void fail(e)
      return finishSignIn()
    })

  const submitNewPassword = () =>
    run(async () => {
      const { error: e } = await signUp.password({ emailAddress: email.trim().toLowerCase(), password })
      if (e) return void fail(e)
      return advanceSignUp()
    })

  const submitNames = () =>
    run(async () => {
      const { error: e } = await signUp.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      if (e) return void fail(e)
      return advanceSignUp()
    })

  const restart = () => {
    setStep({ kind: 'email' })
    setNotice('')
    setCode('')
    setPassword('')
    setError('')
  }

  const lede = 'text-muted'
  return (
    <Screen>
      <Text variant="logo" accessibilityRole="header" className="mt-[30px] -ml-[26px]" style={{ fontSize: logoSize, lineHeight: logoSize }}>
        alpha
      </Text>

      <Layout className="mt-12 gap-[18px]">
        {step.kind === 'email' && (
          <>
            <Text className={lede}>Sign in or create your account.</Text>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={submitEmail}
              autoFocus
            />
            <Button variant="hero" label="Continue" busy={busy} disabled={!email.includes('@')} onPress={submitEmail} />
          </>
        )}

        {step.kind === 'code' && (
          <>
            <Text className={lede}>
              We emailed a code to <Text className="text-fg">{email.trim()}</Text>.
            </Text>
            <Field
              label="Code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="go"
              onSubmitEditing={() => submitCode(step.flow)}
              autoFocus
              mono
            />
            <Button variant="hero" label="Verify" busy={busy} disabled={code.length < 6} onPress={() => submitCode(step.flow)} />
            {step.flow === 'signIn' && signIn.supportedFirstFactors.some((f) => f.strategy === 'password') && (
              <Button variant="ghost" label="Use password instead" onPress={() => setStep({ kind: 'password', canUseCode: true })} />
            )}
          </>
        )}

        {step.kind === 'password' && (
          <>
            <Text className={lede}>{email.trim()}</Text>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submitPassword}
              autoFocus
            />
            <Button variant="hero" label="Sign in" busy={busy} disabled={!password} onPress={submitPassword} />
            {step.canUseCode && (
              <Button
                variant="ghost"
                label="Email me a code instead"
                onPress={() =>
                  run(async () => {
                    const { error: e } = await signIn.emailCode.sendCode()
                    if (e) return void fail(e)
                    setStep({ kind: 'code', flow: 'signIn' })
                  })
                }
              />
            )}
          </>
        )}

        {step.kind === 'newPassword' && (
          <>
            <Text className={lede}>New here. Choose a password for {email.trim()}.</Text>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submitNewPassword}
              autoFocus
            />
            <Button variant="hero" label="Continue" busy={busy} disabled={password.length < 8} onPress={submitNewPassword} />
          </>
        )}

        {step.kind === 'names' && (
          <>
            <Text className={lede}>What’s your name?</Text>
            <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" autoFocus />
            <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            <Button variant="hero" label="Continue" busy={busy} disabled={!firstName.trim() || !lastName.trim()} onPress={submitNames} />
          </>
        )}

        {/* Clerk bot protection mounts its CAPTCHA here on web (nativeID becomes the DOM id). */}
        {Platform.OS === 'web' && <View nativeID="clerk-captcha" />}

        {!!notice && !error && <Text className={lede}>{notice}</Text>}

        {!!error && (
          <Text className="text-[15px] leading-[21px] text-accent" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        {step.kind !== 'email' && <Button variant="ghost" label="Use a different email" onPress={restart} />}
      </Layout>
    </Screen>
  )
}
