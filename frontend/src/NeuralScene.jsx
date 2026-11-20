import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const nodePositions = [
  [-0.86, 0.1, 0.46], [-0.67, 0.82, 0.24], [-0.4, 0.34, 0.62],
  [-0.2, 1.02, 0.15], [0.12, 0.72, 0.58], [0.37, 1.0, 0.1],
  [0.68, 0.66, 0.36], [0.88, 0.08, 0.43], [0.6, -0.5, 0.46],
  [0.28, -0.9, 0.18], [-0.1, -0.68, 0.58], [-0.52, -0.75, 0.2],
  [-0.78, -0.35, 0.36], [0.02, 0.05, 0.76], [0.42, -0.13, 0.7],
]

const connections = [
  [0, 1, 2], [1, 3, 4], [2, 4, 13], [3, 5, 6], [4, 6, 7],
  [13, 14, 8], [14, 8, 9], [13, 10, 11], [10, 11, 12], [12, 0, 2],
  [2, 13, 14], [6, 14, 8], [4, 13, 10], [1, 2, 12],
]

function NeuralBrain({ intensity, theme }) {
  const brain = useRef(null)
  const particles = useRef(null)
  const time = useRef(0)
  const pointer = useRef({ x: 0, y: 0 })
  const viewport = useThree((state) => state.viewport)
  const scale = Math.min(1.75, Math.max(0.95, viewport.width * 0.19))
  const curves = useMemo(() => connections.map((connection) => {
    const points = connection.map((index) => new THREE.Vector3(...nodePositions[index]))
    return new THREE.CatmullRomCurve3(points)
  }), [])
  const colors = theme === 'dark'
    ? { red: '#E62429', white: '#FFFFFF', body: '#B8C1D1' }
    : theme === 'comfort'
      ? { red: '#B83232', white: '#665E55', body: '#B83232' }
      : { red: '#E62429', white: '#BFC5CC', body: '#E62429' }
  const movement = intensity === 'high' ? 1 : intensity === 'normal' ? 0.48 : 0.12

  useEffect(() => {
    function trackPointer(event) {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('pointermove', trackPointer, { passive: true })
    return () => window.removeEventListener('pointermove', trackPointer)
  }, [])

  useFrame((_, delta) => {
    if (!brain.current) return
    time.current += delta
    brain.current.rotation.y += (pointer.current.x * 0.09 - brain.current.rotation.y) * 0.025 * movement
    brain.current.rotation.x += (-pointer.current.y * 0.045 - brain.current.rotation.x) * 0.025 * movement
    brain.current.rotation.z = Math.sin(time.current * 0.24) * 0.018 * movement
    particles.current?.children.forEach((particle, index) => {
      if (particle.userData.baseY === undefined) particle.userData.baseY = particle.position.y
      particle.position.y = particle.userData.baseY + Math.sin(time.current * 0.5 + index) * 0.06 * movement
    })
  })

  return (
    <group position={[Math.min(1.75, viewport.width * 0.19), 0.08, 0]} scale={scale}>
      <group ref={brain}>
        <mesh position={[-0.43, 0.12, 0]}>
          <sphereGeometry args={[1, 30, 24]} />
          <meshPhysicalMaterial color={colors.body} roughness={0.28} metalness={0.16} transparent opacity={0.12} />
        </mesh>
        <mesh position={[0.43, 0.12, 0]}>
          <sphereGeometry args={[1, 30, 24]} />
          <meshPhysicalMaterial color={colors.body} roughness={0.28} metalness={0.16} transparent opacity={0.12} />
        </mesh>
        <mesh position={[0, 0.03, -0.02]} scale={[0.12, 1.18, 0.48]}>
          <sphereGeometry args={[1, 16, 20]} />
          <meshBasicMaterial color={colors.white} transparent opacity={0.2} />
        </mesh>
        {curves.map((curve, index) => (
          <mesh key={`path-${index}`}>
            <tubeGeometry args={[curve, 18, 0.008, 5, false]} />
            <meshBasicMaterial color={index % 3 === 0 ? colors.white : colors.red} transparent opacity={0.68} />
          </mesh>
        ))}
        {nodePositions.map(([x, y, z], index) => (
          <mesh key={`node-${index}`} position={[x, y, z]}>
            <sphereGeometry args={[index % 4 === 0 ? 0.044 : 0.027, 10, 8]} />
            <meshBasicMaterial color={index % 3 === 0 ? colors.white : colors.red} />
          </mesh>
        ))}
        <group ref={particles}>
          {Array.from({ length: 18 }, (_, index) => {
            const angle = index * 2.399
            const radius = 1.15 + (index % 5) * 0.1
            return (
              <mesh
                key={`particle-${index}`}
                position={[Math.cos(angle) * radius, Math.sin(angle * 1.7) * 1.25, Math.sin(angle) * 0.6]}
              >
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshBasicMaterial color={index % 2 ? colors.red : colors.white} transparent opacity={0.65} />
              </mesh>
            )
          })}
        </group>
      </group>
    </group>
  )
}

function NeuralScene({ intensity, theme, reducedMotion }) {
  return (
    <Canvas
      frameloop={reducedMotion || intensity === 'low' ? 'demand' : 'always'}
      camera={{ position: [0, 0, 8], fov: 36 }}
      dpr={[0.75, 1.15]}
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      fallback={null}
    >
      <ambientLight intensity={0.8} />
      <NeuralBrain intensity={intensity} theme={theme} />
    </Canvas>
  )
}

export default NeuralScene
