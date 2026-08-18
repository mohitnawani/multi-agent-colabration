import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import agentsReducer from '../features/agents/agentsSlice'
import teamsReducer from '../features/teams/teamsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    agents: agentsReducer,
    teams: teamsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch