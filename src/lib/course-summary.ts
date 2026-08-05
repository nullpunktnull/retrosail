import type { EntryDTO, EntryType, SurveyDTO } from "@/lib/identity";

const SECTION: Record<EntryType, { title: string; emoji: string }> = {
  WIND: { title: "Wind — Was treibt uns voran?", emoji: "💨" },
  ANCHOR: { title: "Anker — Was hält uns zurück?", emoji: "⚓" },
  ROCK: { title: "Felsen — Welche Gefahren gibt es?", emoji: "🪨" },
};

function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function formatEntries(entries: EntryDTO[]): string {
  if (entries.length === 0) return "_Noch keine Einträge._\n";
  return entries
    .map((e) => `- ${stripBoldMarkers(e.content)} _( ${e.authorName} )_`)
    .join("\n");
}

/** Feature 1 — Zusammenfassung als Markdown. */
export function formatCourseSummary(survey: SurveyDTO): string {
  const wind = survey.entries.filter((e) => e.type === "WIND");
  const anchor = survey.entries.filter((e) => e.type === "ANCHOR");
  const rock = survey.entries.filter((e) => e.type === "ROCK");
  const date = new Date(survey.updatedAt).toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    `# RetroSail — Zusammenfassung`,
    ``,
    `**Ziel / Insel**`,
    survey.goal,
    ``,
    `_${date}_ · ${survey.entries.length} Einträge`,
    ``,
    `## ${SECTION.WIND.emoji} ${SECTION.WIND.title}`,
    formatEntries(wind),
    ``,
    `## ${SECTION.ANCHOR.emoji} ${SECTION.ANCHOR.title}`,
    formatEntries(anchor),
    ``,
    `## ${SECTION.ROCK.emoji} ${SECTION.ROCK.title}`,
    formatEntries(rock),
    ``,
  ].join("\n");
}
