import type { Deck, VocabCard } from "@/types/vocab";
import { DAILY_SENTENCE_CARDS } from "./decks/dailySentences";
import { DAILY_WORD_CARDS } from "./decks/dailyWords";
import { TOPIK_NOUN_CARDS } from "./decks/topikNouns";
import { TOPIK_VERB_CARDS } from "./decks/topikVerbs";
import { TRAVEL_SENTENCE_CARDS } from "./decks/travelSentences";

const SEED_TIME = "2026-01-01T00:00:00.000Z";

export const SYSTEM_DECKS: Deck[] = [
  {
    id: "sys-topik-1",
    title: "TOPIK I 核心名詞與漢字詞",
    description: "100 個初級必背名詞，附漢字詞對應與連音／變音標註",
    isSystem: true,
    ownerId: null,
    createdAt: SEED_TIME,
  },
  {
    id: "sys-topik-verbs",
    title: "TOPIK I 必背動詞與形容詞",
    description: "100 個最高頻動詞與形容詞，附不規則變化與實用例句",
    isSystem: true,
    ownerId: null,
    createdAt: SEED_TIME,
  },
  {
    id: "sys-daily-kr",
    title: "日常追劇 & 生活高頻詞",
    description: "100 個韓劇、咖啡廳、情緒與副詞高頻口語詞彙",
    isSystem: true,
    ownerId: null,
    createdAt: SEED_TIME,
  },
  {
    id: "sys-sentences-daily",
    title: "生活日常必背常用句",
    description: "100 句問候、聊天、邀約、工作與社群實用會話（附常見回應）",
    isSystem: true,
    ownerId: null,
    createdAt: SEED_TIME,
  },
  {
    id: "sys-sentences-travel",
    title: "韓國旅遊 & 應急實戰句",
    description: "100 句機場、飯店、地鐵、點餐、退稅與藥局急救句子",
    isSystem: true,
    ownerId: null,
    createdAt: SEED_TIME,
  },
];

export const SYSTEM_CARDS: VocabCard[] = [
  ...TOPIK_NOUN_CARDS,
  ...TOPIK_VERB_CARDS,
  ...DAILY_WORD_CARDS,
  ...DAILY_SENTENCE_CARDS,
  ...TRAVEL_SENTENCE_CARDS,
];
