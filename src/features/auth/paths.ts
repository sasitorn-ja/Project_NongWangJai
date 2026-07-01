import { apiPath } from "@/lib/base-path";

export function getLogoutHref() {
  return apiPath("/auth/logout");
}
