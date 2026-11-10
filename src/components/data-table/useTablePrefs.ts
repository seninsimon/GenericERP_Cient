import { useCallback, useMemo, useState } from "react";
import { readJson, removeKey, writeJson } from "../../lib/storage";
import type { Density } from "./types";

export interface TablePrefs {
  hidden: string[]; // column ids the user hid
  shown: string[]; // hidden-by-default columns the user showed
  order: string[]; // column ids in the user's order (may be partial)
  density: Density;
  pageSize: number;
}

const DEFAULTS: TablePrefs = { hidden: [], shown: [], order: [], density: "compact", pageSize: 25 };

// Saved table view per storageKey (per browser).
export function useTablePrefs(storageKey?: string) {
  const key = storageKey ? `erp:table:${storageKey}` : null;
  const [prefs, setPrefs] = useState<TablePrefs>(() => (key ? readJson(key, DEFAULTS) : DEFAULTS));

  const update = useCallback(
    (patch: Partial<TablePrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        if (key) writeJson(key, next);
        return next;
      });
    },
    [key]
  );

  const reset = useCallback(() => {
    if (key) removeKey(key);
    setPrefs((prev) => ({ ...DEFAULTS, pageSize: prev.pageSize }));
  }, [key]);

  return useMemo(() => ({ prefs, update, reset }), [prefs, update, reset]);
}
