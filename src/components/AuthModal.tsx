"use client";

import { useState } from "react";
import { Cloud, HardDrive, LogOut, Mail, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type { StorageUser } from "@/types/vocab";

interface AuthModalProps {
  user: StorageUser | null;
  isSupabaseReady: boolean;
  onClose: () => void;
}

export function AuthModal({
  user,
  isSupabaseReady,
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        onClose();
      } else {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
        setMessage(
          "註冊成功！如果 Supabase 有開啟信箱驗證，請先點擊驗證信再登入。"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "驗證失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {user ? (
              <Cloud className="h-5 w-5 text-emerald-500" />
            ) : (
              <HardDrive className="h-5 w-5 text-indigo-500" />
            )}
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              跨裝置雲端同步
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

        <div className="p-5">
          {!isSupabaseReady ? (
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200">
                <p className="font-bold">目前為「本機體驗模式」</p>
                <p className="mt-1">
                  你的刷詞進度與自建詞庫會安全存在這台裝置的瀏覽器內。要開啟電腦／手機跨裝置雲端同步，請在專案根目錄建立{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    .env.local
                  </code>{" "}
                  並填入 Supabase 金鑰，再執行{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    supabase/schema.sql
                  </code>
                  。
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                了解，先用本機模式刷詞
              </button>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/40">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  已登入 · 雲端同步開啟中
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  所有生詞／模糊／熟詞分桶與自建詞庫都會即時同步到你的其他裝置。
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                登出帳號
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-lg py-1.5 text-xs font-semibold ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  登入
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-lg py-1.5 text-xs font-semibold ${
                    mode === "signup"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  註冊新帳號
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {message}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  密碼（至少 6 碼）
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting
                  ? "處理中..."
                  : mode === "signin"
                    ? "登入並同步雲端資料"
                    : "註冊小圈子帳號"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
