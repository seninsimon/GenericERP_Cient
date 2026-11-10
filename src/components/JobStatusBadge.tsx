import { Badge, Loader } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconClock } from "@tabler/icons-react";
import type { Job, JobStatus } from "../api/api";
import { formatNumber } from "../lib/format";

const STATUS: Record<JobStatus, { color: string; label: string }> = {
  queued: { color: "gray", label: "Queued" },
  running: { color: "blue", label: "Running" },
  done: { color: "teal", label: "Done" },
  failed: { color: "red", label: "Failed" },
};

// Job status: colour + icon + word (never colour alone).
export function JobStatusBadge({ status }: { status: JobStatus }) {
  const s = STATUS[status] ?? STATUS.queued;
  const icon =
    status === "running" ? (
      <Loader size={10} color="blue" />
    ) : status === "done" ? (
      <IconCheck size={12} />
    ) : status === "failed" ? (
      <IconAlertTriangle size={12} />
    ) : (
      <IconClock size={12} />
    );
  return (
    <Badge color={s.color} leftSection={icon}>
      {s.label}
    </Badge>
  );
}

// "1,204 rows" / "980 added, 3 failed" / "—"
export function jobResultSummary(job: Job): string {
  if (job.status === "failed") return job.error ?? "Failed";
  if (!job.result) return job.status === "running" && job.progress ? `${formatNumber(job.progress)} processed` : "";
  if (job.type === "export") return `${formatNumber(job.result.rows ?? 0)} rows`;
  const added = `${formatNumber(job.result.inserted ?? 0)} added`;
  return job.result.failed ? `${added}, ${formatNumber(job.result.failed)} failed` : added;
}
