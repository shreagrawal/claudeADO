export interface Config {
  ado_org_url: string;
  ado_project: string;
  assigned_to: string;
  area_path: string;
  iteration_path: string;
  azureauth_path: string;
}

export interface Task {
  title: string;
  effort?: number;
}

export interface PBI {
  title: string;
  description: string;
  tasks: Task[];
}

export interface Hierarchy {
  feature: { title: string; description: string };
  pbis: PBI[];
}

export interface CreateResult {
  feature_id: number;
  feature_url: string;
  pbi_count: number;
  task_count: number;
}

export interface WorkItem {
  id: number;
  type: string;
  title: string;
  state: string;
  assigned_to: string;
  area_path: string;
  iteration_path: string;
}

export interface Feature {
  id: number;
  title: string;
  state: string;
  created_date: string;
  assigned_to: string;
  area_path: string;
  iteration_path: string;
  tags: string;
  ado_url: string;
}

export type Page = "create-text" | "create-single" | "update" | "delete" | "settings" | "features";
