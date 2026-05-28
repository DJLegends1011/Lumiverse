import { useTranslation } from 'react-i18next'
import { useImageGenProgress } from '@/hooks/useImageGenProgress'
import styles from './ImageGenProgressBar.module.css'

interface Props {
  jobId: string | null
  showPreview?: boolean
}

export default function ImageGenProgressBar({ jobId, showPreview = true }: Props) {
  const { t } = useTranslation('panels', { keyPrefix: 'imageGenPanel.progress' })
  const progress = useImageGenProgress(jobId)
  if (!progress.isGenerating) return null

  const { step, totalSteps, preview } = progress
  const pct = totalSteps > 0 ? Math.min(100, Math.round((step / totalSteps) * 100)) : 0
  const indeterminate = totalSteps <= 0

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <span className={styles.label}>{t('generating')}</span>
        <span className={styles.stepCount}>
          {indeterminate ? t('starting') : t('step', { step, total: totalSteps, pct })}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${indeterminate ? styles.fillIndeterminate : ''}`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      {showPreview && preview && <img className={styles.preview} src={preview} alt={t('previewAlt')} />}
    </div>
  )
}
