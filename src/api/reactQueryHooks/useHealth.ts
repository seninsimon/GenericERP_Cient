import { useQuery } from "@tanstack/react-query";
import { getSystemHealth } from "../api";

// CPU / RAM / disk usage; only admins may read it
export const useSystemHealth = (enabled = true) => {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const { data } = await getSystemHealth();
      return data;
    },
    refetchInterval: 50000,
    enabled,
  });
};
