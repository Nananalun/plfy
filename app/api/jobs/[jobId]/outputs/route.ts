import { NextResponse } from "next/server";
import { getJobById, getResultAssetsByJobIdPage } from "@/lib/mock-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJobById(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const pageParam = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSizeParam = Number.parseInt(url.searchParams.get("pageSize") ?? "24", 10);
  const result = getResultAssetsByJobIdPage(
    jobId,
    Number.isFinite(pageParam) ? pageParam : 1,
    Number.isFinite(pageSizeParam) ? pageSizeParam : 24,
  );

  return NextResponse.json(result);
}
