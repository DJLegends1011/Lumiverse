import { useTranslation } from 'react-i18next'
import type { VisualAssetHintItem } from '../../lib/visual-studio-model'
import styles from './VisualAssetHintRow.module.css'

interface VisualAssetHintRowProps {
  items: VisualAssetHintItem[]
}

const HINT_LABEL_KEYS: Record<VisualAssetHintItem['id'], string> = {
  portrait: 'visuals.hints.portrait',
  expressions: 'visuals.hints.expressions',
  gallery: 'visuals.hints.gallery',
}

export function VisualAssetHintRow({ items }: VisualAssetHintRowProps) {
  const { t } = useTranslation('dreamWeaver')

  return (
    <div className={styles.row} aria-label={t('visuals.hints.ariaLabel')}>
      {items.map((item) => (
        <div key={item.id} className={styles.item} data-state={item.state}>
          <span className={styles.label}>{t(HINT_LABEL_KEYS[item.id])}</span>
          {item.state === 'muted' && <span className={styles.hint}>{t('visuals.hints.later')}</span>}
        </div>
      ))}
    </div>
  )
}
