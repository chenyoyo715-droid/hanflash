import type { VocabCard } from "@/types/vocab";

export type CardDraft = Omit<VocabCard, "id" | "deckId" | "createdAt">;

/**
 * Parses a single RFC-4180-like CSV line, respecting double-quoted commas.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses pasted CSV / TSV or plain text ("한국어,中文" or "한국어\t中文" or one Korean word per line).
 */
export function parseBatchInput(raw: string): {
  cards: CardDraft[];
  wordsNeedingAi: string[];
} {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { cards: [], wordsNeedingAi: [] };
  }

  // Detect optional header line
  const firstLower = lines[0].toLowerCase();
  const hasHeader =
    firstLower.startsWith("korean,") ||
    firstLower.startsWith("korean\t") ||
    firstLower.startsWith("韓文,") ||
    firstLower.startsWith("韓文\t");

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const cards: CardDraft[] = [];
  const wordsNeedingAi: string[] = [];

  for (const line of dataLines) {
    const delimiter = line.includes("\t") ? "\t" : ",";
    const cols = parseCsvLine(line, delimiter);
    const korean = cols[0]?.trim();
    if (!korean) continue;

    if (cols.length === 1 || !cols[1]) {
      wordsNeedingAi.push(korean);
      continue;
    }

    cards.push({
      korean,
      meaning: cols[1] ?? "",
      pronunciation: cols[2] || undefined,
      hanja: cols[3] || undefined,
      partOfSpeech: cols[4] || undefined,
      exampleKo: cols[5] || undefined,
      exampleZh: cols[6] || undefined,
      mnemonic: cols[7] || undefined,
    });
  }

  return { cards, wordsNeedingAi };
}
