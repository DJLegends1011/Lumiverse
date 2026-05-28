import type { DreamWeaverDraft, DreamWeaverSession } from '@/api/dream-weaver'
import i18n from '@/i18n'

export const MAIN_TABS = ['soul', 'world', 'visuals'] as const
export const SOUL_SECTIONS = [
  'name',
  'appearance',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'voice_guidance',
  'alternate_fields',
  'greetings',
  'system_prompt',
  'post_history_instructions',
] as const
export const WORLD_SECTIONS = ['lorebooks', 'npc_definitions', 'regex_scripts'] as const
export const VISUALS_SECTIONS = [] as const

export function hasWorldContent(draft: DreamWeaverDraft | null): boolean {
  if (!draft) return false
  return (
    (draft.lorebooks?.length ?? 0) > 0 ||
    (draft.npc_definitions?.length ?? 0) > 0 ||
    (draft.regex_scripts?.length ?? 0) > 0
  )
}

export function getTextSectionStatus(value: string | null | undefined): 'empty' | 'populated' {
  return value?.trim() ? 'populated' : 'empty'
}

export function resolveSelectedConnectionId(
  sessionConnectionId: string | null | undefined,
  connections: Array<{ id: string; is_default?: boolean | null }>,
): string | null {
  if (sessionConnectionId && connections.some((connection) => connection.id === sessionConnectionId)) {
    return sessionConnectionId
  }

  const defaultConnection = connections.find((connection) => connection.is_default)
  return defaultConnection?.id ?? connections[0]?.id ?? null
}

export function canFinalize(session: DreamWeaverSession | null, draft: DreamWeaverDraft | null): boolean {
  if (!session || !draft) return false

  return !session.character_id && Boolean(
    draft.card.name.trim() &&
    draft.card.description.trim() &&
    draft.card.personality.trim() &&
    draft.card.scenario.trim() &&
    draft.card.first_mes.trim()
  )
}

export function shouldOfferOpenChat(session: DreamWeaverSession | null): boolean {
  return Boolean(session?.character_id)
}

export function getSessionStatusLabel(session: DreamWeaverSession): string {
  if (session.character_id) return i18n.t('session.statusFinalized', { ns: 'dreamWeaver' })
  if (session.status === 'generating') return i18n.t('session.statusWeaving', { ns: 'dreamWeaver' })
  if (session.status === 'complete') return i18n.t('session.statusSaved', { ns: 'dreamWeaver' })
  if (session.status === 'error') return i18n.t('session.statusNeedsAttention', { ns: 'dreamWeaver' })
  return session.workspace_kind === 'scenario'
    ? i18n.t('session.statusScenarioStudio', { ns: 'dreamWeaver' })
    : i18n.t('session.statusCharacterStudio', { ns: 'dreamWeaver' })
}

export function isWorldStale(session: DreamWeaverSession | null): boolean {
  return false
}

export type WeavingOperationKey = 'soul' | 'world' | 'finalize'

export interface WeavingOperation {
  title: string
  description: string
  steps: readonly string[]
}

export function getWeavingOperation(key: WeavingOperationKey): WeavingOperation {
  return i18n.t(`weaving.${key}`, { ns: 'dreamWeaver', returnObjects: true }) as WeavingOperation
}

/** @deprecated Use getWeavingOperation() for locale-aware labels. */
export const WEAVING_OPERATIONS = {
  get soul() { return getWeavingOperation('soul') },
  get world() { return getWeavingOperation('world') },
  get finalize() { return getWeavingOperation('finalize') },
} as const
