import type { VocabCard } from "@/types/vocab";

const SEED_TIME = "2026-01-01T00:00:00.000Z";

/**
 * Compact tuple format:
 * [korean, meaning, pronunciation, hanja, partOfSpeech, exampleKo, exampleZh, mnemonic]
 */
export type SeedRow = readonly [
  korean: string,
  meaning: string,
  pronunciation?: string,
  hanja?: string,
  partOfSpeech?: string,
  exampleKo?: string,
  exampleZh?: string,
  mnemonic?: string,
];

export function buildSeedCards(
  deckId: string,
  prefix: string,
  rows: readonly SeedRow[]
): VocabCard[] {
  return rows.map((row, idx) => {
    const num = String(idx + 1).padStart(3, "0");
    // Preserve original 2-digit IDs for the first 20 / 12 starter cards so existing progress stays intact
    const id =
      (prefix === "sys-t1" && idx < 20) || (prefix === "sys-dl" && idx < 12)
        ? `${prefix}-${String(idx + 1).padStart(2, "0")}`
        : `${prefix}-${num}`;

    return {
      id,
      deckId,
      korean: row[0],
      meaning: row[1],
      pronunciation: row[2] || undefined,
      hanja: row[3] || undefined,
      partOfSpeech: row[4] || undefined,
      exampleKo: row[5] || undefined,
      exampleZh: row[6] || undefined,
      mnemonic: row[7] || undefined,
      createdAt: SEED_TIME,
    };
  });
}
