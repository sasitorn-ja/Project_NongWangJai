import { type ReactNode, useEffect, useState } from "react";
import logoImage from "@/assets/mascot/nong-wangjai-logo.png";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/base-path";
import { fetchAuthSession } from "./api";
import type { AuthSession } from "./types";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut"; reason?: string }
  | { status: "error"; message: string }
  | { status: "authenticated"; user: AuthSession };

function getAuthErrorMessage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("authError");

  switch (error) {
    case "state_mismatch":
      return "ไม่สามารถยืนยันการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
    case "token_exchange_failed":
      return "ระบบแลก token ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า SSO และลองใหม่";
    case "missing_id_token":
      return "SSO ไม่ส่ง id_token กลับมา กรุณาตรวจสอบการตั้งค่า scope และ claims";
    case "callback_failed":
      return "เกิดข้อผิดพลาดระหว่างรับ callback จาก SSO";
    default:
      return undefined;
  }
}

function buildLoginUrl() {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  return `${apiPath("/auth/login")}?${new URLSearchParams({ returnTo }).toString()}`;
}

function AuthScreen({
  actionHref,
  actionLabel,
  caption,
  title
}: {
  actionHref: string;
  actionLabel: string;
  caption: string;
  title: string;
}) {
  const authErrorMessage = getAuthErrorMessage();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_32%),linear-gradient(180deg,_#fffdf8_0%,_#f7fafc_100%)] px-6 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-orange-100 bg-white/85 p-8 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
              Nong Wang Jai Dashboard
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{caption}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild className="h-12 rounded-full bg-[#f97316] px-7 text-base font-semibold text-white hover:bg-[#ea580c]">
                <a href={actionHref}>{actionLabel}</a>
              </Button>
              <span className="text-sm text-slate-500">ใช้ RMC SSO ผ่าน Microsoft Azure ตามเอกสาร handoff</span>
            </div>
            {authErrorMessage ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {authErrorMessage}
              </div>
            ) : null}
          </section>

          <aside className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-[0_22px_70px_rgba(15,23,42,0.16)]">
            <div className="flex h-full flex-col justify-between gap-8 p-8 md:p-10">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-orange-300">RMC SSO</p>
                <h2 className="text-2xl font-semibold leading-tight">ยืนยันตัวตนก่อนเข้าถึงข้อมูล dealer intelligence</h2>
                <p className="text-sm leading-7 text-slate-300">
                  เมื่อเข้าสู่ระบบสำเร็จ แอปจะสร้าง session ของตัวเองด้วย HTTP-only cookie และค่อยเรียก API ภายในที่ป้องกันไว้
                </p>
              </div>

              <div className="rounded-[28px] bg-white/8 p-6 backdrop-blur">
                <img alt="Nong Wang Jai" className="mx-auto mb-6 h-28 w-auto object-contain" src={logoImage} />
                <div className="grid gap-3 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Authorization Code Flow + PKCE</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Server-side token exchange</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Protected `/api/*` data access</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({
  children
}: {
  children: (session: AuthSession) => ReactNode;
}) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchAuthSession()
      .then((payload) => {
        if (cancelled) return;

        if (!payload.authenticated || !payload.user) {
          setState({
            status: "signedOut",
            reason: window.location.pathname.endsWith("/signed-out") ? "signed-out" : undefined
          });
          return;
        }

        setState({ status: "authenticated", user: payload.user });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to check authentication state";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfcfe] px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          กำลังตรวจสอบ session...
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <AuthScreen
        actionHref={buildLoginUrl()}
        actionLabel="ลองเข้าสู่ระบบอีกครั้ง"
        caption={state.message}
        title="ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ"
      />
    );
  }

  if (state.status === "signedOut") {
    return (
      <AuthScreen
        actionHref={buildLoginUrl()}
        actionLabel="เข้าสู่ระบบด้วย RMC SSO"
        caption={
          state.reason === "signed-out"
            ? "คุณออกจากระบบเรียบร้อยแล้ว หน้า signed-out นี้จะไม่ redirect กลับไปหา SSO อัตโนมัติ"
            : "เข้าสู่ระบบด้วยบัญชีองค์กรเพื่อดูข้อมูล dealer, orders และ insight ภายในแดชบอร์ด"
        }
        title={state.reason === "signed-out" ? "ออกจากระบบเรียบร้อย" : "เข้าสู่ระบบก่อนใช้งานแดชบอร์ด"}
      />
    );
  }

  return <>{children(state.user)}</>;
}
