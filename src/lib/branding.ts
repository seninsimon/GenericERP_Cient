import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import api from "../api/api";

// The organization's name and logo (Administration → Branding). Loaded before
// signing in too (the sign-in page shows them). Until it's loaded, or when the
// server can't be reached: "Zenin ERP" and a letter mark.

export const DEFAULT_NAME = "Zenin ERP";
type BrandingInfo = { name: string; logoVersion: string | null };

export const logoSrc = (version: string | null) => (version ? `${import.meta.env.VITE_API_BASE_URL}/branding/logo?v=${version}` : null);

export function useBranding() {
  const { data } = useQuery({
    queryKey: ["branding"],
    queryFn: async () => (await api.get<BrandingInfo>("/branding")).data,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return { name: data?.name ?? DEFAULT_NAME, logo: logoSrc(data?.logoVersion ?? null) };
}

// The browser tab's icon: the logo, when there is one.
export function useBrandFavicon() {
  const { logo } = useBranding();
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) return;
    const original = link.dataset.original ?? link.href;
    link.dataset.original = original;
    link.removeAttribute("type");
    link.href = logo ?? original;
  }, [logo]);
}
