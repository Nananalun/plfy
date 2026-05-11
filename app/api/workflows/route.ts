import { NextResponse } from "next/server";
import { getWorkflowDslExample } from "@/lib/platform-data";
import { createWorkflow, listWorkflows } from "@/lib/mock-store";

export function GET() {
  return NextResponse.json({
    workflows: listWorkflows(),
    sampleDsl: getWorkflowDslExample(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    trigger?: string;
    summary?: string;
    steps?: string[];
  };

  if (!body.name || !body.trigger || !body.summary || !Array.isArray(body.steps) || body.steps.length === 0) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const workflow = createWorkflow({
    name: body.name,
    trigger: body.trigger,
    summary: body.summary,
    steps: body.steps,
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
