import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './CoursePlatform.css'
import './JobsPlatform.css'
import './CareerAssistant.css'
import './VisualEffects.css'
import './FuturisticTheme.css'
import './NeuralExperience.css'
import './NeuralBackground.css'
import './ThemeTokens.css'
import { GlobalThemeProvider } from './GlobalThemeProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalThemeProvider>
      <App />
    </GlobalThemeProvider>
  </StrictMode>,
)
