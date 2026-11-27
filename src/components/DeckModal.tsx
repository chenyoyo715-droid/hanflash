"use client";

import { useState } from "react";
import {
  BookMarked,
  Check,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { CardProgress, Deck, VocabCard } from "@/types/vocab";

interface DeckModalProps {
  decks: Deck[];
  cards: VocabCard[];
  progressMap: Record<string, CardProgress>;
  activeDeckId: string;
  onClose: () => void;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (title: string, description: string) => Promise<Deck>;
  onDeleteDeck: (deckId: string) => Promise<void>;
  onResetDeck: (deckId: string) => Promise<void>;
}

export function DeckModal({
  decks,
  cards,
  progressMap,
  activeDeckId,
  onClose,
  onSelectDeck,
  onCreateDeck,
  onDeleteDeck,
  onResetDeck,
}: DeckModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await onCreateDeck(title.trim(), description.trim());
      setTitle("");
      setDescription("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              切換與管理詞庫
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {decks.map((deck) => {
            const deckCards = cards.filter((c) => c.deckId === deck.id);
            const known = deckCards.filter(
              (c) => progressMap[c.id]?.bucket === "known"
            ).length;
            const fuzzy = deckCards.filter(
              (c) => progressMap[c.id]?.bucket === "fuzzy"
            ).length;
            const fresh = deckCards.length - known - fuzzy;
            const isActive = deck.id === activeDeckId;

            return (
              <div
                key={deck.id}
                className={`rounded-2xl border p-4 transition ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDeck(deck.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-slate-900 dark:text-white">
                        {deck.title}
                      </span>
                      {deck.isSystem ? (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          系統內建
                        </span>
                      ) : (
                        <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          自建
                        </span>
                      )}
                      {isActive && (
                        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    {deck.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {deck.description}
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        共 {deckCards.length} 張
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        生詞 {fresh}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        模糊 {fuzzy}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        熟詞 {known}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {deckCards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `確定要重置「${deck.title}」的學習紀錄嗎？（單字不會刪除）`
                            )
                          ) {
                            onResetDeck(deck.id);
                          }
                        }}
                        title="重置此詞庫進度"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    {!deck.isSystem && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `確定要刪除自建詞庫「${deck.title}」與其中的所有單字嗎？`
                            )
                          ) {
                            onDeleteDeck(deck.id);
                          }
                        }}
                        title="刪除自建詞庫"
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create new custom deck */}
        <form
          onSubmit={handleCreate}
          className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            建立個人自建詞庫
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="詞庫名稱（例：韓劇生詞、TOPIK II）"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              建立
            </button>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="簡短備註（選填）"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </form>
      </div>
    </div>
  );
}
