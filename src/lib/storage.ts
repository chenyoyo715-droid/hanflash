import { SYSTEM_CARDS, SYSTEM_DECKS } from "@/data/seedDecks";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  BucketStatus,
  CardProgress,
  Deck,
  VocabCard,
} from "@/types/vocab";

const LOCAL_DECKS_KEY = "hanflash:decks:v1";
const LOCAL_CARDS_KEY = "hanflash:cards:v1";
const LOCAL_PROGRESS_KEY = "hanflash:progress:v1";

export interface AppDataSnapshot {
  decks: Deck[];
  cards: VocabCard[];
  progressMap: Record<string, CardProgress>;
  mode: "cloud" | "local";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadLocalCustomDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  return safeParse<Deck[]>(window.localStorage.getItem(LOCAL_DECKS_KEY), []);
}

function saveLocalCustomDecks(decks: Deck[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
}

function loadLocalCustomCards(): VocabCard[] {
  if (typeof window === "undefined") return [];
  return safeParse<VocabCard[]>(
    window.localStorage.getItem(LOCAL_CARDS_KEY),
    []
  );
}

function saveLocalCustomCards(cards: VocabCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(cards));
}

function loadLocalProgress(): Record<string, CardProgress> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, CardProgress>>(
    window.localStorage.getItem(LOCAL_PROGRESS_KEY),
    {}
  );
}

function saveLocalProgress(progress: Record<string, CardProgress>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
}

export function generateId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 12)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${rand}`;
}

export async function loadAppData(userId: string | null): Promise<AppDataSnapshot> {
  const supabase = getSupabaseClient();

  // Cloud mode when Supabase is configured AND user is signed in
  if (supabase && userId) {
    const [decksRes, cardsRes, progressRes] = await Promise.all([
      supabase.from("decks").select("*").order("created_at", { ascending: true }),
      supabase.from("cards").select("*").order("created_at", { ascending: true }),
      supabase.from("user_card_progress").select("*").eq("user_id", userId),
    ]);

    if (!decksRes.error && !cardsRes.error && !progressRes.error) {
      const remoteDecks: Deck[] = (decksRes.data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string) ?? "",
        isSystem: Boolean(row.is_system),
        ownerId: (row.owner_id as string | null) ?? null,
        createdAt: row.created_at as string,
      }));

      const remoteCards: VocabCard[] = (cardsRes.data ?? []).map((row) => ({
        id: row.id as string,
        deckId: row.deck_id as string,
        korean: row.korean as string,
        pronunciation: (row.pronunciation as string | null) ?? undefined,
        hanja: (row.hanja as string | null) ?? undefined,
        partOfSpeech: (row.part_of_speech as string | null) ?? undefined,
        meaning: row.meaning as string,
        exampleKo: (row.example_ko as string | null) ?? undefined,
        exampleZh: (row.example_zh as string | null) ?? undefined,
        mnemonic: (row.mnemonic as string | null) ?? undefined,
        createdAt: row.created_at as string,
      }));

      // Merge built-in system decks/cards if they haven't been seeded to Postgres yet
      const deckIds = new Set(remoteDecks.map((d) => d.id));
      const mergedDecks = [
        ...SYSTEM_DECKS.filter((d) => !deckIds.has(d.id)),
        ...remoteDecks,
      ];

      const cardIds = new Set(remoteCards.map((c) => c.id));
      const mergedCards = [
        ...SYSTEM_CARDS.filter((c) => !cardIds.has(c.id)),
        ...remoteCards,
      ];

      const progressMap: Record<string, CardProgress> = {};
      for (const row of progressRes.data ?? []) {
        const cardId = row.card_id as string;
        progressMap[cardId] = {
          cardId,
          bucket: row.bucket as BucketStatus,
          reviewCount: Number(row.review_count ?? 0),
          lastReviewedAt: (row.last_reviewed_at as string | null) ?? null,
        };
      }

      return {
        decks: mergedDecks,
        cards: mergedCards,
        progressMap,
        mode: "cloud",
      };
    }
  }

  // Fallback: Local Mode (zero setup required)
  const customDecks = loadLocalCustomDecks();
  const customCards = loadLocalCustomCards();
  const progressMap = loadLocalProgress();

  return {
    decks: [...SYSTEM_DECKS, ...customDecks],
    cards: [...SYSTEM_CARDS, ...customCards],
    progressMap,
    mode: "local",
  };
}

export async function saveCardReview(
  userId: string | null,
  cardId: string,
  bucket: BucketStatus,
  currentCount: number
): Promise<CardProgress> {
  const now = new Date().toISOString();
  const nextProgress: CardProgress = {
    cardId,
    bucket,
    reviewCount: currentCount + 1,
    lastReviewedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase && userId) {
    await Promise.all([
      supabase.from("user_card_progress").upsert(
        {
          user_id: userId,
          card_id: cardId,
          bucket,
          review_count: nextProgress.reviewCount,
          last_reviewed_at: now,
        },
        { onConflict: "user_id,card_id" }
      ),
      supabase.from("review_logs").insert({
        user_id: userId,
        card_id: cardId,
        bucket,
        reviewed_at: now,
      }),
    ]);
    return nextProgress;
  }

  const map = loadLocalProgress();
  map[cardId] = nextProgress;
  saveLocalProgress(map);
  return nextProgress;
}

export async function createCustomDeck(
  userId: string | null,
  title: string,
  description: string
): Promise<Deck> {
  const newDeck: Deck = {
    id: generateId("deck"),
    title: title.trim(),
    description: description.trim(),
    isSystem: false,
    ownerId: userId,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase && userId) {
    const { error } = await supabase.from("decks").insert({
      id: newDeck.id,
      title: newDeck.title,
      description: newDeck.description,
      is_system: false,
      owner_id: userId,
      created_at: newDeck.createdAt,
    });
    if (error) throw new Error(error.message);
    return newDeck;
  }

  const decks = loadLocalCustomDecks();
  decks.push(newDeck);
  saveLocalCustomDecks(decks);
  return newDeck;
}

export async function deleteCustomDeck(
  userId: string | null,
  deckId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase && userId) {
    const { error } = await supabase
      .from("decks")
      .delete()
      .eq("id", deckId)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const decks = loadLocalCustomDecks().filter((d) => d.id !== deckId);
  const cards = loadLocalCustomCards().filter((c) => c.deckId !== deckId);
  saveLocalCustomDecks(decks);
  saveLocalCustomCards(cards);
}

export async function addCardsToDeck(
  userId: string | null,
  deckId: string,
  drafts: Array<Omit<VocabCard, "id" | "deckId" | "createdAt">>
): Promise<VocabCard[]> {
  const now = new Date().toISOString();
  const created: VocabCard[] = drafts.map((draft) => ({
    id: generateId("card"),
    deckId,
    korean: draft.korean.trim(),
    pronunciation: draft.pronunciation?.trim() || undefined,
    hanja: draft.hanja?.trim() || undefined,
    partOfSpeech: draft.partOfSpeech?.trim() || undefined,
    meaning: draft.meaning.trim(),
    exampleKo: draft.exampleKo?.trim() || undefined,
    exampleZh: draft.exampleZh?.trim() || undefined,
    mnemonic: draft.mnemonic?.trim() || undefined,
    createdAt: now,
  }));

  const supabase = getSupabaseClient();
  if (supabase && userId) {
    const { error } = await supabase.from("cards").insert(
      created.map((c) => ({
        id: c.id,
        deck_id: c.deckId,
        korean: c.korean,
        pronunciation: c.pronunciation ?? null,
        hanja: c.hanja ?? null,
        part_of_speech: c.partOfSpeech ?? null,
        meaning: c.meaning,
        example_ko: c.exampleKo ?? null,
        example_zh: c.exampleZh ?? null,
        mnemonic: c.mnemonic ?? null,
        created_at: c.createdAt,
      }))
    );
    if (error) throw new Error(error.message);
    return created;
  }

  const existing = loadLocalCustomCards();
  saveLocalCustomCards([...existing, ...created]);
  return created;
}

export async function resetDeckProgress(
  userId: string | null,
  cardIds: string[]
): Promise<void> {
  if (cardIds.length === 0) return;

  const supabase = getSupabaseClient();
  if (supabase && userId) {
    await supabase
      .from("user_card_progress")
      .delete()
      .eq("user_id", userId)
      .in("card_id", cardIds);
    return;
  }

  const map = loadLocalProgress();
  for (const id of cardIds) {
    delete map[id];
  }
  saveLocalProgress(map);
}
