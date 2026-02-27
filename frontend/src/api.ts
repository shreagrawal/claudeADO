import axios from "axios";
import type { Config, Hierarchy, CreateResult, WorkItem } from "./types";

const BASE = "http://localhost:8000";
const api = axios.create({ baseURL: BASE });

export const getConfig = () => api.get<Config>("/api/config").then(r => r.data);

export const saveConfig = (config: Config) =>
  api.post("/api/config", config).then(r => r.data);

export const parseText = (text: string) =>
  api.post<Hierarchy>("/api/parse", { text }).then(r => r.data);

export const createHierarchy = (
  hierarchy: Hierarchy,
  assigned_to: string,
  area_path: string,
  iteration_path: string
) =>
  api.post<CreateResult>("/api/create", {
    hierarchy, assigned_to, area_path, iteration_path,
  }).then(r => r.data);

export const createSingle = (payload: {
  wit_type: string; title: string; description?: string;
  assigned_to?: string; area_path?: string; iteration_path?: string;
  effort?: number; parent_id?: number;
}) => api.post("/api/create-single", payload).then(r => r.data);

export const getWorkItem = (id: number) =>
  api.get<WorkItem>(`/api/workitem/${id}`).then(r => r.data);

export const updateWorkItem = (id: number, fields: Partial<{
  title: string; state: string; assigned_to: string;
  area_path: string; iteration_path: string;
}>) => api.patch(`/api/workitem/${id}`, fields).then(r => r.data);

export const deleteWorkItems = (ids: number[]) =>
  api.post("/api/workitems/delete", { ids }).then(r => r.data);
