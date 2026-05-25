const BANNED_NAMES = [
  "Elara", "Lyra", "Aria", "Seraphina", "Elowen", "Lysandra", "Isolde",
  "Aurora", "Luna", "Maya", "Elena", "Sylvana",
  "Kael", "Thorne", "Elias", "Silas", "Draven", "Zephyr", "Orion",
  "Jasper", "Finn", "Jax", "Ryker", "Zane", "Malachi",
  "Wren", "Lark", "Juniper", "Hazel", "Ivy", "Willow", "Sage",
];

const BANNED_SURNAMES = [
  "Blackwood", "Nightshade", "Storm", "Rivers", "Weaver", "Chen",
];

export const ANTI_SLOP_FRAGMENT = `## Quality Standards

### §1 Card-Authoring Violations

- \`Role-As-Personality\` — Profession or role substituted for inner life. → Personality lives in contradictions and habits, not job duties. A soldier can be anxious; a healer can be cruel; a scholar can be reckless.
- \`Genre Casting\` — Character described as the obvious archetype for this setting. → Find the person the setting doesn't predict. The interesting choice is rarely the first one.
- \`Trait Listing\` — Personality delivered as adjective inventory ("brave, loyal, fierce"). → Behavioral texture: what do they do when nervous, angry, caught off-guard?
- \`Cosmetic Depth\` — Surface contradiction passed off as complexity ("cold exterior, warm heart"). → Real contradictions are messy. People don't resolve neatly into two layers.
- \`Aesthetic Inflation\` — Every detail skews striking or dramatic. → Most real people are ordinary in most ways. Specificity beats spectacle.
- \`Nominative Determinism\` — Name reflects role or nature (thief named Shadow, gardener named Ivy). → Names come from parents, culture, and accident — not destiny.
- \`Transplantable Detail\` — Description could be swapped to any character in the genre. → Every detail should trace to this specific person's history, environment, or body.

### §2 Naming

Ban list — auto-reject and re-derive: ${BANNED_NAMES.join(", ")}
Banned surnames: ${BANNED_SURNAMES.join(", ")}

When a name is needed, apply these techniques in order:
1. Scrabble Check: If the name flows with soft liquids (L/R/A vowel chains), scrap it. Favor crunchy consonants (K, T, G, B, Z) or blunt syllables.
2. Cultural Grounding: Names should come from a real cultural tradition that fits the setting — or hybridize two distinct traditions for invented worlds. Not Standard Fantasy.
3. Phonebook Method (modern/realistic settings): Use mundane, un-aesthetic names. Gary, not Ryker. Brenda, not Seraphina.
4. No Nominative Determinism: Never name a character after their role, nature, or defining trait.

### §3 Description Quality

Ground everything in specificity. If a detail could apply to any character in this genre, it's not specific enough. If a description could be swapped between characters without anyone noticing, it needs more texture.

Before generating, ask yourself:
- Does this feel like a real person, or a character type?
- Are the details chosen for this individual, or borrowed from the genre shelf?
- Would removing any detail make this description noticeably less specific?

Observe the particular, not the general. Find what makes this one person distinct from the next.`;
