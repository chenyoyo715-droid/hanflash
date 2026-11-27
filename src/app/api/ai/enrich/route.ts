import { NextResponse } from "next/server";
import type { EnrichedKoreanWord } from "@/types/vocab";

const MAX_WORDS_PER_REQUEST = 20;

interface EnrichRequestBody {
  words?: string[];
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return NextResponse.json(
      {
        error:
          "尚未設定 GEMINI_API_KEY。請在專案根目錄建立 .env.local 並填入 Gemini API Key 後重啟伺服器。",
      },
      { status: 503 }
    );
  }

  let body: EnrichRequestBody;
  try {
    body = (await req.json()) as EnrichRequestBody;
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const words = (body.words ?? [])
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_WORDS_PER_REQUEST);

  if (words.length === 0) {
    return NextResponse.json(
      { error: "請至少輸入一個韓文單字" },
      { status: 400 }
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `你是一位專為台灣繁體中文母語者設計教材的頂尖韓語老師。
請為以下韓文單字清單產生精準、道地的學習卡片資料（全部使用繁體中文解釋）：
${words.map((w, i) => `${i + 1}. ${w}`).join("\n")}

嚴格規則：
1. pronunciation：僅在該詞有連音、鼻音化、濃音化、激音化、流音化、口蓋音化或 ㅎ 脫落等實際讀音與拼字不同時，才填寫方括號實際讀音（例如 "[한구거]"、"[괜찬타]"）。若無發音變化則填空字串 ""。
2. hanja：若為漢字詞請填對應的繁體漢字（例如 "圖書館"、"約束"）；純固有詞或外來語請填空字串 ""。
3. partOfSpeech：填簡短詞性（名詞、動詞、形容詞、副詞、片語、常用語）。
4. meaning：自然簡潔的繁體中文釋義。
5. exampleKo：一句自然、實用且簡短的現代韓語例句（優先使用해요體）。
6. exampleZh：該例句的道地繁體中文翻譯。
7. mnemonic：一句超好記的記憶提示（說明音變規則、漢字聯想或語境拆解）。`;

  try {
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
      const errText = await response.text();
      return NextResponse.json(
        {
          error: `Gemini API 呼叫失敗 (${response.status})`,
          detail: errText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "Gemini 回傳內容為空，請稍後再試" },
        { status: 502 }
      );
    }

    const items = JSON.parse(rawText) as EnrichedKoreanWord[];
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `AI 補全過程發生錯誤：${message}` },
      { status: 500 }
    );
  }
}
