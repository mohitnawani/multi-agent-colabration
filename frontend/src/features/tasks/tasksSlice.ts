import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import api from '../../lib/api'
import type { AgentOutput, CreateTaskPayload, Task, RunResult, ResumeTaskPayload } from '../../types'

// A real agent run makes many paced LLM calls (7s apart) and can take a
// couple of minutes — far beyond the default 30s axios timeout.
const RUN_TIMEOUT = 600_000

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  runningTaskId: string | null
  runResult: RunResult | null
  outputs: AgentOutput[] | null
  outputsLoading: boolean
  outputsError: string | null
}

const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
  runningTaskId: null,
  runResult: null,
  outputs: null,
  outputsLoading: false,
  outputsError: null,
}

export const listTasks = createAsyncThunk(
  'tasks/listTasks',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/tasks')
      return res.data as Task[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load tasks')
    }
  },
)

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (data: CreateTaskPayload, { rejectWithValue }) => {
    try {
      const res = await api.post('/tasks', data)
      return res.data as Task
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create task')
    }
  },
)

export const runTask = createAsyncThunk(
  'tasks/runTask',
  async (data: { taskId: string; force?: boolean }, { rejectWithValue }) => {
    try {
      const params = data.force ? { force: true } : {}
      const res = await api.post(`/tasks/${data.taskId}/run`, {}, { params, timeout: RUN_TIMEOUT })
      return res.data as RunResult
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to run task')
    }
  },
)

export const resumeTask = createAsyncThunk(
  'tasks/resumeTask',
  async (data: { taskId: string; payload: ResumeTaskPayload }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tasks/${data.taskId}/resume`, data.payload, { timeout: RUN_TIMEOUT })
      return res.data as RunResult
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to resume task')
    }
  },
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`)
      return id
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete task')
    }
  },
)

export const fetchTaskOutputs = createAsyncThunk(
  'tasks/fetchTaskOutputs',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tasks/${taskId}/outputs`)
      return { taskId, outputs: res.data as AgentOutput[] }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to load agent outputs')
    }
  },
)

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
    clearRunResult(state) {
      state.runResult = null
      state.runningTaskId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listTasks.pending, (state) => { state.loading = true; state.error = null })
      .addCase(listTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false
        state.tasks = action.payload
      })
      .addCase(listTasks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createTask.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading = false
        state.tasks.unshift(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(runTask.pending, (state, action) => {
        state.loading = true
        state.error = null
        state.runningTaskId = action.meta.arg.taskId
        state.runResult = null
      })
      .addCase(runTask.fulfilled, (state, action: PayloadAction<RunResult>) => {
        state.loading = false
        state.runningTaskId = null
        state.runResult = action.payload
        const idx = state.tasks.findIndex((t) => t.id === action.payload.task_id)
        if (idx !== -1) {
          state.tasks[idx].status = action.payload.status
          state.tasks[idx].final_output = action.payload.final_output
          state.tasks[idx].agent_outputs = action.payload.agent_outputs
          state.tasks[idx].subtasks = action.payload.subtasks
        }
      })
      .addCase(runTask.rejected, (state, action) => {
        state.loading = false
        state.runningTaskId = null
        state.error = action.payload as string
      })
      .addCase(resumeTask.pending, (state, action) => {
        state.loading = true
        state.error = null
        state.runningTaskId = action.meta.arg.taskId
        state.runResult = null
      })
      .addCase(resumeTask.fulfilled, (state, action: PayloadAction<RunResult>) => {
        state.loading = false
        state.runningTaskId = null
        state.runResult = action.payload
        const idx = state.tasks.findIndex((t) => t.id === action.payload.task_id)
        if (idx !== -1) {
          state.tasks[idx].status = action.payload.status
          state.tasks[idx].final_output = action.payload.final_output
          state.tasks[idx].agent_outputs = action.payload.agent_outputs
          state.tasks[idx].subtasks = action.payload.subtasks
        }
      })
      .addCase(resumeTask.rejected, (state, action) => {
        state.loading = false
        state.runningTaskId = null
        state.error = action.payload as string
      })
      .addCase(deleteTask.pending, (state) => { state.loading = true; state.error = null })
      .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.tasks = state.tasks.filter((t) => t.id !== action.payload)
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchTaskOutputs.pending, (state) => {
        state.outputsLoading = true
        state.outputsError = null
      })
      .addCase(fetchTaskOutputs.fulfilled, (state, action: PayloadAction<{ taskId: string; outputs: AgentOutput[] }>) => {
        state.outputsLoading = false
        state.outputs = action.payload.outputs
      })
      .addCase(fetchTaskOutputs.rejected, (state, action) => {
        state.outputsLoading = false
        state.outputsError = action.payload as string
      })
  },
})

export const { clearError, clearRunResult } = tasksSlice.actions
export default tasksSlice.reducer