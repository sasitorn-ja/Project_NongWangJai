import { finishLogin } from "../../_shared/auth.js";

export async function GET(request: Request) {
  try {
    return await finishLogin(request);
  } catch (error) {
    console.error("SSO callback failed", error);
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/api\/auth\/callback\/rmc-sso$/, "") || "/";
    url.search = "?authError=callback_failed";
    url.hash = "";
    return Response.redirect(url.toString(), 302);
  }
}
