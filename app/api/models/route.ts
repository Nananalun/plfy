import { NextResponse } from "next/server";
import { getModels, getRoutingPolicies } from "@/lib/platform-data";

export function GET() {
  return NextResponse.json({
    models: getModels(),
    policies: getRoutingPolicies(),
  });
}
