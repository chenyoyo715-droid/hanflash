import type { EnrichedKoreanWord } from "@/types/vocab";

const LOCAL_GEMINI_KEY_STORAGE = "hanflash:gemini-key:v1";

export const isStaticExportMode =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

export function getSavedBrowserGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOCAL_GEMINI_KEY_STORAGE) ?? "";
}

export function saveBrowserGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    window.localStorage.setItem(LOCAL_GEMINI_KEY_STORAGE, trimmed);
  } else {
    window.localStorage.removeItem(LOCAL_GEMINI_KEY_STORAGE);
  }
}

export async function requestAiEnrich(
  words: string[],
  browserApiKey?: string
): Promise<EnrichedKoreanWord[]> {
  const cleaned = words
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (cleaned.length === 0) {
    throw new Error("請至少輸入一個韓文單字");
  }

  // Server-backed mode (local dev / Vercel): use protected Next.js API route
  if (!isStaticExportMode) {
    const res = await fetch("/api/ai/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: cleaned }),
    });
    const data = (await res.json()) as {
      items?: EnrichedKoreanWord[];
      error?: string;
    };
    if (!res.ok || !data.items) {
      throw new Error(data.error || "AI 補全失敗");
    }
    return data.items;
  }

  // Static GitHub Pages mode: call Gemini directly using user's browser-stored BYOK key
  const apiKey = (browserApiKey ?? getSavedBrowserGeminiKey()).trim();
  if (!apiKey) {
    throw new Error(
      "目前為 GitHub Pages 靜態版本，請先在上方填入你的 Gemini API Key（僅存於本機瀏覽器，不會上傳）即可啟用 AI 一鍵補全。"
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const prompt = `你是一位專為台灣繁體中文母語者設計教材的頂尖韓語老師。
請為以下韓文單字清單產生精準、道地的學習卡片資料（全部使用繁體中文解釋）：
${cleaned.map((w, i) => `${i + 1}. ${w}`).join("\n")}

嚴格規則：
1. pronunciation：僅在有連音、鼻音化、濃音化、激音化、流音化、口蓋音化或 ㅎ 脫落等實際讀音與拼字不同時，填方括號實際讀音（如 "[한구거]"）；無音變填空字串 ""。
2. hanja：漢字詞請填對應繁體漢字（如 "圖書館"）；純固有詞或外來語填空字串 ""。
3. partOfSpeech：名詞、動詞、形容詞、副詞、片語或常用語。
4. meaning：自然簡潔的繁體中文釋義。
5. exampleKo：一句自然實用的現代韓語例句（優先해요體）。
6. exampleZh：該例句的繁體中文翻譯。
7. mnemonic：一句簡短實用的記憶提示。`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              korean: { type: "STRING" },
              pronunciation: { type: "STRING" },
              hanja: { type: "STRING" },
              partOfSpeech: { type: "STRING" },
              meaning: { type: "STRING" },
              exampleKo: { type: "STRING" },
              exampleZh: { type: "STRING" },
              mnemonic: { type: "STRING" },
            },
            required: [
              "korean",
              "pronunciation",
              "hanja",
              "partOfSpeech",
              "meaning",
              "exampleKo",
              "exampleZh",
              "mnemonic",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API 呼叫失敗 (${response.status})，請確認 API Key 是否正確。`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini 回傳內容為空，請稍後再試");
  }

  return JSON.parse(rawText) as EnrichedKoreanWord[];
}
