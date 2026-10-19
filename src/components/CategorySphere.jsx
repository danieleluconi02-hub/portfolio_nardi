import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SketchySphereGrid from './SketchySphereGrid'
import { sampleSphereImages, loadTexture, SPHERE_IMAGE_COUNT } from '../lib/sphereImages'


/**
 * Fibonacci Sphere Distribution - creates evenly distributed points on a sphere
 */
function fibonacciSphere(samples, radius = 1) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    // Exclude both poles to prevent overlap
    const yMin = -0.92  // Slightly above bottom pole
    const yMax = 0.92   // Slightly below top pole

    for (let i = 0; i < samples; i++) {
        // Distribute from top to almost bottom (avoiding south pole overlap)
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
 * Static Image Plane Component - images are already positioned on the sphere
 */
function StaticImagePlane({
    imagePath,
    position,
    quaternion,
    scale = 1.0,
    getOpacity
}) {
    const meshRef = useRef()
    const textureRef = useRef(null)
    const [textureLoaded, setTextureLoaded] = useState(false)

    useEffect(() => {
        let cancelled = false
        if (imagePath && !textureRef.current) {
            loadTexture(imagePath)
                .then((tex) => {
                    if (cancelled) return
                    textureRef.current = tex
                    setTextureLoaded(true)
                })
                .catch(() => { /* leave placeholder on failed image */ })
        }
        return () => { cancelled = true }
    }, [imagePath])

    // Optimize: Only update opacity in the frame loop
    // Position and Rotation are static for the sphere
    useFrame(() => {
        if (!meshRef.current || !meshRef.current.material) return

        // Apply opacity from parent animation
        // Multiplied by a simple fade-in for the texture itself
        const globalOpacity = getOpacity()

        // Ensure material is transparent and handles sorting better
        meshRef.current.material.opacity = textureLoaded ? globalOpacity : 0
        meshRef.current.visible = globalOpacity > 0.01
    })

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            scale={[scale, scale * 1.35, 1]}
            renderOrder={2} // Render ABOVE the grid lines (which have renderOrder=-1)
        >
            <planeGeometry args={[1, 1]} />
            {textureLoaded && textureRef.current ? (
                <meshBasicMaterial
                    map={textureRef.current}
                    side={THREE.DoubleSide}
                    transparent={true}
                    depthWrite={false}
                    depthTest={false} // Disable depth test to ensure visibility
                    opacity={0}
                    polygonOffset={true}
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                />
            ) : (
                <meshBasicMaterial
                    color="#1a1a1a"
                    side={THREE.DoubleSide}
                    transparent={true}
                    depthWrite={false}
                    depthTest={false}
                    opacity={0}
                />
            )}
        </mesh>
    )
}

/**
 * Main Category Sphere Component - Pre-formed sphere with top-down camera animation
 * Camera stays OUTSIDE the sphere, showing its external form
 */
export default function CategorySphere({
    category,
    collections,
    appState,
    seed,
    onSphereClick,
    onEnterComplete,
    onOrbitComplete
}) {
    const { camera } = useThree()
    const groupRef = useRef()

    // Animation state
    const animationState = useRef({
        phase: 'camera_orbit',
        startTime: 0,
        opacity: 0,
        enterComplete: false,
        sphereRotation: 0
    })

    // Sphere parameters - many more images since grid defines shape
    const sphereRadius = 4.5

    // Timing (milliseconds)
    const CAMERA_ORBIT_DURATION = 5000  // Longer animation - 5 seconds for dramatic effect
    const ENTER_DURATION = 1200         // Camera entering the sphere

    // Camera distance - stays well OUTSIDE the sphere
    const cameraDistance = 22  // Increased to ensure external view

    // Seeded sample - shared with PreloadManager so preloaded textures are reused
    const sampledImages = useMemo(
        () => sampleSphereImages(collections, seed, SPHERE_IMAGE_COUNT).map(img => img.path),
        [collections, seed]
    )

    // Image scale - adjusted for higher image count
    const imageScale = useMemo(() => {
        const count = sampledImages.length
        if (count <= 40) return 1.1
        if (count <= 60) return 0.9
        if (count <= 80) return 0.75
        return 0.65  // Smaller to prevent overlap at 90 images
    }, [sampledImages.length])

    // Fixed positions on sphere (pre-calculated)
    const spherePositions = useMemo(() =>
        fibonacciSphere(sampledImages.length, sphereRadius),
        [sampledImages.length, sphereRadius]
    )

    // Calculate quaternions for each image to face outward
    const imageQuaternions = useMemo(() => {
        return spherePositions.map(position => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(position, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
        })
    }, [spherePositions])

    // Initialize camera position - start FAR AWAY, looking down at small sphere
    useEffect(() => {
        if (appState === 'sphere') {
            // Start with camera very far and high - sphere appears small
            const startDistance = cameraDistance * 2.8
            camera.position.set(0, startDistance * 0.85, startDistance * 0.4)
            camera.lookAt(0, 0, 0)
            camera.fov = 40
            camera.updateProjectionMatrix()

            // Start camera orbit animation
            animationState.current = {
                phase: 'camera_orbit',
                startTime: performance.now(),
                opacity: 0,
                enterComplete: false,
                sphereRotation: 0
            }
        }
    }, [appState, camera, cameraDistance])

    // Handle sphere click - start entering phase
    useEffect(() => {
        if (appState === 'entering') {
            const currentPhase = animationState.current.phase
            // Force start 'entering' phase if not already there, regardless of previous phase
            // This handles both "Idle click" and "Orbit skip"
            if (currentPhase !== 'entering' && currentPhase !== 'complete') {
                animationState.current.phase = 'entering'
                animationState.current.startTime = performance.now()
            }
        }
    }, [appState])

    const getOpacity = useCallback(() => animationState.current.opacity, [])

    // Main animation loop
    useFrame(() => {
        const anim = animationState.current
        const now = performance.now()

        // PHASE 1: Camera zooms in from far away, sphere rotates with progressive acceleration
        if (anim.phase === 'camera_orbit') {
            const elapsed = now - anim.startTime
            const progress = Math.min(elapsed / CAMERA_ORBIT_DURATION, 1)

            // Smooth easing for camera movement
            const eased = smoothEase(progress)

            // Fade in images
            anim.opacity = Math.min(1, progress * 0.8) * 0.95

            // Camera starts VERY FAR AWAY and moves closer
            const startDistance = cameraDistance * 4.0  // Much farther for tiny sphere at start
            const endDistance = cameraDistance * 1.1    // Slightly back for external view
            const currentDistance = startDistance + (endDistance - startDistance) * eased

            // Camera angle: start from above, end at front external view
            // Start: high angle looking down at tiny sphere
            // End: slightly elevated front view (like reference photo)
            const startAngle = Math.PI * 0.35  // ~63 degrees from horizontal
            const endAngle = Math.PI * 0.12    // ~22 degrees - more elevated for external view
            const currentAngle = startAngle + (endAngle - startAngle) * eased

            camera.position.y = Math.sin(currentAngle) * currentDistance
            camera.position.z = Math.cos(currentAngle) * currentDistance
            camera.position.x = 0
            camera.lookAt(0, 0, 0)

            // Sphere rotation: smooth continuous acceleration throughout
            // Uses incremental speed that matches idle speed at start/end
            const baseSpeed = 0.01   // Same as idle rotation speed (faster)
            const maxSpeed = 0.04    // Peak speed during animation

            // Smooth curve: starts at idle speed, peaks in middle, ends at idle speed
            const speedCurve = Math.sin(progress * Math.PI)
            const currentSpeed = baseSpeed + speedCurve * (maxSpeed - baseSpeed)

            anim.sphereRotation += currentSpeed

            if (groupRef.current) {
                groupRef.current.rotation.y = anim.sphereRotation
            }

            if (progress >= 1) {
                anim.phase = 'idle'
                // Notify that orbit is complete to show hint
                if (onOrbitComplete) onOrbitComplete()
            }
        }

        // PHASE 2: Idle - sphere formed, camera outside at front view, waiting for click
        if (anim.phase === 'idle') {
            // Camera stays at front external position with subtle breathing
            const breathe = Math.sin(now * 0.0008) * 0.25
            const endAngle = Math.PI * 0.12 // Same as end of orbit animation
            const endDist = cameraDistance * 1.1
            camera.position.y = Math.sin(endAngle) * endDist
            camera.position.z = Math.cos(endAngle) * endDist + breathe
            camera.position.x = 0
            camera.lookAt(0, 0, 0)

            // Fast continuous rotation in idle state
            anim.sphereRotation += 0.01  // Faster rotation
            if (groupRef.current) {
                groupRef.current.rotation.y = anim.sphereRotation
            }
        }

        // PHASE 3: Entering - camera flies DIRECTLY INTO the sphere center
        if (anim.phase === 'entering') {
            const elapsed = now - anim.startTime
            const progress = Math.min(elapsed / ENTER_DURATION, 1)
            const eased = smoothEase(progress)

            // Camera moves DIRECTLY towards sphere center (same angle, reducing distance)
            const endAngle = Math.PI * 0.12
            const startDist = cameraDistance * 1.1
            const targetDist = -2  // Goes slightly past center

            // Interpolate distance while keeping same angle (direct entry)
            const currentDist = startDist + (targetDist - startDist) * eased

            camera.position.y = Math.sin(endAngle) * Math.max(0.1, currentDist)
            camera.position.z = Math.cos(endAngle) * currentDist
            camera.position.x = 0
            camera.lookAt(0, 0, 0)

            // FOV widens for immersion effect
            camera.fov = 40 + eased * 35
            camera.updateProjectionMatrix()

            // Fade out images as camera passes through
            anim.opacity = 0.95 * Math.max(0, 1 - progress * 1.1)

            // Faster rotation as entering
            anim.sphereRotation += 0.012
            if (groupRef.current) {
                groupRef.current.rotation.y = anim.sphereRotation
            }

            // Trigger completion at 85%
            if (progress >= 0.85 && !anim.enterComplete) {
                anim.enterComplete = true
                if (onEnterComplete) onEnterComplete()
            }
        }
    })

    // Handle click on sphere - Allow during orbit AND idle
    const handleSphereClick = useCallback((e) => {
        // Stop propagation to prevent hitting anything behind it
        e.stopPropagation()

        if (appState === 'sphere' && onSphereClick) {
            // Permit click during orbit OR idle phases
            if (animationState.current.phase === 'idle' || animationState.current.phase === 'camera_orbit') {
                onSphereClick()
            }
        }
    }, [appState, onSphereClick])

    if (sampledImages.length === 0) return null

    return (
        <>
            {/* Ambient lighting */}
            <ambientLight intensity={1.2} />

            {/* Pre-formed sphere group */}
            <group ref={groupRef}>
                <mesh onClick={handleSphereClick}>
                    <sphereGeometry args={[sphereRadius + 0.6, 32, 32]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* Hand-drawn sketchy grid - with image occlusion */}
                <SketchySphereGrid
                    radius={sphereRadius * 0.995} // Very tight fit - images are ON the surface
                    color="#FFC0CB" // Pink to match menu
                    opacity={0.75}
                    lineWidth={2.2}
                    imagePositions={spherePositions} // Pass image positions for occlusion
                    imageScale={imageScale}          // Pass scale for occlusion radius calculation
                    renderOrder={-1}                 // Render BELOW images
                />

                {/* Static image planes on sphere surface */}
                {sampledImages.map((imagePath, index) => (
                    <StaticImagePlane
                        key={`${imagePath}-${index}`}
                        imagePath={imagePath}
                        position={spherePositions[index]}
                        quaternion={imageQuaternions[index]}
                        scale={imageScale}
                        getOpacity={getOpacity}
                    />
                ))}
            </group>
        </>
    )
}
