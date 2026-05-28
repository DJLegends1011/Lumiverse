import { Sparkles, X } from "lucide-react";
import { useTranslation } from 'react-i18next'
import { Spinner } from "@/components/shared/Spinner";
import type { DreamWeaverSession } from "@/api/dream-weaver";
import type { useSuiteRunner } from "../hooks/useSuiteRunner";
import styles from "./SuiteRunner.module.css";

type SuiteRunnerState = ReturnType<typeof useSuiteRunner>;

interface Props {
  suite: SuiteRunnerState;
  workspaceKind: DreamWeaverSession["workspace_kind"];
  onDismiss: () => void;
}

export function SuiteRunner({ suite, workspaceKind, onDismiss }: Props) {
  const { t } = useTranslation('dreamWeaver')
  const { t: tc } = useTranslation('common')
  const description = workspaceKind === "scenario"
    ? t('studio.suite.descriptionScenario')
    : t('studio.suite.descriptionCharacter');

  if (suite.state === "idle") {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerBody}>
          <span className={styles.bannerIcon} aria-hidden>
            <Sparkles size={13} />
          </span>
          <div className={styles.bannerText}>
            <span className={styles.bannerTitle}>{t('studio.suite.title')}</span>
            <span className={styles.bannerDesc}>
              {description}
            </span>
          </div>
        </div>
        <div className={styles.bannerActions}>
          <button className={styles.runBtn} onClick={() => void suite.start()}>
            {t('studio.suite.runFullSuite')}
          </button>
          <button className={styles.dismissBtn} onClick={onDismiss} aria-label={t('studio.suite.dismissAria')}>
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  if (suite.state === "running") {
    return (
      <div className={styles.banner} data-running role="status" aria-live="polite">
        <Spinner size={14} />
        <span className={styles.runningText}>
          {t('studio.suite.running')}
        </span>
      </div>
    );
  }

  if (suite.state === "done") {
    return (
      <div className={styles.banner} data-done role="status" aria-live="polite">
        <span className={styles.doneText}>
          {t('studio.suite.done', { count: suite.queued || suite.total })}
        </span>
        <button className={styles.dismissBtn} onClick={onDismiss} aria-label={t('studio.suite.dismissAria')}>
          <X size={13} />
        </button>
      </div>
    );
  }

  if (suite.state === "error") {
    return (
      <div className={styles.banner} data-error role="alert">
        <span className={styles.errorText}>{t('studio.suite.failed', { message: suite.errorMessage })}</span>
        <button className={styles.runBtn} onClick={() => void suite.start()}>{tc('actions.retry')}</button>
        <button className={styles.dismissBtn} onClick={onDismiss} aria-label={t('studio.suite.dismissAria')}>
          <X size={13} />
        </button>
      </div>
    );
  }

  return null;
}
