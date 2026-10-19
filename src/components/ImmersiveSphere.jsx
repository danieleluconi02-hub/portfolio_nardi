import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SketchySphereGrid from './SketchySphereGrid'
import { sampleSphereImages, loadTexture, IMMERSIVE_IMAGE_COUNT } from '../lib/sphereImages'


/**
 * Fibonacci Sphere Distribution - same as CategorySphere for consistent look
 * Creates evenly distributed points on a sphere's inner surface
 */
function fibonacciSphereInner(samples, radius) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    // Exclude both poles to prevent overlap
    const yMin = -0.92
    const yMax = 0.92

    for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1)
        const y = yMax - t * (yMax - yMin)
        const radiusAtY = Math.sqrt(1 - y * y)
        const theta = phi * i

        points.push({
            position: new THREE.Vector3(
                Math.cos(theta) * radiusAtY * radius,
                y * radius,
                Math.sin(theta) * radiusAtY * radius
            ),
            scale: 2.8 + Math.random() * 0.4 // Larger images for exploration
        })
    }

    return points
}

/**
 * Single image that always faces the camera center
 */
function GalleryImage({
    position,
    scale,
    imagePath,
    collectionId,
    collectionTitle,
    onImageClick,
    index
}) {
    const meshRef = useRef()
    const [texture, setTexture] = useState(null)
    const [loaded, setLoaded] = useState(false)
    const [hovered, setHovered] = useState(false)
    const hoveredRef = useRef(false)
    const animatedScale = useRef(scale)

    // Load texture (shared cache - already warm if the external sphere showed it)
    useEffect(() => {
        let cancelled = false
        if (imagePath) {
            loadTexture(imagePath)
                .then((tex) => {
                    if (cancelled) return
                    setTexture(tex)
                    setLoaded(true)
                })
                .catch(() => { /* skip images that fail to load */ })
        }
        return () => { cancelled = true }
    }, [imagePath])

    // Reset the cursor if this image unmounts while hovered (e.g. after a click opens the preview)
    useEffect(() => () => {
        if (hoveredRef.current) document.body.style.cursor = 'default'
    }, [])

    // Calculate rotation to face center (0,0,0)
    const quaternion = useMemo(() => {
        const lookMatrix = new THREE.Matrix4()
        lookMatrix.lookAt(position, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
        return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
    }, [position])

    // Animate scale on hover
    useFrame(() => {
        if (meshRef.current) {
            const targetScale = hovered ? scale * 1.12 : scale
            animatedScale.current += (targetScale - animatedScale.current) * 0.15
            meshRef.current.scale.set(
                animatedScale.current,
                animatedScale.current * 1.35,
                1
            )
        }
    })

    const handleClick = useCallback((e) => {
        e.stopPropagation()
        if (onImageClick && loaded) {
            onImageClick({
                imagePath,
                collectionId,
                collectionTitle,
                position
            })
        }
    }, [onImageClick, imagePath, collectionId, collectionTitle, position, loaded])

    const handlePointerOver = useCallback((e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        hoveredRef.current = true
        setHovered(true)
    }, [])

    const handlePointerOut = useCallback(() => {
        document.body.style.cursor = 'default'
        hoveredRef.current = false
        setHovered(false)
    }, [])

    if (!loaded) return null

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture}
                side={THREE.DoubleSide}
                transparent
                opacity={hovered ? 1 : 0.92}
            />
        </mesh>
    )
}

/**
 * Central "Start" or category button
 */
function CenterButton({ label, onClick }) {
    const meshRef = useRef()
    const [hovered, setHovered] = useState(false)

    useFrame(() => {
        if (meshRef.current) {
            // Subtle pulse animation
            const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.02
            const hoverScale = hovered ? 1.05 : 1
            meshRef.current.scale.setScalar(pulse * hoverScale)
        }
    })

    return (
        <mesh
            ref={meshRef}
            position={[0, 0, 0]}
            onClick={onClick}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true) }}
            onPointerOut={() => { document.body.style.cursor = 'default'; setHovered(false) }}
        >
            <circleGeometry args={[1.2, 64]} />
            <meshBasicMaterial color="#0a0a0a" />
        </mesh>
    )
}

/**
 * Main immersive sphere component - panoramic gallery view
 */
export default function ImmersiveSphere({
    collections,
    seed,
    onImageClick,
    onBack,
    savedRotation // Ref from parent to persist rotation across state changes
}) {
    const { camera, gl } = useThree()
    const groupRef = useRef()

    // Camera rotation state - initialize from saved rotation if available
    const initialX = savedRotation?.current?.x || 0
    const initialY = savedRotation?.current?.y || 0
    const rotationRef = useRef({ x: initialX, y: initialY })
    const targetRotationRef = useRef({ x: initialX, y: initialY })
    const isDragging = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })

    // Fibonacci sphere configuration - same distribution as external sphere
    const SPHERE_RADIUS = 12

    // Seeded sample - the first 60 of the same shuffle the external sphere uses
    const sampledImages = useMemo(
        () => sampleSphereImages(collections, seed, IMMERSIVE_IMAGE_COUNT),
        [collections, seed]
    )

    // Generate fibonacci sphere positions - same as external sphere
    const spherePositions = useMemo(() => {
        return fibonacciSphereInner(sampledImages.length, SPHERE_RADIUS)
    }, [sampledImages.length])

    // Initialize camera at center with saved rotation
    useEffect(() => {
        camera.position.set(0, 0, 0)
        camera.rotation.order = 'YXZ'
        // Restore saved rotation if available
        camera.rotation.y = initialY
        camera.rotation.x = initialX
        camera.fov = 70
        camera.updateProjectionMatrix()
    }, [camera])

    // Mouse/touch controls for camera rotation
    useEffect(() => {
        const canvas = gl.domElement

        const handleMouseMove = (e) => {
            // Only move camera when actively dragging
            if (isDragging.current) {
                const deltaX = e.clientX - lastMouse.current.x
                const deltaY = e.clientY - lastMouse.current.y

                // Natural movement: drag right = sphere rotates right (images move left)
                targetRotationRef.current.y += deltaX * 0.004
                targetRotationRef.current.x += deltaY * 0.002

                // Clamp vertical
                targetRotationRef.current.x = Math.max(
                    -Math.PI * 0.35,
                    Math.min(Math.PI * 0.35, targetRotationRef.current.x)
                )

                lastMouse.current = { x: e.clientX, y: e.clientY }
            }
        }

        const handleMouseDown = (e) => {
            isDragging.current = true
            lastMouse.current = { x: e.clientX, y: e.clientY }
        }

        const handleMouseUp = () => {
            isDragging.current = false
        }

        // Touch support
        const handleTouchStart = (e) => {
            if (e.touches.length === 1) {
                isDragging.current = true
                lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
            }
        }

        const handleTouchEnd = () => {
            isDragging.current = false
        }

        const handleTouchMove = (e) => {
            if (isDragging.current && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - lastMouse.current.x
                const deltaY = e.touches[0].clientY - lastMouse.current.y

                // Natural movement: drag right = sphere rotates right (images move left)
                targetRotationRef.current.y += deltaX * 0.004
                targetRotationRef.current.x += deltaY * 0.002

                targetRotationRef.current.x = Math.max(
                    -Math.PI * 0.2,
                    Math.min(Math.PI * 0.2, targetRotationRef.current.x)
                )

                lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        canvas.addEventListener('touchstart', handleTouchStart)
        window.addEventListener('touchend', handleTouchEnd)
        window.addEventListener('touchmove', handleTouchMove)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            canvas.removeEventListener('touchstart', handleTouchStart)
            window.removeEventListener('touchend', handleTouchEnd)
            window.removeEventListener('touchmove', handleTouchMove)
        }
    }, [gl])

    // Animation loop - smooth camera rotation + persist to parent ref
    useFrame(() => {
        const damping = 0.06
        rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * damping
        rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * damping

        camera.rotation.order = 'YXZ'
        camera.rotation.y = rotationRef.current.y
        camera.rotation.x = rotationRef.current.x

        // Persist rotation to parent ref so it survives state changes
        if (savedRotation) {
            savedRotation.current.x = rotationRef.current.x
            savedRotation.current.y = rotationRef.current.y
        }
    })

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            const step = 0.12
            switch (e.key) {
                case 'ArrowLeft':
                    targetRotationRef.current.y += step
                    break
                case 'ArrowRight':
                    targetRotationRef.current.y -= step
                    break
                case 'ArrowUp':
                    targetRotationRef.current.x = Math.min(
                        Math.PI * 0.2,
                        targetRotationRef.current.x + step * 0.5
                    )
                    break
                case 'ArrowDown':
                    targetRotationRef.current.x = Math.max(
                        -Math.PI * 0.2,
                        targetRotationRef.current.x - step * 0.5
                    )
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    if (sampledImages.length === 0) return null

    return (
        <>
            {/* Ambient lighting */}
            <ambientLight intensity={1.1} />

            <group ref={groupRef}>
                {/* Hand-drawn sketchy grid - slightly smaller than image radius */}
                <SketchySphereGrid
                    radius={SPHERE_RADIUS * 0.99}
                    color="#FFC0CB"
                    opacity={0.7}
                    lineWidth={2.5}
                />

                {sampledImages.map((img, index) => {
                    if (index >= spherePositions.length) return null
                    return (
                        <GalleryImage
                            key={`${img.path}-${index}`}
                            position={spherePositions[index].position}
                            scale={spherePositions[index].scale}
                            imagePath={img.path}
                            collectionId={img.collectionId}
                            collectionTitle={img.collectionTitle}
                            onImageClick={onImageClick}
                            index={index}
                        />
                    )
                })}
            </group>
        </>
    )
}
