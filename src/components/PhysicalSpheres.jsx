import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import manifest from '../data/manifest.json'
import SketchySphereGrid from './SketchySphereGrid'


// --- Helpers ---

/**
 * Fibonacci Sphere Distribution - creates evenly distributed points on a sphere
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
 * Get multiple unique random images from a category
 */
const getRandomImages = (categoryKey, count = 40) => {
    const collections = manifest[categoryKey]?.collections || []
    if (!collections.length) return []

    // Flatten all images
    const allImages = collections.reduce((acc, col) => {
        // Use thumbnails if available
        const images = col.images.map(img => img.replace('/full/', '/thumb/'))
        return [...acc, ...images]
    }, [])

    if (!allImages.length) return []

    // Fisher-Yates shuffle
    const shuffled = [...allImages]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, count)
}

// --- Components ---

function ImagePlane({ imagePath, position, quaternion, scale = 1.0, opacity = 1.0 }) {
    const meshRef = useRef()
    const texture = useMemo(() => {
        if (!imagePath) return null
        return new THREE.TextureLoader().load(imagePath)
    }, [imagePath])

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            scale={[scale, scale, 1]}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
            />
        </mesh>
    )
}

function CompositeSphere({ images, radius, opacity, isBackground }) {
    // Use all passed images (controlled by parent)
    const displayImages = useMemo(() => images, [images])

    // Generate positions with more spacing
    const positions = useMemo(() => fibonacciSphere(displayImages.length, radius * 1.2), [displayImages.length, radius])

    // Generate quaternions (facing outwards, slightly randomized for natural look)
    const quaternions = useMemo(() => {
        return positions.map(pos => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            const quat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix)

            // Add slight random tilt for more natural look
            const tiltAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
            const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, (Math.random() - 0.5) * 0.3)
            quat.multiply(tiltQuat)

            return quat
        })
    }, [positions])

    // Larger image scale for better visibility (like cards)
    const planeScale = useMemo(() => {
        return radius * 0.41 // Increased to reduce gaps (balanced with 40 images)
    }, [radius])

    return (
        <group>
            {displayImages.map((img, i) => (
                <ImagePlane
                    key={`${img}-${i}`}
                    imagePath={img}
                    position={positions[i]}
                    quaternion={quaternions[i]}
                    scale={planeScale}
                    opacity={opacity}
                />
            ))}
        </group>
    )
}

/**
 * ExplodedFragments - Render fragments during explosion
 * Enhanced with smoother animations and better visibility
 */
function ExplodedFragments({ images, radius, opacity, fragmentState }) {
    const groupRef = useRef()

    // Physics state ref
    const physicsRef = useRef({
        fragments: [],
        initialized: false,
        reconstructionStartCaptured: false,
        capturePos: [],
        captureQuat: []
    })

    // Ultra-smooth easing functions
    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5)
    const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
    // Elastic ease for organic feel on final approach
    const easeOutElastic = (t) => {
        if (t === 0 || t === 1) return t
        const p = 0.4
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
    }
    // Smooth blend function
    const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10)

    // Initialize physics state using useEffect (safer than useMemo for side-effects)
    useEffect(() => {
        if (!fragmentState?.fragments) return

        physicsRef.current.fragments = fragmentState.fragments.map(f => ({
            currentPos: f.originalPos.clone(),
            currentQuat: f.originalQuat.clone(),
            velocity: f.velocity.clone(),
            angularVelocity: f.angularVelocity.clone(),
            originalPos: f.originalPos,
            originalQuat: f.originalQuat
        }))
        physicsRef.current.initialized = true
        physicsRef.current.reconstructionStartCaptured = false
        // Clear capture arrays
        physicsRef.current.capturePos = []
        physicsRef.current.captureQuat = []

        console.log("ExplodedFragments initialized", physicsRef.current.fragments.length)
    }, [fragmentState?.fragments])

    useFrame((state, delta) => {
        if (!groupRef.current || !physicsRef.current.initialized || !fragmentState) return

        const { isReconstructing, reconstructionProgress } = fragmentState
        const physics = physicsRef.current

        // Very soft gravity for elegant floating
        const gravity = new THREE.Vector3(0, -1.8, 0)

        // Calculate explosion phase for smooth but immediate start
        const explosionAge = fragmentState.explosionStartTime
            ? (Date.now() - fragmentState.explosionStartTime) / 1000
            : 0
        // Quick smooth start: reaches full speed in 0.1 seconds with ease-out
        const explosionEase = Math.min(explosionAge / 0.1, 1.0)
        const smoothStart = 1 - Math.pow(1 - explosionEase, 2) // Ease-out for immediate response

        groupRef.current.children.forEach((child, i) => {
            const pFrag = physics.fragments[i]
            if (!pFrag) return

            if (isReconstructing) {
                // CAPTURE START POSITIONS
                if (!physics.reconstructionStartCaptured) {
                    physics.capturePos[i] = pFrag.currentPos.clone()
                    physics.captureQuat[i] = pFrag.currentQuat.clone()
                }

                const t = reconstructionProgress
                // Use standard easeInOutQuint for very smooth acceleration/deceleration
                // This removes the "clunky" elastic feel and gives a premium motion
                const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2

                // Matching smooth rotation
                const quatEase = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

                if (physics.capturePos[i]) {
                    child.position.lerpVectors(physics.capturePos[i], pFrag.originalPos, ease)
                    child.quaternion.slerpQuaternions(physics.captureQuat[i], pFrag.originalQuat, quatEase)

                    // Sync physics state
                    pFrag.currentPos.copy(child.position)
                    pFrag.currentQuat.copy(child.quaternion)
                }

            } else {
                // PHYSICS - Immediate but smooth explosion
                const scaledGravity = gravity.clone().multiplyScalar(smoothStart)
                pFrag.velocity.addScaledVector(scaledGravity, delta)

                // Very low drag for floaty, elegant movement
                pFrag.velocity.multiplyScalar(1.0 - (0.2 * delta))

                // Apply velocity immediately
                pFrag.currentPos.addScaledVector(pFrag.velocity, delta * smoothStart)

                // Very gradual rotation slowdown
                pFrag.angularVelocity.multiplyScalar(1.0 - (0.08 * delta))

                const rotDelta = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        pFrag.angularVelocity.x * delta * smoothStart,
                        pFrag.angularVelocity.y * delta * smoothStart,
                        pFrag.angularVelocity.z * delta * smoothStart
                    )
                )
                pFrag.currentQuat.multiply(rotDelta)

                child.position.copy(pFrag.currentPos)
                child.quaternion.copy(pFrag.currentQuat)
            }
        })

        if (isReconstructing && !physics.reconstructionStartCaptured) {
            physics.reconstructionStartCaptured = true
        }
    })

    if (!fragmentState?.fragments) return null

    // Calculate scale multiplier based on reconstruction progress
    const getScale = () => {
        if (!fragmentState.isReconstructing) return 1.25 // Explosions are larger

        const t = fragmentState.reconstructionProgress
        // Use the same ease as position for consistent motion
        // Interpolate FROM 1.25 TO 1.0
        const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
        return 1.25 - (0.25 * ease)
    }

    const currentScaleMultiplier = getScale()
    const explosionOpacity = 1.0

    return (
        <group ref={groupRef}>
            {fragmentState.fragments.map((frag, i) => (
                <ImagePlane
                    key={`frag-${i}`}
                    imagePath={images[i]}
                    position={frag.originalPos}
                    quaternion={frag.originalQuat}
                    scale={frag.scale * currentScaleMultiplier}
                    opacity={explosionOpacity}
                />
            ))}
        </group>
    )
}

function PhysicsGroup({ id, config, onNavigate, opacity, scale, isBackground, onClick }) {
    const groupRef = useRef()
    const meshRef = useRef() // Invisible click target

    const handleClick = (e) => {
        e.stopPropagation()
        if (onClick) onClick(id)
    }

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Apply Physics Position from parent state
            groupRef.current.position.copy(config.pos)

            // Apply Spin (only if not exploded)
            if (!config.isExploded) {
                groupRef.current.rotation.x += delta * config.rotationSpeed.x
                groupRef.current.rotation.y += delta * config.rotationSpeed.y
            }

            // Apply Scale
            const baseScale = isBackground ? 0.9 : 1.0
            // Use targetScale from config (progressive scaling)
            const currentTargetScale = baseScale * (config.targetScale || 1.0) * (config.explosionScale || 1.0)

            groupRef.current.scale.lerp(new THREE.Vector3(currentTargetScale, currentTargetScale, currentTargetScale), delta * 5)

        }
    })

    return (
        <group ref={groupRef}>
            {/* Invisible Sphere for Interaction */}
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
                visible={false}
            >
                <sphereGeometry args={[config.radius, 16, 16]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>

            {/* Visual Composite Sphere */}
            {!config.isExploded ? (
                <>
                    <CompositeSphere
                        images={config.images}
                        radius={config.radius}
                        opacity={opacity}
                        isBackground={isBackground}
                    />
                    {/* Hand-Drawn Grid - Slightly smaller to sit behind images */}
                    <SketchySphereGrid
                        radius={config.radius * 1.05} // Images are at 1.2, so 1.05 sits nicely behind
                        color={isBackground ? "#444" : "#fff"}
                        opacity={isBackground ? 0.3 : 0.6}
                    />
                </>
            ) : (
                <ExplodedFragments
                    images={config.images}
                    radius={config.radius}
                    opacity={opacity}
                    fragmentState={config.fragmentState}
                />
            )}
        </group>
    )
}

function PhysicsScene({ onNavigate, targetCategory, onTransitionComplete }) {
    const { viewport, camera } = useThree()

    // Configuration
    // Keep consistent structure across devices (proportional scaling)
    const radius = Math.min(viewport.width, viewport.height) * 0.18
    const IMAGE_COUNT = 45

    // Initial State setup
    const [spheres, setSpheres] = useState(() => {
        const startY = viewport.height / 2 + radius * 3
        // Scale speed based on viewport width (reference width ~16 for desktop)
        const speedFactor = Math.min(viewport.width / 16, 1.0)

        return [
            {
                id: 'design',
                pos: new THREE.Vector3(-viewport.width * 0.2, startY, 0),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.1 * speedFactor, -0.15 * speedFactor, 0),
                rotationSpeed: { x: 0.2, y: 0.15 },
                images: getRandomImages('design', IMAGE_COUNT),
                radius: radius,
                isBackground: false,
                isEntering: true,
                opacity: 1,
                isExploded: false,
                fragmentState: null,
                explosionScale: 1.0,
                clickCount: 0,
                targetScale: 1.0
            },
            {
                id: 'styling',
                pos: new THREE.Vector3(viewport.width * 0.2, startY * 1.5, -1),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.1 * speedFactor, -0.15 * speedFactor, 0),
                rotationSpeed: { x: 0.15, y: 0.2 },
                images: getRandomImages('styling', IMAGE_COUNT),
                radius: radius,
                isBackground: true,
                isEntering: true,
                opacity: 0.4,
                isExploded: false,
                fragmentState: null,

                explosionScale: 1.0,
                clickCount: 0,
                targetScale: 1.0
            }
        ]
    })

    // Timeout refs for auto-reset
    const resetTimeouts = useRef({})

    // Ref to track target position for camera - accessible outside state setter
    const targetSphereRef = useRef(null)



    // Unified Click Handler
    const handleSphereClick = (sphereId) => {
        if (onNavigate) {
            onNavigate(sphereId)
            return
        }
        setSpheres(currentSpheres => {
            return currentSpheres.map(s => {
                if (s.id !== sphereId || s.isExploded) return s

                // Clear existing timeout if any
                if (resetTimeouts.current[sphereId]) {
                    clearTimeout(resetTimeouts.current[sphereId])
                }

                const newClickCount = s.clickCount + 1

                // Level 1-4: Progressive Scaling
                if (newClickCount < 5) {
                    // Set new timeout to reset if no more clicks occur
                    resetTimeouts.current[sphereId] = setTimeout(() => {
                        setSpheres(latestSpheres => latestSpheres.map(ls => {
                            if (ls.id === sphereId && !ls.isExploded) {
                                return {
                                    ...ls,
                                    clickCount: 0,
                                    targetScale: 1.0
                                }
                            }
                            return ls
                        }))
                    }, 2000) // Reset after 2 seconds of inactivity

                    return {
                        ...s,
                        clickCount: newClickCount,
                        targetScale: 1.0 + (newClickCount * 0.25) // Grow 25% per click
                    }
                }

                // Level 5: EXPLOSION!
                console.log(`Sphere ${sphereId} reached max clicks - EXPLOSION!`)

                // Match visual structure (use actual images on sphere)
                const displayImages = s.images
                const radius = s.radius * 1.2
                const planeScale = s.radius * 0.41

                const positions = fibonacciSphere(displayImages.length, radius)
                const quaternions = positions.map(pos => {
                    const lookMatrix = new THREE.Matrix4()
                    lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))

                    // Add tilt matching CompositeSphere (approximate)
                    const quat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
                    const tiltAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, (Math.random() - 0.5) * 0.3)
                    quat.multiply(tiltQuat)
                    return quat
                })

                const fragments = positions.map((pos, i) => {
                    // Explosion Physics - Very gentle initial burst for smooth start
                    const direction = pos.clone().normalize()
                    // Strong upward bias for floating, elegant dispersion
                    direction.y += 1.0
                    direction.normalize()

                    // Very gentle initial force - the warm-up system will scale this
                    const force = 1.5 + Math.random() * 1.5
                    const velocity = direction.multiplyScalar(force)

                    // Slow, elegant rotation
                    const angularVelocity = new THREE.Vector3(
                        Math.random() - 0.5,
                        Math.random() - 0.5,
                        Math.random() - 0.5
                    ).multiplyScalar(2.0)

                    return {
                        originalPos: pos.clone(),
                        originalQuat: quaternions[i].clone(),
                        scale: planeScale,
                        velocity: velocity,
                        angularVelocity: angularVelocity
                    }
                })

                // Start reconstruction after 2 seconds for a clear "pause" moment
                setTimeout(() => {
                    setSpheres(spheres => spheres.map(sphere => {
                        if (sphere.id === sphereId) {
                            return {
                                ...sphere,
                                fragmentState: {
                                    ...sphere.fragmentState,
                                    isReconstructing: true,
                                    reconstructionStartTime: Date.now()
                                }
                            }
                        }
                        return sphere
                    }))
                }, 2000) // Restored to 2.0 seconds

                return {
                    ...s,
                    isExploded: true,
                    // Note: do NOT reset clicks/scale yet (wait for reconstruction)
                    fragmentState: {
                        fragments,
                        reconstructionProgress: 0,
                        isReconstructing: false,
                        reconstructionStartTime: null,
                        explosionStartTime: Date.now()  // Track explosion start for warm-up
                    }
                }
            })
        })
    }

    // Physics Loop
    useFrame((state, delta) => {
        setSpheres(currentSpheres => {
            const newSpheres = currentSpheres.map(s => ({
                ...s,
                pos: s.pos.clone(),
                vel: s.vel.clone()
            }))

            const s1 = newSpheres[0]
            const s2 = newSpheres[1]

            // Physics Update (Movement, Wall Bounce, Collision)
            // ... (Same logic as before, just referencing radius from config)
            newSpheres.forEach(s => {
                const r = s.radius

                // Skip physics for exploded spheres
                if (s.isExploded) return

                if (s.id === targetCategory) {
                    // ** CENTERING PHASE **
                    // Target sphere logic: Move to center, stop physics
                    const targetCenter = new THREE.Vector3(0, 0, 1.8) // Foreground center

                    // Fast but controlled snap to center
                    s.pos.lerp(targetCenter, delta * 3.5)

                    // Kill velocity
                    s.vel.set(0, 0, 0)

                    // Slowly align rotation to look at camera (identity quaternion) for a clean look
                    s.isBackground = false
                } else if (s.isEntering) {
                    s.pos.add(s.vel)
                    // Continue entering until hitting bottom bound
                    const boundsY = viewport.height / 2 - r
                    if (s.pos.y < -boundsY) {
                        s.pos.y = -boundsY
                        s.vel.y *= -0.6 // Dampen the first bounce
                        s.isEntering = false

                        // Give random sideways velocity for the bounce
                        const angle = Math.random() * Math.PI
                        // Scale bounce speed by viewport width
                        const speedFactor = Math.min(viewport.width / 16, 1.0)
                        const speed = (0.05 + Math.random() * 0.05) * speedFactor
                        s.vel.x = Math.cos(angle) * speed
                    }
                } else {
                    // Standard Physics for non-target spheres
                    s.pos.add(s.vel)
                    // Use scaled radius for wall bounces too
                    const rScaled = r * (s.targetScale || 1.0)
                    const boundsX = viewport.width / 2 - rScaled
                    const boundsY = viewport.height / 2 - rScaled
                    if (s.pos.x > boundsX) { s.pos.x = boundsX; s.vel.x *= -1 }
                    if (s.pos.x < -boundsX) { s.pos.x = -boundsX; s.vel.x *= -1 }
                    if (s.pos.y > boundsY) { s.pos.y = boundsY; s.vel.y *= -1 }
                    if (s.pos.y < -boundsY) { s.pos.y = -boundsY; s.vel.y *= -1 }
                }
            })

            // Elastic Collision (skip if any sphere is exploded)
            if (!s1.isEntering && !s2.isEntering && !s1.isExploded && !s2.isExploded) {
                const dx = s2.pos.x - s1.pos.x
                const dy = s2.pos.y - s1.pos.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                // Use targetScale to prevent overlap during growth
                const r1 = s1.radius * (s1.targetScale || 1.0)
                const r2 = s2.radius * (s2.targetScale || 1.0)
                const minDist = r1 + r2

                if (dist < minDist) {
                    const nx = dx / dist
                    const ny = dy / dist
                    const dvx = s1.vel.x - s2.vel.x
                    const dvy = s1.vel.y - s2.vel.y
                    const dot = dvx * nx + dvy * ny

                    if (dot > 0) {
                        const impulse = dot
                        s1.vel.x -= impulse * nx
                        s1.vel.y -= impulse * ny
                        s2.vel.x += impulse * nx
                        s2.vel.y += impulse * ny

                        const overlap = minDist - dist
                        s1.pos.x -= nx * overlap * 0.5
                        s1.pos.y -= ny * overlap * 0.5
                        s2.pos.x += nx * overlap * 0.5
                        s2.pos.y += ny * overlap * 0.5
                    }
                }
            }

            // Visual Logic (Opacity/Depth)
            const dx = s2.pos.x - s1.pos.x
            const dy = s2.pos.y - s1.pos.y
            const dist2D = Math.sqrt(dx * dx + dy * dy)
            const overlapThreshold = (s1.radius + s2.radius) * 0.9

            if (dist2D < overlapThreshold) {
                if (s1.pos.z > s2.pos.z) {
                    s1.isBackground = false; s2.isBackground = true
                } else {
                    s1.isBackground = true; s2.isBackground = false
                }
            } else {
                s1.isBackground = false
                s2.isBackground = false
            }

            // Lerp Opacity
            newSpheres.forEach(s => {
                const targetOp = s.isBackground ? 0.4 : 1.0
                s.opacity = THREE.MathUtils.lerp(s.opacity, targetOp, 0.1)
            })

            // Handle Reconstruction with extended duration for smoothness
            newSpheres.forEach(s => {
                if (s.fragmentState?.isReconstructing) {
                    const elapsed = Date.now() - s.fragmentState.reconstructionStartTime
                    const reconstructionDuration = 3500 // 3.5 seconds for ultra-smooth reconstruction

                    s.fragmentState.reconstructionProgress = Math.min(elapsed / reconstructionDuration, 1)

                    // When reconstruction is complete, reset to normal state
                    if (s.fragmentState.reconstructionProgress >= 1) {
                        s.isExploded = false
                        s.fragmentState = null
                        s.explosionScale = 1.0
                        s.clickCount = 0
                        s.targetScale = 1.0
                    } else {
                        // Smoother scale lerp during reconstruction
                        if (s.targetScale > 1.0) {
                            s.targetScale = THREE.MathUtils.lerp(s.targetScale, 1.0, 0.03)
                        }
                    }
                }


            })

            // Update ref for camera logic (runs outside this setter)
            if (targetCategory) {
                const targetSphere = newSpheres.find(s => s.id === targetCategory)
                if (targetSphere) {
                    targetSphereRef.current = targetSphere.pos.clone()
                }
            }


            return newSpheres
        })

        // -- CAMERA ANIMATION FOR NAVIGATION --
        // Now runs in the main frame loop, reading the REF updated by physics
        if (targetCategory && targetSphereRef.current) {
            const targetPos = targetSphereRef.current
            const centerPos = new THREE.Vector3(0, 0, 1.8)
            const distToCenter = targetPos.distanceTo(centerPos)

            // Only start diving if sphere is essentially STOPPED at center (Phase 2)
            // Strict threshold < 0.1 ensure it's "locked in" before we move
            if (distToCenter < 0.1) {
                // Phase 2: DIVE
                const speed = 4.5 * delta

                // 1. Move Camera Position INSIDE the sphere
                const approachTarget = targetPos.clone().add(new THREE.Vector3(0, 0, 1.5))

                camera.position.lerp(approachTarget, speed)

                // 2. Look At the sphere center
                const dummy = new THREE.Object3D()
                dummy.position.copy(camera.position)
                dummy.lookAt(targetPos)

                camera.quaternion.slerp(dummy.quaternion, speed * 4.0)

                // Check distance to trigger transition
                const dist = camera.position.distanceTo(targetPos)

                if (dist < 2.8) {
                    if (onTransitionComplete) onTransitionComplete()
                }
            } else {
                // Phase 1: TRACKING during centering (Lerp Speed 10.0)
                const dummy = new THREE.Object3D()
                dummy.position.copy(camera.position)
                dummy.lookAt(targetPos)
                // Fast tracking to avoid "looking at where it was" lag
                camera.quaternion.slerp(dummy.quaternion, delta * 10.0)
            }
        }
    })

    return (
        <group>
            {spheres.map((s) => (
                <PhysicsGroup
                    key={s.id}
                    id={s.id}
                    config={s}
                    opacity={s.opacity}
                    isBackground={s.isBackground}
                    onNavigate={onNavigate}
                    onClick={handleSphereClick}
                />
            ))}
        </group>
    )
}

export default function PhysicalSpheres({ onNavigate, targetCategory, onTransitionComplete }) {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 5,
            pointerEvents: 'none'
        }}>
            <Canvas
                camera={{ position: [0, 0, 10], fov: 50 }}
                dpr={[1, 2]}
                style={{ pointerEvents: 'auto' }}
            >
                <ambientLight intensity={1.5} />
                <PhysicsScene
                    onNavigate={onNavigate}
                    targetCategory={targetCategory}
                    onTransitionComplete={onTransitionComplete}
                />
            </Canvas>
        </div>
    )
}
