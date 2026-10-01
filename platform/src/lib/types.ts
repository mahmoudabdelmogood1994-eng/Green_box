
import type { LucideIcon } from "lucide-react";

export type Part = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageId: string;
};

export type AssetStatus = "Operational" | "Maintenance Due" | "Offline";

export type Asset = {
  id: string;
  name: string;
  location: string;
  status: AssetStatus;
  lastService: string;
};

export type DashboardStat = {
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease";
  icon: LucideIcon;
  href?: string;
};

export type CriticalAlert = {
  id: string;
  asset_ID: string;
  part_PN: string;
  current_reading: number;
  status: string;
  reason?: string;
  last_simulated_update?: {
    seconds: number;
    nanoseconds: number;
  };
};

export type GreenBoxNode = {
  id: string;
  location: string;
  status: "Active" | "Inactive";
};

export type Supplier = {
  id: string;
  name: string;
  country: string;
};

export type PartSupplier = {
  partId: string;
  supplierId: string;
  price: number;
  leadTime: number;
  spec: string;
};
