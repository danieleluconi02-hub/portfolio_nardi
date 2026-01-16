import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Fibonacci Sphere Distribution
 */
function fibonacciSphere(samples, radius = 1) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2
        const radiusAtY = Math.sqrt(1 - y * y)
        const theta = phi * i

        points.push(new THREE.Vector3(
            Math.cos(theta) * radiusAtY * radius,
            y * radius,
            Math.sin(theta) * radiusAtY * radius
        ))
    }

    return points
}

/**
 * Ultra-smooth cinematic easing - slow start, smooth acceleration, gentle deceleration
 */
function smoothEase(t) {
    // Sine-based easing for ultra-smooth, organic motion
    return t < 0.5
        ? (1 - Math.cos(Math.PI * t)) / 2
        : (1 + Math.sin(Math.PI * (t - 0.5))) / 2
}

/**
 * Curved trajectory interpolation
 */
function bezierPoint(p0, p1, p2, t) {
    const oneMinusT = 1 - t
    return new THREE.Vector3(
        oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
        oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y,
        oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z
    )
}

/**
 * Image Plane Component
 */
function ImagePlane({
    imagePath,
    startPosition,
    startRotation,
    targetPosition,
    controlPoint,
    targetQuaternion,
    scale = 1.0,
    getProgress,
    getCameraZ
}) {
    const meshRef = useRef()
    const textureRef = useRef(null)
    const [textureLoaded, setTextureLoaded] = useState(false)

    useEffect(() => {
        if (imagePath && !textureRef.current) {
            const loader = new THREE.TextureLoader()
            loader.load(imagePath, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace
                tex.minFilter = THREE.LinearFilter
                tex.magFilter = THREE.LinearFilter
                textureRef.current = tex
                setTextureLoaded(true)
            })
        }
    }, [imagePath])

    useFrame(() => {
        if (!meshRef.current) return

        const mesh = meshRef.current
        const rawProgress = getProgress()
        const cameraZ = getCameraZ()
        const t = smoothEase(Math.min(rawProgress, 1))

        const currentPos = bezierPoint(startPosition, controlPoint, targetPosition, t)
        mesh.position.copy(currentPos)

        const startQuat = new THREE.Quaternion().setFromEuler(startRotation)
        mesh.quaternion.slerpQuaternions(startQuat, targetQuaternion, t)

        // Fade out as camera passes through
        if (mesh.material) {
            const baseOpacity = Math.min(1, rawProgress * 3.33) * 0.95
            // Fade out when camera gets close
            const fadeStart = 5 // Start fading when camera is at z=5
            const fadeEnd = -1  // Fully faded at z=-1
            const cameraFade = cameraZ < fadeStart
                ? Math.max(0, (cameraZ - fadeEnd) / (fadeStart - fadeEnd))
                : 1
            mesh.material.opacity = baseOpacity * cameraFade
        }
    })

    return (
        <mesh ref={meshRef} scale={[scale, scale * 1.35, 1]}>
            <planeGeometry args={[1, 1]} />
            {textureLoaded && textureRef.current ? (
                <meshBasicMaterial
                    map={textureRef.current}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0}
                />
            ) : (
                <meshBasicMaterial
                    color="#cccccc"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0}
                />
            )}
        </mesh>
    )
}

/**
 * Main Scene Component
 */
function IntroSphereScene({ images, onFormationComplete, onEnterComplete }) {
    const groupRef = useRef()
    const { camera } = useThree()

    // Animation state - simplified: waiting -> forming -> entering -> complete
    const animationState = useRef({
        phase: 'waiting',
        startTime: 0,
        progress: 0,
        enterStartTime: 0,
        cameraZ: 14,
        formationCompleteCalled: false,
        enterCompleteCalled: false
    })

    const sphereRadius = 5
    const imageCount = images.length
    const imageScale = imageCount <= 25 ? 2.2 :
        imageCount <= 40 ? 1.8 :
            imageCount <= 55 ? 1.5 : 1.2

    // Timing (milliseconds) - smooth and cinematic ~2.8s total
    const FORMATION_DURATION = 2000     // 2.0s formation - smooth assembly
    const ENTER_DURATION = 800          // 0.8s camera enter

    const targetPositions = useMemo(() =>
        fibonacciSphere(imageCount, sphereRadius),
        [imageCount, sphereRadius]
    )

    const imageData = useMemo(() => {
        return images.map((_, index) => {
            const seed1 = Math.sin(index * 127.1 + 311.7) * 43758.5453
            const seed2 = Math.sin(index * 269.5 + 183.3) * 43758.5453
            const seed3 = Math.sin(index * 419.2 + 371.9) * 43758.5453

            const r1 = seed1 - Math.floor(seed1)
            const r2 = seed2 - Math.floor(seed2)
            const r3 = seed3 - Math.floor(seed3)

            const scatterRadius = sphereRadius * 2.8  // Start further away
            const theta = r1 * Math.PI * 2
            const phi = Math.acos(2 * r2 - 1)
            const r = 0.5 + r3 * scatterRadius

            const startPosition = new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            )

            const targetPosition = targetPositions[index]

            const mid = new THREE.Vector3()
                .addVectors(startPosition, targetPosition)
                .multiplyScalar(0.5)
            const controlPoint = mid.clone().multiplyScalar(0.65)

            const startRotation = new THREE.Euler(
                (r1 - 0.5) * Math.PI * 0.6,
                (r2 - 0.5) * Math.PI * 0.6,
                (r3 - 0.5) * Math.PI * 0.4
            )

            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(targetPosition, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix)

            return { startPosition, targetPosition, controlPoint, startRotation, targetQuaternion }
        })
    }, [images, targetPositions, sphereRadius])

    useEffect(() => {
        camera.position.set(0, 0, 14)
        camera.lookAt(0, 0, 0)
    }, [camera])

    // Start animation
    useEffect(() => {
        let isMounted = true

        const timer = setTimeout(() => {
            if (isMounted && animationState.current.phase === 'waiting') {
                animationState.current.startTime = performance.now()
                animationState.current.phase = 'forming'
            }
        }, 300) // Brief pause before animation begins

        return () => {
            isMounted = false
            clearTimeout(timer)
        }
    }, [])

    const getProgress = useCallback(() => animationState.current.progress, [])
    const getCameraZ = useCallback(() => animationState.current.cameraZ, [])

    useFrame(() => {
        const anim = animationState.current
        if (anim.phase === 'waiting') return

        const now = performance.now()
        const elapsed = now - anim.startTime

        // PHASE 1: Formation - images fly into sphere
        if (anim.phase === 'forming') {
            const progress = Math.min(elapsed / FORMATION_DURATION, 1)
            anim.progress = progress

            // Gentle rotation during formation
            if (groupRef.current) {
                groupRef.current.rotation.y += 0.0004
            }

            // Seamlessly transition to entering phase
            if (progress >= 1) {
                anim.phase = 'entering'
                anim.enterStartTime = now

                // Notify parent formation is complete
                if (!anim.formationCompleteCalled) {
                    anim.formationCompleteCalled = true
                    if (onFormationComplete) onFormationComplete()
                }
            }
        }

        // PHASE 2: Camera entering sphere - seamless continuation
        if (anim.phase === 'entering') {
            const enterElapsed = now - anim.enterStartTime
            const enterProgress = Math.min(enterElapsed / ENTER_DURATION, 1)
            const easedEnter = smoothEase(enterProgress)

            // Camera moves forward into sphere
            const startZ = 14
            const endZ = -2
            anim.cameraZ = startZ + (endZ - startZ) * easedEnter
            camera.position.z = anim.cameraZ

            // Subtle FOV change for immersion
            camera.fov = 50 + easedEnter * 12
            camera.updateProjectionMatrix()

            // Continue smooth rotation
            if (groupRef.current) {
                groupRef.current.rotation.y += 0.0005
            }

            // Trigger menu at 90% for gentle crossfade
            if (enterProgress >= 0.9 && !anim.enterCompleteCalled) {
                anim.enterCompleteCalled = true
                anim.phase = 'complete'
                if (onEnterComplete) onEnterComplete()
            }
        }
    })

    return (
        <>
            <ambientLight intensity={1.2} />
            <group ref={groupRef}>
                {images.map((imagePath, index) => (
                    <ImagePlane
                        key={index}
                        imagePath={imagePath}
                        startPosition={imageData[index].startPosition}
                        startRotation={imageData[index].startRotation}
                        targetPosition={imageData[index].targetPosition}
                        controlPoint={imageData[index].controlPoint}
                        targetQuaternion={imageData[index].targetQuaternion}
                        scale={imageScale}
                        getProgress={getProgress}
                        getCameraZ={getCameraZ}
                    />
                ))}
            </group>
        </>
    )
}

/**
 * Main Component with phase management
 */
export default function IntroSphere({ allCollections, onComplete }) {
    const [phase, setPhase] = useState('sphere') // 'sphere' | 'dissolving' | 'menu'
    const [canShowMenu, setCanShowMenu] = useState(false)

    const sampledImages = useMemo(() => {
        const allImages = []

        allCollections.forEach(col => {
            if (col.images) {
                col.images.forEach(img => {
                    allImages.push({
                        path: img.replace('/full/', '/thumb/'),
                        collection: col.id
                    })
                })
            }
        })

        if (allImages.length === 0) return []

        const seed = Date.now() // Random shuffle on each page refresh
        const seededRandom = (i) => {
            const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
            return x - Math.floor(x)
        }

        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(i) * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const sampled = []
        const collectionCounts = {}
        const maxPerCollection = 5
        const targetCount = 50

        for (const img of shuffled) {
            if (sampled.length >= targetCount) break
            collectionCounts[img.collection] = (collectionCounts[img.collection] || 0) + 1
            if (collectionCounts[img.collection] <= maxPerCollection) {
                sampled.push(img.path)
            }
        }

        if (sampled.length < targetCount) {
            for (const img of shuffled) {
                if (sampled.length >= targetCount) break
                if (!sampled.includes(img.path)) sampled.push(img.path)
            }
        }

        return sampled
    }, [allCollections])

    // Formation complete - camera will now enter
    const handleFormationComplete = useCallback(() => {
        // Prepare for menu (can pre-load if needed)
        setCanShowMenu(true)
    }, [])

    // Camera has passed through sphere - show menu immediately
    const handleEnterComplete = useCallback(() => {
        setPhase('menu')
        if (onComplete) onComplete()
    }, [onComplete])

    return (
        <motion.div
            className="intro-sphere-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: '#e6e6e6',
                zIndex: 5
            }}
        >
            {/* 3D Canvas with sphere */}
            <AnimatePresence>
                {phase !== 'menu' && (
                    <motion.div
                        style={{ position: 'absolute', inset: 0 }}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0 }}
                    >
                        <Canvas
                            camera={{ position: [0, 0, 14], fov: 50 }}
                            dpr={[1, 2]}
                            gl={{ antialias: true, alpha: false }}
                        >
                            <color attach="background" args={['#e6e6e6']} />
                            <IntroSphereScene
                                images={sampledImages}
                                onFormationComplete={handleFormationComplete}
                                onEnterComplete={handleEnterComplete}
                            />
                        </Canvas>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
