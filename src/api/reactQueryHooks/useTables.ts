import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { notifications } from "@mantine/notifications";

// show the server's message (e.g. "You don't have permission ...")
const showError = (error: any) =>
    notifications.show({
        title: "Request failed",
        message: api.errorMessage(error),
        color: "red",
    });

export const useTables = () =>
    useQuery({
        queryKey: ["tables"],
        queryFn: async () => {
            const res = await api.getTables();
            return res.data;
        },
    });


export const useSchema = (table: string) =>
    useQuery({
        queryKey: ["schema", table],
        queryFn: async () => {
            const res = await api.getSchema(table);
            return res.data;
        },
        enabled: !!table,
    });


export const useCreateTable = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: api.createTable,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tables"] });
            notifications.show({
                title: "Table created",
                message: "Table created successfully",
                color: "green",
            })
        },
        onError: showError,
    });
};



export const useAddColumn = (table: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => api.addColumn(table, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schema", table] });
            notifications.show({
                title: "Column added",
                message: "Column added successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useUpdateColumn = (table: string, column: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => api.updateColumn(table, column, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schema", table] });
            notifications.show({
                title: "Column updated",
                message: "Column updated successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useDeleteColumn = (table: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (column: string) => api.deleteColumn(table, column),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schema", table] });
            notifications.show({
                title: "Column deleted",
                message: "Column deleted successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useTableData = (
    table: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        sort?: string;
        order?: "asc" | "desc";
    }
) =>
    useQuery({
        queryKey: ["tableData", table, params],
        queryFn: async () => {
            const res = await api.getTableData(table, params);
            return res.data;
        },
        enabled: !!table,
    });


export const useInsertData = (table: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => api.insertData(table, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tableData", table] });
            notifications.show({
                title: "Data inserted",
                message: "Data inserted successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useUpdateData = (table: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.updateData(table, id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tableData", table] });
            notifications.show({
                title: "Data updated",
                message: "Data updated successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useDeleteData = (table: string) => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.deleteData(table, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tableData", table] });
            notifications.show({
                title: "Data deleted",
                message: "Data deleted successfully",
                color: "green",
            });
        },
        onError: showError,
    });
};


export const useSingleData = (table: string, id: string) =>
    useQuery({
        queryKey: ["singleData", table, id],
        queryFn: async () => {
            const res = await api.getSingleData(table, id);
            return res.data;
        },
        enabled: !!table && !!id,
    });


export const useUpdateTableSettings = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ table, data }: { table: string; data: any }) =>
            api.updateTableSettings(table, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tables"] });
            qc.invalidateQueries({ queryKey: ["schema"] });
            notifications.show({
                title: "Table settings updated",
                message: "Table settings updated successfully",
                color: "green",
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: "Error updating table settings",
                message: api.errorMessage(error, "Error updating table settings"),
                color: "red",
            });
        }
    });
};