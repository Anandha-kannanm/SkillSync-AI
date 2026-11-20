import { lazy, Suspense, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useGlobalTheme } from './GlobalThemeProvider.jsx'
import './NeuralBackground.css'

const NeuralScene = lazy(() => import('./NeuralScene.jsx'))

function NeuralBackground() {
  const { theme, intensity } = useGlobalTheme()
  const reducedMotion = useReducedMotion()
  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    let timeoutId
    let idleId
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => setSceneReady(true), { timeout: 900 })
    } else {
      timeoutId = window.setTimeout(() => setSceneReady(true), 250)
    }

    return () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId)
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="neural-background" aria-hidden="true">
      <svg className="neural-static-network" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <g>
          <path d="M-40 520 140 360 300 440 460 220 640 350 820 145 1020 280 1240 120" />
          <path d="M140 360 205 125 460 220 520 620 640 350 850 565 1020 280" />
          <path d="M300 440 520 620 700 535 820 145 1100 650" />
          <path d="M640 350 760 80 1020 280 1140 490" />
          <circle cx="140" cy="360" r="4" /><circle cx="300" cy="440" r="4" />
          <circle cx="460" cy="220" r="5" /><circle cx="640" cy="350" r="5" />
          <circle cx="820" cy="145" r="4" /><circle cx="1020" cy="280" r="5" />
          <circle cx="520" cy="620" r="4" /><circle cx="850" cy="565" r="4" />
        </g>
      </svg>
      <div className="neural-scene">
        <Suspense fallback={null}>
          {sceneReady && <NeuralScene intensity={intensity} theme={theme} reducedMotion={reducedMotion || theme === 'comfort'} />}
        </Suspense>
      </div>
    </div>
  )
}

export default NeuralBackground
