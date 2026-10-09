import styles from './Avatar.module.css'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

// Decorative: the name is always shown next to it.
export function Avatar({ name, imageUrl, size = 36 }: { name: string; imageUrl?: string; size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden>
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  )
}
