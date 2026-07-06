import { findAllDealers } from "../_shared/repositories/dealers.js";

export async function GET() {
  try {
    const rows = await findAllDealers();

    return Response.json({
      status: true,
      items: rows,
      message: "success"
    });
  } catch (error) {
    console.error("Failed to load dealers from database", { error });

    const message = error instanceof Error ? error.message : "Unknown database error";

    return Response.json(
      { status: false, items: [], message },
      { status: 500 }
    );
  }
}
