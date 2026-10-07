import { isClerkAPIResponseError, useSignIn, useSignUp } from '@clerk/expo'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native'
import { color, font, gutter, type } from '../theme'
import { haptic, useTopInset } from '../ui/hooks'

// Custom flow on Clerk's Core 3 sign-in/sign-up resources. Adapts to whatever factors the
// Clerk app has enabled: email code preferred, password if that's what's available.

type Step =
  | { kind: 'email' }
  | { kind: 'code'; flow: 'signIn' | 'signUp' }
  | { kind: 'password'; canUseCode: boolean }
  | { kind: 'newPassword' }
  | { kind: 'names' }

type ClerkErr = { message: string; code?: string; longMessage?: string } | null

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
  const top = useTopInset()
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

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
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
      if (errorCode(e) === 'form_identifier_not_found' || signIn.isTransferable) {
        const { error: se } = await signUp.create({ emailAddress: identifier })
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
    setCode('')
    setPassword('')
    setError('')
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: top + 30 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.logo, { fontSize: logoSize, lineHeight: logoSize }]} accessibilityRole="header">
          alpha
        </Text>

        <View style={styles.form}>
          {step.kind === 'email' && (
            <>
              <Text style={styles.lede}>Sign in or create your account.</Text>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={submitEmail}
                autoFocus
              />
              <Submit label="Continue" busy={busy} disabled={!email.includes('@')} onPress={submitEmail} />
            </>
          )}

          {step.kind === 'code' && (
            <>
              <Text style={styles.lede}>
                We emailed a code to <Text style={{ color: color.text }}>{email.trim()}</Text>.
              </Text>
              <Field
                label="Code"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                onSubmitEditing={() => submitCode(step.flow)}
                autoFocus
                mono
              />
              <Submit label="Verify" busy={busy} disabled={code.length < 6} onPress={() => submitCode(step.flow)} />
              {step.flow === 'signIn' && signIn.supportedFirstFactors.some((f) => f.strategy === 'password') && (
                <Link label="Use password instead" onPress={() => setStep({ kind: 'password', canUseCode: true })} />
              )}
            </>
          )}

          {step.kind === 'password' && (
            <>
              <Text style={styles.lede}>{email.trim()}</Text>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={submitPassword}
                autoFocus
              />
              <Submit label="Sign in" busy={busy} disabled={!password} onPress={submitPassword} />
              {step.canUseCode && (
                <Link
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
              <Text style={styles.lede}>New here. Choose a password for {email.trim()}.</Text>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submitNewPassword}
                autoFocus
              />
              <Submit label="Continue" busy={busy} disabled={password.length < 8} onPress={submitNewPassword} />
            </>
          )}

          {step.kind === 'names' && (
            <>
              <Text style={styles.lede}>What’s your name?</Text>
              <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" autoFocus />
              <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
              <Submit label="Continue" busy={busy} disabled={!firstName.trim() || !lastName.trim()} onPress={submitNames} />
            </>
          )}

          {!!error && (
            <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {step.kind !== 'email' && <Link label="Use a different email" onPress={restart} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, mono, ...props }: TextInputProps & { label: string; mono?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={type.monoLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        returnKeyType="go"
        style={[styles.input, mono && styles.inputMono]}
      />
    </View>
  )
}

function Submit({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  const off = busy || disabled
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPressIn={() => !off && haptic('medium')}
      onPress={onPress}
      style={({ pressed }) => [styles.submit, off && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      {busy ? <ActivityIndicator color={color.bg} /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  )
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  page: { paddingHorizontal: gutter, paddingBottom: 40 },
  logo: { marginLeft: -6 - gutter, fontFamily: font.radwave, color: color.text },
  form: { marginTop: 48, gap: 18 },
  lede: { fontFamily: font.sans, fontSize: 17, lineHeight: 23, color: color.muted },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    backgroundColor: color.surface2,
    color: color.text,
    fontFamily: font.sans,
    fontSize: 17,
  },
  inputMono: { fontFamily: font.monoMedium, fontSize: 24, letterSpacing: 8 },
  submit: {
    height: 76,
    borderRadius: 38,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: font.radwave, fontSize: 22, letterSpacing: 0.5, color: color.bg },
  error: { fontFamily: font.sans, fontSize: 15, lineHeight: 21, color: color.accent },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: font.sansMedium, fontSize: 15, color: color.text },
})
