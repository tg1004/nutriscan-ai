import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { lightColors, darkColors, getTypography, spacing, radius, shadows } from '../theme'

// Create the context with lightColors as default — never undefined
const ThemeContext = createContext({
  colors: lightColors,
  typography: getTypography(lightColors),
  isDark: false,
  spacing,
  radius,
  shadows,
  toggleTheme: () => {},
})

// Provider wraps the whole app
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)
  const [colors, setColors] = useState(lightColors)  // initialized immediately

  useEffect(() => {
    // Load saved preference after mount
    SecureStore.getItemAsync('theme').then(saved => {
      if (saved === 'dark') {
        setIsDark(true)
        setColors(darkColors)
      }
    }).catch(() => {})
  }, [])

  const toggleTheme = async () => {
    const next = !isDark
    setIsDark(next)
    setColors(next ? darkColors : lightColors)
    try {
      await SecureStore.setItemAsync('theme', next ? 'dark' : 'light')
    } catch {}
  }

  const value = {
    colors,
    typography: getTypography(colors),
    isDark,
    spacing,
    radius,
    shadows,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Single hook — use this everywhere instead of useThemeStore
export function useTheme() {
  return useContext(ThemeContext)
}