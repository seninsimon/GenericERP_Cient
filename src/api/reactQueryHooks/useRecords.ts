import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

import * as api from "../api";

// Hooks for the record pages (list / detail / form).

const fieldErrorsOf = (error: unknown): Record<string, string> | undefined =>
  (error as { response?: { data?: { errors?: Record<string, string> } } })?.response?.data?.errors;

// Show a notification unless the error is shown inline next to the fields.
const notifyUnlessInline = (title: string) => (error: unknown) => {
  if (fieldErrorsOf(error)) return;
  notifications.show({ title, message: api.errorMessage(error), color: "red" });
};

// One record (relations as ids). Same cache key as useSingleData.
export const useRecord = (table: string, id: string | undefined) =>
  useQuery({
    queryKey: ["singleData", table, id],
    queryFn: async () => (await api.getSingleData(table, id!)).data as Record<string, unknown> & { _id: string },
    enabled: Boolean(table && id),
    retry: (count, error) => (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });

export const useCreateRecord = (table: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.insertData(table, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tableData", table] });
      notifications.show({ title: "Record created", message: "Your changes were saved.", color: "teal" });
    },
    onError: notifyUnlessInline("Couldn't create the record"),
  });
};

export const useUpdateRecord = (table: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      (await api.updateData(table, id, data)).data,
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["tableData", table] });
      qc.invalidateQueries({ queryKey: ["singleData", table, id] });
      qc.invalidateQueries({ queryKey: ["audit", "record", table, id] });
      notifications.show({ title: "Record saved", message: "Your changes were saved.", color: "teal" });
    },
    onError: notifyUnlessInline("Couldn't save the record"),
  });
};

export const useDeleteRecord = (table: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.deleteData(table, id)).data,
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ["tableData", table] });
      qc.removeQueries({ queryKey: ["singleData", table, id] });
      notifications.show({ title: "Record deleted", message: "The record was deleted.", color: "teal" });
    },
    onError: (error) =>
      notifications.show({ title: "Couldn't delete the record", message: api.errorMessage(error), color: "red" }),
  });
};

export { fieldErrorsOf };

// Display names for relation ids (only records the user may see are returned).
export const useRelationNames = (
  ref: string | null | undefined,
  ids: string[],
  displayField?: string
) =>
  useQuery({
    queryKey: ["relationOptions", ref, displayField, "ids", [...ids].sort().join(",")],
    queryFn: async () => (await api.getRelationOptions(ref!, { ids, displayField })).data,
    enabled: Boolean(ref) && ids.length > 0,
    staleTime: 60_000,
    retry: false,
  });

// Follow a background job (import/export) until it finishes.
export function useWatchJob(onFinished: (job: api.Job) => void) {
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useQuery({
    queryKey: ["jobs", "watch", jobId],
    queryFn: async () => (await api.getJob(jobId!)).data,
    enabled: Boolean(jobId),
    refetchInterval: (q) =>
      q.state.data && (q.state.data.status === "done" || q.state.data.status === "failed") ? false : 2000,
  });

  useEffect(() => {
    const data = job.data;
    if (data && jobId && (data.status === "done" || data.status === "failed")) {
      setJobId(null);
      onFinished(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.data]);

  return { watch: setJobId, watching: Boolean(jobId) };
}
