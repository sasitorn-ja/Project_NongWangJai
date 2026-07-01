import fs from "node:fs";
import path from "node:path";

export function resolveApiRouteFile(baseDir: string, pathname: string): string | null {
  const segments = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return resolveApiRouteFromDirectory(baseDir, segments);
}

function resolveApiRouteFromDirectory(currentDir: string, segments: string[]): string | null {
  if (segments.length === 0) {
    const indexFile = path.join(currentDir, "index.js");
    return fs.existsSync(indexFile) ? indexFile : null;
  }

  const [segment, ...rest] = segments;
  const exactDirectory = path.join(currentDir, segment);

  if (fs.existsSync(exactDirectory) && fs.statSync(exactDirectory).isDirectory()) {
    const match = resolveApiRouteFromDirectory(exactDirectory, rest);
    if (match) return match;
  }

  const exactFile = path.join(currentDir, `${segment}.js`);
  if (rest.length === 0 && fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
    return exactFile;
  }

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\[.+\]$/.test(entry.name)) continue;
    const match = resolveApiRouteFromDirectory(path.join(currentDir, entry.name), rest);
    if (match) return match;
  }

  if (rest.length === 0) {
    for (const entry of entries) {
      if (!entry.isFile() || !/^\[.+\]\.js$/.test(entry.name)) continue;
      return path.join(currentDir, entry.name);
    }
  }

  return null;
}
