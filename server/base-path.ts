function cleanEnv(value?: string) {
  return value?.trim() ?? "";
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.replace(/^\/+|\/+$/g, "")}`;
}

function inferBasePathFromUrl(url: string) {
  if (!url) return "/";

  try {
    const parsed = new URL(url);
    return normalizePathname(parsed.pathname);
  } catch {
    return normalizePathname(url);
  }
}

export function resolveBasePath() {
  const configuredBasePath = cleanEnv(process.env.APP_BASE_PATH);
  if (configuredBasePath) return normalizePathname(configuredBasePath);

  const configuredUiUrl = cleanEnv(process.env.PROD_UI_BASE_URL);
  if (configuredUiUrl) return inferBasePathFromUrl(configuredUiUrl);

  return "/";
}

export function stripBasePath(pathname: string, basePath: string) {
  if (basePath === "/") return pathname;
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return null;
}
