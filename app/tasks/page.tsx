import { TasksDashboard } from "@/components/tasks-dashboard";
import { toJobListItem } from "@/lib/job-list-view";
import { listJobs } from "@/lib/mock-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_JOBS_PER_PAGE = 25;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const jobsPerPage = Math.max(10, Math.min(100, Number.parseInt(params.pageSize ?? `${DEFAULT_JOBS_PER_PAGE}`, 10) || DEFAULT_JOBS_PER_PAGE));
  const allJobs = listJobs();
  const totalPages = Math.max(1, Math.ceil(allJobs.length / jobsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * jobsPerPage;
  const jobs = allJobs.slice(startIndex, startIndex + jobsPerPage);

  return (
    <div className="stack-xl">
      <section className="page-header">
        <div>
          <p className="eyebrow">Tasks</p>
          <h1>Batch Processing</h1>
          <p>Upload files or folders, track image-level failures, and download outputs with preserved structure.</p>
        </div>
      </section>

      <TasksDashboard
        initialJobs={jobs.map(toJobListItem)}
        initialResultSummaries={[]}
        initialPage={page}
        initialTotalPages={totalPages}
        jobsPerPage={jobsPerPage}
      />
    </div>
  );
}
