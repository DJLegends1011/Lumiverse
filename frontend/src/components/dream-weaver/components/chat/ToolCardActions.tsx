import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from 'react-i18next'
import styles from "./ToolCard.module.css";

interface Props {
  hasError: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
  onNudge: () => void;
}

export function ToolCardActions({ hasError, onAccept, onReject, onRetry, onNudge }: Props) {
  const { t } = useTranslation('dreamWeaver')
  return (
    <div className={styles.actions}>
      {!hasError && <button className={styles.acceptBtn} onClick={onAccept}><Check size={13} /> {t('chat.toolCard.useResult')}</button>}
      <button className={styles.btn} onClick={onRetry}><RotateCcw size={13} /> {t('chat.toolCard.runAgain')}</button>
      <button className={styles.btn} onClick={onNudge}><SlidersHorizontal size={13} /> {t('chat.toolCard.adjust')}</button>
      <button className={styles.rejectBtn} onClick={onReject}><X size={13} /> {t('chat.toolCard.discard')}</button>
    </div>
  );
}
