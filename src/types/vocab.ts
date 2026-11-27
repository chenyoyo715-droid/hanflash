export type BucketStatus = "new" | "fuzzy" | "known";

export type ReviewFilter = "active" | "new" | "fuzzy" | "known" | "all";

export interface Deck {
  id: string;
  title: string;
  description: string;
  isSystem: boolean;
  ownerId: string | null;
  createdAt: string;
}

export interface VocabCard {
  id: string;
  deckId: string;
  korean: string;
  /** Actual phonetic realization when liaison/assimilation applies, e.g. "[한구거]" */
  pronunciation?: string;
  /** Sino-Korean Hanja origin for Chinese speakers, e.g. "圖書館" */
  hanja?: string;
  partOfSpeech?: string;
  meaning: string;
  exampleKo?: string;
  exampleZh?: string;
  mnemonic?: string;
  createdAt: string;
}

export interface CardProgress {
  cardId: string;
  bucket: BucketStatus;
  reviewCount: number;
  lastReviewedAt: string | null;
}

export interface CardWithProgress extends VocabCard {
  bucket: BucketStatus;
  reviewCount: number;
  lastReviewedAt: string | null;
}

export interface EnrichedKoreanWord {
  korean: string;
  pronunciation: string;
  hanja: string;
  partOfSpeech: string;
  meaning: string;
  exampleKo: string;
  exampleZh: string;
  mnemonic: string;
}

export interface StorageUser {
  id: string;
  email: string;
}
