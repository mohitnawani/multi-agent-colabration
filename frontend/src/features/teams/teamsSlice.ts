import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import api from '../../lib/api'
import type { Team, CreateTeamPayload } from '../../types'

interface TeamsState {
  teams: Team[]
  loading: boolean
  error: string | null
}

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
}

export const listTeams = createAsyncThunk(
  'teams/listTeams',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/teams')
      return res.data as Team[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load teams')
    }
  },
)

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (data: CreateTeamPayload, { rejectWithValue }) => {
    try {
      const res = await api.post('/teams', data)
      return res.data as Team
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create team')
    }
  },
)

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/teams/${id}`)
      return id
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete team')
    }
  },
)

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listTeams.pending, (state) => { state.loading = true; state.error = null })
      .addCase(listTeams.fulfilled, (state, action: PayloadAction<Team[]>) => {
        state.loading = false
        state.teams = action.payload
      })
      .addCase(listTeams.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createTeam.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createTeam.fulfilled, (state, action: PayloadAction<Team>) => {
        state.loading = false
        state.teams.push(action.payload)
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteTeam.pending, (state) => { state.loading = true; state.error = null })
      .addCase(deleteTeam.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.teams = state.teams.filter((t) => t.id !== action.payload)
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = teamsSlice.actions
export default teamsSlice.reducer