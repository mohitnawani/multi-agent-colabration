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