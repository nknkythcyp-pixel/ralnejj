import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token, activeConvId: null }),
      updateUser: (data) => set((s) => ({ user: { ...s.user, ...data } })),
      logout: () => set({ user: null, token: null, activeConvId: null }),
      isAuth: () => !!get().token,
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
      },
      applyTheme: () => {
        document.documentElement.classList.toggle('dark', get().theme === 'dark')
      },
      activeConvId: null,
      setActiveConv: (id) => set({ activeConvId: id }),
    }),
    {
      name: 'ralnejj-store',
      partialize: (s) => ({ user: s.user, token: s.token, theme: s.theme }),
    }
  )
)