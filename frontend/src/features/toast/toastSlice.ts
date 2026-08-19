import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: Toast[]
}

const initialState: ToastState = {
  toasts: [],
}

let nextId = 1

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<{ message: string; tone: Toast['tone'] }>) {
      state.toasts.push({ id: nextId++, ...action.payload })
      if (state.toasts.length > 4) state.toasts.shift()
    },
    dismissToast(state, action: PayloadAction<number>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { addToast, dismissToast } = toastSlice.actions
export default toastSlice.reducer
