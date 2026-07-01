import { type ReactNode, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import bannerMascotImage from "@/assets/mascot/banner-mascot-cut.png";
import mascotImage from "@/assets/mascot/nong-wangjai.png";
import logoImage from "@/assets/mascot/nong-wangjai-logo.png";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/base-path";
import { withBasePath } from "@/lib/base-path";
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
  const showError = Boolean(authErrorMessage);
  const showMessage = Boolean(caption);

  return (
    <div className="login-screen relative min-h-screen overflow-hidden px-4 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="login-screen__orb login-screen__orb--left" />
      <div className="login-screen__orb login-screen__orb--right" />
      <div className="login-screen__glow login-screen__glow--left" />
      <div className="login-screen__glow login-screen__glow--right" />
      <img
        alt=""
        aria-hidden="true"
        className="login-screen__banner pointer-events-none absolute inset-x-0 top-0 hidden w-full max-w-none opacity-80 lg:block"
        src={bannerMascotImage}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1240px] items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full items-start gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-6 xl:gap-8">
          <section className="relative order-1 mx-auto w-full max-w-[580px] rounded-[28px] border border-white/75 bg-white/58 p-5 shadow-[0_24px_70px_rgba(75,123,196,0.18)] backdrop-blur-[22px] sm:rounded-[40px] sm:p-8 md:p-10 lg:mx-0">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/72 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#146bcb] shadow-[0_10px_30px_rgba(129,177,233,0.18)] sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.28em]">
              <img alt="Nong Wang Jai" className="h-8 w-8 rounded-full bg-white object-contain p-1" src={logoImage} />
              Nong Wang Jai
            </div>

            <div className="mt-6 space-y-3 sm:mt-10 sm:space-y-4">
              {title ? (
                <h1 className="max-w-md text-[2.35rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#16336c] sm:text-[3rem] md:text-[3.6rem] xl:text-[3.85rem]">
                  {title}
                </h1>
              ) : null}
              {showMessage ? (
                <p className="max-w-[30rem] text-[1.02rem] leading-7 text-[#7187ad] sm:text-[1.2rem] sm:leading-8 md:text-[1.18rem] md:leading-8 xl:text-[1.28rem]">
                  {caption}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex items-center gap-3 text-[#80a5dc] sm:mt-10 sm:gap-5">
              <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(157,189,234,0.6),rgba(157,189,234,0.18))]" />
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d5e6ff] bg-white/80 text-[#2f8dff] shadow-[0_8px_24px_rgba(114,162,226,0.18)] sm:h-10 sm:w-10">
                <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(157,189,234,0.18),rgba(157,189,234,0.6))]" />
            </div>

            <div className="mt-6 sm:mt-9">
              <Button
                asChild
                className="h-[78px] w-full rounded-[24px] bg-[linear-gradient(135deg,#1558e6_0%,#1f7ff1_48%,#39a3ff_100%)] px-4 text-base font-semibold text-white shadow-[0_26px_48px_rgba(41,119,240,0.32)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_34px_56px_rgba(41,119,240,0.34)] sm:h-[92px] sm:rounded-[28px] sm:px-6 sm:text-lg md:h-[92px] md:rounded-[30px] md:px-6 md:text-[1.1rem] xl:h-[98px] xl:rounded-[32px] xl:px-7 xl:text-[1.18rem]"
              >
                <a className="flex w-full items-center justify-between gap-4" href={actionHref}>
                  <span className="flex items-center gap-3 sm:gap-4 md:gap-5">
                    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_10px_24px_rgba(10,57,142,0.18)] sm:h-14 sm:w-14 md:h-14 md:w-14 xl:h-16 xl:w-16">
                      <img alt="SCG" className="h-8 w-8 object-contain sm:h-9 sm:w-9 md:h-9 md:w-9 xl:h-10 xl:w-10" src={withBasePath("/scg-logo.jpg")} />
                    </span>
                    <span className="text-left text-[1rem] font-semibold tracking-[-0.02em] sm:text-[1.1rem] md:text-[1.2rem] xl:text-[1.32rem]">
                      {actionLabel}
                    </span>
                  </span>
                  <ArrowRight className="h-6 w-6 shrink-0 text-white/92 sm:h-7 sm:w-7 md:h-7 md:w-7 xl:h-8 xl:w-8" strokeWidth={2.4} />
                </a>
              </Button>
            </div>

            {showError ? (
              <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
                {authErrorMessage}
              </div>
            ) : null}

            {!showError ? (
              <div className="mt-6 rounded-[22px] border border-[#dceaff] bg-white/46 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:mt-10 sm:rounded-[28px] sm:px-5 sm:py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f2ff] text-[#2486f2] sm:h-12 sm:w-12">
                    <LockKeyhole className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#1e67d5] sm:text-[1.12rem]">ระบบล็อกอินแบบ Single Sign-On (SSO)</p>
                    <p className="mt-1 text-sm leading-6 text-[#7a90b3] sm:text-base sm:leading-7">ปลอดภัยด้วยมาตรฐานความปลอดภัยระดับองค์กร</p>
                  </div>
                </div>
              </div>
            ) : null}

          </section>

          <aside className="relative order-2 hidden min-h-[640px] items-center justify-center overflow-hidden lg:flex xl:min-h-[700px]">
            <div className="login-mascot-stage">
              <div className="login-mascot-stage__halo" />
              <div className="login-mascot-stage__ring login-mascot-stage__ring--outer" />
              <div className="login-mascot-stage__ring login-mascot-stage__ring--inner" />
              <div className="login-mascot-stage__sphere login-mascot-stage__sphere--one" />
              <div className="login-mascot-stage__sphere login-mascot-stage__sphere--two" />
              <div className="login-mascot-stage__sphere login-mascot-stage__sphere--three" />
              <div className="login-mascot-stage__waterline" />
              <img alt="Nong Wang Jai mascot" className="login-mascot-stage__figure" src={mascotImage} />
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
      <div className="login-screen flex min-h-screen items-center justify-center px-6">
        <div className="rounded-[28px] border border-white/70 bg-white/85 px-6 py-5 text-sm font-medium text-slate-600 shadow-[0_20px_60px_rgba(7,20,43,0.12)] backdrop-blur">
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
        actionLabel="พนักงาน SCG เข้าสู่ระบบ"
        caption={state.reason === "signed-out" ? "คุณออกจากระบบเรียบร้อยแล้ว" : "เข้าสู่ระบบเพื่อใช้งานระบบ NONG WANG JAI"}
        title={state.reason === "signed-out" ? "See you again" : "Welcome back"}
      />
    );
  }

  return <>{children(state.user)}</>;
}
