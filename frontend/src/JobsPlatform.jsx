import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import './JobsPlatform.css'
import { LanguageSelector } from './i18n.js'
import { NeuralIcon, NeuralLoader } from './NeuralExperience.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import { useGlobalTheme } from './GlobalThemeProvider.jsx'

const EMPTY_PROFILE = {
  education: '',
  degree: '',
  skills: [],
  experience_years: 0,
  preferred_locations: [],
  career_interests: [],
  resume_text: '',
  alerts_enabled: true,
  minimum_match_percent: 70,
}

const FRESHER_FILTERS = [
  { label: 'MCA freshers', education: 'MCA', max_experience: '1' },
  { label: 'BCA freshers', education: 'BCA', max_experience: '1' },
  { label: 'BTech freshers', education: 'BTech', max_experience: '1' },
  { label: 'MBA freshers', education: 'MBA', max_experience: '1' },
  { label: 'Any degree', education: 'degree', max_experience: '1' },
  { label: 'Internships', employment_type: 'Internship' },
  { label: 'Entry-level', max_experience: '2' },
]

async function apiRequest(url, options = {}, csrfToken = '') {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`)
  return body
}

function commaList(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function dateLabel(value) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString()
}

function salaryLabel(job) {
  if (job.salary_min == null && job.salary_max == null) return 'Not disclosed'
  const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
  if (job.salary_min != null && job.salary_max != null) return `${formatter.format(job.salary_min)} – ${formatter.format(job.salary_max)} / year`
  return `${formatter.format(job.salary_min ?? job.salary_max)} / year`
}

function CompanyCard({ company }) {
  const initials = company.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return (
    <article className="jp-company-card">
      {company.logo_url
        ? <img className="jp-company-logo" src={company.logo_url} alt={`${company.name} logo`} loading="lazy" referrerPolicy="no-referrer" />
        : <span className="jp-company-logo jp-company-monogram" aria-hidden="true">{initials}</span>}
      <div className="jp-company-copy">
        <h3>{company.name}</h3>
        <p>{company.industry} <span aria-hidden="true">·</span> {company.organization_type}</p>
        <small>{company.headquarters}</small>
        {company.careers_link_reviewed_at && <small className="jp-reviewed">Career link reviewed {dateLabel(company.careers_link_reviewed_at)}</small>}
      </div>
      <a className="jp-secondary-button" href={company.careers_url} target="_blank" rel="noreferrer">Official careers page <span aria-hidden="true">↗</span></a>
    </article>
  )
}

function JobCard({ job, match, saved, applicationStatus, applying, applicationConfirmed, onSave, onApplied }) {
  const initials = job.company_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const reducedMotion = useReducedMotion()
  return (
    <motion.article
      className={`jp-job-card${applicationConfirmed ? ' jp-application-confirmed' : ''}`}
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      whileHover={reducedMotion ? undefined : { y: -3, rotateX: 1 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.36, ease: 'easeOut' }}
      style={{ transformPerspective: 900 }}
    >
      <div className="jp-job-card-head">
        <span className="jp-company-logo jp-company-monogram" aria-hidden="true">{initials}</span>
        <div className="jp-job-title">
          <div className="jp-job-eyebrows">
            <span className="jp-job-category">{job.category}</span>
            <span className="jp-verified-pill">Verified listing</span>
          </div>
          <h3>{job.title}</h3>
          <p>{job.company_name} <span aria-hidden="true">·</span> {job.location}</p>
        </div>
        {match && <strong className="jp-match-score">{match.match_percent}%<small>profile match</small></strong>}
      </div>
      <div className="jp-job-facts">
        <span>{job.work_mode}</span>
        <span>{job.employment_type}</span>
        <span>{job.experience_min}–{job.experience_max ?? 'Any'} years</span>
        <span>{salaryLabel(job)}</span>
      </div>
      {job.required_education?.length > 0 && <p className="jp-job-eligibility"><b>Eligibility:</b> {job.required_education.join(', ')}</p>}
      <p className="jp-job-description">{job.description}</p>
      {job.skills?.length > 0 && <div className="jp-chip-row" aria-label="Required skills">{job.skills.map((skill) => <span className="jp-chip" key={skill}>{skill}</span>)}</div>}
      <div className="jp-job-foot">
        <div className="jp-job-source">
          <a href={job.source_url} target="_blank" rel="noreferrer">Source: {job.source_name} ↗</a>
          <span>Verified {dateLabel(job.verified_at)}</span>
          <span>Posted {dateLabel(job.posted_at)}</span>
        </div>
        <div className="jp-job-actions">
          <button type="button" className="jp-secondary-button" onClick={() => onSave(job.id, !saved)}>{saved ? 'Saved' : 'Save job'}</button>
          <a className="jp-primary-button" href={job.application_url} target="_blank" rel="noreferrer">Apply on official site <span aria-hidden="true">↗</span></a>
          {onApplied && <button type="button" className="jp-text-button jp-mark-applied" disabled={applying || applicationStatus === 'applied'} onClick={() => onApplied(job.id)}>{applying ? 'Saving…' : applicationStatus ? `Status: ${applicationStatus}` : 'Mark applied'}</button>}
        </div>
      </div>
      {applicationConfirmed && <div className="jp-application-success" role="status"><span aria-hidden="true">✦</span> APPLICATION TRACKED</div>}
      {match && (
        <div className="jp-match-detail">
          <strong>Why it matches</strong>
          <ul>{match.why_it_matches.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {match.missing_skills.length > 0 && <p><b>Skills to build:</b> {match.missing_skills.join(', ')}</p>}
          {match.required_qualifications.length > 0 && <p><b>Required qualifications:</b> {match.required_qualifications.join(', ')}</p>}
          <a href={match.learning_path.url}>Explore {match.learning_path.title} →</a>
          <small>{match.score_note}</small>
        </div>
      )}
    </motion.article>
  )
}

function JobFields({ form, setForm, companies, categories }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <>
      <label>Company
        <select required value={form.company_id} onChange={(event) => update('company_id', event.target.value)}>
          <option value="">Select a company</option>
          {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
        </select>
      </label>
      <label>Job title<input required maxLength={180} value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
      <label>Category
        <select required value={form.category} onChange={(event) => update('category', event.target.value)}>
          <option value="">Select a category</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label>City<input required maxLength={100} value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
      <label>State<input required maxLength={100} value={form.state} onChange={(event) => update('state', event.target.value)} /></label>
      <label>Work mode
        <select value={form.work_mode} onChange={(event) => update('work_mode', event.target.value)}>
          <option>Office</option><option>Hybrid</option><option>Remote</option>
        </select>
      </label>
      <label>Employment type
        <select value={form.employment_type} onChange={(event) => update('employment_type', event.target.value)}>
          <option>Full-time</option><option>Internship</option><option>Contract</option><option>Government</option>
        </select>
      </label>
      <label>Experience range (years)<span className="jp-inline-fields">
        <input aria-label="Minimum experience" type="number" min="0" max="60" step="0.5" value={form.experience_min} onChange={(event) => update('experience_min', event.target.value)} />
        <input aria-label="Maximum experience" type="number" min="0" max="60" step="0.5" value={form.experience_max} onChange={(event) => update('experience_max', event.target.value)} placeholder="Any" />
      </span></label>
      <label>Annual salary range (INR)<span className="jp-inline-fields">
        <input aria-label="Minimum annual salary" type="number" min="0" value={form.salary_min} onChange={(event) => update('salary_min', event.target.value)} placeholder="Not disclosed" />
        <input aria-label="Maximum annual salary" type="number" min="0" value={form.salary_max} onChange={(event) => update('salary_max', event.target.value)} placeholder="Not disclosed" />
      </span></label>
      <label>Required qualifications (comma-separated)<input value={form.required_education} onChange={(event) => update('required_education', event.target.value)} /></label>
      <label>Required skills (comma-separated)<input value={form.skills} onChange={(event) => update('skills', event.target.value)} /></label>
      <label>Apply URL<input type="url" required placeholder="https://" value={form.application_url} onChange={(event) => update('application_url', event.target.value)} /></label>
      <label>Source URL<input type="url" required placeholder="Official source page" value={form.source_url} onChange={(event) => update('source_url', event.target.value)} /></label>
      <label>Source name<input required value={form.source_name} onChange={(event) => update('source_name', event.target.value)} /></label>
      <label>Expires at<input type="datetime-local" required value={form.expires_at} onChange={(event) => update('expires_at', event.target.value)} /></label>
      <label className="jp-span-all">Job description<textarea required maxLength={10000} rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
    </>
  )
}

const emptyJobForm = () => ({
  company_id: '',
  title: '',
  category: '',
  description: '',
  city: '',
  state: '',
  work_mode: 'Office',
  employment_type: 'Full-time',
  experience_min: '0',
  experience_max: '',
  salary_min: '',
  salary_max: '',
  required_education: '',
  skills: '',
  posted_at: '',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  application_url: '',
  source_url: '',
  source_name: 'Official company careers page',
})

function toJobPayload(form) {
  const optionalNumber = (value) => value === '' ? null : Number(value)
  return {
    ...form,
    experience_min: Number(form.experience_min || 0),
    experience_max: optionalNumber(form.experience_max),
    salary_min: optionalNumber(form.salary_min),
    salary_max: optionalNumber(form.salary_max),
    required_education: commaList(form.required_education),
    skills: commaList(form.skills),
    expires_at: new Date(form.expires_at).toISOString(),
    posted_at: form.posted_at ? new Date(form.posted_at).toISOString() : null,
  }
}

function initialJobFilters() {
  const params = new URLSearchParams(window.location.search)
  return Object.fromEntries(
    ['search', 'company_id', 'category', 'state', 'city', 'work_mode', 'employment_type', 'organization_type', 'education', 'skills', 'min_salary', 'max_salary', 'min_experience', 'max_experience']
      .map((key) => [key, params.get(key) || ''])
      .filter(([, value]) => value),
  )
}

function JobsPlatform({ path }) {
  const { theme } = useGlobalTheme()
  const view = path.replace(/\/+$/, '') || '/jobs'
  const protectedView = ['/jobs/recommended', '/jobs/saved', '/jobs/applied', '/jobs/alerts', '/jobs/profile', '/jobs/admin'].includes(view)
  const isCompanies = view === '/jobs/companies'
  const isAdmin = view === '/jobs/admin'
  const [session, setSession] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')
  const [companies, setCompanies] = useState([])
  const [categories, setCategories] = useState([])
  const [jobs, setJobs] = useState([])
  const [totalJobs, setTotalJobs] = useState(0)
  const [jobPage, setJobPage] = useState(1)
  const [jobPageSize, setJobPageSize] = useState(20)
  const [recommendations, setRecommendations] = useState([])
  const [savedJobs, setSavedJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [alerts, setAlerts] = useState([])
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [filters, setFilters] = useState(initialJobFilters)
  const [companyQuery, setCompanyQuery] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [applyingJobId, setApplyingJobId] = useState(null)
  const [successJobId, setSuccessJobId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [adminSummary, setAdminSummary] = useState(null)
  const [adminListings, setAdminListings] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [adminCategories, setAdminCategories] = useState([])
  const [adminAnalytics, setAdminAnalytics] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [isJobAdmin, setIsJobAdmin] = useState(false)
  const [companyForm, setCompanyForm] = useState({ id: '', name: '', industry: '', organization_type: '', headquarters: '', website_url: '', careers_url: '', logo_url: '', review_careers_link: false })
  const [jobForm, setJobForm] = useState(emptyJobForm)
  const [editingJob, setEditingJob] = useState(null)
  const [alertPopup, setAlertPopup] = useState(null)

  useEffect(() => {
    let active = true
    apiRequest('/api/auth/me')
      .then(({ user }) => {
        if (active) {
          setSession(user)
          setCsrfToken(user.csrf_token || '')
        }
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setSessionChecked(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!sessionChecked) return
    if (protectedView && !session) {
      window.location.replace(`/login?next=${encodeURIComponent(view)}`)
    }
  }, [protectedView, session, sessionChecked, view])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      apiRequest('/api/jobs/companies'),
      apiRequest('/api/jobs/categories'),
    ]).then(([companyResult, categoryResult]) => {
      if (!active) return
      setCompanies(companyResult.companies)
      setCategories(categoryResult.categories)
    }).catch((requestError) => {
      if (active) setError(requestError.message)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (isCompanies || protectedView || isAdmin) return undefined
    let active = true
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value != null) params.set(key, value)
      })
      params.set('page', String(jobPage))
      params.set('page_size', String(jobPageSize))
      apiRequest(`/api/jobs?${params.toString()}`)
        .then((result) => {
          if (!active) return
          setJobs(result.jobs)
          setTotalJobs(result.total)
          setJobPageSize(result.page_size)
        })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }, 180)
    return () => { active = false; clearTimeout(timer) }
  }, [filters, isCompanies, isAdmin, protectedView, jobPage, jobPageSize])

  useEffect(() => {
    if (!session || !sessionChecked) return undefined
    let active = true
    apiRequest('/api/admin/jobs/summary')
      .then(() => { if (active) setIsJobAdmin(true) })
      .catch(() => { if (active) setIsJobAdmin(false) })
    if (view === '/jobs/profile') {
      apiRequest('/api/jobs/profile')
        .then((result) => { if (active) setProfile(result.profile) })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }
    if (view === '/jobs/recommended' || view === '/jobs' || view === '/jobs/alerts') {
      apiRequest('/api/jobs/recommendations')
        .then((result) => {
          if (active) {
            setRecommendations(result.recommendations)
            if (view === '/jobs' || view === '/jobs/alerts') {
              return apiRequest('/api/jobs/alerts').then((alertResult) => {
                if (!active) return
                setAlerts(alertResult.alerts)
                if (view === '/jobs') {
                  const unseenAlert = alertResult.alerts.find((alert) => {
                    return !localStorage.getItem(`skillsync-job-alert-seen:${session.id}:${alert.id}`)
                  })
                  if (unseenAlert) {
                    localStorage.setItem(`skillsync-job-alert-seen:${session.id}:${unseenAlert.id}`, '1')
                    setAlertPopup(unseenAlert)
                  }
                }
              })
            }
          }
          return undefined
        })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }
    if (view === '/jobs/saved' || view === '/jobs' || view === '/jobs/recommended') {
      apiRequest('/api/jobs/saved')
        .then((result) => { if (active) setSavedJobs(result.jobs) })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }
    if (view === '/jobs/applied') {
      apiRequest('/api/jobs/applications')
        .then((result) => { if (active) setApplications(result.applications) })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }
    if (isAdmin) {
      Promise.all([
        apiRequest('/api/admin/jobs/summary'),
        apiRequest('/api/admin/jobs/listings'),
        apiRequest('/api/admin/jobs/users'),
        apiRequest('/api/admin/jobs/categories'),
        apiRequest('/api/admin/jobs/analytics'),
      ]).then(([summary, listingResult, userResult, categoryResult, analyticsResult]) => {
        if (!active) return
        setAdminSummary(summary)
        setAdminListings(listingResult.jobs)
        setAdminUsers(userResult.users)
        setAdminCategories(categoryResult.categories)
        setAdminAnalytics(analyticsResult.by_industry)
      }).catch((requestError) => { if (active) setError(requestError.message) })
    }
    return () => { active = false }
  }, [isAdmin, session, sessionChecked, view])

  const companiesFiltered = useMemo(() => companies.filter((company) => {
    const matchesText = !companyQuery || `${company.name} ${company.industry} ${company.headquarters}`.toLowerCase().includes(companyQuery.toLowerCase())
    const matchesIndustry = !industryFilter || company.industry.toLowerCase().includes(industryFilter.toLowerCase())
    return matchesText && matchesIndustry
  }), [companies, companyQuery, industryFilter])

  async function refreshSavedJobs() {
    if (!session) return
    const result = await apiRequest('/api/jobs/saved')
    setSavedJobs(result.jobs)
  }

  async function saveJob(jobId, saved) {
    if (!session) {
      window.location.assign(`/login?next=${encodeURIComponent(view)}`)
      return false
    }
    setError('')
    try {
      await apiRequest(`/api/jobs/${jobId}/save`, {
        method: 'POST',
        body: JSON.stringify({ saved }),
      }, csrfToken)
      setNotice(saved ? 'Job saved to your account.' : 'Job removed from saved jobs.')
      if (view === '/jobs/saved') await refreshSavedJobs()
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    }
  }

  async function markApplied(jobId) {
    if (!session) {
      window.location.assign(`/login?next=${encodeURIComponent(view)}`)
      return
    }
    setError('')
    setNotice('')
    setApplyingJobId(jobId)
    try {
      await apiRequest(`/api/jobs/${jobId}/application`, {
        method: 'POST',
        body: JSON.stringify({ status: 'applied' }),
      }, csrfToken)
      setApplications((current) => [
        { id: jobId, status: 'applied' },
        ...current.filter((application) => application.id !== jobId),
      ])
      setNotice('Application activity confirmed. SkillSync records your status but does not submit applications.')
      setSuccessJobId(jobId)
      window.setTimeout(() => {
        setSuccessJobId((current) => current === jobId ? null : current)
      }, 2400)
      if (view === '/jobs/applied') {
        const result = await apiRequest('/api/jobs/applications')
        setApplications(result.applications)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setApplyingJobId(null)
    }
  }

  async function dismissAlert(jobId) {
    try {
      await apiRequest(`/api/jobs/alerts/${jobId}/dismiss`, { method: 'POST' }, csrfToken)
      setAlerts((current) => current.filter((alert) => alert.id !== jobId))
      setAlertPopup(null)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const payload = {
      ...profile,
      skills: Array.isArray(profile.skills) ? profile.skills : commaList(profile.skills),
      preferred_locations: Array.isArray(profile.preferred_locations) ? profile.preferred_locations : commaList(profile.preferred_locations),
      career_interests: Array.isArray(profile.career_interests) ? profile.career_interests : commaList(profile.career_interests),
      experience_years: Number(profile.experience_years || 0),
      minimum_match_percent: Number(profile.minimum_match_percent || 70),
    }
    try {
      const result = await apiRequest('/api/jobs/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, csrfToken)
      setProfile({ ...result.profile, resume_text: payload.resume_text })
      setNotice('Your private job profile was saved.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function createOrEditJob(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const endpoint = editingJob ? `/api/admin/jobs/listings/${editingJob}/edit` : '/api/admin/jobs/listings'
      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(toJobPayload(jobForm)),
      }, csrfToken)
      setNotice(result.message)
      setEditingJob(null)
      setJobForm(emptyJobForm())
      const [summary, listingResult] = await Promise.all([
        apiRequest('/api/admin/jobs/summary'),
        apiRequest('/api/admin/jobs/listings'),
      ])
      setAdminSummary(summary)
      setAdminListings(listingResult.jobs)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function saveCompany(event) {
    event.preventDefault()
    setError('')
    try {
      const { company } = await apiRequest('/api/admin/jobs/companies', {
        method: 'POST',
        body: JSON.stringify(companyForm),
      }, csrfToken)
      setCompanies((current) => [...current.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name)))
      setNotice(`${company.name} company details saved.`)
      setCompanyForm({ id: '', name: '', industry: '', organization_type: '', headquarters: '', website_url: '', careers_url: '', logo_url: '', review_careers_link: false })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function reviewJob(jobId, status) {
    setError('')
    try {
      const result = await apiRequest(`/api/admin/jobs/listings/${jobId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }, csrfToken)
      setNotice(result.message)
      const [summary, listingResult] = await Promise.all([
        apiRequest('/api/admin/jobs/summary'),
        apiRequest('/api/admin/jobs/listings'),
      ])
      setAdminSummary(summary)
      setAdminListings(listingResult.jobs)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function setUserStatus(userId, active) {
    try {
      await apiRequest(`/api/admin/jobs/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ active }),
      }, csrfToken)
      const result = await apiRequest('/api/admin/jobs/users')
      setAdminUsers(result.users)
      setNotice(active ? 'Account enabled.' : 'Account disabled and its sessions revoked.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function saveCategory(event) {
    event.preventDefault()
    try {
      await apiRequest('/api/admin/jobs/categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName, active: true }),
      }, csrfToken)
      const [allCategories, activeCategories] = await Promise.all([
        apiRequest('/api/admin/jobs/categories'),
        apiRequest('/api/jobs/categories'),
      ])
      setAdminCategories(allCategories.categories)
      setCategories(activeCategories.categories)
      setCategoryName('')
      setNotice('Job category saved.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function setCategoryActive(category, active) {
    try {
      await apiRequest('/api/admin/jobs/categories', {
        method: 'POST',
        body: JSON.stringify({ name: category.name, active }),
      }, csrfToken)
      const [allCategories, activeCategories] = await Promise.all([
        apiRequest('/api/admin/jobs/categories'),
        apiRequest('/api/jobs/categories'),
      ])
      setAdminCategories(allCategories.categories)
      setCategories(activeCategories.categories)
      setNotice(`Category ${active ? 'enabled' : 'disabled'}.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function editJob(job) {
    setEditingJob(job.id)
    setJobForm({
      company_id: job.company_id,
      title: job.title,
      category: job.category,
      description: job.description,
      city: job.city,
      state: job.state,
      work_mode: job.work_mode,
      employment_type: job.employment_type,
      experience_min: String(job.experience_min),
      experience_max: job.experience_max == null ? '' : String(job.experience_max),
      salary_min: job.salary_min == null ? '' : String(job.salary_min),
      salary_max: job.salary_max == null ? '' : String(job.salary_max),
      required_education: job.required_education.join(', '),
      skills: job.skills.join(', '),
      posted_at: new Date(job.posted_at).toISOString().slice(0, 16),
      expires_at: new Date(job.expires_at).toISOString().slice(0, 16),
      application_url: job.application_url,
      source_url: job.source_url,
      source_name: job.source_name,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editCompany(company) {
    setCompanyForm({
      id: company.id,
      name: company.name,
      industry: company.industry,
      organization_type: company.organization_type,
      headquarters: company.headquarters,
      website_url: company.website_url,
      careers_url: company.careers_url,
      logo_url: company.logo_url || '',
      review_careers_link: Boolean(company.careers_link_reviewed_at),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateFilter(key, value) {
    setJobPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function applyFresherFilter(preset) {
    setJobPage(1)
    setFilters((current) => ({ ...current, ...preset }))
  }

  const activeJobs = view === '/jobs/saved' ? savedJobs : view === '/jobs/applied' ? applications : jobs
  const activeTitle = isCompanies
    ? 'India company directory'
    : isAdmin
      ? 'Job operations'
      : view === '/jobs/profile'
        ? 'Your job profile'
        : view === '/jobs/recommended'
          ? 'Recommended for you'
          : view === '/jobs/saved'
            ? 'Saved jobs'
            : view === '/jobs/applied'
              ? 'Application tracking'
              : view === '/jobs/alerts'
                ? 'Job alerts'
                : 'Find verified jobs across India'

  return (
    <main className="jobs-platform" data-theme={theme}>
      <header className="jp-header">
        <a className="jp-brand" href="/" aria-label="SkillSync AI home"><span className="jp-brand-mark">S</span><span>SkillSync <strong>AI</strong></span></a>
        <nav className="jp-top-nav" aria-label="Job platform navigation">
          <a href="/jobs" aria-current={view === '/jobs' ? 'page' : undefined}>Find jobs</a>
          <a href="/jobs/companies" aria-current={isCompanies ? 'page' : undefined}>Companies</a>
          <a href="/dashboard">Learning</a>
        </nav>
        <div className="jp-header-actions">
          <ThemeSwitcher />
          <LanguageSelector />
          {session ? <a className="jp-sign-in" href="/dashboard">{session.name.split(' ')[0]}</a> : <a className="jp-sign-in" href={`/login?next=${encodeURIComponent(view)}`}>Sign in</a>}
        </div>
      </header>

      <div className="jp-layout">
        <aside className="jp-sidebar" aria-label="Job workspace">
          <p className="jp-side-label">WORKSPACE</p>
          <a className={view === '/jobs' ? 'active' : ''} href="/jobs">⌕ <span>Search jobs</span></a>
          <a className={isCompanies ? 'active' : ''} href="/jobs/companies">▦ <span>Company directory</span></a>
          <a className={view === '/jobs' && filters.organization_type === 'Product' ? 'active' : ''} href="/jobs?organization_type=Product">◆ <span>Product-based jobs</span></a>
          <a className={view === '/jobs' && filters.organization_type === 'Service' ? 'active' : ''} href="/jobs?organization_type=Service">◈ <span>Service-based jobs</span></a>
          <p className="jp-side-label">MY CAREER</p>
          <a className={view === '/jobs/recommended' ? 'active' : ''} href={`/jobs/recommended`}><NeuralIcon className="jp-nav-neural" /> <span>Recommended jobs</span></a>
          <a className={view === '/jobs/saved' ? 'active' : ''} href="/jobs/saved">♡ <span>Saved jobs</span></a>
          <a className={view === '/jobs/applied' ? 'active' : ''} href="/jobs/applied">↗ <span>Applied jobs</span></a>
          <a className={view === '/jobs/alerts' ? 'active' : ''} href="/jobs/alerts">◉ <span>Job alerts</span>{alerts.length > 0 && <i>{alerts.length}</i>}</a>
          <a className={view === '/jobs/profile' ? 'active' : ''} href="/jobs/profile">◈ <span>My profile</span></a>
          {isJobAdmin && <a className={isAdmin ? 'active' : ''} href="/jobs/admin">⚙ <span>Admin</span></a>}
          <div className="jp-sidebar-note"><span>✓</span><p>Only listings verified by a job administrator appear as active opportunities.</p></div>
        </aside>

        <section className="jp-content">
          <div className="jp-heading-row">
            <div>
              <p className="jp-eyebrow">SKILLSYNC INDIA JOBS</p>
              <h1>{activeTitle}</h1>
              <p className="jp-subtitle">{isCompanies ? 'Explore employers and go directly to their official career pages.' : isAdmin ? 'Review sources, verify listings, and manage the company directory.' : 'Discover opportunities with transparent sources and profile-aware matching.'}</p>
            </div>
            <div className="jp-neural-sidecar" aria-hidden="true"><NeuralIcon /></div>
            {session && <a className="jp-primary-button" href="/jobs/profile">Complete job profile <span aria-hidden="true">→</span></a>}
          </div>

          {error && <p className="jp-feedback error" role="alert">{error}</p>}
          {notice && <p className="jp-feedback success" role="status">{notice}</p>}

          {isCompanies && (
            <section className="jp-panel">
              <div className="jp-filter-row">
                <label>Search companies<input type="search" value={companyQuery} onChange={(event) => setCompanyQuery(event.target.value)} placeholder="Name, industry, or city" /></label>
                <label>Industry<select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}><option value="">All industries</option>{[...new Set(companies.map((item) => item.industry))].sort().map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <p className="jp-source-note">Career-page links open the company’s site. A review date is shown only when the link was checked.</p>
              {loading ? <NeuralLoader label="Loading the company directory" /> : companiesFiltered.length
                ? <div className="jp-company-grid">{companiesFiltered.map((company) => <CompanyCard company={company} key={company.id} />)}</div>
                : <div className="jp-empty">No companies match that search.</div>}
            </section>
          )}

          {view === '/jobs' && (
            <>
              <section className="jp-fresher-panel">
                <div><p className="jp-eyebrow">START YOUR CAREER</p><h2>Fresher and early-career opportunities</h2></div>
                <div className="jp-fresher-chips">{FRESHER_FILTERS.map((preset) => <button type="button" key={preset.label} onClick={() => applyFresherFilter(preset)}>{preset.label}</button>)}</div>
              </section>
              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">ADVANCED SEARCH</p><h2>Filter verified openings</h2></div><button className="jp-text-button" type="button" onClick={() => { setJobPage(1); setFilters({}) }}>Clear filters</button></div>
                <div className="jp-filter-grid">
                  <label>Search role or company<input type="search" value={filters.search || ''} onChange={(event) => updateFilter('search', event.target.value)} placeholder="e.g. data analyst" /></label>
                  <label>Company<select value={filters.company_id || ''} onChange={(event) => updateFilter('company_id', event.target.value)}><option value="">All companies</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
                  <label>Role category<select value={filters.category || ''} onChange={(event) => updateFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>State<input value={filters.state || ''} onChange={(event) => updateFilter('state', event.target.value)} placeholder="Any state" /></label>
                  <label>City<input value={filters.city || ''} onChange={(event) => updateFilter('city', event.target.value)} placeholder="Any city" /></label>
                  <label>Work mode<select value={filters.work_mode || ''} onChange={(event) => updateFilter('work_mode', event.target.value)}><option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>Office</option></select></label>
                  <label>Company type<select value={filters.organization_type || ''} onChange={(event) => updateFilter('organization_type', event.target.value)}><option value="">All company types</option><option value="Product">Product-based</option><option value="Service">Service-based</option><option value="Startup">Startups</option><option>Government</option><option>Private</option></select></label>
                  <label>Employment<select value={filters.employment_type || ''} onChange={(event) => updateFilter('employment_type', event.target.value)}><option value="">Any type</option><option>Full-time</option><option>Internship</option><option>Contract</option><option>Government</option></select></label>
                  <label>Education<input value={filters.education || ''} onChange={(event) => updateFilter('education', event.target.value)} placeholder="e.g. BCA" /></label>
                  <label>Skills (comma-separated)<input value={filters.skills || ''} onChange={(event) => updateFilter('skills', event.target.value)} placeholder="e.g. Python, SQL" /></label>
                  <label>Minimum annual salary<input type="number" min="0" value={filters.min_salary || ''} onChange={(event) => updateFilter('min_salary', event.target.value)} /></label>
                  <label>Maximum annual salary<input type="number" min="0" value={filters.max_salary || ''} onChange={(event) => updateFilter('max_salary', event.target.value)} /></label>
                  <label>Minimum experience (years)<input type="number" min="0" value={filters.min_experience || ''} onChange={(event) => updateFilter('min_experience', event.target.value)} /></label>
                  <label>Maximum experience (years)<input type="number" min="0" value={filters.max_experience || ''} onChange={(event) => updateFilter('max_experience', event.target.value)} /></label>
                </div>
              </section>
              <section className="jp-listing-section">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">OFFICIAL SOURCES ONLY</p><h2>Active verified jobs</h2></div><span className="jp-job-count">{totalJobs} matching</span></div>
                {loading ? <NeuralLoader label="Searching verified listings" /> : jobs.length
                  ? <div className="jp-job-list">{jobs.map((job) => <JobCard key={job.id} job={job} saved={savedJobs.some((item) => item.id === job.id)} onSave={saveJob} onApplied={session ? markApplied : null} applying={applyingJobId === job.id} applicationConfirmed={successJobId === job.id} applicationStatus={applications.find((item) => item.id === job.id)?.status} />)}</div>
                  : <div className="jp-empty jp-empty-feature"><span aria-hidden="true">⌕</span><h3>No active verified listings yet</h3><p>There is no authorized live job feed configured. This platform does not invent vacancies; administrators can add official-source listings and verify them before they appear here.</p><a href="/jobs/companies">Browse official company career pages →</a></div>}
                {totalJobs > jobPageSize && <nav className="jp-pagination" aria-label="Job search pages">
                  <button className="jp-secondary-button" type="button" disabled={jobPage <= 1} onClick={() => setJobPage((page) => page - 1)}>Previous</button>
                  <span>Page {jobPage} of {Math.ceil(totalJobs / jobPageSize)}</span>
                  <button className="jp-secondary-button" type="button" disabled={jobPage >= Math.ceil(totalJobs / jobPageSize)} onClick={() => setJobPage((page) => page + 1)}>Next</button>
                </nav>}
              </section>
            </>
          )}

          {view === '/jobs/recommended' && (
            <section className="jp-job-list">
              <p className="jp-source-note">Match scores are estimates based on the profile information you entered, not a hiring guarantee.</p>
              {recommendations.length ? recommendations.map((item) => <JobCard key={item.job.id} job={item.job} match={item} saved={savedJobs.some((job) => job.id === item.job.id)} onSave={saveJob} onApplied={markApplied} applying={applyingJobId === item.job.id} applicationConfirmed={successJobId === item.job.id} applicationStatus={applications.find((application) => application.id === item.job.id)?.status} />) : <div className="jp-empty jp-empty-feature"><h3>No verified matches to show</h3><p>Complete your profile and check again when verified listings are available.</p><a href="/jobs/profile">Set up your profile →</a></div>}
            </section>
          )}

          {view === '/jobs/saved' && (
            <section className="jp-job-list">{activeJobs.length ? activeJobs.map((job) => <JobCard key={job.id} job={job} saved onSave={saveJob} onApplied={markApplied} applying={applyingJobId === job.id} applicationConfirmed={successJobId === job.id} applicationStatus={applications.find((application) => application.id === job.id)?.status} />) : <div className="jp-empty jp-empty-feature"><h3>No saved jobs yet</h3><p>Save verified listings to review them later.</p><a href="/jobs">Search jobs →</a></div>}</section>
          )}

          {view === '/jobs/applied' && (
            <section className="jp-job-list">{activeJobs.length ? activeJobs.map((job) => <JobCard key={job.id} job={job} applicationStatus={job.status} onSave={saveJob} />) : <div className="jp-empty jp-empty-feature"><h3>No applications tracked</h3><p>Mark a job as applied after you submit it on the official company site.</p><a href="/jobs">Search jobs →</a></div>}</section>
          )}

          {view === '/jobs/alerts' && (
            <section className="jp-panel">
              <p className="jp-source-note">Alerts are generated only for recent verified jobs that meet your profile’s minimum match score. Dismissing an alert prevents it from reappearing.</p>
              {alerts.length ? <div className="jp-job-list">{alerts.map((alert) => <JobCard key={alert.id} job={alert} match={{ match_percent: alert.match_percent, why_it_matches: ['Matched the preferences saved in your job profile.'], missing_skills: [], required_qualifications: [], learning_path: { title: 'Career roadmap', url: '/#roadmaps' }, score_note: 'Estimated match only.' }} saved={savedJobs.some((item) => item.id === alert.id)} onSave={saveJob} />)}{alerts.map((alert) => <button className="jp-text-button" type="button" key={`dismiss-${alert.id}`} onClick={() => dismissAlert(alert.id)}>Dismiss alert for {alert.title}</button>)}</div> : <div className="jp-empty jp-empty-feature"><h3>No new job alerts</h3><p>Keep your profile and alert preferences up to date to receive relevant matches.</p><a href="/jobs/profile">Manage alert preferences →</a></div>}
            </section>
          )}

          {view === '/jobs/profile' && (
            <form className="jp-panel jp-profile-form" onSubmit={saveProfile}>
              <p className="jp-source-note">Your profile and optional pasted resume text are private to your account. Clear the resume field and save to remove it. Only profile details are used for matching.</p>
              <div className="jp-display-settings">
                <div><h2>Display preferences</h2><p>Choose your theme and animation intensity for every page.</p></div>
                <ThemeSwitcher />
              </div>
              <div className="jp-form-grid">
                <label>Highest education<input maxLength={160} value={profile.education} onChange={(event) => setProfile((current) => ({ ...current, education: event.target.value }))} placeholder="e.g. Bachelor of Computer Applications" /></label>
                <label>Degree or qualification<input maxLength={120} value={profile.degree} onChange={(event) => setProfile((current) => ({ ...current, degree: event.target.value }))} placeholder="e.g. BCA, MCA, BTech" /></label>
                <label>Skills (comma-separated)<input value={Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills} onChange={(event) => setProfile((current) => ({ ...current, skills: event.target.value }))} placeholder="Python, SQL, communication" /></label>
                <label>Experience (years)<input type="number" min="0" max="60" step="0.5" value={profile.experience_years} onChange={(event) => setProfile((current) => ({ ...current, experience_years: event.target.value }))} /></label>
                <label>Preferred cities or states<input value={Array.isArray(profile.preferred_locations) ? profile.preferred_locations.join(', ') : profile.preferred_locations} onChange={(event) => setProfile((current) => ({ ...current, preferred_locations: event.target.value }))} placeholder="Chennai, Tamil Nadu, Remote" /></label>
                <label>Career interests<input value={Array.isArray(profile.career_interests) ? profile.career_interests.join(', ') : profile.career_interests} onChange={(event) => setProfile((current) => ({ ...current, career_interests: event.target.value }))} placeholder="Data Analyst, Cloud" /></label>
                <label className="jp-span-all">Resume text (optional)<textarea rows={7} maxLength={12000} value={profile.resume_text} onChange={(event) => setProfile((current) => ({ ...current, resume_text: event.target.value }))} placeholder="Paste resume text for skill matching. Do not include sensitive information you do not want stored." /></label>
              </div>
              <div className="jp-preference-row">
                <label className="jp-checkbox"><input type="checkbox" checked={profile.alerts_enabled} onChange={(event) => setProfile((current) => ({ ...current, alerts_enabled: event.target.checked }))} /> Enable relevant job popups</label>
                <label>Minimum match %<input type="number" min="40" max="100" value={profile.minimum_match_percent} onChange={(event) => setProfile((current) => ({ ...current, minimum_match_percent: event.target.value }))} /></label>
              </div>
              <button className="jp-primary-button" type="submit">Save private profile <span aria-hidden="true">→</span></button>
            </form>
          )}

          {isAdmin && (
            <>
              {adminSummary && <div className="jp-admin-stats">
                <article><span>Companies</span><strong>{adminSummary.companies}</strong></article>
                <article><span>Users</span><strong>{adminSummary.users}</strong></article>
                <article><span>Pending review</span><strong>{adminSummary.listings.pending}</strong></article>
                <article><span>Active verified</span><strong>{adminSummary.listings.active}</strong></article>
                <article><span>Expired</span><strong>{adminSummary.listings.expired}</strong></article>
              </div>}
              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">PLATFORM ANALYTICS</p><h2>Verified postings by industry</h2></div></div>
                {adminAnalytics.length
                  ? <div className="jp-analytics-list">{adminAnalytics.map((entry) => <div key={`${entry.industry}-${entry.status}`}><span>{entry.industry} · {entry.status}</span><b>{entry.count}</b></div>)}</div>
                  : <p className="jp-source-note">No job postings have been added to analyze yet.</p>}
              </section>
              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">ACCOUNT CONTROLS</p><h2>Manage user access</h2></div><span className="jp-job-count">{adminUsers.length} recent accounts</span></div>
                <div className="jp-admin-list">{adminUsers.map((managedUser) => <article className="jp-admin-job" key={managedUser.id}>
                  <div><strong>{managedUser.name}</strong><p>{managedUser.email} · joined {dateLabel(managedUser.created_at)}</p><small>Account status: {managedUser.active ? 'Active' : 'Disabled'}</small></div>
                  <button className={managedUser.active ? 'jp-secondary-button' : 'jp-primary-button'} type="button" onClick={() => setUserStatus(managedUser.id, !managedUser.active)}>{managedUser.active ? 'Disable account' : 'Enable account'}</button>
                </article>)}</div>
                <p className="jp-source-note">Disabling an account revokes its sessions. Administrators cannot disable their own account.</p>
              </section>
              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">ROLE CATEGORIES</p><h2>Manage job categories</h2></div></div>
                <form className="jp-category-form" onSubmit={saveCategory}>
                  <label>New category<input required minLength={2} maxLength={100} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Product Design" /></label>
                  <button className="jp-primary-button" type="submit">Add category</button>
                </form>
                <div className="jp-category-admin-list">{adminCategories.map((category) => <div key={category.id}><span>{category.name}</span><button className="jp-text-button" type="button" onClick={() => setCategoryActive(category, !category.active)}>{category.active ? 'Disable' : 'Enable'}</button><small>{category.active ? 'Active' : 'Disabled'}</small></div>)}</div>
              </section>
              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">CURATE EMPLOYERS</p><h2>Add or edit a company</h2></div></div>
                <form className="jp-form-grid" onSubmit={saveCompany}>
                  <label>Company name<input required value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label>Industry<input required value={companyForm.industry} onChange={(event) => setCompanyForm((current) => ({ ...current, industry: event.target.value }))} /></label>
                  <label>Company type<input required value={companyForm.organization_type} onChange={(event) => setCompanyForm((current) => ({ ...current, organization_type: event.target.value }))} /></label>
                  <label>Headquarters<input required value={companyForm.headquarters} onChange={(event) => setCompanyForm((current) => ({ ...current, headquarters: event.target.value }))} /></label>
                  <label>Website URL<input type="url" required value={companyForm.website_url} onChange={(event) => setCompanyForm((current) => ({ ...current, website_url: event.target.value }))} /></label>
                  <label>Official careers URL<input type="url" required value={companyForm.careers_url} onChange={(event) => setCompanyForm((current) => ({ ...current, careers_url: event.target.value }))} /></label>
                  <label>Logo URL (optional)<input type="url" value={companyForm.logo_url} onChange={(event) => setCompanyForm((current) => ({ ...current, logo_url: event.target.value }))} /></label>
                  <label className="jp-checkbox"><input type="checkbox" checked={companyForm.review_careers_link} onChange={(event) => setCompanyForm((current) => ({ ...current, review_careers_link: event.target.checked }))} /> I reviewed this career link on the official site</label>
                  <div className="jp-company-admin-actions jp-span-all">
                    <button className="jp-primary-button" type="submit">{companyForm.id ? 'Update company details' : 'Save company details'}</button>
                    {companyForm.id && <button className="jp-secondary-button" type="button" onClick={() => setCompanyForm({ id: '', name: '', industry: '', organization_type: '', headquarters: '', website_url: '', careers_url: '', logo_url: '', review_careers_link: false })}>Cancel edit</button>}
                  </div>
                </form>
                <p className="jp-source-note">{companies.length} listed companies. Editing a directory entry keeps its existing company ID.</p>
                <div className="jp-company-admin-list">
                  {companies.map((company) => <div key={company.id}><span><b>{company.name}</b><small>{company.industry} · {company.id}</small></span><button className="jp-text-button" type="button" onClick={() => editCompany(company)}>Edit</button></div>)}
                </div>
              </section>

              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">JOB POSTING</p><h2>{editingJob ? `Edit listing #${editingJob}` : 'Add a listing for review'}</h2></div>{editingJob && <button type="button" className="jp-text-button" onClick={() => { setEditingJob(null); setJobForm(emptyJobForm()) }}>Cancel edit</button>}</div>
                <form className="jp-form-grid" onSubmit={createOrEditJob}>
                  <JobFields form={jobForm} setForm={setJobForm} companies={companies} categories={categories} />
                  <p className="jp-source-note jp-span-all">New and edited postings remain hidden until an administrator verifies the official source and publishes them.</p>
                  <button className="jp-primary-button jp-span-all" type="submit">{editingJob ? 'Save changes for review' : 'Save listing as pending'}</button>
                </form>
              </section>

              <section className="jp-panel">
                <div className="jp-panel-heading"><div><p className="jp-eyebrow">REVIEW QUEUE</p><h2>Listings and verification</h2></div><span className="jp-job-count">{adminListings.length} listings</span></div>
                <div className="jp-admin-list">{adminListings.map((job) => <article className="jp-admin-job" key={job.id}>
                  <div><strong>{job.title}</strong><p>{job.company_name} · {job.location} · {job.status}</p><small>Source: <a href={job.source_url} target="_blank" rel="noreferrer">{job.source_name}</a> · Expires {dateLabel(job.expires_at)}</small></div>
                  <div className="jp-admin-actions">
                    <button className="jp-secondary-button" type="button" onClick={() => editJob(job)}>Edit</button>
                    {job.status !== 'active' && job.status !== 'closed' && <button className="jp-primary-button" type="button" onClick={() => reviewJob(job.id, 'active')}>Verify & publish</button>}
                    {job.status === 'active' && <button className="jp-secondary-button" type="button" onClick={() => reviewJob(job.id, 'closed')}>Close listing</button>}
                  </div>
                </article>)}</div>
                {!adminListings.length && <div className="jp-empty">No postings have been added. Company directory pages remain available.</div>}
              </section>
            </>
          )}
        </section>
      </div>

      {alertPopup && (
        <aside className="jp-alert-popup" aria-labelledby="job-alert-title">
          <button className="jp-alert-close" type="button" aria-label="Dismiss job alert" onClick={() => dismissAlert(alertPopup.id)}>×</button>
          <p className="jp-eyebrow">NEW JOB MATCH</p>
          <h2 id="job-alert-title">A verified job matches your profile</h2>
          <strong>{alertPopup.company_name} · {alertPopup.title}</strong>
          <p>{alertPopup.employment_type} · {alertPopup.location}</p>
          <b>{alertPopup.match_percent}% profile match</b>
          <div className="jp-alert-actions">
            <button type="button" className="jp-secondary-button" onClick={() => { setSelectedJob(alertPopup); dismissAlert(alertPopup.id) }}>View job</button>
            <button type="button" className="jp-secondary-button" onClick={async () => { if (await saveJob(alertPopup.id, true)) await dismissAlert(alertPopup.id) }}>Save job</button>
            <a className="jp-primary-button" href={alertPopup.application_url} target="_blank" rel="noreferrer" onClick={() => dismissAlert(alertPopup.id)}>Apply now ↗</a>
          </div>
        </aside>
      )}

      {selectedJob && (
        <div className="jp-modal-backdrop" role="presentation" onClick={() => setSelectedJob(null)}>
          <section className="jp-job-modal" role="dialog" aria-modal="true" aria-labelledby="jp-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="jp-alert-close" type="button" aria-label="Close job details" onClick={() => setSelectedJob(null)}>×</button>
            <p className="jp-eyebrow">{selectedJob.company_name} · {selectedJob.location}</p>
            <h2 id="jp-modal-title">{selectedJob.title}</h2>
            <p>{selectedJob.description}</p>
            <p><b>Required skills:</b> {selectedJob.skills?.join(', ') || 'Not specified'}</p>
            <p><b>Qualifications:</b> {selectedJob.required_education?.join(', ') || 'Not specified'}</p>
            <a className="jp-primary-button" href={selectedJob.application_url} target="_blank" rel="noreferrer">Apply on official site ↗</a>
          </section>
        </div>
      )}

      <footer className="jp-footer"><a href="/">SkillSync AI</a><span>Job source and verification details are shown on every listing.</span><a href="/#about">About</a></footer>
    </main>
  )
}

export default JobsPlatform
