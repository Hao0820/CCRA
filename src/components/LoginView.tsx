import { LogIn } from 'lucide-react';

interface LoginViewProps {
  loading: boolean;
  error?: string;
  onLineLogin: () => void;
}

export default function LoginView({
  loading,
  error,
  onLineLogin,
}: LoginViewProps) {
  return (
    <main className="min-h-screen px-5 py-8 font-handwriting">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <section className="w-full space-y-6 bg-[#fdf9e9]/95 p-7 text-center sketch-border sketch-shadow">
          <img
            src="/branding/ccra-icon-192.png?v=2"
            alt="CCRA"
            className="mx-auto h-20 w-20 object-contain"
          />

          <div className="space-y-2">
            <p className="font-display text-3xl font-bold tracking-wider text-primary">
              CCRA
            </p>
            <h1 className="font-display text-xl font-bold text-primary">
              信用卡回饋與消費管理
            </h1>
            <p className="text-sm leading-6 text-on-surface-variant">
              使用 LINE 帳號登入後，才能查看並同步你的信用卡與消費資料。
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onLineLogin}
            className="mx-auto flex w-full items-center justify-center gap-2 bg-[#06c755] px-5 py-3 text-base font-bold text-white sketch-border-sm sketch-shadow transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn size={20} />
            {loading ? '正在確認登入狀態...' : '使用 LINE 登入'}
          </button>

          {error && (
            <p className="border-t border-dashed border-[#ba1a1a]/40 pt-4 text-sm font-bold text-[#ba1a1a]">
              {error}
            </p>
          )}

          <p className="text-[11px] leading-5 text-outline">
            登入即代表同意將信用卡與消費紀錄安全儲存在 CCRA 雲端。
          </p>
        </section>
      </div>
    </main>
  );
}
