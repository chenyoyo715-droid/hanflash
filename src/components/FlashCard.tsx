"use client";

import { Lightbulb, RotateCw, Volume2 } from "lucide-react";
import { speakKorean } from "@/lib/tts";
import type { BucketStatus, CardWithProgress } from "@/types/vocab";

interface FlashCardProps {
  card: CardWithProgress;
  isFlipped: boolean;
  onFlip: () => void;
}

const BUCKET_META: Record<
  BucketStatus,
  { label: string; className: string }
> = {
  new: {
    label: "生詞",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-900",
  },
  fuzzy: {
    label: "模糊",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  },
  known: {
    label: "熟詞",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  },
};

export function FlashCard({ card, isFlipped, onFlip }: FlashCardProps) {
  const bucketStyle = BUCKET_META[card.bucket];
  const charLen = card.korean.trim().length;
  const isSentence = charLen > 9 || /[.?!]$/.test(card.korean.trim());
  const wordSizeClass =
    charLen <= 6
      ? "text-5xl sm:text-6xl"
      : charLen <= 12
        ? "text-3xl sm:text-4xl leading-snug"
        : "text-2xl sm:text-3xl leading-snug";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isFlipped) onFlip();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isFlipped) {
          e.preventDefault();
          onFlip();
        }
      }}
      className={`touch-manipulation relative flex w-full flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all duration-200 dark:bg-slate-900 sm:p-8 ${
        isFlipped
          ? "border-slate-200 dark:border-slate-800 cursor-default"
          : "border-slate-200/90 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-700 cursor-pointer"
      }`}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${bucketStyle.className}`}
        >
          {bucketStyle.label}
        </span>

        <div className="flex items-center gap-2">
          {card.partOfSpeech && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {card.partOfSpeech}
            </span>
          )}
          <button
            type="button"
            aria-label="朗讀韓文單字"
            onClick={(e) => {
              e.stopPropagation();
              speakKorean(card.korean);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 active:scale-95 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/70"
            title="朗讀單字 (快捷鍵 S)"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Korean word or sentence */}
      <div
        className={`flex flex-col items-center text-center transition-all ${
          isFlipped ? "py-5" : "py-14 sm:py-20"
        }`}
      >
        <h1
          className={`font-kr font-extrabold tracking-tight text-slate-900 dark:text-white ${wordSizeClass}`}
        >
          {card.korean}
        </h1>

        {isFlipped && (card.pronunciation || card.hanja) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {card.pronunciation && (
              <span className="font-kr inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                實際讀音 {card.pronunciation}
              </span>
            )}
            {card.hanja && (
              <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                漢字詞：{card.hanja}
              </span>
            )}
          </div>
        )}

        {!isFlipped && (
          <p className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
            <RotateCw className="h-3.5 w-3.5" />
            點擊卡片或按 Space 查看釋義
          </p>
        )}
      </div>

      {/* Answer Section */}
      {isFlipped && (
        <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
          {/* Meaning */}
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
              {card.meaning}
            </p>
          </div>

          {/* Example sentence or dialogue follow-up */}
          {card.exampleKo && (
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {isSentence ? "常見回應 / 對話延伸" : "語境例句"}
                  </p>
                  <p className="font-kr text-base font-medium leading-relaxed text-slate-800 dark:text-slate-100 sm:text-lg">
                    {card.exampleKo}
                  </p>
                  {card.exampleZh && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {card.exampleZh}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="朗讀例句"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakKorean(card.exampleKo ?? "");
                  }}
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-indigo-600 active:scale-95 dark:bg-slate-700 dark:text-slate-200 dark:hover:text-indigo-300"
                  title="朗讀例句 (快捷鍵 E)"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mnemonic */}
          {card.mnemonic && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <p className="leading-relaxed">{card.mnemonic}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
