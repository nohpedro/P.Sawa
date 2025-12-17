import type { IconType } from "react-icons";

export interface SidebarItem {
  label: string;
  to: string;
  icon: IconType;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}
