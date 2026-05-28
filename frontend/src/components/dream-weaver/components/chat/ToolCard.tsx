import { useState } from "react";
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ChevronDown, Clock3, Hash, Loader2, Wrench } from "lucide-react";
import type { DreamWeaverMessage, DreamWeaverToolTokenUsage } from "@/api/dream-weaver-tooling";
import { ToolCardActions } from "./ToolCardActions";
import { NudgeInline } from "./NudgeInline";
import styles from "./ToolCard.module.css";

interface Props {
  message: DreamWeaverMessage;
  isLatestInChain: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (msg: DreamWeaverMessage, nudge: string | null) => void;
}

export function ToolCard({ message, isLatestInChain, onAccept, onReject, onCancel, onRetry }: Props) {
  const { t } = useTranslation('dreamWeaver')
  const payload = message.payload as {
    tool: string;
    output: any;
    error: { message?: string } | null;
    duration_ms: number | null;
    token_usage?: DreamWeaverToolTokenUsage | null;
  };
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const status = message.status ?? "running";
  const running = status === "running";

  return (
    <div className={styles.run} data-status={status}>
      <div className={styles.content}>
        <div className={styles.head}>
          <div className={styles.identity}>
            <span className={styles.toolIcon}>
              {running ? <Loader2 size={13} /> : <Wrench size={13} />}
            </span>
            <div>
              <div className={styles.name}>{formatToolName(payload.tool)}</div>
              <div className={styles.intent}>{getToolIntent(t, payload.tool)}</div>
            </div>
          </div>
          <div className={styles.metaGroup}>
            <span className={styles.status} data-s={status}>{formatStatus(t, status)}</span>
            <TokenUsage usage={payload.token_usage} />
            <span className={styles.metaItem} title={t('chat.toolCard.runTime')}>
              <Clock3 size={12} />
              {payload.duration_ms ? `${(payload.duration_ms / 1000).toFixed(1)}s` : "…"}
            </span>
          </div>
        </div>

        {running ? (
          <div className={styles.runningRows}>
            <div className={styles.skel} />
            <div className={styles.skel} />
            <div className={styles.skel} />
          </div>
        ) : payload.error ? (
          <div className={styles.errorBox}>
            <span className={styles.errorLabel}>{t('chat.toolCard.toolError')}</span>
            <p>{getToolErrorMessage(t, payload.error.message)}</p>
          </div>
        ) : (
          <ToolOutput output={payload.output} />
        )}

        {isLatestInChain && status === "pending" && (
          <ToolCardActions
            hasError={!!payload.error}
            onAccept={() => onAccept(message.id)}
            onReject={() => onReject(message.id)}
            onRetry={() => onRetry(message, null)}
            onNudge={() => setNudgeOpen(true)}
          />
        )}
        {isLatestInChain && status === "running" && (
          <div className={styles.cancelRow}>
            <button onClick={() => onCancel(message.id)} className={styles.cancelBtn}>{t('chat.toolCard.cancelRun')}</button>
          </div>
        )}
        {nudgeOpen && (
          <NudgeInline
            onCancel={() => setNudgeOpen(false)}
            onSubmit={(text) => { setNudgeOpen(false); onRetry(message, text); }}
          />
        )}
        {!running && !payload.error && (
          <details className={styles.runDetails}>
            <summary>
              <ChevronDown size={13} />
              {t('chat.toolCard.runDetails')}
            </summary>
            <pre className={styles.rawOutput}>{JSON.stringify(payload.output, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

function getToolErrorMessage(t: TFunction<'dreamWeaver'>, message: string | undefined): string {
  if (!message) return t('chat.toolCard.errors.generic');
  if (
    message.startsWith("Choose a ") ||
    message.startsWith("Add source material") ||
    message === "Generation was canceled." ||
    message === "Unknown Dream Weaver tool." ||
    message === "The tool could not finish. Check the connection and try again."
  ) {
    return message;
  }
  return t('chat.toolCard.errors.generic');
}

function formatToolName(tool: string): string {
  return tool.replace(/^set_/, "").replace(/^add_/, "add ").replace(/_/g, " ");
}

function getToolIntent(t: TFunction<'dreamWeaver'>, tool: string): string {
  const key = `chat.toolCard.intent.${tool}`
  const translated = t(key, { defaultValue: '' })
  return translated || t('chat.toolCard.intent.default')
}

function formatStatus(t: TFunction<'dreamWeaver'>, status: string): string {
  const key = `chat.toolCard.status.${status}`
  const translated = t(key, { defaultValue: '' })
  return translated || status;
}

function TokenUsage({ usage }: { usage?: DreamWeaverToolTokenUsage | null }) {
  const { t } = useTranslation('dreamWeaver')
  if (!usage) return null;
  return (
    <span className={styles.metaItem} title={`${usage.tokenizer_name} · ${usage.model}`}>
      <Hash size={12} />
      {formatCount(usage.input_tokens)} {t('chat.toolCard.tokens.in')}
      <span className={styles.metaDot} />
      {formatCount(usage.output_tokens)} {t('chat.toolCard.tokens.out')}
      <span className={styles.metaTotal}>{formatCount(usage.total_tokens)}</span>
    </span>
  );
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function ToolOutput({ output }: { output: any }) {
  const { t } = useTranslation('dreamWeaver')
  const entries = buildOutputEntries(t, output);
  return (
    <div className={styles.outputPanel}>
      {entries.map((entry) => (
        <OutputField key={entry.label} label={entry.label} value={entry.value} />
      ))}
      <AppearanceDataSection value={output?.appearance_data} />
      <VoiceRulesSection value={output?.voice_guidance} />
    </div>
  );
}

function buildOutputEntries(t: TFunction<'dreamWeaver'>, output: any): Array<{ label: string; value: unknown }> {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return [{ label: t('chat.toolCard.output.result'), value: output }];
  }

  const skip = new Set(["appearance_data", "voice_guidance"]);
  return Object.entries(output)
    .filter(([key]) => !skip.has(key))
    .map(([key, value]) => ({ label: humanizeKey(t, key), value }));
}

function humanizeKey(t: TFunction<'dreamWeaver'>, key: string): string {
  if (key === "first_mes") return t('chat.toolCard.output.firstMes');
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function OutputField({ label, value }: { label: string; value: unknown }) {
  const { t } = useTranslation('dreamWeaver')
  const text = stringifyValue(t, value);
  const long = text.length > 360;

  return (
    <section className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldText} data-long={long || undefined}>
        {long ? `${text.slice(0, 360).trimEnd()}…` : text}
      </div>
      {long && (
        <details className={styles.moreDetails}>
          <summary>{t('chat.toolCard.output.showFull', { label: label.toLowerCase() })}</summary>
          <div className={styles.fullText}>{text}</div>
        </details>
      )}
    </section>
  );
}

function stringifyValue(t: TFunction<'dreamWeaver'>, value: unknown): string {
  if (value == null) return t('chat.toolCard.output.notProvided');
  if (Array.isArray(value)) return value.map((item) => stringifyValue(t, item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function AppearanceDataSection({ value }: { value: unknown }) {
  const { t } = useTranslation('dreamWeaver')
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value).filter(([, v]) => v != null && String(v).trim());
  if (entries.length === 0) return null;
  return (
    <section className={styles.field}>
      <div className={styles.fieldLabel}>{t('chat.toolCard.output.appearanceData')}</div>
      <div className={styles.chipGrid}>
        {entries.slice(0, 16).map(([key, v]) => (
          <span key={key} className={styles.dataChip}>
            <span>{humanizeKey(t, key)}</span>
            {String(v)}
          </span>
        ))}
      </div>
    </section>
  );
}

function VoiceRulesSection({ value }: { value: unknown }) {
  const { t } = useTranslation('dreamWeaver')
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const voice = value as any;
  const rules = voice.rules && typeof voice.rules === "object" ? voice.rules : null;
  if (!rules) return null;
  return (
    <section className={styles.field}>
      <div className={styles.fieldLabel}>{t('chat.toolCard.output.voiceRules')}</div>
      <div className={styles.ruleGrid}>
        {Object.entries(rules).map(([key, items]) => (
          <div key={key} className={styles.ruleGroup}>
            <span>{humanizeKey(t, key)}</span>
            <p>{Array.isArray(items) && items.length > 0 ? items.join("; ") : t('chat.toolCard.output.none')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
