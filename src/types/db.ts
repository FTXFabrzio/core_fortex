export type ProjectType = "GREENFIELD" | "BROWNFIELD";
export type ProjectStatus =
  | "INTEL"
  | "DESIGN"
  | "EXECUTION"
  | "TEST"
  | "PAUSED"
  | "ARCHIVED";

export type StoryStatus = "INICIO" | "EN_PROGRESO" | "TERMINADO" | "TESTEADO";
export type TaskStatus = "ICEBOX" | "IN_PROGRESS" | "DISCUSSION" | "DONE";
export type DailyTaskKind = "MEETING" | "PERSONAL" | "HEALTH" | "FOCUS" | "OTHER";

export interface core_domain {
  id: string;
  owner_user_id: string;
  name: string;
  code: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface core_project {
  id: string;
  owner_user_id: string;
  domain_id: string | null;
  name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  active: boolean;
  drive_folder_url: string | null;
  primary_doc_url: string | null;
  pause_condition: string | null;
  created_at: string;
  updated_at: string;
}

export interface project_core2 {
  id: string;
  project_id: string;
  pain_now: string | null;
  intel_min: string | null;
  context: string | null;
  unfreeze: string | null;
  bet_short: string | null;
  x1_short: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface epic {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  order_no: number;
  created_at: string;
  updated_at: string;
}

export interface story {
  id: string;
  project_id: string;
  epic_id: string | null;
  title: string;
  user_story: string;
  acceptance_criteria: string;
  status: StoryStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface task {
  id: string;
  story_id: string;
  title: string;
  acceptance_note: string | null;
  status: TaskStatus;
  start_at: string | null;
  end_at: string | null;
  order_no: number;
  created_at: string;
  updated_at: string;
}

export interface daily_task {
  id: string;
  owner_user_id: string;
  title: string;
  notes: string | null;
  start_at: string;
  end_at: string;
  kind: DailyTaskKind;
  created_at: string;
  updated_at: string;
}

export interface test_log {
  id: string;
  story_id: string;
  task_id: string | null;
  notes: string;
  created_at: string;
}
