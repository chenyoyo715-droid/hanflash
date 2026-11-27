"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Cloud,
  HardDrive,
  Moon,
  Plus,
  RotateCcw,
  Shuffle,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AddImportModal } from "@/components/AddImportModal";
import { AuthModal } from "@/components/AuthModal";
import { DeckModal } from "@/components/DeckModal";
import { FlashCard } from "@/components/FlashCard";
import {
  addCardsToDeck,
  createCustomDeck,
  deleteCustomDeck,
  loadAppData,
  resetDeckProgress,
  saveCardReview,
} from "@/lib/storage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { speakKorean } from "@/lib/tts";
import type {
  BucketStatus,
  CardProgress,
  CardWithProgress,
  Deck,
  ReviewFilter,
  StorageUser,
  VocabCard,
} from "@/types/vocab";

const PREFS_KEY = "hanflash:prefs:v1";

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ReviewWorkspace() {
  const [user, setUser] = useState<StorageUser | null>(null);
  const [storageMode, setStorageMode] = useState<"cloud" | "local">("local");
  const [loading, setLoading] = useState(true);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, CardProgress>>(
    {}
  );

  const [activeDeckId, setActiveDeckId] = useState<string>("sys-topik-1");
  const [filter, setFilter] = useState<ReviewFilter>("active");
  const [queue, setQueue] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState(0);

  const [autoSpeak, setAutoSpeak] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load UI preferences (theme, autoSpeak, last deck)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          autoSpeak?: boolean;
          darkMode?: boolean;
          activeDeckId?: string;
        };
        if (typeof parsed.autoSpeak === "boolean") {
          setAutoSpeak(parsed.autoSpeak);
        }
        if (typeof parsed.darkMode === "boolean") {
          setDarkMode(parsed.darkMode);
          document.documentElement.classList.toggle("dark", parsed.darkMode);
        }
        if (parsed.activeDeckId) {
          setActiveDeckId(parsed.activeDeckId);
        }
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistPrefs = useCallback(
    (next: { autoSpeak?: boolean; darkMode?: boolean; activeDeckId?: string }) => {
      try {
        const current = {
          autoSpeak,
          darkMode,
          activeDeckId,
          ...next,
        };
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(current));
      } catch {
        // ignore
      }
    },
    [autoSpeak, darkMode, activeDeckId]
  );

  // Watch Supabase Auth session if configured
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUser(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user;
        setUser(u ? { id: u.id, email: u.email ?? "" } : null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load decks, cards, and progress whenever auth user changes
  const refreshData = useCallback(async (uid: string | null) => {
    setLoading(true);
    try {
      const snapshot = await loadAppData(uid);
      setDecks(snapshot.decks);
      setCards(snapshot.cards);
      setProgressMap(snapshot.progressMap);
      setStorageMode(snapshot.mode);
      setActiveDeckId((prev) =>
        snapshot.decks.some((d) => d.id === prev)
          ? prev
          : snapshot.decks[0]?.id ?? "sys-topik-1"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(user?.id ?? null);
  }, [user, refreshData]);

  // Enrich active deck cards with bucket state
  const activeDeckCards: CardWithProgress[] = useMemo(() => {
    return cards
      .filter((c) => c.deckId === activeDeckId)
      .map((card) => {
        const prog = progressMap[card.id];
        return {
          ...card,
          bucket: prog?.bucket ?? "new",
          reviewCount: prog?.reviewCount ?? 0,
          lastReviewedAt: prog?.lastReviewedAt ?? null,
        };
      });
  }, [cards, activeDeckId, progressMap]);

  const bucketCounts = useMemo(() => {
    let newCount = 0;
    let fuzzyCount = 0;
    let knownCount = 0;
    for (const c of activeDeckCards) {
      if (c.bucket === "new") newCount++;
      else if (c.bucket === "fuzzy") fuzzyCount++;
      else knownCount++;
    }
    return {
      new: newCount,
      fuzzy: fuzzyCount,
      known: knownCount,
      active: newCount + fuzzyCount,
      all: activeDeckCards.length,
    };
  }, [activeDeckCards]);

  // Build shuffled study queue when deck or filter changes
  const rebuildQueue = useCallback(
    (targetDeckId: string, targetFilter: ReviewFilter) => {
      const matchingIds = cards
        .filter((c) => c.deckId === targetDeckId)
        .filter((c) => {
          const b = progressMap[c.id]?.bucket ?? "new";
          if (targetFilter === "all") return true;
          if (targetFilter === "active") return b === "new" || b === "fuzzy";
          return b === targetFilter;
        })
        .map((c) => c.id);

      setQueue(shuffleArray(matchingIds));
      setIsFlipped(false);
    },
    [cards, progressMap]
  );

  // Trigger queue rebuild when loading finishes, deck switches, or filter changes
  useEffect(() => {
    if (!loading) {
      rebuildQueue(activeDeckId, filter);
    }
    // Intentionally exclude progressMap so rating a single card doesn't reset the live queue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeDeckId, filter, cards.length]);

  const currentCard: CardWithProgress | null = useMemo(() => {
    const id = queue[0];
    if (!id) return null;
    return activeDeckCards.find((c) => c.id === id) ?? null;
  }, [queue, activeDeckCards]);

  // Auto-speak Korean when a new card enters front stage
  useEffect(() => {
    if (
      autoSpeak &&
      currentCard &&
      !isFlipped &&
      !showDeckModal &&
      !showAddModal &&
      !showAuthModal
    ) {
      speakKorean(currentCard.korean);
    }
  }, [
    autoSpeak,
    currentCard?.id,
    isFlipped,
    showDeckModal,
    showAddModal,
    showAuthModal,
    currentCard,
  ]);

  const handleRate = useCallback(
    async (bucket: BucketStatus) => {
      if (!currentCard) return;

      const ratedId = currentCard.id;
      const prevCount = currentCard.reviewCount;

      // Optimistically update local state immediately for zero-latency feel
      const optimistic: CardProgress = {
        cardId: ratedId,
        bucket,
        reviewCount: prevCount + 1,
        lastReviewedAt: new Date().toISOString(),
      };
      setProgressMap((prev) => ({ ...prev, [ratedId]: optimistic }));
      setSessionReviewed((n) => n + 1);
      setIsFlipped(false);

      // Update queue:
      // If rated "new" (生詞), re-insert 3 positions later in this session so it sticks!
      setQueue((prev) => {
        const rest = prev.slice(1);
        if (bucket === "new") {
          const insertAt = Math.min(3, rest.length);
          const next = [...rest];
          next.splice(insertAt, 0, ratedId);
          return next;
        }
        return rest;
      });

      // Persist asynchronously
      try {
        await saveCardReview(user?.id ?? null, ratedId, bucket, prevCount);
      } catch {
        // Keep optimistic UI responsive even if offline
      }
    },
    [currentCard, user]
  );

  // Global keyboard shortcuts for lightning-fast desktop review
  useEffect(() => {
    const modalOpen = showDeckModal || showAddModal || showAuthModal;
    if (modalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!currentCard) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
        }
        return;
      }

      if (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        speakKorean(currentCard.korean);
        return;
      }

      if (e.key.toLowerCase() === "e" && isFlipped && currentCard.exampleKo) {
        e.preventDefault();
        speakKorean(currentCard.exampleKo);
        return;
      }

      if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("new");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("fuzzy");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("known");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    currentCard,
    isFlipped,
    handleRate,
    showDeckModal,
    showAddModal,
    showAuthModal,
  ]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    persistPrefs({ darkMode: next });
  };

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    persistPrefs({ autoSpeak: next });
  };

  const handleSelectDeck = (deckId: string) => {
    setActiveDeckId(deckId);
    persistPrefs({ activeDeckId: deckId });
    setShowDeckModal(false);
  };

  const handleCreateDeck = async (title: string, description: string) => {
    const created = await createCustomDeck(user?.id ?? null, title, description);
    setDecks((prev) => [...prev, created]);
    setActiveDeckId(created.id);
    persistPrefs({ activeDeckId: created.id });
    return created;
  };

  const handleDeleteDeck = async (deckId: string) => {
    await deleteCustomDeck(user?.id ?? null, deckId);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    setCards((prev) => prev.filter((c) => c.deckId !== deckId));
    if (activeDeckId === deckId) {
      const fallback = decks.find((d) => d.id !== deckId)?.id ?? "sys-topik-1";
      setActiveDeckId(fallback);
      persistPrefs({ activeDeckId: fallback });
    }
  };

  const handleResetDeck = async (deckId: string) => {
    const ids = cards.filter((c) => c.deckId === deckId).map((c) => c.id);
    await resetDeckProgress(user?.id ?? null, ids);
    setProgressMap((prev) => {
      const copy = { ...prev };
      for (const id of ids) delete copy[id];
      return copy;
    });
    if (deckId === activeDeckId) {
      setQueue(shuffleArray(ids));
      setIsFlipped(false);
    }
  };

  const handleAddCards = async (
    targetDeckId: string,
    drafts: Array<Omit<VocabCard, "id" | "deckId" | "createdAt">>
  ) => {
    const added = await addCardsToDeck(user?.id ?? null, targetDeckId, drafts);
    setCards((prev) => [...prev, ...added]);
    if (targetDeckId !== activeDeckId) {
      setActiveDeckId(targetDeckId);
      persistPrefs({ activeDeckId: targetDeckId });
    } else {
      setQueue((prev) => [...added.map((c) => c.id), ...prev]);
    }
  };

  const activeDeck = decks.find((d) => d.id === activeDeckId);
  const masteryPct =
    bucketCounts.all > 0
      ? Math.round((bucketCounts.known / bucketCounts.all) * 100)
      : 0;

  const filterTabs: Array<{
    key: ReviewFilter;
    label: string;
    count: number;
  }> = [
    { key: "active", label: "待背", count: bucketCounts.active },
    { key: "new", label: "生詞", count: bucketCounts.new },
    { key: "fuzzy", label: "模糊", count: bucketCounts.fuzzy },
    { key: "known", label: "熟詞", count: bucketCounts.known },
    { key: "all", label: "全部", count: bucketCounts.all },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-6 pt-3 sm:px-6 sm:pt-5">
      {/* Compact Header */}
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowDeckModal(true)}
          className="group flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-left shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-kr text-sm font-extrabold text-white">
            한
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {activeDeck?.title ?? "載入詞庫中..."}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              熟詞率 {masteryPct}% · 今日已刷 {sessionReviewed} 次
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleAutoSpeak}
            title={autoSpeak ? "自動發音：開啟" : "自動發音：關閉"}
            aria-label="切換自動發音"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              autoSpeak
                ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            }`}
          >
            {autoSpeak ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            title="新增單字 / AI 製卡 / 批次匯入"
            className="inline-flex h-10 items-center gap-1 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">加字</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            title={
              storageMode === "cloud"
                ? `雲端同步中 (${user?.email})`
                : "本機模式（點擊登入雲端同步）"
            }
            aria-label="帳號與同步狀態"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              storageMode === "cloud"
                ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {storageMode === "cloud" ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            title="切換深淺色主題"
            aria-label="切換深淺色主題"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Filter Pills + Mastery Bar */}
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1">
            {filterTabs.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-200/70 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                      active
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-white/70 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => rebuildQueue(activeDeckId, filter)}
            title="重新洗牌"
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">洗牌</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${masteryPct}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Stage */}
      <main className="my-auto flex flex-1 flex-col justify-center py-5">
        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            載入韓文詞庫中...
          </div>
        ) : currentCard ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-slate-400 dark:text-slate-500">
              <span>本輪剩餘 {queue.length} 張</span>
              <span>快捷鍵：Space 翻面 · 1/2/3 分桶 · S 發音</span>
            </div>
            <FlashCard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              {bucketCounts.all === 0
                ? "這個詞庫還沒有單字"
                : filter === "active"
                  ? "太強了！目前待背單字全部清空"
                  : "這個分桶目前沒有單字"}
            </h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {bucketCounts.all === 0
                ? "點擊下方按鈕，輸入韓文單字讓 Gemini AI 幫你一鍵製卡，或直接貼上 CSV 匯入。"
                : "你可以抽考全部單字保溫記憶、切換其他詞庫，或馬上加入新單字。"}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {bucketCounts.all > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    rebuildQueue(activeDeckId, "all");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  全部重抽複習
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeckModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <BookOpen className="h-4 w-4" />
                切換詞庫
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                新增 / AI 製卡
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom 3-Button Action Bar */}
      {currentCard && (
        <footer className="sticky bottom-0 pt-2">
          {!isFlipped ? (
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="touch-manipulation flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500 active:scale-[0.99]"
            >
              顯示答案
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-medium">
                Space
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleRate("new")}
                className="touch-manipulation flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-3.5 text-rose-700 transition hover:bg-rose-100 active:scale-95 dark:border-rose-900/80 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                <span className="text-base font-bold">生詞</span>
                <span className="mt-0.5 text-[11px] opacity-75">
                  [1] 稍後重考
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate("fuzzy")}
                className="touch-manipulation flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 py-3.5 text-amber-800 transition hover:bg-amber-100 active:scale-95 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950"
              >
                <span className="text-base font-bold">模糊</span>
                <span className="mt-0.5 text-[11px] opacity-75">
                  [2] 留在待背
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate("known")}
                className="touch-manipulation flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 py-3.5 text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                <span className="text-base font-bold">熟詞</span>
                <span className="mt-0.5 text-[11px] opacity-75">
                  [3] 移出本輪
                </span>
              </button>
            </div>
          )}
        </footer>
      )}

      {/* Modals */}
      {showDeckModal && (
        <DeckModal
          decks={decks}
          cards={cards}
          progressMap={progressMap}
          activeDeckId={activeDeckId}
          onClose={() => setShowDeckModal(false)}
          onSelectDeck={handleSelectDeck}
          onCreateDeck={handleCreateDeck}
          onDeleteDeck={handleDeleteDeck}
          onResetDeck={handleResetDeck}
        />
      )}

      {showAddModal && (
        <AddImportModal
          decks={decks}
          activeDeckId={activeDeckId}
          onClose={() => setShowAddModal(false)}
          onCreateDeck={handleCreateDeck}
          onAddCards={handleAddCards}
        />
      )}

      {showAuthModal && (
        <AuthModal
          user={user}
          isSupabaseReady={isSupabaseConfigured}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
