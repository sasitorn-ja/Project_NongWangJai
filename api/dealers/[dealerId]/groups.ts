import { findGroupsByDealerId } from "../../_shared/repositories/dealerGroups.js";

function resolveDealerId(request: Request) {
  const url = new URL(request.url);
  return url.pathname.split("/").filter(Boolean)[2] ?? "";
}

export async function GET(request: Request) {
  try {
    const dealerId = Number(resolveDealerId(request));

    if (!Number.isFinite(dealerId)) {
      return Response.json(
        { status: false, groups: [], message: "Invalid dealer id" },
        { status: 400 }
      );
    }

    const rows = await findGroupsByDealerId(dealerId);

    return Response.json({
      status: true,
      groups: rows,
      message: "success"
    });
  } catch (error) {
    console.error("Failed to load dealer groups from database", { error });

    const message = error instanceof Error ? error.message : "Unknown database error";

    return Response.json(
      { status: false, groups: [], message },
      { status: 500 }
    );
  }
}
