import { logout } from "../_shared/auth.js";

export async function GET(request: Request) {
  return logout(request);
}
