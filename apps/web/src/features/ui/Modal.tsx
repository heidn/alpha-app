import { useEffect, useRef, type ReactNode } from 'react'
import ui from './ui.module.css'
import styles from './Modal.module.css'

type Props = {
  title: string
  onClose: () => void
  // While true, Esc / backdrop / × don't close (e.g. a batched mutation is running).
  busy?: boolean
  footer?: ReactNode
  children: ReactNode
}

// Native <dialog> as a modal: focus trap, Esc and top-layer stacking come from the browser.
export function Modal({ title, onClose, busy, footer, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <header className={styles.head}>
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className={`${ui.btn} ${ui.btnSmall}`}
          aria-label="Close"
          disabled={busy}
          title={busy ? 'Wait until it finishes' : undefined}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.foot}>{footer}</footer>}
    </dialog>
  )
}
