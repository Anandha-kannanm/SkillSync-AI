import { NeuralIcon } from './NeuralExperience.jsx'
import { useGlobalTheme } from './GlobalThemeProvider.jsx'
import { useLanguage } from './i18n.js'

function ThemeSwitcher({ className = '' }) {
  const { theme, setTheme, intensity, setIntensity } = useGlobalTheme()
  const { t } = useLanguage()

  return (
    <details className={`theme-switcher ${className}`.trim()}>
      <summary aria-label={t('Display settings')}>
        <NeuralIcon className="theme-switcher-icon" />
        <span>{t('Display')}</span>
      </summary>
      <div className="theme-switcher-menu">
        <label>
          {t('Theme')}
          <select aria-label={t('Color theme')} value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="dark">{t('Dark Mode')}</option>
            <option value="light">{t('Light Mode')}</option>
            <option value="comfort">{t('Eye Comfort Mode')}</option>
          </select>
        </label>
        <label>
          {t('Animation intensity')}
          <select aria-label={t('Animation intensity')} value={intensity} onChange={(event) => setIntensity(event.target.value)}>
            <option value="low">{t('Low')}</option>
            <option value="normal">{t('Normal')}</option>
            <option value="high">{t('High')}</option>
          </select>
        </label>
      </div>
    </details>
  )
}

export default ThemeSwitcher
