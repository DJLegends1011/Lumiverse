import { Check } from "lucide-react";
import { useTranslation } from 'react-i18next'
import type { DreamWeaverSession } from "@/api/dream-weaver";
import type { FieldStatus } from "../hooks/useProgressTracker";
import styles from "./ProgressBadges.module.css";

interface Props {
  fields: FieldStatus[];
  workspaceKind: DreamWeaverSession["workspace_kind"];
}

export function ProgressBadges({ fields, workspaceKind }: Props) {
  const { t } = useTranslation('dreamWeaver')
  const isScenario = workspaceKind === "scenario";
  const complete = fields.filter((f) => f.complete).length;
  const total = fields.length;
  const allDone = complete === total;

  return (
    <div
      className={styles.bar}
      data-done={allDone || undefined}
      role="status"
      aria-live="polite"
      aria-label={isScenario ? t('studio.progress.completionAriaScenario') : t('studio.progress.completionAriaCharacter')}
    >
      <span className={styles.label}>
        {isScenario ? t('studio.progress.labelScenario') : t('studio.progress.labelCharacter')}
      </span>
      <div className={styles.fields}>
        {fields.map((field) => (
          <span
            key={field.key}
            className={styles.field}
            data-complete={field.complete || undefined}
            data-required={(!field.complete && field.required) || undefined}
            title={field.complete
              ? t('studio.progress.fieldComplete', { label: field.label })
              : t('studio.progress.fieldMissing', { label: field.label })}
            aria-label={field.complete
              ? t('studio.progress.fieldCompleteAria', { label: field.label })
              : t('studio.progress.fieldMissingAria', { label: field.label })}
          >
            {field.complete ? <Check size={9} /> : null}
            {field.label}
          </span>
        ))}
      </div>
      <span className={styles.count} title={t('studio.progress.countTitle', { complete, total })}>
        {complete}<span className={styles.countSep}>/</span>{total}
      </span>
    </div>
  );
}
