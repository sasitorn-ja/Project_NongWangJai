import { Buffer } from "node:buffer";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import process from "node:process";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

type SessionPayload = {
  email: string;
  exp: number;
  iat: number;
  sub: string;
  user: string;
};

type LoginFlowPayload = {
  returnTo: string;
  state: string;
  verifier: string;
};

type VerifiedIdentity = {
  email: string;
  sub: string;
  user: string;
};

const APP_SESSION_COOKIE = "nong_wang_jai_session";
const LOGIN_FLOW_COOKIE = "nong_wang_jai_login_flow";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const FLOW_TTL_SECONDS = 60 * 10;
const CALLBACK_PATH = "/api/auth/callback/rmc-sso";

function cleanEnv(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1).replace(/\\\$/g, "$");
  }

  return trimmed.replace(/\\\$/g, "$");
}

function encodeBase64Url(value: string | Uint8Array) {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function sign(value: string, secret: string) {
  return encodeBase64Url(createHmac("sha256", secret).update(value).digest());
}

function createSignedValue(payload: unknown, secret: string) {
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

function readSignedValue<T>(value: string | undefined, secret: string): T | null {
  if (!value) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    return JSON.parse(decodeBase64Url(body).toString("utf8")) as T;
  } catch {
    return null;
  }
}

function randomBase64Url(size = 32) {
  return encodeBase64Url(randomBytes(size));
}

function sha256Base64Url(value: string) {
  return encodeBase64Url(createHash("sha256").update(value).digest());
}

function parseCookies(request: Request) {
  const source = request.headers.get("cookie") ?? "";
  const cookies = new Map<string, string>();

  for (const part of source.split(/;\s*/)) {
    if (!part) continue;
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    cookies.set(part.slice(0, separator), decodeURIComponent(part.slice(separator + 1)));
  }

  return cookies;
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path ?? "/"}`);

  if (typeof options.maxAge === "number") {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  segments.push(`SameSite=${options.sameSite ?? "Lax"}`);

  return segments.join("; ");
}

function appendCookie(headers: Headers, cookie: string) {
  headers.append("set-cookie", cookie);
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const protocol = forwardedProto || url.protocol.replace(/:$/, "");
  const host = forwardedHost || request.headers.get("host") || url.host;
  return `${protocol}://${host}`;
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function inferUiBaseUrlFromRedirectUri(redirectUri: string) {
  if (!redirectUri) return "";

  try {
    const url = new URL(redirectUri);
    url.pathname = url.pathname.replace(/\/api\/auth\/callback\/rmc-sso$/, "") || "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "") || `${url.origin}/`;
  } catch {
    return "";
  }
}

function resolveUiBaseUrl(request: Request, configuredBaseUrl: string, redirectUri: string) {
  const baseUrl = configuredBaseUrl && configuredBaseUrl !== "-" ? configuredBaseUrl : inferUiBaseUrlFromRedirectUri(redirectUri);
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  return requestOrigin(request);
}

function resolveCookiePath(uiBaseUrl: string) {
  try {
    const pathname = new URL(uiBaseUrl).pathname.replace(/\/+$/, "") || "/";
    return pathname === "/" ? "/" : pathname;
  } catch {
    return "/";
  }
}

function resolveRedirectUri(request: Request, configuredRedirectUri: string) {
  if (configuredRedirectUri && configuredRedirectUri !== "-") return configuredRedirectUri;
  return `${requestOrigin(request)}${CALLBACK_PATH}`;
}

function getRequiredEnv(name: string) {
  const value = cleanEnv(process.env[name]);
  if (!value || value === "-") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAuthConfig(request: Request) {
  const origin = requestOrigin(request);
  const isLocal = isLocalOrigin(origin);
  const devUiBaseUrl = cleanEnv(process.env.DEV_UI_BASE_URL);
  const prodUiBaseUrl = cleanEnv(process.env.PROD_UI_BASE_URL);
  const configuredUiBaseUrl = isLocal ? devUiBaseUrl || prodUiBaseUrl : prodUiBaseUrl || devUiBaseUrl;
  const configuredRedirectUri = cleanEnv(process.env.SSO_REDIRECT_URI);
  const devRedirectUri = cleanEnv(process.env.DEV_SSO_REDIRECT_URI);
  const prodRedirectUri = cleanEnv(process.env.PROD_SSO_REDIRECT_URI);
  const configuredPostLogoutRedirectUri = cleanEnv(process.env.SSO_POST_LOGOUT_REDIRECT_URI);
  const devPostLogoutRedirectUri = cleanEnv(process.env.DEV_SSO_POST_LOGOUT_REDIRECT_URI);
  const prodPostLogoutRedirectUri = cleanEnv(process.env.PROD_SSO_POST_LOGOUT_REDIRECT_URI);
  const redirectUri = resolveRedirectUri(
    request,
    isLocal ? devRedirectUri || configuredRedirectUri : prodRedirectUri || configuredRedirectUri
  );
  const postLogoutRedirectUri =
    (isLocal ? devPostLogoutRedirectUri || configuredPostLogoutRedirectUri : prodPostLogoutRedirectUri || configuredPostLogoutRedirectUri) ||
    `${resolveUiBaseUrl(request, configuredUiBaseUrl, redirectUri)}/signed-out`;

  return {
    appSessionSecret: getRequiredEnv("APP_SESSION_SECRET"),
    authorizeUrl:
      cleanEnv(process.env.SSO_AUTHORIZE_URL) || `${getRequiredEnv("SSO_ISSUER")}/api/auth/oauth2/authorize`,
    clientId: getRequiredEnv("SSO_CLIENT_ID"),
    clientSecret: getRequiredEnv("SSO_CLIENT_SECRET"),
    endSessionUrl:
      cleanEnv(process.env.SSO_END_SESSION_URL) || `${getRequiredEnv("SSO_ISSUER")}/api/auth/oauth2/endsession`,
    issuer: getRequiredEnv("SSO_ISSUER"),
    cookiePath: resolveCookiePath(resolveUiBaseUrl(request, configuredUiBaseUrl, redirectUri)),
    postLogoutRedirectUri,
    redirectUri,
    scope: cleanEnv(process.env.SSO_SCOPE) || "openid profile email offline_access",
    tokenUrl: cleanEnv(process.env.SSO_TOKEN_URL) || `${getRequiredEnv("SSO_ISSUER")}/api/auth/oauth2/token`,
    uiBaseUrl: resolveUiBaseUrl(request, configuredUiBaseUrl, redirectUri),
    userInfoUrl:
      cleanEnv(process.env.SSO_USERINFO_URL) || `${getRequiredEnv("SSO_ISSUER")}/api/auth/oauth2/userinfo`
  };
}

function isSecureRequest(request: Request) {
  const url = new URL(request.url);
  return request.headers.get("x-forwarded-proto") === "https" || url.protocol === "https:";
}

function normalizeReturnTo(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo")?.trim();
  const config = getAuthConfig(request);

  if (!returnTo) return config.uiBaseUrl;

  try {
    const candidate = new URL(returnTo, config.uiBaseUrl);
    const expectedOrigin = new URL(config.uiBaseUrl).origin;
    if (candidate.origin !== expectedOrigin) return config.uiBaseUrl;
    return candidate.toString();
  } catch {
    return config.uiBaseUrl;
  }
}

async function verifyIdToken(request: Request, idToken: string) {
  const config = getAuthConfig(request);
  const { alg } = decodeProtectedHeader(idToken);

  if (!alg) {
    throw new Error("Missing JWT algorithm");
  }

  const validateIssuer = (payload: { iss?: unknown; sub?: unknown }) => {
    if (typeof payload.iss === "undefined") {
      console.warn("SSO id_token is missing iss claim; accepting token after signature/audience/expiry validation", {
        expectedIssuer: config.issuer,
        sub: typeof payload.sub === "string" ? payload.sub : undefined
      });
      return;
    }

    if (typeof payload.iss !== "string" || payload.iss !== config.issuer) {
      throw new Error(`Unexpected iss claim: expected ${config.issuer}`);
    }
  };

  if (alg === "HS256") {
    const result = await jwtVerify(idToken, new TextEncoder().encode(config.clientSecret), {
      algorithms: ["HS256"],
      audience: config.clientId
    });
    validateIssuer(result.payload);
    return result.payload;
  }

  const discoveryUrl = `${config.issuer}/api/auth/.well-known/openid-configuration`;
  const discovery = await fetch(discoveryUrl, {
    headers: { accept: "application/json" }
  });

  if (!discovery.ok) {
    throw new Error(`OIDC discovery failed with status ${discovery.status}`);
  }

  const metadata = (await discovery.json()) as { jwks_uri?: string };
  if (!metadata.jwks_uri) {
    throw new Error("OIDC discovery did not include jwks_uri");
  }

  const result = await jwtVerify(idToken, createRemoteJWKSet(new URL(metadata.jwks_uri)), {
    audience: config.clientId
  });
  validateIssuer(result.payload);

  return result.payload;
}

async function resolveIdentity(request: Request, idToken: string, accessToken?: string) {
  const claims = await verifyIdToken(request, idToken);
  const email = typeof claims.EMAIL === "string" ? claims.EMAIL : typeof claims.email === "string" ? claims.email : "";
  const user = typeof claims.USER === "string" ? claims.USER : "";
  const sub = typeof claims.sub === "string" ? claims.sub : user || email;

  if (email && user && sub) {
    return { email, sub, user } satisfies VerifiedIdentity;
  }

  if (!accessToken) {
    throw new Error("ID token is missing required user claims");
  }

  const config = getAuthConfig(request);
  const response = await fetch(config.userInfoUrl, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`UserInfo request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const resolvedEmail =
    email ||
    (typeof payload.EMAIL === "string" ? payload.EMAIL : typeof payload.email === "string" ? payload.email : "");
  const resolvedUser = user || (typeof payload.USER === "string" ? payload.USER : "");
  const resolvedSub = sub || (typeof payload.sub === "string" ? payload.sub : resolvedUser || resolvedEmail);

  if (!resolvedEmail || !resolvedUser || !resolvedSub) {
    throw new Error("Authenticated user info is missing EMAIL or USER claims");
  }

  return { email: resolvedEmail, sub: resolvedSub, user: resolvedUser } satisfies VerifiedIdentity;
}

function sessionCookieOptions(request: Request, maxAge = SESSION_TTL_SECONDS): CookieOptions {
  const config = getAuthConfig(request);
  return {
    httpOnly: true,
    maxAge,
    path: config.cookiePath,
    sameSite: "Lax",
    secure: isSecureRequest(request)
  };
}

function clearCookieOptions(request: Request): CookieOptions {
  return sessionCookieOptions(request, 0);
}

function getSessionPayload(request: Request) {
  const config = getAuthConfig(request);
  const cookies = parseCookies(request);
  const payload = readSignedValue<SessionPayload>(cookies.get(APP_SESSION_COOKIE), config.appSessionSecret);

  if (!payload) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
  if (!payload.email || !payload.user || !payload.sub) return null;

  return payload;
}

export function getAuthSession(request: Request) {
  const payload = getSessionPayload(request);
  if (!payload) return null;

  return {
    email: payload.email,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    sub: payload.sub,
    user: payload.user
  };
}

export function requireAuth(request: Request) {
  const session = getAuthSession(request);

  if (!session) {
    return Response.json(
      {
        error: "Authentication required",
        loginUrl: "/api/auth/login"
      },
      { status: 401 }
    );
  }

  return session;
}

export function startLogin(request: Request) {
  const config = getAuthConfig(request);
  const state = randomBase64Url();
  const verifier = randomBase64Url(48);
  const challenge = sha256Base64Url(verifier);
  const redirectUrl = new URL(config.authorizeUrl);

  redirectUrl.searchParams.set("client_id", config.clientId);
  redirectUrl.searchParams.set("redirect_uri", config.redirectUri);
  redirectUrl.searchParams.set("response_type", "code");
  redirectUrl.searchParams.set("scope", config.scope);
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("code_challenge", challenge);
  redirectUrl.searchParams.set("code_challenge_method", "S256");

  const headers = new Headers({ location: redirectUrl.toString() });
  appendCookie(
    headers,
    serializeCookie(
      LOGIN_FLOW_COOKIE,
      createSignedValue({ returnTo: normalizeReturnTo(request), state, verifier }, config.appSessionSecret),
      {
        httpOnly: true,
        maxAge: FLOW_TTL_SECONDS,
        path: "/",
        sameSite: "Lax",
        secure: isSecureRequest(request)
      }
    )
  );

  return new Response(null, { status: 302, headers });
}

export async function finishLogin(request: Request) {
  const config = getAuthConfig(request);
  const cookies = parseCookies(request);
  const flow = readSignedValue<LoginFlowPayload>(cookies.get(LOGIN_FLOW_COOKIE), config.appSessionSecret);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !flow || state !== flow.state) {
    return Response.redirect(`${config.uiBaseUrl}?authError=state_mismatch`, 302);
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: flow.verifier,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    body,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!tokenResponse.ok) {
    return Response.redirect(`${config.uiBaseUrl}?authError=token_exchange_failed`, 302);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; id_token?: string };

  if (!tokenPayload.id_token) {
    return Response.redirect(`${config.uiBaseUrl}?authError=missing_id_token`, 302);
  }

  const identity = await resolveIdentity(request, tokenPayload.id_token, tokenPayload.access_token);
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = Math.max(300, Math.min(tokenPayload.expires_in ?? SESSION_TTL_SECONDS, SESSION_TTL_SECONDS));
  const sessionValue = createSignedValue(
    {
      email: identity.email,
      exp: issuedAt + expiresIn,
      iat: issuedAt,
      sub: identity.sub,
      user: identity.user
    } satisfies SessionPayload,
    config.appSessionSecret
  );

  const headers = new Headers({ location: flow.returnTo || config.uiBaseUrl });
  appendCookie(headers, serializeCookie(APP_SESSION_COOKIE, sessionValue, sessionCookieOptions(request, expiresIn)));
  appendCookie(headers, serializeCookie(LOGIN_FLOW_COOKIE, "", clearCookieOptions(request)));

  return new Response(null, { status: 302, headers });
}

export function logout(request: Request) {
  const config = getAuthConfig(request);
  const headers = new Headers();
  appendCookie(headers, serializeCookie(APP_SESSION_COOKIE, "", clearCookieOptions(request)));
  appendCookie(headers, serializeCookie(LOGIN_FLOW_COOKIE, "", clearCookieOptions(request)));

  const redirectUrl = new URL(config.endSessionUrl);
  redirectUrl.searchParams.set("client_id", config.clientId);
  redirectUrl.searchParams.set("post_logout_redirect_uri", config.postLogoutRedirectUri);
  redirectUrl.searchParams.set("state", randomBase64Url());
  headers.set("location", redirectUrl.toString());

  return new Response(null, { status: 302, headers });
}
