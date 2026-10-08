import type { Role } from '../../../../../convex/roles'
import { ROLE_LABEL } from './roleLabel.ts'
import styles from './RoleBadge.module.css'

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`${styles.badge} ${styles[role]}`}>{ROLE_LABEL[role]}</span>
}
