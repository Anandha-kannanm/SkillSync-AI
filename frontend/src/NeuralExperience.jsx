import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './NeuralExperience.css'

function NeuralIcon({ className = '' }) {
  return (
    <svg className={`neural-icon ${className}`.trim()} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M19.5 5.5c-5.8-2.1-11.6 2.2-11.6 8.3 0 1.5.4 2.8 1.1 4-2.8 4.1-.1 10 4.9 10.4.8 4.4 6.1 6.2 9.5 3.3V8.1a7.8 7.8 0 0 0-3.9-2.6Z" />
      <path d="M20.5 5.5c5.8-2.1 11.6 2.2 11.6 8.3 0 1.5-.4 2.8-1.1 4 2.8 4.1.1 10-4.9 10.4-.8 4.4-6.1 6.2-9.5 3.3V8.1a7.8 7.8 0 0 1 3.9-2.6Z" />
      <path d="M10 15h5l3 4 4-7 3 5h4M10 23h6l3 4 3-5 3 3h4" />
      <circle cx="10" cy="15" r="1.5" /><circle cx="30" cy="18" r="1.5" />
      <circle cx="19" cy="27" r="1.5" /><circle cx="26" cy="25" r="1.5" />
    </svg>
  )
}

function NeuralLoader({ label = 'Loading' }) {
  return (
    <div className="neural-loader" role="status">
      <NeuralIcon className="neural-loader-icon" />
      <span>{label}</span>
      <span className="neural-loader-track" aria-hidden="true"><i /></span>
    </div>
  )
}

function NeuralTransition({ active, transitionId }) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {active && !reducedMotion && (
        <motion.div
          key={transitionId}
          className="neural-transition"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <motion.svg
            className="neural-transition-network"
            viewBox="0 0 1200 420"
            preserveAspectRatio="none"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
          >
            <path d="M-20 330 190 190 360 270 545 108 720 210 910 70 1220 175" />
            <path d="M180 190 220 50 545 108 590 365 720 210 990 340" />
            <path d="M360 270 590 365 810 300 910 70" />
          </motion.svg>
          <motion.span
            className="neural-transition-pulse"
            initial={{ x: '-12vw', y: '18vh', scale: 0.75 }}
            animate={{ x: '108vw', y: '-12vh', scale: 1.08 }}
            transition={{ duration: 0.46, ease: [0.22, 0.7, 0.25, 1] }}
          >
            <NeuralIcon />
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function NeuralClickEffect({ impact }) {
  const reducedMotion = useReducedMotion()
  if (!impact || reducedMotion) return null

  return (
    <motion.span
      key={impact.id}
      className="neural-click-effect"
      style={{ left: impact.x, top: impact.y }}
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.6, 2.2] }}
      transition={{ duration: 0.36, ease: 'easeOut' }}
    >
      <NeuralIcon />
    </motion.span>
  )
}

export { NeuralClickEffect, NeuralIcon, NeuralLoader, NeuralTransition }
