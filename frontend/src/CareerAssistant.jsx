import { useEffect, useState } from 'react'
import './CareerAssistant.css'
import { useLanguage } from './i18n.js'
import { NeuralIcon } from './NeuralExperience.jsx'

function stringList(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string').slice(0, 20)
}

async function loadCareerContext() {
  const response = await fetch('/api/jobs/recommendations', { credentials: 'same-origin' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`)

  const profile = body.profile || {}
  return {
    profile_context: {
      education: typeof profile.education === 'string' ? profile.education : '',
      degree: typeof profile.degree === 'string' ? profile.degree : '',
      skills: stringList(profile.skills),
      experience_years: Number(profile.experience_years) || 0,
      preferred_locations: stringList(profile.preferred_locations),
      career_interests: stringList(profile.career_interests),
    },
    job_context: (Array.isArray(body.recommendations) ? body.recommendations : [])
      .slice(0, 5)
      .map(({ job, match_percent, why_it_matches }) => ({
        title: job.title,
        company_name: job.company_name,
        location: job.location || '',
        match_percent: Number(match_percent) || 0,
        why_it_matches: stringList(why_it_matches),
      })),
  }
}

async function sendMessage(message, history, language, csrfToken, careerContext) {
  const response = await fetch('/api/ai/career-assistant', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ message, history, language, ...careerContext }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`)
  if (!body.answer) throw new Error('The assistant returned an empty answer. Please try again.')
  return body.answer
}

function CareerAssistant({ user, openRequest = 0 }) {
  const { language, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (openRequest > 0) setIsOpen(true)
  }, [openRequest])

  async function submit(event) {
    event.preventDefault()
    const message = question.trim()
    if (!message || !user || isSending) return

    setError('')
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', content: message }])
    setIsSending(true)
    try {
      const history = messages.slice(-8).map(({ role, content }) => ({ role, content }))
      const careerContext = /\b(job|jobs|opportunit|recommend|match|search|career|skill|role)\b/i.test(message)
        ? await loadCareerContext()
        : {}
      const answer = await sendMessage(
        message,
        history,
        language === 'ta' ? 'Tamil' : 'English',
        user.csrf_token,
        careerContext,
      )
      setMessages((current) => [...current, { role: 'assistant', content: answer }])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="assistant-widget" id="career-assistant">
      {isOpen && (
        <section className="career-assistant-panel" aria-label={t('AI Career Assistant')}>
          <header className="career-assistant-header">
            <span className={`assistant-mark assistant-mark-hero${isSending ? ' is-thinking' : ''}`} aria-hidden="true"><NeuralIcon /></span>
            <div>
              <strong>{t('AI Career Assistant')}</strong>
              <span>{t('Connected to the career AI service')}</span>
            </div>
            <button type="button" className="assistant-close" aria-label={t('Close assistant')} onClick={() => setIsOpen(false)}>×</button>
          </header>
          {!user ? (
            <div className="assistant-signin">
              <p>{t('Sign in to ask the AI assistant a question.')}</p>
              <a href="/login?next=%2F">{t('Sign in to continue →')}</a>
            </div>
          ) : (
            <>
              <div className="assistant-messages" role="log" aria-live="polite" aria-label={t('Conversation')}>
                {messages.length === 0 && (
                  <>
                    <p className="assistant-welcome">{t('Get help with resume analysis, job search, skill matches, career planning, or interview preparation.')}</p>
                    <div className="assistant-suggestions">
                      <button type="button" onClick={() => setQuestion(t('Review this resume excerpt for clarity and suggest improvements: '))}>{t('Analyze my resume')}</button>
                      <button type="button" onClick={() => setQuestion(t('How can I search for verified fresher jobs that match my skills?'))}>{t('Find matching jobs')}</button>
                      <button type="button" onClick={() => setQuestion(t('Help me prepare for an interview for this role: '))}>{t('Prepare for an interview')}</button>
                    </div>
                  </>
                )}
                {messages.map((item, index) => (
                  <p className={`assistant-message ${item.role}`} key={`${item.role}-${index}`}>{item.content}</p>
                ))}
                {isSending && <p className="assistant-thinking" role="status">{t('Thinking…')}</p>}
              </div>
              {error && <p className="assistant-error" role="alert">{t(error)}</p>}
              <form className="assistant-form" onSubmit={submit}>
                <label className="sr-only" htmlFor="career-assistant-question">{t('Your question')}</label>
                <textarea
                  id="career-assistant-question"
                  maxLength={1500}
                  rows={2}
                  required
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={t('Ask a career question…')}
                />
                <button type="submit" disabled={!question.trim() || isSending}>
                  {isSending ? t('Thinking…') : t('Send')}
                </button>
              </form>
              <p className="assistant-disclaimer">{t('AI answers can make mistakes. Don’t share passwords or private information.')}</p>
            </>
          )}
        </section>
      )}
      <button
        className="assistant-launcher"
        type="button"
        aria-expanded={isOpen}
        aria-controls="career-assistant"
        aria-label={t(isOpen ? 'Close AI Career Assistant' : 'Open AI Career Assistant')}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen
          ? <span className="assistant-launcher-close" aria-hidden="true">×</span>
          : <span className="assistant-launcher-sigil" aria-hidden="true"><NeuralIcon /></span>}
        <span>{t('Ask AI')}</span>
      </button>
    </div>
  )
}

export default CareerAssistant
