import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Check if device is mobile for responsive sizing
 */
function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth < 768
}

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
 * Fisher-Yates shuffle with true randomness (not seeded)
 * Creates different image arrangement on each page refresh
 */
function shuffleArrayRandom(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
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

    // Removed useFrame: Position/Quaternion are static relative to group.
    // Opacity is controlled by parent SingleSphere traversal to avoid React overhead.

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            scale={[scale, scale * 1.35, 1]}
        >
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
 * Single Sphere Component - used by DualSphereBg
 */
function SingleSphere({
    collections,
    sphereRadius,
    category,
    animState, // Mutable Ref: { current: { position, rotation, opacity, scale, renderOrder } }
}) {
    const groupRef = useRef()
    const TARGET_IMAGE_COUNT = 60  // Match CategorySphere for fuller spheres

    // Get all images from collections
    const allImages = useMemo(() => {
        const images = []
        if (!collections) return [] // Safety check
        collections.forEach(col => {
            if (col.images) {
                col.images.forEach(img => {
                    images.push(img.replace('/full/', '/thumb/'))
                })
            }
        })
        return images
    }, [collections])

    // Sample random images - TRUE RANDOM shuffle on each page refresh (not seeded)
    // This creates a unique visual experience every time the page loads
    const sampledImages = useMemo(() => {
        if (allImages.length === 0) return []

        // Use true random shuffle instead of seeded random
        const shuffled = shuffleArrayRandom(allImages)

        return shuffled.slice(0, Math.min(TARGET_IMAGE_COUNT, shuffled.length))
    }, [allImages])

    // Image scale logic
    const baseImageScale = useMemo(() => {
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

    // Calculate quaternions for each image to face outward
    const imageQuaternions = useMemo(() => {
        return spherePositions.map(pos => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
        })
    }, [spherePositions])

    // Apply self-rotation, scale, and render order (perspective) using REF to avoid re-renders
    useFrame(() => {
        if (groupRef.current && animState.current) {
            const state = animState.current

            // Apply Group Transforms
            groupRef.current.position.copy(state.position)
            groupRef.current.rotation.y = state.rotation
            groupRef.current.scale.setScalar(state.scale)

            // Optimization: Update children opacities directly without React re-renders of ImagePlane
            // This is much faster.
            groupRef.current.traverse((child) => {
                // If child is a mesh (the image plane)
                if (child.isMesh) {
                    child.renderOrder = state.renderOrder
                    if (child.material) {
                        // Force update opacity
                        child.material.opacity = state.opacity
                        child.material.transparent = true // ensure transparent
                    }
                }
            })
        }
    })

    // Debug logging
    useEffect(() => {
        console.log(`[SingleSphere:${category}] Initialized:`, {
            collections: collections?.length || 0,
            allImages: allImages.length,
            sampledImages: sampledImages.length,
            sphereRadius,
            animState: animState.current
        })
    }, [])

    if (sampledImages.length === 0) {
        console.warn(`[SingleSphere:${category}] No images to display!`)
        return null
    }

    return (
        <group ref={groupRef}>
            {sampledImages.map((imagePath, index) => (
                <StaticImagePlane
                    key={`${category}-${imagePath}-${index}`}
                    imagePath={imagePath}
                    position={spherePositions[index]}
                    quaternion={imageQuaternions[index]}
                    scale={baseImageScale}
                    opacity={0} // Initial opacity, overridden by useFrame immediately
                />
            ))}
        </group>
    )
}

/**
 * Smooth easing function for entrance animation
 */
function smoothEase(t) {
    // Cubic bezier-like easing for smooth entrance
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Helper component for clickable area that follows animation
 * Disables pointer-events when sphere is in background (opacity < 1.0)
 */
function AnimatableClickSphere({ radius, onClick, animState }) {
    const meshRef = useRef()
    useFrame(() => {
        if (meshRef.current && animState.current) {
            meshRef.current.position.copy(animState.current.position)
            // Disable raycast (pointer-events) when sphere is in background
            meshRef.current.raycast = animState.current.opacity >= 1.0
                ? THREE.Mesh.prototype.raycast
                : () => { }
        }
    })
    return (
        <mesh ref={meshRef} onClick={onClick}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
    )
}

/**
 * Dual Sphere Background Component
 * Renders both Fashion Design and Styling spheres orbiting each other
 * with automatic entrance animation on load - camera orbits from top-down view
 * showing both spheres simultaneously before settling into orbit mode
 */
export default function DualSphereBg({
    designCollections,
    stylingCollections,
    onSphereClick
}) {
    const { camera } = useThree()

    // Entrance animation state - Start directly visible
    const [animPhase, setAnimPhase] = useState('physics') // Physics-based movement

    // Responsive sphere parameters - Mobile First with dynamic viewport calculation
    const mobile = isMobile()

    // Animation Mutable State Refs (Shared with Children)
    const designAnimState = useRef({
        position: new THREE.Vector3(-6, 0, 0),  // Start left
        rotation: 0,
        opacity: 1.0,
        scale: 1.0,
        renderOrder: 10
    })

    const stylingAnimState = useRef({
        position: new THREE.Vector3(6, 0, 0),  // Start right
        rotation: 0,
        opacity: 1.0,
        scale: 1.0,
        renderOrder: 0
    })

    // Physics state for each sphere - Mobile gets 30% reduced velocity for better UX
    const mobileVelocityScale = mobile ? 0.7 : 1.0  // 30% reduction on mobile
    const baseVelocity = 0.08 * mobileVelocityScale

    const physicsRef = useRef({
        design: {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * baseVelocity * 2,  // Random X velocity
                (Math.random() - 0.5) * baseVelocity * 2,  // Random Y velocity
                0
            ),
            rotationSpeed: 0.008 + Math.random() * 0.004,  // Varied rotation speed
            rotation: Math.random() * Math.PI * 2  // Random starting rotation
        },
        styling: {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * baseVelocity * 2,  // Random X velocity
                (Math.random() - 0.5) * baseVelocity * 2,  // Random Y velocity
                0
            ),
            rotationSpeed: 0.006 + Math.random() * 0.004,  // Varied rotation speed
            rotation: Math.random() * Math.PI * 2  // Random starting rotation
        },
        // Track velocity magnitudes for opacity calculation
        maxVelocity: baseVelocity * 2  // Used to normalize velocity for opacity
    })


    // Dynamic orbital radius based on min(vw, vh) to prevent clipping on smartphones
    const viewportMin = typeof window !== 'undefined'
        ? Math.min(window.innerWidth, window.innerHeight)
        : 768

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 768

    // Scale orbit radius proportionally to viewport - REDUCED for better visibility
    const baseOrbitRadius = mobile ? 5 : 6  // Reduced from 10 to 6 for tighter orbit
    const viewportScale = mobile ? Math.min(1, viewportMin / 400) : 1

    // Sphere size - MATCH CategorySphere for better visibility
    const sphereRadius = mobile ? 3.5 * viewportScale : 4.5  // Increased to match CategorySphere

    // Calculate maximum orbit radius to prevent lateral boundary overflow
    // Formula: maxRadius = (viewportWidth / 2) - sphereRadius - safetyMargin
    const safetyMargin = mobile ? 20 : 0 // 20px safety margin on mobile
    const maxOrbitRadius = mobile
        ? (viewportWidth / 2 / 10) - sphereRadius - (safetyMargin / 10) // Convert to Three.js units
        : baseOrbitRadius * viewportScale

    // Clamp orbit radius to prevent exceeding lateral boundaries (devices < 768px)
    const orbitRadius = mobile
        ? Math.min(baseOrbitRadius * viewportScale, maxOrbitRadius)
        : baseOrbitRadius * viewportScale

    const orbitSpeed = 0.003
    const selfRotationSpeed = 0.01  // Match CategorySphere idle rotation speed

    // Z-depth ratio for 3D orbital effect - controls how much depth variation
    const zDepthRatio = 0.35

    // Camera parameters - adjusted for dual sphere visibility
    const cameraDistance = 28  // Increased from 22 to see both spheres
    const cameraAngle = Math.PI * 0.12  // ~22 degrees - front external view
    const cameraFov = 45  // Wider FOV to capture both spheres

    // Camera position initialization - NO ANIMATION, direct to final position
    useEffect(() => {
        // Position camera at final "idle" position immediately
        const finalDist = cameraDistance * 1.1
        camera.position.y = Math.sin(cameraAngle) * finalDist
        camera.position.z = Math.cos(cameraAngle) * finalDist
        camera.position.x = 0
        camera.lookAt(0, 0, 0)
        camera.fov = cameraFov
        camera.updateProjectionMatrix()

        setAnimPhase('physics')
    }, [])

    // Animation loop - Enhanced Physics with velocity-based opacity
    useFrame((state) => {
        const physics = physicsRef.current
        const dState = designAnimState.current
        const sState = stylingAnimState.current

        // Calculate screen boundaries in Three.js units
        // Use camera frustum to determine visible bounds
        const vFOV = THREE.MathUtils.degToRad(camera.fov)
        const height = 2 * Math.tan(vFOV / 2) * Math.abs(camera.position.z)
        const width = height * camera.aspect

        const boundX = width / 2 - sphereRadius - 1  // Add margin
        const boundY = height / 2 - sphereRadius - 1

        // ===== POSITION UPDATE =====
        dState.position.x += physics.design.velocity.x
        dState.position.y += physics.design.velocity.y

        sState.position.x += physics.styling.velocity.x
        sState.position.y += physics.styling.velocity.y

        // ===== BOUNDARY COLLISIONS WITH ENERGY PRESERVATION =====
        const wallRestitution = 0.92  // Slightly elastic walls
        const minVelocity = 0.02  // Minimum velocity to prevent stalling

        // Design sphere boundary collision
        if (Math.abs(dState.position.x) > boundX) {
            physics.design.velocity.x *= -wallRestitution
            dState.position.x = Math.sign(dState.position.x) * boundX
            // Inject small random energy to prevent stalling
            physics.design.velocity.y += (Math.random() - 0.5) * 0.01
        }
        if (Math.abs(dState.position.y) > boundY) {
            physics.design.velocity.y *= -wallRestitution
            dState.position.y = Math.sign(dState.position.y) * boundY
            physics.design.velocity.x += (Math.random() - 0.5) * 0.01
        }

        // Styling sphere boundary collision
        if (Math.abs(sState.position.x) > boundX) {
            physics.styling.velocity.x *= -wallRestitution
            sState.position.x = Math.sign(sState.position.x) * boundX
            physics.styling.velocity.y += (Math.random() - 0.5) * 0.01
        }
        if (Math.abs(sState.position.y) > boundY) {
            physics.styling.velocity.y *= -wallRestitution
            sState.position.y = Math.sign(sState.position.y) * boundY
            physics.styling.velocity.x += (Math.random() - 0.5) * 0.01
        }

        // ===== SPHERE-TO-SPHERE COLLISION (Improved Elastic) =====
        const distance = dState.position.distanceTo(sState.position)
        const minDistance = sphereRadius * 2.1  // Slightly larger to prevent overlap

        if (distance < minDistance) {
            // Calculate collision normal
            const normal = new THREE.Vector3()
                .subVectors(sState.position, dState.position)
                .normalize()

            // Separate spheres (push apart)
            const overlap = minDistance - distance
            const separation = normal.clone().multiplyScalar(overlap / 2 + 0.05)

            dState.position.sub(separation)
            sState.position.add(separation)

            // Elastic collision with proper physics
            // For equal mass spheres: swap velocity components along collision axis
            const relativeVelocity = new THREE.Vector3()
                .subVectors(physics.styling.velocity, physics.design.velocity)

            const velocityAlongNormal = relativeVelocity.dot(normal)

            // Only resolve if spheres are moving towards each other
            if (velocityAlongNormal < 0) {
                const restitution = 0.95  // Nearly elastic collision
                const impulse = normal.clone().multiplyScalar(velocityAlongNormal * (1 + restitution) / 2)

                physics.design.velocity.add(impulse)
                physics.styling.velocity.sub(impulse)

                // Add slight perpendicular impulse for more interesting motion
                const perpendicular = new THREE.Vector3(-normal.y, normal.x, 0).normalize()
                const sidewaysImpulse = perpendicular.multiplyScalar((Math.random() - 0.5) * 0.02)
                physics.design.velocity.add(sidewaysImpulse)
                physics.styling.velocity.sub(sidewaysImpulse)
            }
        }

        // ===== VELOCITY MAGNITUDE MAINTENANCE =====
        // Ensure spheres don't slow down too much
        const designSpeed = physics.design.velocity.length()
        const stylingSpeed = physics.styling.velocity.length()

        if (designSpeed < minVelocity) {
            const boost = new THREE.Vector3(
                (Math.random() - 0.5) * minVelocity * 2,
                (Math.random() - 0.5) * minVelocity * 2,
                0
            )
            physics.design.velocity.add(boost)
        }
        if (stylingSpeed < minVelocity) {
            const boost = new THREE.Vector3(
                (Math.random() - 0.5) * minVelocity * 2,
                (Math.random() - 0.5) * minVelocity * 2,
                0
            )
            physics.styling.velocity.add(boost)
        }

        // ===== CONTINUOUS SELF-ROTATION =====
        physics.design.rotation += physics.design.rotationSpeed
        physics.styling.rotation += physics.styling.rotationSpeed

        dState.rotation = physics.design.rotation
        sState.rotation = physics.styling.rotation

        // ===== Z-DEPTH FOR VISUAL LAYERING =====
        const time = state.clock.getElapsedTime()
        dState.position.z = Math.sin(time * 0.5) * 0.8
        sState.position.z = Math.cos(time * 0.5) * 0.8

        // ===== VELOCITY-BASED OPACITY =====
        // Higher velocity = more visible (foreground feeling)
        // Normalize velocities to 0-1 range
        const normalizedDesignSpeed = Math.min(1, designSpeed / physics.maxVelocity)
        const normalizedStylingSpeed = Math.min(1, stylingSpeed / physics.maxVelocity)

        // Combine velocity with Z-depth for final opacity
        const designZFactor = (dState.position.z + 1) / 2  // Map -1 to 1 -> 0 to 1
        const stylingZFactor = (sState.position.z + 1) / 2

        // Weight: 60% velocity-based, 40% Z-depth based
        const velocityWeight = 0.6
        const depthWeight = 0.4

        // Calculate combined opacity factor
        const designOpacityFactor = (normalizedDesignSpeed * velocityWeight) + (designZFactor * depthWeight)
        const stylingOpacityFactor = (normalizedStylingSpeed * velocityWeight) + (stylingZFactor * depthWeight)

        // Determine which sphere is "in front" based on combined factors
        const designIsFront = designOpacityFactor > stylingOpacityFactor

        // Set opacity with velocity influence
        // Foreground sphere: 1.0, Background: higher minimum opacity (0.6-0.85) to stay visible
        if (designIsFront) {
            dState.opacity = 1.0
            sState.opacity = 0.6 + normalizedStylingSpeed * 0.25  // 0.6 to 0.85 based on velocity
        } else {
            sState.opacity = 1.0
            dState.opacity = 0.6 + normalizedDesignSpeed * 0.25  // 0.6 to 0.85 based on velocity
        }

        // Render order based on opacity/depth
        dState.renderOrder = designIsFront ? 2 : 1
        sState.renderOrder = designIsFront ? 1 : 2

        // ===== DEBUG EXPORT =====
        if (typeof window !== 'undefined') {
            window.spherePositions = {
                design: {
                    x: dState.position.x,
                    y: dState.position.y,
                    z: dState.position.z,
                    vx: physics.design.velocity.x,
                    vy: physics.design.velocity.y,
                    speed: designSpeed,
                    opacity: dState.opacity
                },
                styling: {
                    x: sState.position.x,
                    y: sState.position.y,
                    z: sState.position.z,
                    vx: physics.styling.velocity.x,
                    vy: physics.styling.velocity.y,
                    speed: stylingSpeed,
                    opacity: sState.opacity
                }
            }
        }
    })

    // Handle sphere clicks
    const handleDesignClick = useCallback(() => {
        if (onSphereClick) onSphereClick('design')
    }, [onSphereClick])

    const handleStylingClick = useCallback(() => {
        if (onSphereClick) onSphereClick('styling')
    }, [onSphereClick])

    return (
        <>
            {/* Ambient lighting */}
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={0.3} />

            {/* Design Sphere */}
            <SingleSphere
                collections={designCollections}
                sphereRadius={sphereRadius}
                category="design"
                animState={designAnimState}
            />

            {/* Invisible clickable sphere for Design */}
            <AnimatableClickSphere
                radius={sphereRadius + 0.5}
                onClick={handleDesignClick}
                animState={designAnimState}
            />

            {/* Styling Sphere */}
            <SingleSphere
                collections={stylingCollections}
                sphereRadius={sphereRadius}
                category="styling"
                animState={stylingAnimState}
            />

            {/* Invisible clickable sphere for Styling */}
            <AnimatableClickSphere
                radius={sphereRadius + 0.5}
                onClick={handleStylingClick}
                animState={stylingAnimState}
            />
        </>
    )
}
