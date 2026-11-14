import { useEffect, useState } from 'react'
import './App.css'
import CoursePlatform from './CoursePlatform.jsx'
import { roadmapCategories, roadmaps } from './roadmaps.js'
import { LanguageProvider, LanguageSelector, translate, useLanguage } from './i18n.js'

async function readResponse(response) {
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.detail || `Request failed (${response.status})`)
  }

  return body
}

function HomePage() {
  const { language, t } = useLanguage()
  const [career, setCareer] = useState('')
  const [skills, setSkills] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [apiStatus, setApiStatus] = useState('checking')
  const [user, setUser] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredRoadmaps = roadmaps.filter((roadmap) => {
    const matchesCategory = category === 'All' || roadmap.category === category
    const query = search.trim().toLowerCase()
    const searchableText = [
      roadmap.title,
      roadmap.description,
      roadmap.category,
      ...roadmap.steps.flatMap((step) => [step.title, step.detail, ...step.topics]),
    ].join(' ').toLowerCase()
    const matchesSearch = !query || searchableText.includes(query)
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    let isMounted = true

    fetch('/api/health')
      .then(readResponse)
      .then(() => {
        if (isMounted) setApiStatus('online')
      })
      .catch(() => {
        if (isMounted) setApiStatus('offline')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(readResponse)
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setAnalysis('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ career: career.trim(), skills: skills.trim(), language: language === 'ta' ? 'Tamil' : 'English' }),
      })
      const result = await readResponse(response)

      if (!result.analysis) {
        throw new Error('The API returned an empty analysis. Please try again.')
      }

      setAnalysis(result.analysis)
    } catch (requestError) {
      setError(
        requestError.message === 'Failed to fetch'
          ? 'Could not connect to the backend. Make sure the API server is running.'
          : t(requestError.message),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('SkillSync AI home')}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SkillSync <strong>AI</strong></span>
        </a>
        <nav className="top-nav" aria-label={t('Main navigation')}>
          <a href="#roadmaps">{t('Explore roadmaps')}</a>
          <a href="#skill-match">{t('AI skill match')}</a>
          <a href={user ? '/dashboard' : '/login'}>{t(user ? 'My learning' : 'Sign in')}</a>
        </nav>
        <LanguageSelector />
        <a className="home-signup" href={user ? '/dashboard' : '/signup'}>{t(user ? 'Dashboard →' : 'Get started →')}</a>
        <div className={`api-status ${apiStatus}`} role="status">
          <span className="status-dot" />
          {apiStatus === 'checking'
            ? t('Checking API')
            : apiStatus === 'online'
              ? t('API connected')
              : t('API offline')}
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">{t('YOUR CAREER, WITH A CLEARER PATH')}</p>
        <h1>{t('Learn with a plan.')}<br /><span>{t('Grow with confidence.')}</span></h1>
        <p className="hero-copy">{t('Explore practical, step-by-step learning paths or get an AI-powered plan tailored to the skills you already have.')}</p>
        <a className="hero-link" href="#roadmaps">{t('Explore learning paths')} <span aria-hidden="true">↓</span></a>
      </section>

      <section className="roadmap-section" id="roadmaps" aria-labelledby="roadmaps-title">
        <div className="roadmap-intro">
          <div>
            <p className="eyebrow">{t('LEARN AT YOUR OWN PACE')}</p>
            <h2 id="roadmaps-title">{t('Explore career roadmaps')}</h2>
            <p>{t('Pick a path, work through each milestone, and keep track of your progress.')}</p>
          </div>
          <span className="path-count">{roadmaps.length} IT {t('career paths')}</span>
        </div>

        <div className="roadmap-controls">
          <label className="roadmap-search">
            <span className="sr-only">{t('Search roadmaps')}</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder={t('Search careers, skills, or tools')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="category-filters" aria-label={t('Filter roadmaps by category')}>
            {roadmapCategories.map((item) => (
              <button
                className={category === item ? 'filter-chip active' : 'filter-chip'}
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {translate(item, language)}
              </button>
            ))}
          </div>
        </div>

        {filteredRoadmaps.length > 0 ? (
          <div className="roadmap-grid">
            {filteredRoadmaps.map((roadmap) => (
                <a
                  className={`roadmap-card ${roadmap.color}`}
                  key={roadmap.id}
                  href={`/courses/${roadmap.id}`}
                >
                  <span className="card-topline">
                    <span className="roadmap-icon" aria-hidden="true">{roadmap.icon}</span>
                    <span className="card-duration">{roadmap.duration}</span>
                  </span>
                  <span className="roadmap-title">{translate(roadmap.title, language)}</span>
                  <span className="roadmap-description">{translate(roadmap.description, language)}</span>
                  <span className="roadmap-meta">
                    <span>{translate(roadmap.level, language)}</span>
                    <span>{roadmap.steps.length} {t('milestones')}</span>
                  </span>
                  <span className="card-progress">{t('Open course')} <span aria-hidden="true">→</span></span>
                </a>
            ))}
          </div>
        ) : (
          <div className="no-roadmaps">{t('No roadmaps match that search. Try another career or category.')}</div>
        )}

      </section>

      <section className="ai-section" id="skill-match" aria-labelledby="skill-match-title">
        <div className="ai-section-heading">
          <p className="eyebrow">{t('MAKE IT PERSONAL')}</p>
          <h2 id="skill-match-title">{t('Find your next step with AI')}</h2>
          <p>{t('See how your current skills line up with the role you want.')}</p>
        </div>
      <section className="workspace" aria-label={t('Skill analysis')}>
        <form className="analysis-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>{t('Start with your goal')}</h2>
              <p>{t('Share a target role and your current skills.')}</p>
            </div>
          </div>

          <label htmlFor="career">{t('Target career')}</label>
          <input
            id="career"
            name="career"
            type="text"
            placeholder={t('e.g. Frontend Developer')}
            value={career}
            onChange={(event) => setCareer(event.target.value)}
            required
            maxLength={120}
          />

          <label htmlFor="skills">{t('Skills you have')}</label>
          <textarea
            id="skills"
            name="skills"
            placeholder={t('e.g. HTML, CSS, JavaScript, teamwork...')}
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            required
            rows={5}
            maxLength={2000}
          />
          <p className="field-hint">{t('Separate skills with commas for the clearest results.')}</p>

          <button type="submit" disabled={isSubmitting || apiStatus !== 'online'}>
            {isSubmitting ? t('Building your roadmap…') : t('Analyze my skills')}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
          {apiStatus === 'offline' && (
            <p className="connection-hint">
              {t('Start the backend server to enable skill analysis.')}
            </p>
          )}
        </form>

        <section className={`result-panel${analysis ? ' has-result' : ''}`} aria-live="polite">
          {error ? (
            <div className="message-card error-card" role="alert">
              <span className="result-icon" aria-hidden="true">!</span>
              <h2>{t('We couldn’t complete the analysis')}</h2>
              <p>{t(error)}</p>
            </div>
          ) : analysis ? (
            <div className="analysis-result">
              <div className="section-heading">
                <span className="step-number">02</span>
                <div>
                  <h2>{t('Your roadmap')}</h2>
                  <p>{t('Recommendations for becoming a')} {career.trim()}.</p>
                </div>
              </div>
              <div className="analysis-copy">{analysis}</div>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✳</span>
              <h2>{t('Your next step starts here')}</h2>
              <p>{t('Your strengths, skills to build, learning roadmap, and project ideas will appear here.')}</p>
            </div>
          )}
        </section>
      </section>
      </section>
      <footer>{t('Built to help you grow, one skill at a time.')}</footer>
    </main>
  )
}

function App() {
  const path = window.location.pathname
  return (
    <LanguageProvider>
      {path === '/' || path === '' ? <HomePage /> : <CoursePlatform path={path} />}
    </LanguageProvider>
  )
}

export default App
