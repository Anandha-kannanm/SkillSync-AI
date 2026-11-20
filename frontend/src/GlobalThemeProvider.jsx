import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'webverse-display-theme'
const INTENSITY_STORAGE_KEY = 'webverse-animation-intensity'
const themes = ['dark', 'light', 'comfort']
const intensities = ['low', 'normal', 'high']

function storedValue(key, allowedValues, fallback) {
  const value = localStorage.getItem(key)
  return allowedValues.includes(value) ? value : fallback
}

const ThemeContext = createContext(null)

function GlobalThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = storedValue(THEME_STORAGE_KEY, themes, 'light')
    document.documentElement.dataset.theme = savedTheme
    return savedTheme
  })
  const [intensity, setIntensity] = useState(() => {
    const savedIntensity = storedValue(INTENSITY_STORAGE_KEY, intensities, 'normal')
    document.documentElement.dataset.animationIntensity = savedIntensity
    return savedIntensity
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.animationIntensity = intensity
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    localStorage.setItem(INTENSITY_STORAGE_KEY, intensity)
  }, [theme, intensity])

  const value = useMemo(() => ({ theme, setTheme, intensity, setIntensity }), [theme, intensity])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function useGlobalTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useGlobalTheme must be used inside GlobalThemeProvider.')
  return context
}

export { GlobalThemeProvider, useGlobalTheme }
