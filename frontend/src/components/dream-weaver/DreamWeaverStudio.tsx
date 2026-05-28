import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion } from 'motion/react'
import { CloseButton } from '@/components/shared/CloseButton'
import { Button } from '@/components/shared/FormComponents'
import { Spinner } from '@/components/shared/Spinner'
import { useStore } from '@/store'
import { dreamWeaverApi, type DreamWeaverDraft } from '@/api/dream-weaver'
import i18n from '@/i18n'
import { useDreamWeaverStudio, type TabId } from './hooks/useDreamWeaverStudio'
import { useVisualStudio } from './hooks/useVisualStudio'
import { toast } from '@/lib/toast'
import { StudioTab } from './tabs/StudioTab'
import { VisualsTab } from './tabs/VisualsTab'
import { useProgressTracker } from './hooks/useProgressTracker'
import styles from './DreamWeaverStudio.module.css'

const EMPTY_VOICE_GUIDANCE = {
  compiled: '',
  rules: { baseline: [], rhythm: [], diction: [], quirks: [], hard_nos: [] },
}

type MissingFieldKey = 'aName' | 'aTitle' | 'personality' | 'firstMessage'

function workspaceToV1(draft: any): DreamWeaverDraft | null {
  if (!draft) return null
  return {
    format: 'DW_DRAFT_V1',
    version: 1,
    kind: draft.kind === 'scenario' ? 'scenario' : 'character',
    meta: { title: draft.name ?? '', summary: '', tags: [], content_rating: 'sfw' },
    card: {
      name: draft.name ?? '',
      appearance: draft.appearance ?? '',
      appearance_data: (draft.appearance_data ?? {}) as Record<string, string>,
      description: draft.appearance ?? '',
      personality: draft.personality ?? '',
      scenario: draft.scenario ?? '',
      first_mes: draft.first_mes ?? '',
      system_prompt: '',
      post_history_instructions: '',
    },
    voice_guidance: draft.voice_guidance ?? EMPTY_VOICE_GUIDANCE,
    alternate_fields: { description: [], personality: [], scenario: [] },
    greetings: draft.greeting
      ? [{ id: 'greeting-0', label: i18n.t('dreamWeaver:studio.progress.defaultGreeting'), content: draft.greeting }]
      : [],
    lorebooks: draft.lorebooks ?? [],
    npc_definitions: draft.npcs ?? [],
    regex_scripts: [],
    visual_assets: draft.visual_assets,
  }
}

interface DreamWeaverStudioProps {
  sessionId: string
}

export function DreamWeaverStudio({ sessionId }: DreamWeaverStudioProps) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const closeModal = useStore((s) => s.closeModal)

  const tabs = useMemo(
    () => (['studio', 'visuals'] as TabId[]).map((id) => ({
      id,
      label: t(`studio.tabs.${id}`),
    })),
    [t],
  )

  const studio = useDreamWeaverStudio(sessionId)
  const draftV1 = useMemo(() => workspaceToV1(studio.draft), [studio.draft])
  const workspaceKind = studio.session?.workspace_kind === 'scenario' ? 'scenario' : 'character'
  const progressFields = useProgressTracker(studio.draft, workspaceKind)
  const finalizeHelpId = useId()
  const isFinalized = Boolean(studio.session?.character_id)
  const hasSource = Boolean(
    studio.session?.dream_text?.trim()
      || studio.draft?.sources?.some((source) => source.content.trim()),
  )
  const missingFinalizeFieldKeys = getMissingFinalizeFieldKeys(studio.draft, workspaceKind)
  const missingFinalizeFieldsText = formatMissingFields(t, missingFinalizeFieldKeys)
  const isScenario = workspaceKind === 'scenario'
  const finalizeLabel = isFinalized
    ? (isScenario ? t('studio.finalize.updateScenario') : t('studio.finalize.updateCharacter'))
    : (isScenario ? t('studio.finalize.finalizeScenario') : t('studio.finalize.finalizeCharacter'))
  const statusLabel = isFinalized ? t('studio.status.linked') : t('studio.status.draft')
  const footerStatus = isFinalized
    ? t('studio.footer.updatesExisting')
    : t('studio.footer.createsNew')
  const missingFinalizeMessage = missingFinalizeFieldKeys.length > 0
    ? t('studio.needsBeforeFinalize', { fields: missingFinalizeFieldsText })
    : null
  const handleVisualDraftUpdate = useCallback((patch: Partial<DreamWeaverDraft>) => {
    if (!patch.visual_assets) return
    void dreamWeaverApi.updateVisualAssets(sessionId, patch.visual_assets).catch((error: unknown) => {
      console.error('Failed to persist Dream Weaver visual assets', error)
      toast.error(t('studio.toast.visualSaveFailed'), { title: t('brand') })
    })
  }, [sessionId, t])
  const visuals = useVisualStudio(sessionId, draftV1, handleVisualDraftUpdate)

  const prevFinalized = useRef(isFinalized)
  useEffect(() => {
    if (!prevFinalized.current && isFinalized) {
      toast.success(
        isScenario ? t('studio.toast.createdScenario') : t('studio.toast.createdCharacter'),
        { title: t('brand') },
      )
    }
    prevFinalized.current = isFinalized
  }, [isFinalized, isScenario, t])

  const handleClose = useCallback(() => {
    closeModal()
  }, [closeModal])

  const handleTabChange = useCallback((tab: TabId) => {
    studio.setActiveTab(tab)
  }, [studio])

  const handleFinalize = useCallback(() => {
    if (missingFinalizeFieldKeys.length > 0) {
      toast.warning(t('studio.addBeforeFinalize', { fields: missingFinalizeFieldsText }), { title: t('brand') })
      return
    }

    void studio.finalize({
      accepted_portrait_image_id: visuals.selectedAsset?.references[0]?.image_id ?? null,
    })
  }, [missingFinalizeFieldKeys.length, missingFinalizeFieldsText, studio, visuals.selectedAsset?.references, t])

  return createPortal(
    <>
      <div className={styles.overlay} onClick={handleClose}>
        <motion.div
          className={styles.studio}
          onClick={(event) => event.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          {studio.loading ? (
            <div className={styles.loadingState}>
              <Spinner />
              <p>{t('studio.loadingSession')}</p>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <div className={styles.headerLeft}>
                  <span className={styles.headerLabel}>{t('studio.headerLabel')}</span>
                  <h2 className={styles.headerTitle}>
                    {sessionDisplayName(t, studio.draft, studio.session)}
                  </h2>
                </div>
                <div className={styles.headerRight}>
                  <div className={styles.kindToggle} aria-label={t('studio.kind.ariaLabel')}>
                    {(['character', 'scenario'] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        className={styles.kindButton}
                        data-active={studio.session?.workspace_kind === kind || undefined}
                        onClick={() => void studio.updateWorkspaceKind(kind)}
                        disabled={Boolean(studio.session?.character_id)}
                      >
                        {t(`studio.kind.${kind}`)}
                      </button>
                    ))}
                  </div>
                  <div className={styles.badges}>
                    <span className={styles.badge} data-state={isFinalized ? 'linked' : undefined}>
                      {statusLabel}
                    </span>
                  </div>
                  <CloseButton onClick={handleClose} />
                </div>
              </header>

              <div className={styles.body}>
                <div className={styles.main}>
                  <nav className={styles.tabBar}>
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        className={styles.tab}
                        data-active={studio.activeTab === tab.id || undefined}
                        onClick={() => handleTabChange(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  <div className={styles.canvas}>
                    {studio.activeTab === 'studio' && (
                      <StudioTab sessionId={sessionId} hasSource={hasSource} workspaceKind={workspaceKind} progressFields={progressFields} onWorkspaceChanged={studio.refreshDraft} />
                    )}
                    {studio.activeTab === 'visuals' && (
                      <VisualsTab draft={draftV1} worldStale={false} visuals={visuals} />
                    )}
                  </div>
                </div>
              </div>

              <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                  <span className={styles.sessionName}>
                    {sessionDisplayName(t, studio.draft, studio.session)}
                  </span>
                  <span className={styles.saveStatus} data-dirty={!isFinalized || undefined}>
                    {footerStatus}
                  </span>
                  {missingFinalizeMessage && (
                    <span id={finalizeHelpId} className={styles.missingFields}>
                      {missingFinalizeMessage}
                    </span>
                  )}
                </div>
                <div className={styles.footerRight}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={studio.finalizing}
                  >
                    {tc('actions.close')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleFinalize}
                    loading={studio.finalizing}
                    disabled={studio.finalizing || missingFinalizeFieldKeys.length > 0}
                    aria-describedby={missingFinalizeMessage ? finalizeHelpId : undefined}
                    title={missingFinalizeFieldKeys.length > 0 ? t('studio.needsTitle', { fields: missingFinalizeFieldsText }) : undefined}
                  >
                    {finalizeLabel}
                  </Button>
                </div>
              </footer>

              {studio.errorMessage && (
                <div className={styles.errorBanner}>
                  <span>{studio.errorMessage}</span>
                  <button onClick={studio.dismissError}>x</button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>,
    document.body,
  )
}

function sessionDisplayName(
  t: TFunction<'dreamWeaver'>,
  _draft: ReturnType<typeof useDreamWeaverStudio>['draft'],
  session: ReturnType<typeof useDreamWeaverStudio>['session'],
): string {
  if (session) {
    return session.session_number > 0
      ? t('session.titleNumbered', { number: session.session_number })
      : t('session.title')
  }
  return t('studio.session.newDream')
}

function getMissingFinalizeFieldKeys(
  draft: ReturnType<typeof useDreamWeaverStudio>['draft'],
  workspaceKind: 'character' | 'scenario',
): MissingFieldKey[] {
  if (!draft) return ['aName', 'personality', 'firstMessage']

  const missing: MissingFieldKey[] = []
  if (!draft.name?.trim()) missing.push(workspaceKind === 'scenario' ? 'aTitle' : 'aName')
  if (!draft.personality?.trim()) missing.push('personality')
  if (!draft.first_mes?.trim()) missing.push('firstMessage')
  return missing
}

function formatMissingFields(t: TFunction<'dreamWeaver'>, keys: MissingFieldKey[]): string {
  const labels = keys.map((key) => t(`studio.missingFields.${key}`))
  if (labels.length <= 1) return labels[0] ?? t('studio.missingFields.requiredFields')
  if (labels.length === 2) {
    return t('studio.missingFields.joinTwo', { first: labels[0], second: labels[1] })
  }
  return t('studio.missingFields.joinMany', {
    items: labels.slice(0, -1).join(', '),
    last: labels[labels.length - 1],
  })
}
