import { useRef, useState } from 'react'
import { getLessonContent } from './learningResources.js'
import { translate, useLanguage } from './i18n.js'

function createStarterCode(step, language, t) {
  const topicList = step.topics.map((topic) => translate(topic, language)).join(', ')
  const lessonTitle = translate(step.title, language)
  const practiceTitle = language === 'ta' ? 'எனது முதல் பயிற்சி' : 'My first practice'
  const practiceDescription = language === 'ta'
    ? `இன்று நான் ${topicList} கற்றுக்கொள்கிறேன்.`
    : `Today I am learning ${topicList}.`
  const buttonLabel = language === 'ta' ? 'இந்தப் பக்கத்தை மாற்றிப் பாருங்கள்' : 'Try changing this page'

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t('Practice')}: ${lessonTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 3rem auto; padding: 1rem; color: #242637; }
    .card { padding: 1.5rem; border: 1px solid #e8e9f0; border-radius: 1rem; background: #f7f8fc; }
    h1 { color: #5b53e6; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${practiceTitle}</h1>
    <p>${practiceDescription}</p>
    <button type="button">${buttonLabel}</button>
  </main>
</body>
</html>`
}

function HtmlPlayground({ step }) {
  const { language, t } = useLanguage()
  const starterCode = () => createStarterCode(step, language, t)
  const [code, setCode] = useState(starterCode)
  const [previewCode, setPreviewCode] = useState(starterCode)

  return (
    <section className="playground" aria-labelledby="playground-title">
      <div className="playground-heading">
        <div>
          <span className="lesson-kicker">{t('TRY IT YOURSELF')}</span>
          <h4 id="playground-title">{t('HTML & CSS mini playground')}</h4>
        </div>
        <button type="button" className="preview-button" onClick={() => setPreviewCode(code)}>
          {t('Run preview')}
        </button>
      </div>
      <p>{t('Edit the example, then preview it. This safe preview supports HTML and CSS; scripts are disabled.')}</p>
      <div className="playground-columns">
        <label className="code-editor">
          <span>{t('HTML')}</span>
          <textarea
            aria-label={t('HTML and CSS code editor')}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <div className="preview-frame">
          <span>{t('PREVIEW')}</span>
          <iframe title={t('HTML and CSS practice preview')} sandbox="" srcDoc={previewCode} />
        </div>
      </div>
    </section>
  )
}

function LearningLesson({ roadmap, stepIndex, completed, onLessonPassed, lessonCompleteMessage }) {
  const { language, t } = useLanguage()
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [practiceNote, setPracticeNote] = useState('')
  const [practiceSaved, setPracticeSaved] = useState(false)
  const passedRef = useRef(false)
  const step = roadmap.steps[stepIndex]
  const lesson = getLessonContent(roadmap, step)
  const topic = step.topics[0]
  const showPlayground = step.topics.some((item) => /html|css/i.test(item))
  const isCorrect = selectedAnswer === lesson.correct

  return (
    <section className="lesson-view" id={`course-lesson-${stepIndex}`} aria-labelledby="lesson-title">
      <div className="lesson-header">
        <div>
          <p className="eyebrow">{t('INTERACTIVE LESSON')} · {translate(roadmap.title, language)}</p>
          <h3 id="lesson-title">{translate(step.title, language)}</h3>
          <p>{translate(step.detail, language)}</p>
        </div>
        <span className="lesson-counter">{t('LESSON')} {stepIndex + 1} {t('OF')} {roadmap.steps.length}</span>
      </div>

      <div className="lesson-layout">
        <div className="lesson-content">
          <section className="lesson-card">
            <span className="lesson-kicker">{t('01 · THE CONCEPT')}</span>
            <h4 className="lesson-card-title">{language === 'ta' ? `${translate(topic, language)} ${t('What is')}?` : `${t('What is')} ${translate(topic, language)}?`}</h4>
            <p className="lesson-explanation">{translate(lesson.explanation, language)}</p>
            <p className="lesson-tamil-tip">{t('Read the concept, study the example, then try the practice and quiz.')}</p>
            <div className="topic-list lesson-topics">
              {step.topics.map((item) => <span key={item}>{translate(item, language)}</span>)}
            </div>
          </section>

          <section className="lesson-card">
            <span className="lesson-kicker">{t('02 · WORKED EXAMPLE')}</span>
            <p className="worked-example-copy">{t('Study this example. Think about what each line or step does.')}</p>
            <pre className="worked-example"><code>{lesson.example}</code></pre>
            <p className="example-explanation">{t('Try changing the example and explain what each part does in your own words.')}</p>
          </section>

          <section className="lesson-card">
            <span className="lesson-kicker">{t('03 · YOUR PRACTICE')}</span>
            <h4 className="lesson-card-title">{t('Try it yourself')}</h4>
            <p className="practice-instructions">{translate(lesson.practice, language)}</p>
            {showPlayground && <HtmlPlayground key={`${roadmap.id}-${stepIndex}`} step={step} />}
            {!showPlayground && (
              <label className="practice-answer">
                <span>{t('Your attempt / notes')}</span>
                <textarea
                  value={practiceNote}
                  onChange={(event) => { setPracticeNote(event.target.value); setPracticeSaved(false); }}
                  rows={4}
                  maxLength={1500}
                  placeholder={t('Write how you solved it here...')}
                />
                <span className="practice-note-actions">
                  <small>{t('These notes are not sent to the browser.')}</small>
                  <button type="button" disabled={!practiceNote.trim()} onClick={() => setPracticeSaved(true)}>{t('Save my practice note')}</button>
                </span>
                {practiceSaved && <span className="practice-saved" role="status">{t('Saved on this lesson until you leave.')}</span>}
              </label>
            )}
          </section>

          <section className="lesson-card quick-check">
            <span className="lesson-kicker">{t('04 · CHECK YOUR UNDERSTANDING')}</span>
            <h4 className="lesson-card-title">{translate(lesson.question, language)}</h4>
            <div className="check-options">
              {lesson.options.map((option, index) => (
                <label
                  key={option}
                  className={`check-option${selectedAnswer === index ? ' selected' : ''}${selectedAnswer !== null && index === lesson.correct ? ' correct' : ''}${selectedAnswer === index && !isCorrect ? ' incorrect' : ''}`}
                >
                  <input
                    type="radio"
                    name={`lesson-check-${roadmap.id}-${stepIndex}`}
                    value={index}
                    checked={selectedAnswer === index}
                    disabled={isCorrect}
                    onChange={() => {
                      setSelectedAnswer(index)
                      if (index === lesson.correct && !passedRef.current) {
                        passedRef.current = true
                        onLessonPassed(stepIndex)
                      }
                    }}
                  />
                  <span>{translate(option, language)}</span>
                  {selectedAnswer !== null && index === lesson.correct && <strong className="answer-mark">{t('Correct answer')}</strong>}
                </label>
              ))}
            </div>
            {selectedAnswer !== null && (
              <p className={`check-feedback ${isCorrect ? 'correct' : 'incorrect'}`} role="status">
                {isCorrect ? `${t('Correct!')} ${translate(lesson.reason, language)}` : t('Not quite. Try once more, or review the example above.')}
              </p>
            )}
          </section>

          <div className="lesson-actions">
            <p className={completed.has(stepIndex) ? 'lesson-progress-note complete' : 'lesson-progress-note'}>
              {lessonCompleteMessage || (completed.has(stepIndex) ? `✓ ${t('Lesson complete — your progress is saved to your account.')}` : t('Pass the lesson quiz to complete this milestone automatically.'))}
            </p>
            {completed.has(stepIndex) && stepIndex < roadmap.steps.length - 1 && <span className="lesson-advance-hint">{t('Next lesson is now unlocked →')}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default LearningLesson
