import { NextResponse } from "next/server";
import { previewRoute } from "@/lib/mock-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    capability?: string;
    priority?: string;
    itemCount?: number;
  };

  if (!body.capability || !body.priority || !body.itemCount) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  return NextResponse.json({
    preview: previewRoute({
      capability: body.capability,
      priority: body.priority,
      itemCount: Number(body.itemCount),
    }),
  });
}
