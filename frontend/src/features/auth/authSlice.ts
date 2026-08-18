import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import api from '../../lib/api'

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  checked: boolean
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  checked: false,
}

export const register = createAsyncThunk(
  'auth/register',
  async (data: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', data)
      return res.data.user
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Registration failed')
    }
  },
)

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', data)
      return res.data.user
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Login failed')
    }
  },
)

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout')
})

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/me')
      return res.data
    } catch {
      return rejectWithValue('Not authenticated')
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => { state.loading = true; state.error = null })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.user = action.payload
        state.checked = true
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.checked = true
      })

      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.user = action.payload
        state.checked = true
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.checked = true
      })
      
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.checked = true
      })
      .addCase(checkAuth.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload
        state.checked = true
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null
        state.checked = true
      })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer