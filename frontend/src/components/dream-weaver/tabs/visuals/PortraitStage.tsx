import { useTranslation } from 'react-i18next'
import type {
  DreamWeaverVisualAsset,
  DreamWeaverVisualJob,
} from '@/api/dream-weaver'
import styles from './PortraitStage.module.css'

interface PortraitStageProps {
  asset: DreamWeaverVisualAsset | null
  acceptedImageUrl: string | null
  candidateImageUrl: string | null
  activeJob: DreamWeaverVisualJob | null
  onAccept: () => void
  onDismiss: () => void
  onRegenerate: () => void
}

function getProgressMessage(
  t: ReturnType<typeof useTranslation<'dreamWeaver'>>['t'],
  job: DreamWeaverVisualJob | null,
): string | null {
  const message = job?.progress && typeof job.progress.message === 'string'
    ? job.progress.message
    : null
  if (message) return message
  if (job?.status === 'queued') return t('visuals.portrait.queued')
  if (job?.status === 'running') return t('visuals.portrait.generatingPortrait')
  return null
}

function getPublicErrorMessage(
  t: ReturnType<typeof useTranslation<'dreamWeaver'>>['t'],
  error: string | null,
): string | null {
  if (!error) return null
  return error.toLowerCase().includes('timed out')
    ? t('visuals.portrait.errorTimeout')
    : t('visuals.portrait.errorGeneric')
}

export function PortraitStage({
  asset,
  acceptedImageUrl,
  candidateImageUrl,
  activeJob,
  onAccept,
  onDismiss,
  onRegenerate,
}: PortraitStageProps) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const progressMessage = getProgressMessage(t, activeJob)
  const errorMessage =
    activeJob?.status === 'failed' && typeof activeJob.error === 'string'
      ? getPublicErrorMessage(t, activeJob.error)
      : null

  if (candidateImageUrl) {
    const acceptLabel = acceptedImageUrl
      ? t('visuals.portrait.replacePortrait')
      : t('visuals.portrait.acceptPortrait')

    return (
      <section className={styles.stage}>
        <div className={styles.stageHeader}>
          <div>
            <p className={styles.eyebrow}>{t('visuals.portrait.eyebrow')}</p>
            <h3 className={styles.title}>{asset?.label ?? t('visuals.portrait.mainPortrait')}</h3>
          </div>
          <span className={styles.status}>{t('visuals.portrait.candidateReady')}</span>
        </div>
        <div className={styles.compareGrid}>
          <div className={styles.pane}>
            <div className={styles.paneLabel}>{t('visuals.portrait.accepted')}</div>
            {acceptedImageUrl ? (
              <img src={acceptedImageUrl} alt={t('visuals.portrait.acceptedAlt')} className={styles.image} referrerPolicy="no-referrer" />
            ) : (
              <div className={styles.emptyImage}>{t('visuals.portrait.noAcceptedYet')}</div>
            )}
          </div>
          <div className={styles.pane}>
            <div className={styles.paneLabel}>{t('visuals.portrait.newResult')}</div>
            <img src={candidateImageUrl} alt={t('visuals.portrait.candidateAlt')} className={styles.image} referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryAction} onClick={onDismiss}>
            {t('visuals.portrait.dismiss')}
          </button>
          <button type="button" className={styles.secondaryAction} onClick={onRegenerate}>
            {t('visuals.portrait.regenerate')}
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onAccept}
          >
            {acceptLabel}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.stage}>
      <div className={styles.stageHeader}>
        <div>
          <p className={styles.eyebrow}>{t('visuals.portrait.eyebrow')}</p>
          <h3 className={styles.title}>{asset?.label ?? t('visuals.portrait.mainPortrait')}</h3>
        </div>
        {activeJob?.status === 'queued' || activeJob?.status === 'running' ? (
          <span className={styles.status}>{t('visuals.portrait.generating')}</span>
        ) : null}
      </div>

      <div className={styles.hero}>
        {acceptedImageUrl ? (
          <img src={acceptedImageUrl} alt={asset?.label ?? t('visuals.portrait.acceptedAlt')} className={styles.image} referrerPolicy="no-referrer" />
        ) : (
          <div className={styles.emptyImage}>
            <span className={styles.emptyTitle}>{t('visuals.portrait.noPortraitTitle')}</span>
            <span className={styles.emptyBody}>
              {t('visuals.portrait.noPortraitBody')}
            </span>
          </div>
        )}

        {progressMessage && (
          <div className={styles.overlay}>
            <div className={styles.overlayBadge}>{progressMessage}</div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <span>{errorMessage}</span>
          <button type="button" className={styles.secondaryAction} onClick={onRegenerate}>
            {tc('actions.retry')}
          </button>
        </div>
      )}
    </section>
  )
}
