let cachedKoreanVoice: SpeechSynthesisVoice | null = null;

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return cachedKoreanVoice;

  const koVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("ko")
  );
  if (!koVoices.length) return null;

  // Prefer natural/Google/Apple Korean voices if available
  const preferred =
    koVoices.find((v) => /google|yuna|sora|heami|natural/i.test(v.name)) ??
    koVoices[0];

  cachedKoreanVoice = preferred;
  return preferred;
}

export function isKoreanTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakKorean(text: string, rate = 0.92): void {
  if (!text.trim() || !isKoreanTtsSupported()) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "ko-KR";
    utterance.rate = rate;
    const voice = pickKoreanVoice();
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore browser autoplay / speech errors silently
  }
}
