import { useMemo } from "react";
import i18n from "@/i18n";
import type { DreamWeaverWorkspace } from "@/api/dream-weaver-tooling";
import type { DreamWeaverSession } from "@/api/dream-weaver";

export type FieldStatus = {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
};

type FieldKey = keyof DreamWeaverWorkspace;

const MIN_SCENARIO_NPCS = 2;
const MIN_SCENARIO_LOREBOOKS = 3;

const pf = (key: string, options?: Record<string, unknown>) =>
  i18n.t(`dreamWeaver:studio.progress.fields.${key}`, options);

const CHARACTER_FIELDS: Array<{ key: FieldKey; labelKey: string; required: boolean }> = [
  { key: "name", labelKey: "name", required: true },
  { key: "personality", labelKey: "personality", required: true },
  { key: "first_mes", labelKey: "first_mes", required: true },
  { key: "scenario", labelKey: "scenario", required: false },
  { key: "appearance", labelKey: "appearance", required: false },
  { key: "voice_guidance", labelKey: "voice_guidance", required: false },
];

const SCENARIO_FIELDS: Array<{ key: FieldKey; labelKey: string; required: boolean }> = [
  { key: "name", labelKey: "title", required: true },
  { key: "scenario", labelKey: "premise", required: true },
  { key: "first_mes", labelKey: "openingScene", required: true },
  { key: "personality", labelKey: "mainCharacter", required: false },
  { key: "appearance", labelKey: "appearance", required: false },
  { key: "voice_guidance", labelKey: "voice_guidance", required: false },
];

function isComplete(value: DreamWeaverWorkspace[FieldKey]): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (value && typeof value === "object" && "compiled" in value) {
    return typeof (value as any).compiled === "string" && (value as any).compiled.trim().length > 0;
  }
  return false;
}

export function useProgressTracker(
  draft: DreamWeaverWorkspace | null,
  workspaceKind: DreamWeaverSession["workspace_kind"],
): FieldStatus[] {
  return useMemo(() => {
    const isScenario = workspaceKind === "scenario";
    const fieldDefs = isScenario ? SCENARIO_FIELDS : CHARACTER_FIELDS;

    const fieldStatuses: FieldStatus[] = fieldDefs.map(({ key, labelKey, required }) => ({
      key: key as string,
      label: pf(labelKey),
      required,
      complete: draft ? isComplete(draft[key]) : false,
    }));

    if (!isScenario) return fieldStatuses;

    const npcCount = draft?.npcs?.length ?? 0;
    const loreCount = draft?.lorebooks?.length ?? 0;
    fieldStatuses.push({
      key: "npcs",
      label: pf("npcs", { count: npcCount, min: MIN_SCENARIO_NPCS }),
      required: false,
      complete: npcCount >= MIN_SCENARIO_NPCS,
    });
    fieldStatuses.push({
      key: "lorebooks",
      label: pf("lorebooks", { count: loreCount, min: MIN_SCENARIO_LOREBOOKS }),
      required: false,
      complete: loreCount >= MIN_SCENARIO_LOREBOOKS,
    });
    return fieldStatuses;
  }, [draft, workspaceKind]);
}
