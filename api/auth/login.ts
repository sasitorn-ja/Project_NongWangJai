import { startLogin } from "../_shared/auth.js";

export async function GET(request: Request) {
  return startLogin(request);
}
