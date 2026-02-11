import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import idl from "@/lib/clawbets-idl.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = rateLimit(request);
  if (blocked) return blocked;

  return NextResponse.json(idl, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
