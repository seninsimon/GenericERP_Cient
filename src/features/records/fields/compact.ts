import { createContext, useContext } from "react";
import { columnLabel, type RecordColumn } from "../schema";

// Fields in a grid row (line items) have no label above them: the grid's
// header says what they are. Wrap such inputs in <CompactFields value>.
export const CompactFields = createContext(false);
export const useCompact = () => useContext(CompactFields);

// The label props of a field input, normal or compact.
export function useLabelProps(column: RecordColumn) {
  const compact = useCompact();
  return compact
    ? { label: undefined, "aria-label": columnLabel(column), withAsterisk: false, size: "xs" as const }
    : { label: columnLabel(column), withAsterisk: Boolean(column.required) };
}
