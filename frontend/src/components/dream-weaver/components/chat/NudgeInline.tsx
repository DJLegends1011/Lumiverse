import { useState } from "react";
import { useTranslation } from 'react-i18next'
import styles from "./ToolCard.module.css";

interface Props { onSubmit: (text: string) => void; onCancel: () => void; }

export function NudgeInline({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const [value, setValue] = useState("");
  return (
    <div className={styles.nudge}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSubmit(value); if (e.key === "Escape") onCancel(); }}
        placeholder={t('chat.nudge.placeholder')}
      />
      <button onClick={() => onSubmit(value)} className={styles.acceptBtn}>{t('chat.nudge.runAdjusted')}</button>
      <button onClick={onCancel} className={styles.btn}>{tc('actions.cancel')}</button>
    </div>
  );
}
