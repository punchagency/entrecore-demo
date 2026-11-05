import { Company } from "@/app/store/companiesStore";

export interface App {
  id: number;
  name: string;
  imagePath: string;
  color: string;
  isInner?: boolean;
  isCenter?: boolean;
  notifications: number;
}

export type ConnectorRole = "source" | "repository";

export interface ConnectorConfig {
  connector_id: string;
  company_id?: string;
  connector_name?: string;
  erp_type?: string;
  connector_role?: ConnectorRole[];
  config?: Record<string, unknown>;
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CoreVisualizationProps {
  searchQuery: string;
  showSidePanel?: boolean;
  showNotifications?: boolean;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  dynamicApps: Record<number, App>;
  setDynamicApps: React.Dispatch<React.SetStateAction<Record<number, App>>>;
  onRemoveApp?: (appId: number, appName: string) => void;
  onToggleSidePanel?: () => void;
  selectedCompany?: Company | null;
  initialSuggestions?: any[];
}

export interface DotPosition {
  x: string;
  y: string;
  size: number;
  opacity: number;
}

export interface Service {
  id: number;
  name: string;
  logo: string;
}

export interface Category {
  name: string;
  color: string;
}
