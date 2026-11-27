"use client";

import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { parseBatchInput, type CardDraft } from "@/lib/csvParser";
import type { Deck, EnrichedKoreanWord, VocabCard } from "@/types/vocab";

interface AddImportModalProps {
  decks: Deck[];
  activeDeckId: string;
  onClose: () => void;
  onCreateDeck: (title: string, description: string) => Promise<Deck>;
  onAddCards: (
    deckId: string,
    drafts: Array<Omit<VocabCard, "id" | "deckId" | "createdAt">>
  ) => Promise<void>;
}

export function AddImportModal({
  decks,
  activeDeckId,
  onClose,
  onCreateDeck,
  onAddCards,
}: AddImportModalProps) {
  const customDecks = useMemo(
    () => decks.filter((d) => !d.isSystem),
    [decks]
  );

  const initialDeckId = useMemo(() => {
    const activeIsCustom = customDecks.some((d) => d.id === activeDeckId);
    if (activeIsCustom) return activeDeckId;
    return customDecks[0]?.id ?? "__new_default__";
  }, [customDecks, activeDeckId]);

  const [targetDeckId, setTargetDeckId] = useState<string>(initialDeckId);
  const [tab, setTab] = useState<"single" | "batch">("single");

  // Single card form state
  const [korean, setKorean] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [hanja, setHanja] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [exampleKo, setExampleKo] = useState("");
  const [exampleZh, setExampleZh] = useState("");
  const [mnemonic, setMnemonic] = useState("");

  // Batch import state
  const [batchRaw, setBatchRaw] = useState("");
  const [enrichedBatch, setEnrichedBatch] = useState<CardDraft[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const parsedBatch = useMemo(() => parseBatchInput(batchRaw), [batchRaw]);

  const resolveWritableDeckId = async (): Promise<string> => {
    if (targetDeckId !== "__new_default__") {
      return targetDeckId;
    }
    const created = await onCreateDeck("我的韓文生詞本", "手動新增與 AI 補全的個人單字");
    setTargetDeckId(created.id);
    return created.id;
  };

  const callAiEnrich = async (words: string[]): Promise<EnrichedKoreanWord[]> => {
    const res = await fetch("/api/ai/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
    });
    const data = (await res.json()) as {
      items?: EnrichedKoreanWord[];
      error?: string;
    };
    if (!res.ok || !data.items) {
      throw new Error(data.error || "AI 補全失敗");
    }
    return data.items;
  };

  const handleSingleAiEnrich = async () => {
    if (!korean.trim()) {
      setError("請先輸入韓文單字，再按 AI 補全");
      return;
    }
    setError(null);
    setNotice(null);
    setAiLoading(true);
    try {
      const items = await callAiEnrich([korean.trim()]);
      const first = items[0];
      if (first) {
        setKorean(first.korean || korean.trim());
        setMeaning(first.meaning || "");
        setPronunciation(first.pronunciation || "");
        setHanja(first.hanja || "");
        setPartOfSpeech(first.partOfSpeech || "");
        setExampleKo(first.exampleKo || "");
        setExampleZh(first.exampleZh || "");
        setMnemonic(first.mnemonic || "");
        setNotice("AI 已補全欄位！確認沒問題即可儲存。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 補全失敗");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!korean.trim() || !meaning.trim()) {
      setError("至少需要填寫「韓文單字」與「中文釋義」");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const deckId = await resolveWritableDeckId();
      await onAddCards(deckId, [
        {
          korean,
          meaning,
          pronunciation: pronunciation || undefined,
          hanja: hanja || undefined,
          partOfSpeech: partOfSpeech || undefined,
          exampleKo: exampleKo || undefined,
          exampleZh: exampleZh || undefined,
          mnemonic: mnemonic || undefined,
        },
      ]);
      // Reset fields for quick consecutive additions
      setKorean("");
      setMeaning("");
      setPronunciation("");
      setHanja("");
      setPartOfSpeech("");
      setExampleKo("");
      setExampleZh("");
      setMnemonic("");
      setNotice("已加入詞庫！你可以繼續新增下一個單字。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleBatchAiEnrich = async () => {
    const words = parsedBatch.wordsNeedingAi;
    if (words.length === 0) return;
    setError(null);
    setNotice(null);
    setAiLoading(true);
    try {
      const items = await callAiEnrich(words.slice(0, 20));
      const drafts: CardDraft[] = items.map((item) => ({
        korean: item.korean,
        meaning: item.meaning,
        pronunciation: item.pronunciation || undefined,
        hanja: item.hanja || undefined,
        partOfSpeech: item.partOfSpeech || undefined,
        exampleKo: item.exampleKo || undefined,
        exampleZh: item.exampleZh || undefined,
        mnemonic: item.mnemonic || undefined,
      }));
      setEnrichedBatch(drafts);
      setNotice(
        `AI 已成功補全 ${drafts.length} 個單字！點擊下方「匯入全部卡片」即可完成。`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "批次 AI 補全失敗");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setBatchRaw(text);
      setEnrichedBatch([]);
      setNotice(`已載入檔案：${file.name}`);
    };
    reader.readAsText(file, "utf-8");
  };

  const combinedBatchCards = useMemo(
    () => [...parsedBatch.cards, ...enrichedBatch],
    [parsedBatch.cards, enrichedBatch]
  );

  const handleSaveBatch = async () => {
    if (combinedBatchCards.length === 0) {
      setError("沒有可匯入的卡片。若只貼了韓文單字，請先按「AI 批次補全」。");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const deckId = await resolveWritableDeckId();
      await onAddCards(deckId, combinedBatchCards);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              新增單字 · AI 製卡 · 批次匯入
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

        {/* Target Deck & Tabs */}
        <div className="space-y-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">
              存到詞庫：
            </span>
            <select
              value={targetDeckId}
              onChange={(e) => setTargetDeckId(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {customDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
              <option value="__new_default__">
                + 自動建立「我的韓文生詞本」
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab("single");
                setError(null);
              }}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                tab === "single"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              單字 + AI 一鍵補全
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("batch");
                setError(null);
              }}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                tab === "batch"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              CSV / 純文字批次匯入
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              {notice}
            </div>
          )}

          {tab === "single" ? (
            <form onSubmit={handleSaveSingle} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  韓文單字 *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={korean}
                    onChange={(e) => setKorean(e.target.value)}
                    placeholder="例如：편의점、괜찮다、기억하다"
                    className="font-kr flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-medium outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSingleAiEnrich}
                    disabled={aiLoading || !korean.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI 補全
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  中文釋義 *
                </label>
                <input
                  type="text"
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="例如：便利商店"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    連音／變音
                  </label>
                  <input
                    type="text"
                    value={pronunciation}
                    onChange={(e) => setPronunciation(e.target.value)}
                    placeholder="[펴늬점]"
                    className="font-kr w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    漢字詞
                  </label>
                  <input
                    type="text"
                    value={hanja}
                    onChange={(e) => setHanja(e.target.value)}
                    placeholder="便宜店"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    詞性
                  </label>
                  <input
                    type="text"
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    placeholder="名詞"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  韓文例句
                </label>
                <input
                  type="text"
                  value={exampleKo}
                  onChange={(e) => setExampleKo(e.target.value)}
                  placeholder="집 앞에 편의점이 있어요."
                  className="font-kr w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  例句翻譯
                </label>
                <input
                  type="text"
                  value={exampleZh}
                  onChange={(e) => setExampleZh(e.target.value)}
                  placeholder="我家前面有便利商店。"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  助記提示
                </label>
                <input
                  type="text"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="拆解規則或聯想記憶法"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? "儲存中..." : "加入詞庫"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  支援貼上{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                    韓文,中文,讀音,漢字詞
                  </code>{" "}
                  CSV，或<strong>每行只貼一個韓文單字</strong>交給 AI 批次補全。
                </p>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Upload className="h-3.5 w-3.5" />
                  上傳 CSV
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={6}
                value={batchRaw}
                onChange={(e) => {
                  setBatchRaw(e.target.value);
                  setEnrichedBatch([]);
                }}
                placeholder={`範例 1（純韓文清單，按下方 AI 批次補全）：\n커피숍\n지하철\n약속\n\n範例 2（CSV 直接匯入）：\n도서관,圖書館,,圖書館,名詞,도서관에 가요.,我去圖書館。`}
                className="font-kr w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              {parsedBatch.wordsNeedingAi.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchAiEnrich}
                  disabled={aiLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  偵測到 {parsedBatch.wordsNeedingAi.length} 個純韓文單字 — 用
                  Gemini AI 一鍵補全（單次最多 20 字）
                </button>
              )}

              {combinedBatchCards.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    預覽待匯入卡片（共 {combinedBatchCards.length} 張）
                  </div>
                  <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 text-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
                    {combinedBatchCards.slice(0, 10).map((c, idx) => (
                      <div
                        key={`${c.korean}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="font-kr font-bold text-slate-900 dark:text-white">
                            {c.korean}
                          </span>
                          {c.pronunciation && (
                            <span className="ml-1.5 text-indigo-600 dark:text-indigo-400">
                              {c.pronunciation}
                            </span>
                          )}
                          {c.hanja && (
                            <span className="ml-1.5 text-amber-700 dark:text-amber-400">
                              ({c.hanja})
                            </span>
                          )}
                        </div>
                        <span className="truncate text-slate-600 dark:text-slate-300">
                          {c.meaning}
                        </span>
                      </div>
                    ))}
                    {combinedBatchCards.length > 10 && (
                      <div className="px-3 py-1.5 text-center text-[11px] text-slate-400">
                        ⋯⋯還有 {combinedBatchCards.length - 10} 張卡片
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={saving || combinedBatchCards.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving
                  ? "匯入中..."
                  : `匯入 ${combinedBatchCards.length} 張卡片`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
