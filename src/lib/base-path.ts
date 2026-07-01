function normalizeBasePath(baseUrl: string) {
  if (!baseUrl || baseUrl === "/") return "";
  return `/${baseUrl.replace(/^\/+|\/+$/g, "")}`;
}

export function getBasePath() {
  return normalizeBasePath(import.meta.env.BASE_URL ?? "/");
}

export function withBasePath(pathname: string) {
  const basePath = getBasePath();
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!basePath) return normalizedPathname;
  if (normalizedPathname === "/") return `${basePath}/`;
  return `${basePath}${normalizedPathname}`;
}

export function apiPath(pathname: string) {
  return withBasePath(pathname.startsWith("/api/") || pathname === "/api" ? pathname : `/api${pathname}`);
}
