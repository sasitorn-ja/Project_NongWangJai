import { findSitesByDealerId } from "../../_shared/repositories/dealerSites.js";

function resolveDealerId(request: Request) {
  const url = new URL(request.url);
  return url.pathname.split("/").filter(Boolean)[2] ?? "";
}

export async function GET(request: Request) {
  try {
    const dealerId = Number(resolveDealerId(request));

    if (!Number.isFinite(dealerId)) {
      return Response.json(
        { status: false, items: [], message: "Invalid dealer id" },
        { status: 400 }
      );
    }

    const rows = await findSitesByDealerId(dealerId);

    return Response.json({
      status: true,
      items: rows,
      message: "success"
    });
  } catch (error) {
    console.error("Failed to load dealer sites from database", { error });

    const message = error instanceof Error ? error.message : "Unknown database error";

    return Response.json(
      { status: false, items: [], message },
      { status: 500 }
    );
  }
}
