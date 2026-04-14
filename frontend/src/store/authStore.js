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
        // No token — not logged in, go to login screen
        set({
          isAuthenticated: false,
          isLoading: false,
          onboardingComplete: false,
        })
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false, onboardingComplete: false })
    }
  },

  login: async (tokens, user) => {
    // Save tokens immediately
    await SecureStore.setItemAsync('access_token', tokens.access_token)
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token)
    // New users always go to onboarding
    await SecureStore.setItemAsync('onboarding_complete', 'false')
    set({
      user,
      isAuthenticated: true,
      onboardingComplete: false,
    })
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
    set({
      user: null,
      isAuthenticated: false,
      onboardingComplete: false,
    })
  },
}))

export default useAuthStore