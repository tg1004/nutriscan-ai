import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingComplete: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token')
      const onboarding = await SecureStore.getItemAsync('onboarding_complete')
      if (token) {
        set({
          isAuthenticated: true,
          isLoading: false,
          onboardingComplete: onboarding === 'true',
        })
      } else {
        set({ isAuthenticated: false, isLoading: false })
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false })
    }
  },

  login: async (tokens, user) => {
    await SecureStore.setItemAsync('access_token', tokens.access_token)
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token)
    const onboarding = tokens.onboarding_complete ?? false
    if (onboarding) {
      await SecureStore.setItemAsync('onboarding_complete', 'true')
    }
    set({ user, isAuthenticated: true, onboardingComplete: onboarding })
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync('onboarding_complete', 'true')
    set({ onboardingComplete: true })
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('onboarding_complete')
    set({ user: null, isAuthenticated: false, onboardingComplete: false })
  },
}))

export default useAuthStore