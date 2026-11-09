import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { MantineReactTable } from "mantine-react-table";
import { confirmAction } from "../../utils/confirmModal";
import type { MRT_ColumnDef, MRT_SortingState, MRT_Updater } from "mantine-react-table";
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";

type RowData = {
  _id: string;
  [key: string]: any;
};

type Props = {
  columns: MRT_ColumnDef<RowData>[];
  data: RowData[];
  isLoading: boolean;
  rowCount: number;

  pageIndex: number;
  pageSize: number;
  sorting: any[];
  globalFilter: string;

  setPageIndex: (v: number) => void;
  setPageSize: (v: number) => void;
  setSorting: (updater: MRT_Updater<MRT_SortingState>) => void;
  setGlobalFilter: (v: string) => void;

  onView: (id: string) => void;
  // omitted when the user isn't allowed to edit / delete
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  
};

export default function CustomTable({
  columns,
  data,
  isLoading,
  rowCount,
  pageIndex,
  pageSize,
  sorting,
  globalFilter,
  setPageIndex,
  setPageSize,
  setSorting,   // ✅ add this
  setGlobalFilter,
  onView,
  onEdit,
  onDelete,
}: Props) {
  return (
    <MantineReactTable
      columns={columns}
      data={data}
      // enableColumnResizing

      // mantineTableHeadCellProps={{
      //   style: {
      //     fontWeight: 600,
      //     fontSize: "14px",
      //     padding: "10px 12px",
      //   },
      // }}
      
      
      mantineTableBodyCellProps={{
        style: {
          padding: "8px 12px",
          fontSize: "14px",
          maxHeight: "40px",
          maxWidth: "100px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      }}
      
      mantineTableProps={{
        striped: true,
        highlightOnHover: true,
        withColumnBorders: false,
      }}  
      
    
      mantineTableContainerProps={{
        style: {
          height: "450px",
          maxHeight: "450px",
          overflowY: "auto",
        },
      }}
      
      manualPagination
      manualSorting
      manualFiltering
      rowCount={rowCount}
      state={{
        isLoading,
        pagination: { pageIndex, pageSize },
        sorting,
        globalFilter,
        columnPinning: {
          right: ["mrt-row-actions"],
        },
      }}

       onSortingChange={setSorting}
      
      onPaginationChange={(updater) => {
        const newState =
          typeof updater === "function"
            ? updater({ pageIndex, pageSize })
            : updater;

        setPageIndex(newState.pageIndex);
        setPageSize(newState.pageSize);
      }}
      
      onGlobalFilterChange={setGlobalFilter}
      enableRowActions
      positionActionsColumn="last"
      enableColumnOrdering
      enableColumnPinning
      
      displayColumnDefOptions={{
        "mrt-row-actions": {
          header: "Actions",
          size: 160,
          minSize: 160,
          maxSize: 160,
          enableResizing: false,
          mantineTableHeadCellProps: { align: "center" },
          mantineTableBodyCellProps: { align: "center" },
        },
      }}
      renderRowActions={({ row }) => (
        <Group gap={15} wrap="nowrap">
          <Tooltip label="View">
            <ActionIcon
              size="sm"
              color="blue"
              radius="sm"
              variant="subtle"
              onClick={() => onView(row.original._id)}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>

          {onEdit && (
            <Tooltip label="Edit">
              <ActionIcon
                size="sm"
                color="yellow"
                radius="sm"
                variant="subtle"
                onClick={() => onEdit(row.original._id)}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip label="Delete">
              <ActionIcon
                size="sm"
                color="red"
                radius="sm"
                variant="subtle"
                onClick={() =>
                  confirmAction("Are you sure you want to delete this row?", () =>
                    onDelete(row.original._id),
                  )
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}
    />
  );
}
