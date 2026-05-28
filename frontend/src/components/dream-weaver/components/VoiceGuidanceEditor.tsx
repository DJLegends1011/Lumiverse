import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { DreamWeaverDraft } from '../../../api/dream-weaver'
import styles from './VoiceGuidanceEditor.module.css'

type VoiceGuidance = DreamWeaverDraft['voice_guidance']
type RuleCategory = keyof VoiceGuidance['rules']

interface VoiceGuidanceEditorProps {
  voice: VoiceGuidance
  onChange: (voice: VoiceGuidance) => void
}

const CATEGORY_KEYS: RuleCategory[] = ['baseline', 'rhythm', 'diction', 'quirks', 'hard_nos']

export function VoiceGuidanceEditor({ voice, onChange }: VoiceGuidanceEditorProps) {
  const { t } = useTranslation('dreamWeaver')
  const [view, setView] = useState<'structured' | 'compiled'>('structured')

  const updateRule = useCallback((category: RuleCategory, index: number, value: string) => {
    const newRules = { ...voice.rules }
    newRules[category] = [...newRules[category]]
    newRules[category][index] = value
    onChange({ ...voice, rules: newRules })
  }, [voice, onChange])

  const addRule = useCallback((category: RuleCategory) => {
    const newRules = { ...voice.rules }
    newRules[category] = [...newRules[category], '']
    onChange({ ...voice, rules: newRules })
  }, [voice, onChange])

  const removeRule = useCallback((category: RuleCategory, index: number) => {
    const newRules = { ...voice.rules }
    newRules[category] = newRules[category].filter((_, i) => i !== index)
    onChange({ ...voice, rules: newRules })
  }, [voice, onChange])

  return (
    <div className={styles.editor}>
      <div className={styles.viewToggle}>
        <button
          className={styles.toggleOption}
          data-active={view === 'structured' || undefined}
          onClick={() => setView('structured')}
        >
          {t('studio.voice.structured')}
        </button>
        <button
          className={styles.toggleOption}
          data-active={view === 'compiled' || undefined}
          onClick={() => setView('compiled')}
        >
          {t('studio.voice.compiled')}
        </button>
      </div>

      {view === 'compiled' ? (
        <div className={styles.compiled}>
          <p className={styles.compiledHint}>{t('studio.voice.compiledHint')}</p>
          <div className={styles.compiledText}>
            {voice.compiled || t('studio.voice.noCompiledYet')}
          </div>
        </div>
      ) : (
        <div className={styles.categories}>
          {CATEGORY_KEYS.map((key) => {
            const label = t(`studio.voice.categories.${key}`)
            return (
              <div key={key} className={styles.category}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryLabel}>{label}</span>
                  <span className={styles.categoryCount}>{voice.rules[key].length}</span>
                </div>
                <div className={styles.rules}>
                  {voice.rules[key].map((rule, i) => (
                    <div key={i} className={styles.ruleRow}>
                      <input
                        className={styles.ruleInput}
                        type="text"
                        value={rule}
                        onChange={(e) => updateRule(key, i, e.target.value)}
                        placeholder={t('studio.voice.rulePlaceholder', { label })}
                      />
                      <button className={styles.removeRule} onClick={() => removeRule(key, i)}>×</button>
                    </div>
                  ))}
                  <button className={styles.addRule} onClick={() => addRule(key)}>{t('studio.voice.addRule')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
