import styles from './ui.module.css'

export function ErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className={styles.alert}>
      <span>{error}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
