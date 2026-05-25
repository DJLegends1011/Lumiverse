import type { AnyDreamWeaverTool, DreamWeaverTool, ValidateResult } from "./types";
import type { LorebookEntry, NpcEntry, VoiceGuidance } from "../../../types/dream-weaver";

type V<T> = { ok: true; data: T } | { ok: false; error: string };

function asObject(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function reqString(obj: Record<string, unknown>, key: string, minLen = 1): V<string> {
  const v = obj[key];
  if (typeof v !== "string") return { ok: false, error: `${key}: expected string` };
  if (v.length < minLen) return { ok: false, error: `${key}: too short (min ${minLen})` };
  return { ok: true, data: v };
}

function reqStringArray(
  obj: Record<string, unknown>,
  key: string,
  opts: { min: number; max: number },
): V<string[]> {
  const v = obj[key];
  if (!Array.isArray(v)) return { ok: false, error: `${key}: expected array` };
  if (v.length < opts.min || v.length > opts.max)
    return { ok: false, error: `${key}: length ${opts.min}..${opts.max}` };
  for (const item of v)
    if (typeof item !== "string" || item.length === 0)
      return { ok: false, error: `${key}: items must be non-empty strings` };
  return { ok: true, data: v as string[] };
}

const setName: DreamWeaverTool<{ name: string }> = {
  name: "set_name",
  displayName: "Set Name",
  category: "soul",
  userInvocable: true,
  slashCommand: "/name",
  aliases: ["/title"],
  description: "Generate a grounded character name from the dream.",
  prompt: ({ workspaceKind }) => {
    const what = workspaceKind === "scenario"
      ? "Pick a title for the scenario that grounds it in its world — not a tagline, not a genre label, but a name that belongs to the place or situation the scenario describes. A good title feels like it existed before the scenario was written."
      : "Pick a single character name that fits the dream and feels like it belongs to a real person — someone with parents who chose it, a culture it came from, a reason it stuck.";
    return `Tool: set_name. ${what}

Apply the naming standards from the Quality Standards section. Cross-reference the ban list and re-derive if matched. Use the Scrabble Check, Cultural Grounding, and Phonebook Method as appropriate to the setting.

If the source material implies a cultural context, the name should come from or hybridize real naming traditions that fit. If the setting is modern or realistic, prefer mundane over aesthetic. If the setting is fantastical, ground the name in a constructed or borrowed tradition — not in generic fantasy phonetics.

Output JSON: { "name": "<string>" }.`;
  },
  validate(input): ValidateResult<{ name: string }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const name = reqString(o, "name", 1);
    if (!name.ok) return name;
    return { ok: true, data: { name: name.data } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop"],
  contextSlice: () => ({}),
  apply: (draft, output) => ({ ...draft, name: output.name }),
};

const setAppearance: DreamWeaverTool<{
  appearance: string;
  appearance_data: Record<string, unknown>;
}> = {
  name: "set_appearance",
  displayName: "Set Appearance",
  category: "soul",
  userInvocable: true,
  slashCommand: "/appearance",
  description: "Generate character appearance using the appearance template.",
  prompt: ({ workspaceKind }) => {
    const who = workspaceKind === "scenario"
      ? "Build a physical description for the scenario's main character — the protagonist NPC who interacts with {{user}}. Use the appearance template fragment for structure.\n\nGround the appearance in the scenario's world and the character's place within it. How does this person look like they belong here? What does their body, clothing, or bearing tell you before they speak? Draw from what the source material implies rather than defaulting to genre expectations."
      : "Build a physical description grounded in who this character is and where they come from. Use the appearance template fragment for structure.\n\nAppearance should feel like it belongs to a specific person, not a character type. Let the source material and existing draft inform details — an environment shapes how someone carries themselves, how they dress, what marks they bear.";
    return `Tool: set_appearance. ${who}

Where the source material is sparse, choose details that make this person feel specific and real — not the most dramatic or striking option, but the most believable one. If a physical detail could belong to any character in this genre, push past it and find something more particular.

Output JSON:
{
  "appearance": "<the full templated appearance string>",
  "appearance_data": { "height": "...", "species": "...", "hair": "...", "eyes": "...", "skin_tone": "..." }
}`;
  },
  validate(input): ValidateResult<{ appearance: string; appearance_data: Record<string, unknown> }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const appearance = reqString(o, "appearance", 20);
    if (!appearance.ok) return appearance;
    const ad = asObject(o["appearance_data"]);
    if (!ad) return { ok: false, error: "appearance_data: expected object" };
    return { ok: true, data: { appearance: appearance.data, appearance_data: ad } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop", "format:appearance"],
  contextSlice: (d) => ({ name: d.name }),
  apply: (draft, output) => ({
    ...draft,
    appearance: output.appearance,
    appearance_data: output.appearance_data,
  }),
};

const setPersonality: DreamWeaverTool<{ personality: string }> = {
  name: "set_personality",
  displayName: "Set Personality",
  category: "soul",
  userInvocable: true,
  slashCommand: "/personality",
  description: "Behavioral patterns, habits, contradictions.",
  prompt: ({ workspaceKind }) => {
    const who = workspaceKind === "scenario"
      ? "Write 2-3 paragraphs capturing the main character's actual behavioral patterns — not their role summary or a list of traits. This is the protagonist NPC of the scenario, the person {{user}} encounters and interacts with directly.\n\nGround the personality in what the source material implies. How does this person navigate the world the scenario describes? What do they want that they might not say outright? What habits or tensions come from living in this specific situation?"
      : "Write 2-3 paragraphs capturing how this character actually behaves — not what they are on paper. Personality is not a job description or a list of adjectives. It lives in contradictions, habits, the gap between who someone presents as and who they are when no one's watching.\n\nDig into the source material for texture. What does it imply about how this person moves through the world? If the source material is sparse, lean into what's unsaid — what kind of person would exist in this space, and what internal pressures would shape them?";
    return `Tool: set_personality. ${who}

A character's profession, social role, or education does not determine their emotional range or inner life. Resist reducing them to their function — find the person who exists beyond their role. Their contradictions, their unguarded moments, the texture that makes them feel inhabited rather than cast.

If the source material leaves personality largely unspecified, explore what kind of individual the context naturally calls for — not the obvious choice, but someone whose presence feels real and whose behavior could surprise.

Output JSON: { "personality": "<string>" }.`;
  },
  validate(input): ValidateResult<{ personality: string }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const personality = reqString(o, "personality", 40);
    if (!personality.ok) return personality;
    return { ok: true, data: { personality: personality.data } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop"],
  contextSlice: (d) => ({ name: d.name, appearance: d.appearance, scenario: d.scenario }),
  apply: (draft, output) => ({ ...draft, personality: output.personality }),
};

const setScenario: DreamWeaverTool<{ scenario: string }> = {
  name: "set_scenario",
  displayName: "Set Scenario",
  category: "soul",
  userInvocable: true,
  slashCommand: "/scenario",
  aliases: ["/premise"],
  description: "Current situation, tension, relationship to {{user}}.",
  prompt: `Tool: set_scenario. Write the current situation, tension, and relationship to {{user}}. 1-2 paragraphs. Output JSON: { "scenario": "<string>" }.`,
  validate(input): ValidateResult<{ scenario: string }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const scenario = reqString(o, "scenario", 40);
    if (!scenario.ok) return scenario;
    return { ok: true, data: { scenario: scenario.data } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop"],
  contextSlice: (d) => ({ name: d.name, personality: d.personality }),
  apply: (draft, output) => ({ ...draft, scenario: output.scenario }),
};

const setVoiceGuidance: DreamWeaverTool<{ voice_guidance: VoiceGuidance }> = {
  name: "set_voice_guidance",
  displayName: "Set Voice Guidance",
  category: "soul",
  userInvocable: true,
  slashCommand: "/voice",
  description: "How the character speaks.",
  prompt: ({ workspaceKind }) => {
    const who = workspaceKind === "scenario"
      ? "Capture how the scenario's main character actually sounds — their verbal rhythms, word choices, and speech habits. This is the protagonist NPC's voice, not a narrator voice.\n\nVoice should grow from who this character is within the scenario, not from what role they serve in it. How someone speaks is shaped by their specific history, relationships, and internal state — not by their title or function."
      : "Capture how this character actually sounds in conversation — their verbal rhythms, word choices, and speech habits.\n\nVoice should emerge from personality and circumstance, not from stereotype. A character's background, class, or role might influence their speech, but it doesn't define it. People code-switch, pick up habits from people around them, and develop speech patterns from their own specific history.";
    return `Tool: set_voice_guidance. ${who}

Draw from the personality and source material already established. What does the way this person navigates their world tell you about how they'd talk? If there's little to work with, find a voice that makes them feel like a real person who existed before you started writing — not the first voice that comes to mind for this type, but something more particular.

Output JSON: { "voice_guidance": <VoiceGuidance per voice-rules fragment> }.`;
  },
  validate(input): ValidateResult<{ voice_guidance: VoiceGuidance }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const vg = asObject(o["voice_guidance"]);
    if (!vg) return { ok: false, error: "voice_guidance: expected object" };

    const compiled = reqString(vg, "compiled", 0);
    if (!compiled.ok) return compiled;

    const rules = asObject(vg["rules"]);
    if (!rules) return { ok: false, error: "voice_guidance.rules: expected object" };

    for (const key of ["baseline", "rhythm", "diction", "quirks", "hard_nos"] as const) {
      const arr = rules[key];
      if (!Array.isArray(arr)) return { ok: false, error: `voice_guidance.rules.${key}: expected array` };
      for (const item of arr)
        if (typeof item !== "string")
          return { ok: false, error: `voice_guidance.rules.${key}: items must be strings` };
    }

    return {
      ok: true,
      data: {
        voice_guidance: {
          compiled: compiled.data,
          rules: {
            baseline: rules["baseline"] as string[],
            rhythm: rules["rhythm"] as string[],
            diction: rules["diction"] as string[],
            quirks: rules["quirks"] as string[],
            hard_nos: rules["hard_nos"] as string[],
          },
        },
      },
    };
  },
  conflictMode: "overwrite",
  requiresFragments: ["voice-rules"],
  contextSlice: (d) => ({ name: d.name, personality: d.personality }),
  apply: (draft, output) => ({ ...draft, voice_guidance: output.voice_guidance }),
};

const setFirstMessage: DreamWeaverTool<{ first_mes: string }> = {
  name: "set_first_message",
  displayName: "Set First Message",
  category: "soul",
  userInvocable: true,
  slashCommand: "/first_message",
  aliases: ["/opening_scene", "/opening"],
  description: "Opening message, beginning with action or dialogue.",
  prompt: ({ workspaceKind }) => {
    const who = workspaceKind === "scenario"
      ? "Write the scenario's opening scene — 3-5 paragraphs. The first sentence carries momentum: the main character mid-action, mid-speech, or mid-thought. In medias res. Subject, verb, want. The reader arrives in a world already moving.\n\nEstablish the main character's presence and voice immediately. Let the scenario's world emerge through what the character does and notices — not through narrated setup. End on a moment that hands action to {{user}}: a question asked, a gesture left hanging, a situation that demands response. Hard cut on the tension, not after it resolves."
      : "Write the character's opening message — 3-5 paragraphs. The first sentence carries momentum: the character mid-action, mid-speech, or mid-thought. In medias res. Subject, verb, want. The reader arrives in a moment already happening.\n\nLet the character's personality and voice emerge through what they do, not through narrated introduction. The scenario should be felt through the character's behavior, not explained before it. End on a beat that invites {{user}} into the scene: a direct address, an unfinished action, a moment that demands response. Hard cut on the tension, not after it resolves.";
    return `Tool: set_first_message. ${who}

The voice established in voice_guidance should be audible in how the character speaks and how the narration textures their actions. Every paragraph should earn its place — if removing it wouldn't lose anything specific, it doesn't belong.

Output JSON: { "first_mes": "<string>" }.`;
  },
  validate(input): ValidateResult<{ first_mes: string }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const first_mes = reqString(o, "first_mes", 60);
    if (!first_mes.ok) return first_mes;
    return { ok: true, data: { first_mes: first_mes.data } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop"],
  contextSlice: (d) => ({
    name: d.name,
    personality: d.personality,
    scenario: d.scenario,
    voice_guidance: d.voice_guidance,
  }),
  apply: (draft, output) => ({ ...draft, first_mes: output.first_mes }),
};

const setGreeting: DreamWeaverTool<{ greeting: string }> = {
  name: "set_greeting",
  displayName: "Set Greeting",
  category: "soul",
  userInvocable: true,
  slashCommand: "/greeting",
  description: "Alternate entry-point greeting.",
  prompt: `Tool: set_greeting. Write an alternate greeting different from the first message — same character, different opening situation. 2-4 paragraphs. Output JSON: { "greeting": "<string>" }.`,
  validate(input): ValidateResult<{ greeting: string }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const greeting = reqString(o, "greeting", 40);
    if (!greeting.ok) return greeting;
    return { ok: true, data: { greeting: greeting.data } };
  },
  conflictMode: "overwrite",
  requiresFragments: ["anti-slop"],
  contextSlice: (d) => ({
    name: d.name,
    personality: d.personality,
    scenario: d.scenario,
    first_mes: d.first_mes,
  }),
  apply: (draft, output) => ({ ...draft, greeting: output.greeting }),
};

const addLorebookEntry: DreamWeaverTool<LorebookEntry> = {
  name: "add_lorebook_entry",
  displayName: "Add Lorebook Entry",
  category: "world",
  userInvocable: true,
  slashCommand: "/add_lorebook",
  description: "Add a new lorebook entry to the world.",
  prompt: `Tool: add_lorebook_entry. Generate one new lorebook entry that fits the dream and is distinct from existing entries. Output JSON: { "key": ["<trigger 1>", ...], "comment": "<short title>", "content": "<entry body>" }.`,
  validate(input): ValidateResult<LorebookEntry> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const key = reqStringArray(o, "key", { min: 1, max: 4 });
    if (!key.ok) return key;
    const comment = reqString(o, "comment", 1);
    if (!comment.ok) return comment;
    if (comment.data.length > 80)
      return { ok: false, error: "comment: too long (max 80)" };
    const content = reqString(o, "content", 20);
    if (!content.ok) return content;
    return { ok: true, data: { key: key.data, comment: comment.data, content: content.data } };
  },
  conflictMode: "append",
  requiresFragments: ["anti-slop", "format:lorebook"],
  contextSlice: (d) => ({
    scenario: d.scenario,
    lorebooks: d.lorebooks.map((e) => ({ key: e.key, comment: e.comment, content: "" })) as LorebookEntry[],
  }),
  apply: (draft, output) => ({ ...draft, lorebooks: [...draft.lorebooks, output] }),
};

const addNpc: DreamWeaverTool<NpcEntry> = {
  name: "add_npc",
  displayName: "Add NPC",
  category: "world",
  userInvocable: true,
  slashCommand: "/add_npc",
  description: "Add a new named NPC to the world.",
  prompt: `Tool: add_npc. Generate one new NPC distinct from any existing ones. Output JSON: { "name": "<string>", "description": "<2-3 sentences>", "voice_notes": "<optional>" }.`,
  validate(input): ValidateResult<NpcEntry> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const name = reqString(o, "name", 1);
    if (!name.ok) return name;
    const description = reqString(o, "description", 20);
    if (!description.ok) return description;
    if ("voice_notes" in o && o["voice_notes"] !== undefined) {
      if (typeof o["voice_notes"] !== "string")
        return { ok: false, error: "voice_notes: expected string" };
      return {
        ok: true,
        data: { name: name.data, description: description.data, voice_notes: o["voice_notes"] as string },
      };
    }
    return { ok: true, data: { name: name.data, description: description.data } };
  },
  conflictMode: "append",
  requiresFragments: ["anti-slop", "format:npc"],
  contextSlice: (d) => ({
    name: d.name,
    scenario: d.scenario,
    npcs: d.npcs.map((n) => ({ name: n.name, description: "", voice_notes: undefined })) as NpcEntry[],
  }),
  apply: (draft, output) => ({ ...draft, npcs: [...draft.npcs, output] }),
};

const addNpcBatch: DreamWeaverTool<{ entries: NpcEntry[] }> = {
  name: "add_npc_batch",
  displayName: "Add NPC Batch",
  category: "world",
  userInvocable: true,
  slashCommand: "/add_npcs",
  description: "Add a batch of supporting NPCs to the world in one call.",
  prompt: `Tool: add_npc_batch. Generate a batch of 3-6 distinct supporting NPCs that fit the scenario. None of them is the main character or {{user}} — these are the surrounding cast (allies, rivals, authority figures, bystanders with hooks). Mix major and minor roles. Output JSON: { "entries": [{ "name": "<string>", "description": "<2-3 sentences>", "voice_notes": "<optional>" }, ...] }.`,
  validate(input): ValidateResult<{ entries: NpcEntry[] }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const arr = o["entries"];
    if (!Array.isArray(arr)) return { ok: false, error: "entries: expected array" };
    if (arr.length < 1 || arr.length > 10) return { ok: false, error: "entries: length 1..10" };
    const out: NpcEntry[] = [];
    for (let i = 0; i < arr.length; i++) {
      const ev = asObject(arr[i]);
      if (!ev) return { ok: false, error: `entries[${i}]: expected object` };
      const name = reqString(ev, "name", 1);
      if (!name.ok) return { ok: false, error: `entries[${i}].${name.error}` };
      const description = reqString(ev, "description", 20);
      if (!description.ok) return { ok: false, error: `entries[${i}].${description.error}` };
      const entry: NpcEntry = { name: name.data, description: description.data };
      if ("voice_notes" in ev && ev["voice_notes"] !== undefined) {
        if (typeof ev["voice_notes"] !== "string")
          return { ok: false, error: `entries[${i}].voice_notes: expected string` };
        entry.voice_notes = ev["voice_notes"] as string;
      }
      out.push(entry);
    }
    return { ok: true, data: { entries: out } };
  },
  conflictMode: "append",
  requiresFragments: ["anti-slop", "format:npc"],
  contextSlice: (d) => ({
    name: d.name,
    scenario: d.scenario,
    personality: d.personality,
    npcs: d.npcs.map((n) => ({ name: n.name, description: "", voice_notes: undefined })) as NpcEntry[],
  }),
  apply: (draft, output) => ({ ...draft, npcs: [...draft.npcs, ...output.entries] }),
};

const addLorebookBatch: DreamWeaverTool<{ entries: LorebookEntry[] }> = {
  name: "add_lorebook_batch",
  displayName: "Add Lorebook Batch",
  category: "world",
  userInvocable: true,
  slashCommand: "/add_lorebooks",
  description: "Add a batch of lorebook entries that flesh out the world.",
  prompt: `Tool: add_lorebook_batch. Generate a batch of 4-8 distinct lorebook entries that flesh out the world: places, factions, rules, history, organizations, customs, signature objects, recurring threats. Each entry must be distinct from the others — no overlap. Output JSON: { "entries": [{ "key": ["<trigger 1>", ...], "comment": "<short title>", "content": "<entry body>" }, ...] }.`,
  validate(input): ValidateResult<{ entries: LorebookEntry[] }> {
    const o = asObject(input);
    if (!o) return { ok: false, error: "expected object" };
    const arr = o["entries"];
    if (!Array.isArray(arr)) return { ok: false, error: "entries: expected array" };
    if (arr.length < 1 || arr.length > 12) return { ok: false, error: "entries: length 1..12" };
    const out: LorebookEntry[] = [];
    for (let i = 0; i < arr.length; i++) {
      const ev = asObject(arr[i]);
      if (!ev) return { ok: false, error: `entries[${i}]: expected object` };
      const key = reqStringArray(ev, "key", { min: 1, max: 4 });
      if (!key.ok) return { ok: false, error: `entries[${i}].${key.error}` };
      const comment = reqString(ev, "comment", 1);
      if (!comment.ok) return { ok: false, error: `entries[${i}].${comment.error}` };
      if (comment.data.length > 80) return { ok: false, error: `entries[${i}].comment: too long (max 80)` };
      const content = reqString(ev, "content", 20);
      if (!content.ok) return { ok: false, error: `entries[${i}].${content.error}` };
      out.push({ key: key.data, comment: comment.data, content: content.data });
    }
    return { ok: true, data: { entries: out } };
  },
  conflictMode: "append",
  requiresFragments: ["anti-slop", "format:lorebook"],
  contextSlice: (d) => ({
    name: d.name,
    scenario: d.scenario,
    lorebooks: d.lorebooks.map((e) => ({ key: e.key, comment: e.comment, content: "" })) as LorebookEntry[],
  }),
  apply: (draft, output) => ({ ...draft, lorebooks: [...draft.lorebooks, ...output.entries] }),
};

export const BUILTIN_TOOLS: AnyDreamWeaverTool[] = [
  setName,
  setAppearance,
  setPersonality,
  setScenario,
  setVoiceGuidance,
  setFirstMessage,
  setGreeting,
  addLorebookEntry,
  addNpc,
  addLorebookBatch,
  addNpcBatch,
];
