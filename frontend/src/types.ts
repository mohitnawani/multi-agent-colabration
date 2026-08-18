export interface Agent {
  id: string;
  name: string;
  role: string | null;
  system_prompt: string | null;
  tools: string[];
  llm_model: string;
  temperature: number;
}

export interface Team {
  id: string;
  name: string;
  pattern: string | null;
  agent_ids: string[];
  created_at: string;
}

export interface Template {
  key: string;
  name: string;
  role: string;
  system_prompt: string;
  tools: string[];
  temperature: number;
}

export interface CreateTeamPayload {
  name: string;
  pattern: string;
  agent_ids: string[];
}

export interface UpdateTeamPayload {
  name?: string;
  pattern?: string;
  agent_ids?: string[];
}

export interface CreateAgentFromTemplatePayload {
  template_key: string;
  name: string;
  system_prompt?: string;
}

export interface Task {
  id: string;
  team_id: string | null;
  description: string | null;
  status: string;
  final_output: string | null;
  framework: string;
  require_approval: boolean;
  created_at: string;
  agent_outputs?: Record<string, number>;
  subtasks?: unknown[];
}

export interface CreateTaskPayload {
  team_id: string;
  description: string;
  require_approval?: boolean;
}

export interface RunResult {
  task_id: string;
  status: string;
  final_output: string;
  agent_outputs?: Record<string, number>;
  subtasks?: unknown[];
}

export interface ResumeTaskPayload {
  approval: boolean;
  feedback?: string;
}

export type ProgressEventType = 'progress' | 'interrupt' | 'paused' | 'done' | 'error' | 'idle';

export interface ProgressEvent {
  type: ProgressEventType;
  node?: string;
  phase?: string;
  summary?: string;
  detail?: string;
  final_output?: string;
  timestamp?: string;
}