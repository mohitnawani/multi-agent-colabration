import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import api from '../../lib/api'
import type { Agent } from '../../types'

interface AgentsState {
  agents: Agent[]
  loading: boolean
  error: string | null
}

const initialState: AgentsState = {
  agents: [],
  loading: false,
  error: null,
}

export const listAgents = createAsyncThunk(
  'agents/listAgents',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/agents')
      return res.data as Agent[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load agents')
    }
  },
)

export const createAgentFromTemplate = createAsyncThunk(
  'agents/createAgentFromTemplate',
  async (data: { template_key: string; name: string; system_prompt?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/agents/from-template', data)
      return res.data as Agent
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create agent')
    }
  },
)

export const deleteAgent = createAsyncThunk(
  'agents/deleteAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/agents/${id}`)
      return id
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete agent')
    }
  },
)

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listAgents.pending, (state) => { state.loading = true; state.error = null })
      .addCase(listAgents.fulfilled, (state, action: PayloadAction<Agent[]>) => {
        state.loading = false
        state.agents = action.payload
      })
      .addCase(listAgents.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createAgentFromTemplate.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createAgentFromTemplate.fulfilled, (state, action: PayloadAction<Agent>) => {
        state.loading = false
        state.agents.push(action.payload)
      })
      .addCase(createAgentFromTemplate.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteAgent.pending, (state) => { state.loading = true; state.error = null })
      .addCase(deleteAgent.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.agents = state.agents.filter((a) => a.id !== action.payload)
      })
      .addCase(deleteAgent.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = agentsSlice.actions
export default agentsSlice.reducer