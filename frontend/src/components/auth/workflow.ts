export type FlowNode = {
  id: string
  label: string
  sublabel: string
  x: number
  y: number
  width?: number
}

export type FlowEdge = {
  from: string
  to: string
}

// Start -> Supervisor -> [agents] -> Quality Gate -> Synthesis -> End
export const AUTH_WORKFLOW: { nodes: FlowNode[]; edges: FlowEdge[] } = {
  nodes: [
    { id: 'start', label: 'Start', sublabel: 'Workflow entry', x: 240, y: 52 },
    { id: 'supervisor', label: 'Supervisor', sublabel: 'Lead coordinator', x: 240, y: 128 },
    { id: 'research', label: 'Research', sublabel: 'Research agent', x: 92, y: 216, width: 120 },
    { id: 'code', label: 'Code', sublabel: 'Code agent', x: 240, y: 216, width: 120 },
    { id: 'critic', label: 'Critic', sublabel: 'Critic agent', x: 388, y: 216, width: 120 },
    { id: 'gate', label: 'Quality gate', sublabel: 'LLM-as-judge', x: 240, y: 288, width: 130 },
    { id: 'synthesis', label: 'Synthesis', sublabel: 'Merge + refine', x: 240, y: 364 },
    { id: 'end', label: 'End', sublabel: 'Final output', x: 240, y: 440 },
  ],
  edges: [
    { from: 'start', to: 'supervisor' },
    { from: 'supervisor', to: 'research' },
    { from: 'supervisor', to: 'code' },
    { from: 'supervisor', to: 'critic' },
    { from: 'research', to: 'gate' },
    { from: 'code', to: 'gate' },
    { from: 'critic', to: 'gate' },
    { from: 'gate', to: 'synthesis' },
    { from: 'synthesis', to: 'end' },
  ],
}