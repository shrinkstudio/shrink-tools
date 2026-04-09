import { NextResponse } from "next/server";
import config from "@/lib/estimator-data/config.json";

export async function GET() {
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
