import { getAuthSession } from "../_shared/auth.js";

export async function GET(request: Request) {
  const session = getAuthSession(request);

  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  return Response.json({
    authenticated: true,
    user: session
  });
}
