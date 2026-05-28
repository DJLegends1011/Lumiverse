import { useEffect, useMemo, useRef } from "react";
import { Trans, useTranslation } from 'react-i18next'
import type { DreamWeaverMessage } from "@/api/dream-weaver-tooling";
import { ToolCard } from "./ToolCard";
import { UserCommandBubble } from "./UserCommandBubble";
import { SystemNote } from "./SystemNote";
import { DreamSummary } from "./DreamSummary";
import styles from "./ChatLog.module.css";

interface Props {
  messages: DreamWeaverMessage[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (msg: DreamWeaverMessage, nudge: string | null) => void;
  onSaveDream?: (messageId: string, newText: string) => Promise<void>;
}

export function ChatLog({ messages, onAccept, onReject, onCancel, onRetry, onSaveDream }: Props) {
  const { t } = useTranslation('dreamWeaver')
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const latestInChain = useMemo(() => {
    const supersededIds = new Set(messages.map((m) => m.supersedes_id).filter(Boolean) as string[]);
    return new Set(messages.filter((m) => m.kind === "tool_card" && !supersededIds.has(m.id)).map((m) => m.id));
  }, [messages]);

  return (
    <div className={styles.log} ref={ref}>
      {messages.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyKicker}>{t('chat.empty.kicker')}</div>
          <h3>{t('chat.empty.title')}</h3>
          <p>
            <Trans
              ns="dreamWeaver"
              i18nKey="chat.empty.body"
              components={{ code: <code /> }}
            />
          </p>
        </div>
      )}
      {messages.map((m) => {
        if (m.kind === "dream_summary" || m.kind === "source_card") {
          const p = m.payload as any;
          return (
            <DreamSummary
              key={m.id}
              messageId={m.id}
              title={p.title || undefined}
              dreamText={String(p.content || p.dream_text || "")}
              tone={p.tone}
              dislikes={p.dislikes}
              onSave={onSaveDream}
            />
          );
        }
        if (m.kind === "user_command") {
          const p = m.payload as any;
          if (p.parsed?.tool === "dream_source") return null;
          return <UserCommandBubble key={m.id} raw={p.raw} />;
        }
        if (m.kind === "system_note") {
          return <SystemNote key={m.id} text={(m.payload as any).text} />;
        }
        if (m.kind === "tool_card") {
          return (
            <ToolCard
              key={m.id}
              message={m}
              isLatestInChain={latestInChain.has(m.id)}
              onAccept={onAccept}
              onReject={onReject}
              onCancel={onCancel}
              onRetry={onRetry}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
