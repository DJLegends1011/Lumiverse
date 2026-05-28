import { useTranslation } from 'react-i18next'
import {
  buildVisualMacroOptions,
  collectPromptMacroTokens,
} from '../../lib/visual-studio-model'
import type { VisualStudioModel } from '../../hooks/useVisualStudio'
import styles from './VisualPromptFields.module.css'

interface VisualPromptFieldsProps {
  visuals: VisualStudioModel
}

function appendToken(prompt: string, token: string): string {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) return token
  if (trimmedPrompt.includes(token)) return prompt
  const needsComma = !/[,\s]$/.test(prompt)
  return `${prompt}${needsComma ? ', ' : ' '}${token}`
}

function getGenerateLabel(t: ReturnType<typeof useTranslation<'dreamWeaver'>>['t'], visuals: VisualStudioModel): string {
  if (visuals.generating) return t('visuals.prompts.generating')
  if (visuals.acceptedImageUrl || visuals.candidateImageUrl) return t('visuals.prompts.generateAgain')
  return t('visuals.prompts.generatePortrait')
}

function getPromptHint(t: ReturnType<typeof useTranslation<'dreamWeaver'>>['t'], visuals: VisualStudioModel): string {
  switch (visuals.workspaceState) {
    case 'no_source':
      return t('visuals.prompts.hintNoSource')
    case 'needs_workflow':
      return t('visuals.prompts.hintNeedsWorkflow')
    case 'needs_mapping':
      return t('visuals.prompts.hintNeedsMapping')
    case 'failed':
      return t('visuals.prompts.hintFailed')
    default:
      return t('visuals.prompts.hintDefault')
  }
}

export function VisualPromptFields({ visuals }: VisualPromptFieldsProps) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const asset = visuals.selectedAsset
  const macroOptions = buildVisualMacroOptions(visuals.draft)

  if (!asset) return null

  return (
    <section className={styles.promptArea}>
      <div className={styles.promptBlock}>
        <div className={styles.promptHeader}>
          <span className={styles.promptLabel}>{t('visuals.prompts.positive')}</span>
          <div className={styles.promptTools}>
            <button
              type="button"
              className={styles.suggestButton}
              onClick={visuals.onSuggestTags}
              disabled={visuals.tagSuggestionLoading || !visuals.draft}
            >
              {visuals.tagSuggestionLoading ? t('visuals.prompts.suggesting') : t('visuals.prompts.suggestTags')}
            </button>
            {macroOptions.length > 0 && (
              <div className={styles.tokenRow}>
                {macroOptions.map((option) => (
                  <button
                    key={option.token}
                    type="button"
                    className={styles.token}
                    onClick={() =>
                      visuals.onUpdateAsset(asset.id, {
                        prompt: appendToken(asset.prompt, option.token),
                        macro_tokens: collectPromptMacroTokens(appendToken(asset.prompt, option.token)),
                      })
                    }
                  >
                    {option.token}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {(visuals.pendingTagSuggestion || visuals.tagSuggestionError) && (
          <div className={styles.reviewSheet}>
            <div className={styles.reviewHeader}>
              <span className={styles.reviewLabel}>{t('visuals.prompts.suggestedTags')}</span>
              <span className={styles.reviewHint}>{t('visuals.prompts.suggestedTagsHint')}</span>
            </div>
            {visuals.pendingTagSuggestion ? (
              <>
                <div className={styles.reviewSectionLabel}>{t('visuals.prompts.positiveSection')}</div>
                <div className={styles.reviewPreview}>{visuals.pendingTagSuggestion}</div>
              </>
            ) : null}
            {visuals.pendingNegativeTagSuggestion ? (
              <>
                <div className={styles.reviewSectionLabel}>{t('visuals.prompts.negativeSection')}</div>
                <div className={styles.reviewPreview}>{visuals.pendingNegativeTagSuggestion}</div>
              </>
            ) : null}
            {visuals.tagSuggestionError ? (
              <p className={styles.reviewError}>{visuals.tagSuggestionError}</p>
            ) : null}
            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.reviewPrimary}
                onClick={visuals.onAcceptSuggestedTags}
                disabled={!visuals.pendingTagSuggestion}
              >
                {t('visuals.prompts.applyTags')}
              </button>
              <button
                type="button"
                className={styles.reviewSecondary}
                onClick={visuals.onRegenerateSuggestedTags}
                disabled={visuals.tagSuggestionLoading}
              >
                {t('visuals.prompts.regenerate')}
              </button>
              <button
                type="button"
                className={styles.reviewSecondary}
                onClick={visuals.onCancelSuggestedTags}
              >
                {tc('actions.cancel')}
              </button>
            </div>
          </div>
        )}
        <textarea
          className={styles.textarea}
          rows={6}
          value={asset.prompt}
          onChange={(event) =>
            visuals.onUpdateAsset(asset.id, {
              prompt: event.target.value,
              macro_tokens: collectPromptMacroTokens(event.target.value),
            })
          }
          placeholder={t('visuals.prompts.positivePlaceholder')}
        />
      </div>

      <div className={styles.promptBlock}>
        <div className={styles.promptHeader}>
          <span className={styles.promptLabel}>{t('visuals.prompts.negative')}</span>
        </div>
        <textarea
          className={styles.textarea}
          rows={4}
          value={asset.negative_prompt}
          onChange={(event) =>
            visuals.onUpdateAsset(asset.id, {
              negative_prompt: event.target.value,
            })
          }
          placeholder={t('visuals.prompts.negativePlaceholder')}
        />
      </div>

      <div className={styles.generateRow}>
        <p className={styles.generateHint}>{getPromptHint(t, visuals)}</p>
        <button
          type="button"
          className={styles.generateButton}
          onClick={() => visuals.onGenerate()}
          disabled={!visuals.canGenerate || visuals.generating}
        >
          {getGenerateLabel(t, visuals)}
        </button>
      </div>
    </section>
  )
}
