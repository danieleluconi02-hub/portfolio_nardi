import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Fibonacci Sphere Distribution - creates evenly distributed points on a sphere
 */
function fibonacciSphere(samples, radius = 1) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    const yMin = -0.92
    const yMax = 0.92

    for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1)
        const y = yMax - t * (yMax - yMin)
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
 * Ultra-smooth cinematic easing
 */
function smoothEase(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Static Image Plane for sphere surface
 */
function StaticImagePlane({ imagePath, position, quaternion, scale = 1.0, opacity }) {
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
        meshRef.current.position.copy(position)
        meshRef.current.quaternion.copy(quaternion)
        if (meshRef.current.material) {
            meshRef.current.material.opacity = opacity
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
                    opacity={opacity}
                />
            ) : (
                <meshBasicMaterial
                    color="#1a1a1a"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={opacity}
                />
            )}
        </mesh>
    )
}

/**
 * Sphere Entrance From Landing Component
 * Handles the transition animation when user clicks a category from the landing menu
 * The camera flies from the landing view position into the selected sphere
 * The sphere starts from its current orbit position and moves to center
 */
export default function SphereEntranceFromLanding({
    category,
    collections,
    onEnterComplete,
    initialPosition = { x: 0, y: 0, z: 0 }
}) {
    const { camera } = useThree()
    const groupRef = useRef()

    // Animation state
    const animationState = useRef({
        phase: 'approach', // 'approach' -> 'enter' -> 'complete'
        startTime: 0,
        opacity: 0,
        sphereRotation: 0,
        sphereScale: 0.85, // Start at the same scale as in DualSphereBg
        enterComplete: false
    })

    // Sphere parameters - match DualSphereBg
    const sphereRadius = 2.8 // Same as DualSphereBg
    const TARGET_IMAGE_COUNT = 40 // Same as DualSphereBg for visual consistency

    // Timing (milliseconds) - smooth, cinematic transitions
    const APPROACH_DURATION = 1200 // Camera approaches the sphere
    const ENTER_DURATION = 1400 // Camera enters the sphere

    // Starting position from orbit (passed from App.jsx)
    const startX = initialPosition.x || (category === 'design' ? -10 : 10)
    const startY = initialPosition.y || 0
    const startZ = initialPosition.z || 0

    // Get all images from collections
    const allImages = useMemo(() => {
        const images = []
        collections.forEach(col => {
            if (col.images) {
                col.images.forEach(img => {
                    images.push(img.replace('/full/', '/thumb/'))
                })
            }
        })
        return images
    }, [collections])

    // Sample random images with category-based seed for consistency
    const sampledImages = useMemo(() => {
        if (allImages.length === 0) return []

        const seed = category === 'design' ? 12345 : 67890
        const seededRandom = (i) => {
            const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
            return x - Math.floor(x)
        }

        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(i) * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        return shuffled.slice(0, Math.min(TARGET_IMAGE_COUNT, shuffled.length))
    }, [allImages, category])

    // Image scale - match DualSphereBg
    const imageScale = useMemo(() => {
        const count = sampledImages.length
        if (count <= 30) return 1.0
        if (count <= 40) return 0.85
        return 0.75
    }, [sampledImages.length])

    // Fixed positions on sphere
    const spherePositions = useMemo(() =>
        fibonacciSphere(sampledImages.length, sphereRadius),
        [sampledImages.length, sphereRadius]
    )

    // Calculate quaternions for each image
    const imageQuaternions = useMemo(() => {
        return spherePositions.map(pos => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
        })
    }, [spherePositions])

    // Initialize camera and animation - MATCH EXACT LANDING CAMERA POSITION
    useEffect(() => {
        // Camera starts from the EXACT landing view position
        camera.position.set(0, 5, 20)
        camera.lookAt(0, 0, 0)
        camera.fov = 45
        camera.updateProjectionMatrix()

        animationState.current = {
            phase: 'approach',
            startTime: performance.now(),
            opacity: 0.95, // Start visible (matching DualSphereBg)
            sphereRotation: 0,
            sphereScale: 0.85,
            enterComplete: false
        }
    }, [camera])

    // Main animation loop
    useFrame(() => {
        const anim = animationState.current
        const now = performance.now()

        // Move sphere group to its position
        if (groupRef.current) {
            // PHASE 1: Camera approaches the sphere at its orbit position
            if (anim.phase === 'approach') {
                const elapsed = now - anim.startTime
                const progress = Math.min(elapsed / APPROACH_DURATION, 1)
                const eased = smoothEase(progress)

                // Sphere stays at its orbit position, moves slightly toward center
                const currentX = startX * (1 - eased * 0.7) // Keep mostly at orbit position
                const currentY = startY
                const currentZ = startZ * (1 - eased * 0.5)
                groupRef.current.position.set(currentX, currentY, currentZ)

                // Camera approaches from landing position toward the sphere
                const startCameraZ = 20
                const startCameraY = 5
                const endCameraZ = 8 + Math.abs(currentX) * 0.3 // End closer to sphere
                const endCameraY = 1

                // Camera moves toward the sphere's position
                camera.position.set(
                    currentX * 0.6 * eased, // Move toward sphere's X
                    startCameraY + (endCameraY - startCameraY) * eased,
                    startCameraZ + (endCameraZ - startCameraZ) * eased
                )
                camera.lookAt(currentX * 0.3, 0, currentZ * 0.3)

                // Sphere grows slightly while approaching
                const startScale = 0.85
                const endScale = 1.1
                anim.sphereScale = startScale + (endScale - startScale) * eased

                // Rotate sphere smoothly
                anim.sphereRotation += 0.01 + progress * 0.005
                groupRef.current.rotation.y = anim.sphereRotation
                groupRef.current.scale.setScalar(anim.sphereScale)

                // Keep opacity high
                anim.opacity = 0.95

                if (progress >= 1) {
                    anim.phase = 'enter'
                    anim.startTime = performance.now()
                }
            }
            // PHASE 2: Camera enters inside the sphere
            else if (anim.phase === 'enter') {
                const elapsed = now - anim.startTime
                const progress = Math.min(elapsed / ENTER_DURATION, 1)
                const eased = smoothEase(progress)

                // Sphere moves to center during entry
                const startEntryX = startX * 0.3
                const currentX = startEntryX * (1 - eased)
                groupRef.current.position.set(currentX, 0, 0)

                // Camera flies DIRECTLY INTO the sphere
                const startDist = 8 + Math.abs(startX) * 0.3
                const targetDist = -2 // Goes into the center
                const currentDist = startDist + (targetDist - startDist) * eased

                camera.position.set(
                    currentX * (1 - eased),
                    1 * (1 - eased),
                    currentDist
                )
                camera.lookAt(0, 0, 0)

                // FOV widens for immersion effect
                camera.fov = 45 + eased * 30
                camera.updateProjectionMatrix()

                // Sphere continues to grow
                const startScale = 1.1
                const endScale = 1.5
                anim.sphereScale = startScale + (endScale - startScale) * eased
                groupRef.current.scale.setScalar(anim.sphereScale)

                // Fade out images as camera passes through
                anim.opacity = 0.95 * Math.max(0, 1 - progress * 1.3)

                // Faster rotation during entry
                anim.sphereRotation += 0.015 + progress * 0.01
                groupRef.current.rotation.y = anim.sphereRotation

                // Trigger completion at 80%
                if (progress >= 0.8 && !anim.enterComplete) {
                    anim.enterComplete = true
                    if (onEnterComplete) onEnterComplete()
                }

                if (progress >= 1) {
                    anim.phase = 'complete'
                }
            }
        }
    })

    if (sampledImages.length === 0) return null

    return (
        <>
            {/* Ambient lighting */}
            <ambientLight intensity={1.2} />

            {/* Sphere group */}
            <group ref={groupRef}>
                {sampledImages.map((imagePath, index) => (
                    <StaticImagePlane
                        key={`${category}-${imagePath}-${index}`}
                        imagePath={imagePath}
                        position={spherePositions[index]}
                        quaternion={imageQuaternions[index]}
                        scale={imageScale}
                        opacity={animationState.current.opacity}
                    />
                ))}
            </group>
        </>
    )
}
