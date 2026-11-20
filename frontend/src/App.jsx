import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './App.css'
import CareerAssistant from './CareerAssistant.jsx'
import { roadmapCategories, roadmaps } from './roadmaps.js'
import { LanguageProvider, LanguageSelector, translate, useLanguage } from './i18n.js'
import NeuralBackground from './NeuralBackground.jsx'
import { NeuralClickEffect, NeuralIcon, NeuralTransition } from './NeuralExperience.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'

const CoursePlatform = lazy(() => import('./CoursePlatform.jsx'))
const JobsPlatform = lazy(() => import('./JobsPlatform.jsx'))

async function readResponse(response) {
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.detail || `Request failed (${response.status})`)
  }

  return body
}

const featureShowcase = [
  { icon: '▣', title: 'AI Resume Builder', description: 'Create a polished, editable resume with AI writing support.', available: false },
  { icon: '⌕', title: 'ATS Resume Analyzer', description: 'Check resume alignment with a role and identify areas to improve.', available: false },
  { icon: '◎', title: 'Company-Specific Resume Assistant', description: 'Tailor a truthful resume draft to a company and job description.', available: false },
  { icon: '⌂', title: 'India Job Portal', description: 'Search admin-verified Indian job listings and official company career pages.', available: true, destination: 'jobs' },
  { icon: '◆', title: 'Product-Based Company Jobs', description: 'Search verified openings and go directly to official application pages.', available: true, destination: 'product-jobs' },
  { icon: '◈', title: 'Service-Based Company Jobs', description: 'Search verified openings and go directly to official application pages.', available: true, destination: 'service-jobs' },
  { icon: '</>', title: 'Interactive Coding Learning', description: 'Study lessons and use the existing safe HTML/CSS preview.', available: true, destination: 'frontend' },
  { icon: 'Py', title: 'Python Learning', description: 'Find introductory Python topics in current data career paths.', available: true, destination: 'data-scientist' },
  { icon: 'Ja', title: 'Java Learning', description: 'A dedicated Java learning path is being prepared.', available: false },
  { icon: 'JS', title: 'JavaScript Learning', description: 'Explore JavaScript lessons in the frontend learning path.', available: true, destination: 'frontend' },
  { icon: 'SQL', title: 'SQL Learning', description: 'Practice SQL topics through current data career paths.', available: true, destination: 'data-analyst' },
  { icon: 'DSA', title: 'DSA Practice', description: 'Structured data-structures and algorithms exercises.', available: false },
  { icon: '✳', title: 'AI Career Assistant', description: 'Ask career and learning questions in English or Tamil.', available: true, destination: 'assistant' },
  { icon: '↗', title: 'Career Roadmap', description: 'Browse existing career paths and their guided milestones.', available: true, destination: 'roadmaps' },
  { icon: '⌁', title: 'Skill Gap Analyzer', description: 'Get AI guidance on skills to build for a target career.', available: true, destination: 'skill-match' },
  { icon: '◉', title: 'AI Mock Interview', description: 'Role-specific interview practice and answer feedback.', available: false },
  { icon: '{ }', title: 'Coding Assessment', description: 'Secure, language-specific coding assessments.', available: false },
  { icon: '✦', title: 'Project Recommendations', description: 'Get project ideas as part of the existing AI skill analysis.', available: true, destination: 'skill-match' },
  { icon: '✧', title: '3D Skill Galaxy', description: 'Interactive skill visualization based on saved learner progress.', available: false },
  { icon: '▤', title: 'Career Progress Dashboard', description: 'Review saved course and assessment progress.', available: true, destination: 'dashboard' },
]

const learningAreas = [
  'Python', 'Java', 'JavaScript', 'HTML', 'CSS', 'React', 'SQL',
  'DSA', 'Data Science', 'Machine Learning', 'AI', 'Cybersecurity Fundamentals', 'Cloud Computing',
]

function FeatureCard({ feature, href, onAssistantOpen, t }) {
  const contents = (
    <>
      <span className="feature-icon" aria-hidden="true">{feature.icon}</span>
      <span className="feature-status">{t(feature.available ? 'Available' : 'Coming Soon')}</span>
      <strong>{t(feature.title)}</strong>
      <span className="feature-description">{t(feature.description)}</span>
      {feature.available && <span className="feature-link-label">{t(feature.destination === 'assistant' ? 'Open assistant →' : 'Explore feature →')}</span>}
    </>
  )

  if (!feature.available) {
    return <article className="feature-card coming-soon">{contents}</article>
  }
  if (feature.destination === 'assistant') {
    return <button className="feature-card available-feature" type="button" onClick={onAssistantOpen}>{contents}</button>
  }
  return <a className="feature-card available-feature" href={href}>{contents}</a>
}

function HomePage({ onAssistantOpen, user }) {
  const { language, t } = useLanguage()
  const [career, setCareer] = useState('')
  const [skills, setSkills] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [apiStatus, setApiStatus] = useState('checking')
  const [featuredJobs, setFeaturedJobs] = useState([])
  const [featuredCompanies, setFeaturedCompanies] = useState([])
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
  const [discoveryError, setDiscoveryError] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
    Promise.all([
      fetch('/api/jobs?page_size=3').then(readResponse),
      fetch('/api/jobs/companies').then(readResponse),
    ]).then(([jobResult, companyResult]) => {
      if (!active) return
      setFeaturedJobs(jobResult.jobs)
      setFeaturedCompanies(companyResult.companies.slice(0, 4))
    }).catch((requestError) => {
      if (active) setDiscoveryError(requestError.message)
    }).finally(() => {
      if (active) setDiscoveryLoading(false)
    })
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
        <a className="brand" href="#home" aria-label={t('SkillSync AI home')}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SkillSync <strong>AI</strong></span>
        </a>
        <nav id="primary-navigation" className={`top-nav${menuOpen ? ' is-open' : ''}`} aria-label={t('Main navigation')}>
          <a href="#home" onClick={() => setMenuOpen(false)}>{t('Home')}</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>{t('Features')}</a>
          <a href="#learning" onClick={() => setMenuOpen(false)}>{t('Learning')}</a>
          <a href="/jobs" onClick={() => setMenuOpen(false)}>{t('Jobs')}</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>{t('About')}</a>
        </nav>
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={t(menuOpen ? 'Close navigation' : 'Open navigation')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
        <LanguageSelector />
        <ThemeSwitcher />
        <a className="home-login" href={user ? '/dashboard' : '/login'}>{t(user ? 'Dashboard' : 'Login')}</a>
        <a className="home-signup" href={user ? '/dashboard' : '/signup'}>{t(user ? 'Dashboard →' : 'Get Started')}</a>
        <div className={`api-status ${apiStatus}`} role="status">
          <span className="status-dot" />
          {apiStatus === 'checking'
            ? t('Checking API')
            : apiStatus === 'online'
              ? t('API connected')
              : t('API offline')}
        </div>
      </header>

      <section className="hero hero-modern" id="home">
        <div className="hero-copy-pane">
          <p className="eyebrow">{t('YOUR CAREER, WITH A CLEARER PATH')}</p>
          <h1>{t('Your Career.')}<br /><span>{t('Your Universe.')}</span></h1>
          <p className="hero-copy">{t('Search verified opportunities, find your next role, and build a career plan with AI guidance made for you.')}</p>
          <form className="hero-job-search" action="/jobs" method="get">
            <label className="sr-only" htmlFor="homepage-job-search">{t('Search jobs')}</label>
            <span aria-hidden="true">⌕</span>
            <input id="homepage-job-search" name="search" type="search" placeholder={t('Job title, company, or skill')} />
            <button type="submit">{t('Search jobs')} <span aria-hidden="true">→</span></button>
          </form>
          <div className="hero-search-tags" aria-label={t('Popular job searches')}>
            <span>{t('Popular searches')}</span>
            <a href="/jobs?search=Software%20Engineer">{t('Software engineering')}</a>
            <a href="/jobs?search=Data%20Analyst">{t('Data analyst')}</a>
            <a href="/jobs?employment_type=Internship">{t('Internships')}</a>
          </div>
          <div className="hero-actions">
            <a className="hero-primary" href={user ? '/jobs/recommended' : '/login?next=%2Fjobs%2Frecommended'}>{t('Explore AI job matches')} <span aria-hidden="true">→</span></a>
            <a className="hero-secondary" href="#jobs">{t('Browse companies')}</a>
          </div>
          <p className="hero-note">{t('Verified listings only. Your application stays on the employer’s official website.')}</p>
        </div>
        <div className="hero-visual" role="img" aria-label={t('AI neural brain illustration')}>
          <div className="hero-neural-aura" aria-hidden="true"><NeuralIcon className="hero-neural-icon" /></div>
          <div className="hero-proof-card">
            <span className="hero-proof-mark" aria-hidden="true">✓</span>
            <span><strong>Verified opportunities</strong><small>Official sources. Clear details.</small></span>
          </div>
          <div className="hero-proof-card hero-proof-match">
            <span className="hero-proof-mark" aria-hidden="true">AI</span>
            <span><strong>Personalized matches</strong><small>Based on your career profile.</small></span>
          </div>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="landing-section-heading">
          <p className="eyebrow">{t('YOUR NEXT STEP, MADE CLEAR')}</p>
          <h2 id="how-title">{t('How SkillSync works')}</h2>
        </div>
        <div className="how-grid">
          <article className="how-card"><span>01</span><h3>{t('Create your student profile')}</h3><p>{t('Save your account and keep your learning progress together.')}</p></article>
          <article className="how-card"><span>02</span><h3>{t('Learn skills step by step')}</h3><p>{t('Choose an existing career roadmap, study lessons, and complete assessments.')}</p></article>
          <article className="how-card"><span>03</span><h3>{t('Prepare for your next opportunity')}</h3><p>{t('Use AI skill guidance and search verified jobs today. Resume tools are coming soon.')}</p></article>
        </div>
      </section>

      <section className="feature-showcase" id="features" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <p className="eyebrow">{t('CAREER TOOLS, IN ONE PLACE')}</p>
          <h2 id="features-title">{t('Explore the SkillSync ecosystem')}</h2>
          <p>{t('Available features link to working parts of the app. Planned modules are marked Coming Soon.')}</p>
        </div>
        <div className="feature-grid">
          {featureShowcase.map((feature) => {
            const coursePath = feature.destination === 'frontend'
              ? '/courses/frontend'
              : feature.destination === 'data-scientist'
                ? '/courses/data-scientist'
                : feature.destination === 'data-analyst'
                  ? '/courses/data-analyst'
                  : null
            const href = feature.destination === 'jobs'
              ? '/jobs'
              : feature.destination === 'product-jobs'
                ? '/jobs?organization_type=Product'
                : feature.destination === 'service-jobs'
                  ? '/jobs?organization_type=Service'
                    : feature.destination === 'roadmaps'
                      ? '#roadmaps'
                      : feature.destination === 'skill-match'
                        ? '#skill-match'
                        : feature.destination === 'dashboard'
                          ? user ? '/dashboard' : '/login?next=%2Fdashboard'
                          : coursePath
                            ? user ? coursePath : `/login?next=${encodeURIComponent(coursePath)}`
                            : '#'
            return (
              <FeatureCard
                key={feature.title}
                feature={feature}
                href={href}
                onAssistantOpen={onAssistantOpen}
                t={t}
              />
            )
          })}
        </div>
      </section>

      <section className="learning-showcase" id="learning" aria-labelledby="learning-title">
        <div className="landing-section-heading">
          <p className="eyebrow">{t('LEARN AT YOUR OWN PACE')}</p>
          <h2 id="learning-title">{t('Learning areas')}</h2>
          <p>{t('These topics appear across career paths; standalone course coverage varies. Browse the current roadmaps for available lessons.')}</p>
        </div>
        <div className="learning-chip-grid">
          {learningAreas.map((area) => <span className="learning-chip" key={area}>{translate(area, language)}</span>)}
        </div>
        <a className="section-link" href="#roadmaps">{t('Browse existing learning paths →')}</a>
      </section>

      <section className="jobs-showcase" id="jobs" aria-labelledby="jobs-title">
        <div className="landing-section-heading">
          <p className="eyebrow">{t('JOBS IN INDIA')}</p>
          <h2 id="jobs-title">{t('Explore companies and verified openings')}</h2>
          <p>{t('Search official company career pages and active job listings verified by an administrator. Listings are never invented.')}</p>
        </div>
        <div className="home-discovery-grid">
          <section className="home-discovery-panel" aria-labelledby="featured-jobs-title">
            <div className="home-discovery-heading">
              <div><p className="eyebrow">{t('NEW AND VERIFIED')}</p><h3 id="featured-jobs-title">{t('Latest job openings')}</h3></div>
              <a href="/jobs">{t('View all')} <span aria-hidden="true">→</span></a>
            </div>
            {discoveryLoading
              ? <div className="home-discovery-loading" role="status">{t('Loading verified openings…')}</div>
              : discoveryError
                ? <p className="home-discovery-message" role="alert">{t('Job listings are temporarily unavailable. Please try again from the jobs portal.')}</p>
                : featuredJobs.length
                  ? <div className="home-featured-list">{featuredJobs.map((job) => (
                    <a className="home-featured-job" href={`/jobs?search=${encodeURIComponent(job.title)}`} key={job.id}>
                      <span className="home-featured-job-mark" aria-hidden="true">{job.company_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                      <span><strong>{job.title}</strong><small>{job.company_name} · {job.location}</small></span>
                      <span className="home-featured-arrow" aria-hidden="true">↗</span>
                    </a>
                  ))}</div>
                  : <div className="home-discovery-message"><strong>No active verified listings right now.</strong><span>Check official company career pages or revisit soon.</span></div>}
          </section>
          <section className="home-discovery-panel" aria-labelledby="featured-companies-title">
            <div className="home-discovery-heading">
              <div><p className="eyebrow">{t('OFFICIAL CAREER PAGES')}</p><h3 id="featured-companies-title">{t('Explore companies')}</h3></div>
              <a href="/jobs/companies">{t('Directory')} <span aria-hidden="true">→</span></a>
            </div>
            {discoveryLoading
              ? <div className="home-discovery-loading" role="status">{t('Loading company directory…')}</div>
              : discoveryError
                ? <p className="home-discovery-message" role="alert">{t('The company directory is temporarily unavailable.')}</p>
                : <div className="home-company-list">{featuredCompanies.map((company) => (
                  <a className="home-company-row" href="/jobs/companies" key={company.id}>
                    <span className="home-company-mark" aria-hidden="true">{company.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                    <span><strong>{company.name}</strong><small>{company.industry}</small></span>
                    <span className="home-featured-arrow" aria-hidden="true">↗</span>
                  </a>
                ))}</div>}
          </section>
        </div>
        <section className="home-match-banner">
          <div><p className="eyebrow">{t('MATCHED TO YOUR NEXT MOVE')}</p><h3>{t('AI-recommended jobs, grounded in your profile')}</h3><p>{t('Personalized matches use your saved skills, interests, and location preferences.')}</p></div>
          <a className="hero-primary" href={user ? '/jobs/recommended' : '/login?next=%2Fjobs%2Frecommended'}>{t(user ? 'See my recommendations' : 'Sign in for recommendations')} <span aria-hidden="true">→</span></a>
        </section>
        <div className="job-type-grid">
          <article className="job-type-card">
            <span className="job-type-icon" aria-hidden="true">◆</span>
            <div><h3>{t('Product-Based Companies')}</h3><p>{t('Browse company career pages and verified openings.')}</p></div>
            <a className="section-link" href="/jobs?organization_type=Product">Explore jobs →</a>
          </article>
          <article className="job-type-card">
            <span className="job-type-icon" aria-hidden="true">◈</span>
            <div><h3>{t('Service-Based Companies')}</h3><p>{t('Browse company career pages and verified openings.')}</p></div>
            <a className="section-link" href="/jobs?organization_type=Service">Explore jobs →</a>
          </article>
        </div>
        <a className="section-link" href="/jobs">Open India jobs portal →</a>
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

      <section className="about-showcase" id="about" aria-labelledby="about-title">
        <p className="eyebrow">{t('ABOUT SKILLSYNC AI')}</p>
        <h2 id="about-title">{t('A clearer path from learning to opportunity.')}</h2>
        <p>{t('SkillSync brings verified job discovery, personalized career guidance, and your existing learning tools into one connected workspace.')}</p>
      </section>

      <footer>{t('Built to help you grow, one skill at a time.')}</footer>
      <footer className="site-footer">
        <div><strong>SkillSync AI</strong><p>{t('A career-first job discovery platform.')}</p></div>
        <nav aria-label={t('Footer navigation')}>
          <a href="#about">{t('About')}</a>
          <a href="#features">{t('Features')}</a>
          <a href="#learning">{t('Learning')}</a>
          <a href="#jobs">{t('Jobs')}</a>
          <a href="#about">{t('Contact')}</a>
          <span>{t('Privacy Policy · Coming Soon')}</span>
          <span>{t('Terms and Conditions · Coming Soon')}</span>
        </nav>
      </footer>
    </main>
  )
}

function App() {
  const [route, setRoute] = useState(() => `${window.location.pathname}${window.location.search}`)
  const [transitionId, setTransitionId] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [impact, setImpact] = useState(null)
  const [assistantUser, setAssistantUser] = useState(null)
  const [assistantOpenRequest, setAssistantOpenRequest] = useState(0)
  const transitionTimer = useRef(null)
  const impactTimer = useRef(null)
  const currentUrl = new URL(route, window.location.origin)
  const path = currentUrl.pathname

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(readResponse)
      .then(({ user }) => {
        if (active) setAssistantUser(user)
      })
      .catch(() => {
        if (active) setAssistantUser(null)
      })
    return () => { active = false }
  }, [route])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(`${window.location.pathname}${window.location.search}`)
      setTransitionId((id) => id + 1)
      setIsTransitioning(true)
      window.clearTimeout(transitionTimer.current)
      transitionTimer.current = window.setTimeout(() => setIsTransitioning(false), 620)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.clearTimeout(transitionTimer.current)
      window.clearTimeout(impactTimer.current)
    }
  }, [])

  function handleExperienceClick(event) {
    const target = event.target instanceof Element ? event.target : null
    const control = target?.closest('button, a.jp-primary-button, a.hero-primary, a.platform-primary')
    if (control && !control.matches(':disabled')) {
      const bounds = control.getBoundingClientRect()
      const id = Date.now() + Math.random()
      setImpact({
        id,
        x: event.clientX || bounds.left + bounds.width / 2,
        y: event.clientY || bounds.top + bounds.height / 2,
      })
      window.clearTimeout(impactTimer.current)
      impactTimer.current = window.setTimeout(() => {
        setImpact((current) => current?.id === id ? null : current)
      }, 500)
    }

    const anchor = target?.closest('a[href]')
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target ||
      anchor.hasAttribute('download')
    ) return

    const destination = new URL(anchor.href, window.location.href)
    if (destination.origin !== window.location.origin) return
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
      if (destination.hash || destination.href === window.location.href) return
    }

    event.preventDefault()
    window.history.pushState({}, '', destination)
    window.scrollTo(0, 0)
    setRoute(`${destination.pathname}${destination.search}`)
    setTransitionId((id) => id + 1)
    setIsTransitioning(true)
    window.clearTimeout(transitionTimer.current)
    transitionTimer.current = window.setTimeout(() => setIsTransitioning(false), 620)
  }

  return (
    <div className="experience-root" onClick={handleExperienceClick}>
      <LanguageProvider>
        <NeuralBackground />
        <div className="route-surface" key={`${path}${currentUrl.search}`}>
          <Suspense fallback={<div className="route-loading" role="status">Loading your workspace…</div>}>
            {path === '/' || path === ''
              ? <HomePage
                user={assistantUser}
                onAssistantOpen={() => setAssistantOpenRequest((request) => request + 1)}
              />
              : path.startsWith('/jobs')
                ? <JobsPlatform path={path} />
                : <CoursePlatform path={path} />}
          </Suspense>
        </div>
        <CareerAssistant user={assistantUser} openRequest={assistantOpenRequest} />
      </LanguageProvider>
      <NeuralTransition active={isTransitioning} transitionId={transitionId} />
      <NeuralClickEffect impact={impact} />
    </div>
  )
}

export default App
