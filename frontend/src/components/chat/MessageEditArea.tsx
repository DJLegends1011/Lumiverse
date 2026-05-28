import { Brain } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './MessageEditArea.module.css'

interface MessageEditAreaProps {
  editContent: string
  onChangeContent: (value: string) => void
  onSave: () => void
  onCancel: () => void
  editReasoning?: string
  onChangeReasoning?: (value: string) => void
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function MessageEditArea({
  editContent, onChangeContent, onSave, onCancel,
  editReasoning, onChangeReasoning,
}: MessageEditAreaProps) {
  const { t } = useTranslation('chat')
  const { t: tc } = useTranslation('common')
  const hasReasoning = editReasoning != null && onChangeReasoning != null
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const reasoningRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { autoResize(contentRef.current) }, [editContent])
  useEffect(() => { autoResize(reasoningRef.current) }, [editReasoning])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeContent(e.target.value)
    autoResize(e.currentTarget)
  }, [onChangeContent])

  const handleReasoningChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeReasoning?.(e.target.value)
    autoResize(e.currentTarget)
  }, [onChangeReasoning])

  return (
    <div className={styles.editArea}>
      {hasReasoning && (
        <div className={styles.reasoningSection}>
          <div className={styles.sectionLabel}>
            <Brain size={13} />
            <span>{t('messageEdit.reasoning')}</span>
          </div>
          <textarea
            ref={reasoningRef}
            name="message-edit-reasoning"
            aria-label={t('messageEdit.reasoningAria')}
            className={`${styles.editTextarea} ${styles.reasoningTextarea}`}
            value={editReasoning}
            onChange={handleReasoningChange}
            placeholder={t('messageEdit.reasoningPlaceholder')}
          />
        </div>
      )}
      <div className={hasReasoning ? styles.contentSection : undefined}>
        {hasReasoning && (
          <div className={styles.sectionLabel}>
            <span>{t('messageEdit.response')}</span>
          </div>
        )}
        <textarea
          ref={contentRef}
          name="message-edit-content"
          aria-label={t('messageEdit.contentAria')}
          className={styles.editTextarea}
          value={editContent}
          onChange={handleContentChange}
          autoFocus
        />
      </div>
      <div className={styles.editActions}>
        <button type="button" onClick={onCancel} className={styles.editCancelBtn}>
          {tc('actions.cancel')}
        </button>
        <button type="button" onClick={onSave} className={styles.editSaveBtn}>
          {tc('actions.save')}
        </button>
      </div>
    </div>
  )
}
