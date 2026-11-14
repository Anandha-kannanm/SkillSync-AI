import { useEffect, useMemo, useState } from 'react'
import './CoursePlatform.css'
import LearningLesson from './LearningLesson.jsx'
import { getLessonContent } from './learningResources.js'
import { roadmaps } from './roadmaps.js'
import { LanguageSelector, translate, useLanguage } from './i18n.js'

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`)
  return body
}

function safeNextPath(path) {
  return path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}

function AuthPage({ mode }) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSignup = mode === 'signup'
  const nextPath = safeNextPath(new URLSearchParams(window.location.search).get('next') || '/dashboard')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await apiRequest(`/api/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      })
      window.location.replace(nextPath)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="platform-shell auth-shell">
      <a className="platform-brand" href="/">
        <span className="brand-mark">S</span>
        <span>SkillSync <strong>AI</strong></span>
      </a>
      <LanguageSelector className="auth-language" />
      <section className="auth-card">
        <div className="auth-illustration" aria-hidden="true">
          <span className="auth-orbit orbit-one" />
          <span className="auth-orbit orbit-two" />
          <span className="auth-orbit-core">S</span>
          <span className="auth-floating-note note-one">{t('Learn')}</span>
          <span className="auth-floating-note note-two">{t('Build')}</span>
          <span className="auth-floating-note note-three">{t('Grow')}</span>
        </div>
        <div className="auth-form-side">
          <p className="platform-eyebrow">{t('YOUR NEXT CHAPTER STARTS HERE')}</p>
          <h1>{t(isSignup ? 'Create your account' : 'Welcome back')}</h1>
          <p className="auth-subtitle">
            {t(isSignup ? 'Save your learning, track your skills, and earn certificates.' : 'Pick up right where you left off.')}
          </p>
          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label>
                {t('Name')}
                <input autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            )}
            <label>
              {t('Email')}
              <input autoComplete="email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              {t('Password')}
              <input
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={isSignup ? 10 : 1}
                maxLength={128}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {isSignup && <small>{t('Use at least 10 characters.')}</small>}
            </label>
            {error && <p className="platform-error" role="alert">{error}</p>}
            <button className="platform-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('Please wait…') : t(isSignup ? 'Create account' : 'Sign in')}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="auth-switch">
            {t(isSignup ? 'Already have an account?' : 'New to SkillSync?')}
            {' '}<a href={`/${isSignup ? 'login' : 'signup'}?next=${encodeURIComponent(nextPath)}`}>{t(isSignup ? 'Sign in' : 'Create an account')}</a>
          </p>
          <p className="auth-security">{t('Your password is securely hashed. Your learning progress belongs to your account.')}</p>
        </div>
      </section>
      <a className="auth-back" href="/">{t('← Back to roadmaps')}</a>
    </main>
  )
}

function PlatformHeader({ user, csrfToken }) {
  const { t } = useLanguage()
  const [signOutError, setSignOutError] = useState('')

  async function signOut() {
    setSignOutError('')
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      })
      window.location.replace('/')
    } catch (requestError) {
      setSignOutError(requestError.message)
    }
  }

  return (
    <header className="platform-header">
      <a className="platform-brand" href="/">
        <span className="brand-mark">S</span>
        <span>SkillSync <strong>AI</strong></span>
      </a>
      <nav className="platform-nav" aria-label={t('Course navigation')}>
        <a href="/">{t('Explore')}</a>
        <a href="/dashboard">{t('My learning')}</a>
      </nav>
      <LanguageSelector />
      <div className="platform-user">
        <span className="user-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="platform-user-name">{user.name}</span>
        <button type="button" className="sign-out-button" onClick={signOut}>{t('Sign out')}</button>
      </div>
      {signOutError && <p className="platform-error signout-error" role="alert">{t(signOutError)}</p>}
    </header>
  )
}

function useAuthenticatedPage() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    let active = true
    apiRequest('/api/auth/me')
      .then(({ user }) => {
        if (active) setSession(user)
      })
      .catch(() => {
        if (active) {
          const next = `${window.location.pathname}${window.location.search}`
          window.location.replace(`/login?next=${encodeURIComponent(next)}`)
        }
      })
    return () => { active = false }
  }, [])

  return { session }
}

function DashboardPage() {
  const { language, t } = useLanguage()
  const { session } = useAuthenticatedPage()
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    apiRequest('/api/dashboard')
      .then((result) => setCourses(result.courses))
      .catch((requestError) => setError(requestError.message))
  }, [session])

  if (!session) return <LoadingPage />

  return (
    <main className="platform-shell">
      <PlatformHeader user={session} csrfToken={session.csrf_token} />
      <section className="dashboard-welcome">
        <p className="platform-eyebrow">{t('YOUR PERSONAL LEARNING SPACE')}</p>
        <h1>{t('Welcome back,')} {session.name.split(' ')[0]}.</h1>
        <p>{t('Every lesson completed is a step closer to your next opportunity.')}</p>
        <a className="platform-primary dashboard-explore" href="/">{t('Explore career paths')} <span aria-hidden="true">→</span></a>
      </section>
      <section className="dashboard-courses">
        <div className="platform-section-heading">
          <div><p className="platform-eyebrow">{t('PICK UP WHERE YOU LEFT OFF')}</p><h2>{t('My learning')}</h2></div>
          <span>{courses.length} {t(courses.length === 1 ? 'active course' : 'active courses')}</span>
        </div>
        {error && <p className="platform-error" role="alert">{t(error)}</p>}
        {!error && courses.length === 0 ? (
          <div className="dashboard-empty">
            <span aria-hidden="true">✦</span>
            <h3>{t('Your learning journey starts here')}</h3>
            <p>{t('Choose a career path and your progress will appear here automatically.')}</p>
            <a href="/">{t('Browse roadmaps →')}</a>
          </div>
        ) : (
          <div className="dashboard-course-grid">
            {courses.map((item) => {
              const roadmap = roadmaps.find((course) => course.id === item.course_id)
              if (!roadmap) return null
              const percent = Math.round(item.completed_lessons.length / roadmap.steps.length * 100)
              return (
                <a className="dashboard-course-card" href={`/courses/${roadmap.id}`} key={roadmap.id}>
                  <span className={`roadmap-icon ${roadmap.color}`}>{roadmap.icon}</span>
                  <span className="dashboard-course-title">{translate(roadmap.title, language)}</span>
                  <span className="dashboard-progress-label">{percent}% {t('lessons complete · best test')} {item.best_score}%</span>
                  <span className="dashboard-progress-track"><span style={{ width: `${percent}%` }} /></span>
                  <span className="dashboard-continue">{t(item.certificate_unlocked ? 'View certificate →' : 'Continue learning →')}</span>
                </a>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function Assessment({ course, csrfToken, onSubmitted }) {
  const { language, t } = useLanguage()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function loadAssessment() {
    setLoading(true)
    setError('')
    try {
      const { questions: nextQuestions } = await apiRequest(`/api/courses/${course.id}/assessment`)
      setQuestions(nextQuestions)
      setAnswers({})
      setResult(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAssessment() }, [course.id])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await apiRequest(`/api/courses/${course.id}/assessment`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ answers }),
      })
      setResult(response)
      onSubmitted(response.progress)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="assessment-panel" id="final-assessment">
      <div className="assessment-intro">
        <span className="assessment-icon" aria-hidden="true">✎</span>
        <div>
          <p className="platform-eyebrow">{t('FINAL KNOWLEDGE CHECK')}</p>
          <h2>{t('Course assessment')}</h2>
          <p>{t('Answer every question. Your result and topics to revisit will be saved to your account.')}</p>
        </div>
        <span className="assessment-count">{questions.length || '—'} {t('questions')}</span>
      </div>
      {loading ? <p className="course-loading">{t('Preparing your assessment…')}</p> : error && !result ? <p className="platform-error" role="alert">{t(error)}</p> : (
        <form className="assessment-form" onSubmit={submit}>
          {questions.map((question, index) => (
            <fieldset className="assessment-question" key={question.id}>
              <legend><span>{String(index + 1).padStart(2, '0')}</span>{t(question.question)}</legend>
              <p className="assessment-topic">TOPIC · {t(question.topic)}</p>
              <div className="assessment-options">
                {question.options.map((option, choice) => (
                  <label className={answers[question.id] === choice ? 'assessment-option selected' : 'assessment-option'} key={option}>
                    <input type="radio" name={question.id} checked={answers[question.id] === choice} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice }))} />
                    <span>{t(option)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <p className="platform-error" role="alert">{t(error)}</p>}
          {!result && <button className="platform-primary assessment-submit" type="submit" disabled={submitting || Object.keys(answers).length !== questions.length}>
            {submitting ? t('Checking your answers…') : t('Submit assessment')} <span aria-hidden="true">→</span>
          </button>}
        </form>
      )}
      {result && (
        <div className={`assessment-result ${result.percent === 100 ? 'perfect' : ''}`} role="status">
          <div className="score-orb"><span>{result.percent}%</span></div>
          <div className="assessment-result-copy">
            <p className="platform-eyebrow">{t(result.percent === 100 ? 'PERFECT SCORE' : 'ASSESSMENT COMPLETE')}</p>
            <h3>{result.score} / {result.total} {t('correct answers')}</h3>
            <p>{t(result.percent === 100 ? 'Excellent work! You achieved 100% on this assessment.' : 'Review the topics below, revisit related lessons, then take the assessment again.')}</p>
            {result.weak_topics.length > 0 && (
              <div className="weak-topics">
                <strong>{t('Topics to practise next')}</strong>
                <div>{result.weak_topics.map((topic) => {
                  const stepIndex = course.steps.findIndex((step) => `${step.title} ${step.topics.join(' ')}`.toLowerCase().includes(topic.toLowerCase()))
                  return <button type="button" key={topic} onClick={() => document.getElementById(`course-lesson-${Math.max(stepIndex, 0)}`)?.scrollIntoView({ behavior: 'smooth' })}>{translate(topic, language)} · {t('Review lesson →')}</button>
                })}</div>
              </div>
            )}
            {result.percent < 100 && <button className="assessment-retry" type="button" onClick={loadAssessment}>{t('Retake assessment →')}</button>}
            {result.progress.certificate_unlocked && <a className="platform-primary certificate-link" href="#certificate">{t('Your certificate is ready →')}</a>}
          </div>
        </div>
      )}
    </section>
  )
}

function Certificate({ course, certificate, onLoad, error }) {
  const { language, t } = useLanguage()
  return (
    <section className="certificate-panel" id="certificate" aria-labelledby="certificate-title">
      {!certificate ? (
        <div className="certificate-locked">
          <span className="certificate-lock" aria-hidden="true">✦</span>
          <div><p className="platform-eyebrow">{t('COURSE CERTIFICATE')}</p><h2 id="certificate-title">{t('Your achievement is within reach')}</h2><p>{t('Complete every lesson and earn 100% on the final assessment to unlock your certificate.')}</p></div>
          <button type="button" className="certificate-check" onClick={onLoad}>{t('Check eligibility')}</button>
          {error && <p className="platform-error" role="alert">{t(error)}</p>}
        </div>
      ) : (
        <article className="certificate-document">
          <div className="certificate-seal">S</div>
          <p className="platform-eyebrow">{t('SKILLSYNC AI · CERTIFICATE OF COMPLETION')}</p>
          <h2 id="certificate-title">{t('Certificate of Achievement')}</h2>
          <p className="certificate-recipient">{t('This certificate is proudly presented to')}</p>
          <strong className="certificate-name">{certificate.learner_name}</strong>
          <p className="certificate-recipient">{t('for completing the learning path')}</p>
          <h3>{translate(course.title, language)}</h3>
          <div className="certificate-meta"><span>{t('Assessment score')} <strong>{certificate.score}%</strong></span><span>{t('Certificate ID')} <strong>{certificate.certificate_id}</strong></span></div>
          <p className="certificate-date">{new Date(certificate.completed_at).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <button className="certificate-print" type="button" onClick={() => window.print()}>{t('Print / Save as PDF')}</button>
        </article>
      )}
    </section>
  )
}

function CoursePage({ course }) {
  const { language, t } = useLanguage()
  const { session } = useAuthenticatedPage()
  const [progress, setProgress] = useState(null)
  const [activeLesson, setActiveLesson] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [certificateError, setCertificateError] = useState('')
  const [tutorQuestion, setTutorQuestion] = useState('')
  const [tutorAnswer, setTutorAnswer] = useState('')
  const [tutorError, setTutorError] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)
  const [lessonCompleteMessage, setLessonCompleteMessage] = useState('')

  async function loadProgress() {
    if (!session) return
    try {
      const result = await apiRequest(`/api/courses/${course.id}/progress`)
      setProgress(result)
      const firstIncomplete = Array.from({ length: course.steps.length }, (_, index) => index)
        .find((index) => !result.completed_lessons.includes(index))
      setActiveLesson(firstIncomplete ?? course.steps.length - 1)
      if (result.certificate_unlocked) {
        const unlocked = await apiRequest(`/api/courses/${course.id}/certificate`)
        setCertificate(unlocked)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProgress() }, [session, course.id])

  const completedLessons = useMemo(() => new Set(progress?.completed_lessons ?? []), [progress])
  const completedPercent = progress ? Math.round(completedLessons.size / course.steps.length * 100) : 0
  const step = course.steps[activeLesson]
  const lesson = getLessonContent(course, step)

  async function markLessonComplete(index) {
    if (!session || completedLessons.has(index)) return
    setError('')
    try {
      const updated = await apiRequest(`/api/courses/${course.id}/lessons/${index}/complete`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrf_token },
        body: JSON.stringify({ lesson_index: index }),
      })
      setProgress(updated)
      setLessonCompleteMessage(t('Lesson passed — your course progress was saved.'))
      if (index + 1 < course.steps.length) {
        window.setTimeout(() => {
          setActiveLesson(index + 1)
          setLessonCompleteMessage('')
        }, 900)
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function askTutor(event) {
    event.preventDefault()
    setTutorError('')
    setTutorAnswer('')
    setTutorLoading(true)
    try {
      const result = await apiRequest('/api/ai/tutor', {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrf_token },
        body: JSON.stringify({
          question: tutorQuestion,
          language: language === 'ta' ? 'Tamil' : 'English',
          lesson_title: step.title,
          lesson_context: `${step.detail}\nConcept: ${lesson.explanation}\nExample:\n${lesson.example}\nTopics: ${step.topics.join(', ')}`,
        }),
      })
      setTutorAnswer(result.answer)
      setTutorQuestion('')
    } catch (requestError) {
      setTutorError(requestError.message)
    } finally {
      setTutorLoading(false)
    }
  }

  async function loadCertificate() {
    setCertificateError('')
    try {
      const result = await apiRequest(`/api/courses/${course.id}/certificate`)
      setCertificate(result)
    } catch (requestError) {
      setCertificateError(requestError.message)
    }
  }

  async function handleAssessmentProgress(updated) {
    setProgress(updated)
    if (updated.certificate_unlocked) {
      try {
        setCertificate(await apiRequest(`/api/courses/${course.id}/certificate`))
      } catch (requestError) {
        setCertificateError(requestError.message)
      }
    }
  }

  if (!session || loading) return <LoadingPage message={t('Loading your course…')} />

  return (
    <main className="platform-shell course-shell">
      <PlatformHeader user={session} csrfToken={session.csrf_token} />
      <div className="course-back-row"><a href="/">{t('← All career paths')}</a><span>{t('Learning path')} <b>/</b> {translate(course.category, language)}</span></div>
      <section className="course-hero">
        <div className="course-hero-main">
          <span className={`course-hero-icon ${course.color}`}>{course.icon}</span>
          <div>
            <p className="platform-eyebrow">{translate(course.category, language).toUpperCase()} · {translate(course.level, language).toUpperCase()}</p>
            <h1>{translate(course.title, language)}</h1>
            <p>{translate(course.description, language)}</p>
          </div>
        </div>
        <div className="course-progress-summary">
          <span className="course-progress-number">{completedPercent}%</span>
          <span>{completedLessons.size} {t('OF')} {course.steps.length} {t('lessons')}</span>
          <span className="dashboard-progress-track"><span style={{ width: `${completedPercent}%` }} /></span>
        </div>
      </section>
      <div className="course-workspace">
        <aside className="course-sidebar">
          <div className="course-sidebar-heading"><span>{t('YOUR COURSE')}</span><strong>{course.steps.length} {t('lessons')}</strong></div>
          <ol>
            {course.steps.map((item, index) => {
              const isLocked = index > 0 && !completedLessons.has(index - 1)
              return <li key={item.title}>
                <button
                  type="button"
                  className={`course-sidebar-item${activeLesson === index ? ' active' : ''}${completedLessons.has(index) ? ' complete' : ''}`}
                  disabled={isLocked}
                  aria-current={activeLesson === index ? 'step' : undefined}
                  onClick={() => { setActiveLesson(index); setLessonCompleteMessage(''); }}
                >
                  <span className="course-sidebar-number">{completedLessons.has(index) ? '✓' : isLocked ? '·' : String(index + 1).padStart(2, '0')}</span>
                  <span>{translate(item.title, language)}</span>
                </button>
              </li>
            })}
          </ol>
          <div className="sidebar-progress">
            <span>{t('Course progress')}</span><strong>{completedPercent}%</strong>
            <span className="dashboard-progress-track"><span style={{ width: `${completedPercent}%` }} /></span>
          </div>
          {progress?.certificate_unlocked && <a className="sidebar-certificate" href="#certificate">{t('✦ Certificate unlocked')}</a>}
        </aside>
        <div className="course-main">
          {error && <p className="platform-error course-error" role="alert">{error}</p>}
          <LearningLesson
            key={`${course.id}-${activeLesson}`}
            roadmap={course}
            stepIndex={activeLesson}
            completed={completedLessons}
            onLessonPassed={markLessonComplete}
            lessonCompleteMessage={lessonCompleteMessage}
          />
          <section className="ai-tutor-panel">
            <div className="tutor-heading">
              <span className="tutor-avatar" aria-hidden="true">✳</span>
              <div><p className="platform-eyebrow">{t('YOUR PERSONAL STUDY BUDDY')}</p><h2>{t('Ask the AI tutor')}</h2><p>{t('Ask about this lesson. Get a simpler explanation, a hint, or another example.')}</p></div>
            </div>
            <div className="tutor-suggestion-row">
              {['Explain more simply', 'Give me a small hint', 'Show another example'].map((prompt) => (
                <button type="button" key={prompt} onClick={() => setTutorQuestion(t(prompt))}>{t(prompt)}</button>
              ))}
            </div>
            {tutorAnswer && <div className="tutor-answer"><strong>AI tutor</strong><p>{tutorAnswer}</p></div>}
            {tutorError && <p className="platform-error" role="alert">{t(tutorError)}</p>}
            <form className="tutor-form" onSubmit={askTutor}>
              <label className="sr-only" htmlFor="tutor-question">{t('Ask a question about this lesson')}</label>
              <input id="tutor-question" maxLength={1500} required placeholder={t("I don't understand this part…")} value={tutorQuestion} onChange={(event) => setTutorQuestion(event.target.value)} />
              <button type="submit" disabled={tutorLoading}>{tutorLoading ? t('Thinking…') : t('Ask tutor →')}</button>
            </form>
            <p className="tutor-privacy">{t('Don’t share passwords, API keys, or personal information. AI answers can make mistakes.')}</p>
          </section>
          {progress?.completed_lessons.length === course.steps.length && (
            <Assessment course={course} csrfToken={session.csrf_token} onSubmitted={handleAssessmentProgress} />
          )}
          {progress && (
            <Certificate course={course} certificate={certificate} onLoad={loadCertificate} error={certificateError} />
          )}
        </div>
      </div>
    </main>
  )
}

function LoadingPage({ message = 'Checking your secure session…' }) {
  const { t } = useLanguage()
  return <main className="platform-shell loading-shell"><span className="brand-mark">S</span><LanguageSelector /><p>{t(message)}</p></main>
}

function PlatformApp({ path }) {
  if (path === '/login' || path === '/signup') return <AuthPage mode={path.slice(1)} />
  if (path === '/dashboard') return <DashboardPage />
  if (path.startsWith('/courses/')) {
    const course = roadmaps.find((item) => item.id === path.slice('/courses/'.length))
    return course ? <CoursePage course={course} /> : <NotFoundPage />
  }
  return <NotFoundPage />
}

function NotFoundPage() {
  const { t } = useLanguage()
  return <main className="platform-shell not-found"><LanguageSelector /><h1>{t('This course could not be found.')}</h1><a href="/">{t('Browse learning paths →')}</a></main>
}

export default PlatformApp
