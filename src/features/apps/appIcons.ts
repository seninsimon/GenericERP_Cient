import {
  IconAddressBook,
  IconApps,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconCash,
  IconChecklist,
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconHeadset,
  IconHeartHandshake,
  IconLifebuoy,
  IconPackage,
  IconReceipt,
  IconReceiptRefund,
  IconSchool,
  IconShoppingCart,
  IconSparkles,
  IconStethoscope,
  IconTable,
  IconTargetArrow,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

// Icons named by the app catalog (src/apps on the server). "IconTable" is
// "My tables" (the tables you built yourself).
export const ICONS: Record<string, Icon> = {
  IconAddressBook,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconCash,
  IconChecklist,
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconHeadset,
  IconHeartHandshake,
  IconLifebuoy,
  IconPackage,
  IconReceipt,
  IconReceiptRefund,
  IconSchool,
  IconShoppingCart,
  IconSparkles,
  IconStethoscope,
  IconTable,
  IconTargetArrow,
  IconUsers,
};

export const appIcon = (name: string): Icon => ICONS[name] ?? IconApps;

// Each app gets its own colour, so apps are told apart at a glance (in the
// sidebar, the app launcher, Home and Manage apps). By icon, so an app keeps
// its colour everywhere; unknown icons get a stable colour from their name.
const COLORS: Record<string, string> = {
  IconBuildingSkyscraper: "blue",
  IconDeviceDesktop: "cyan",
  IconDeviceLaptop: "cyan",
  IconReceiptRefund: "orange",
  IconLifebuoy: "red",
  IconUsers: "grape",
  IconBuildingWarehouse: "teal",
  IconChecklist: "indigo",
  IconTargetArrow: "pink",
  IconStethoscope: "green",
  IconSchool: "yellow",
  IconCash: "lime",
  IconReceipt: "orange",
  IconShoppingCart: "teal",
  IconHeartHandshake: "pink",
  IconHeadset: "violet",
  IconBriefcase: "blue",
  IconAddressBook: "cyan",
  IconPackage: "teal",
  IconBuildingStore: "orange",
  IconSparkles: "violet",
  IconTable: "gray",
};
const SPARE = ["blue", "teal", "grape", "orange", "pink", "cyan", "lime", "violet", "red", "green", "indigo", "yellow"];
export const appColor = (name: string) =>
  COLORS[name] ?? SPARE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SPARE.length];
