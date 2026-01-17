import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

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
    const animatedScale = useRef(scale)

    // Load texture
    useEffect(() => {
        if (imagePath) {
            const loader = new THREE.TextureLoader()
            loader.load(
                imagePath,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    setTexture(tex)
                    setLoaded(true)
                }
            )
        }
    }, [imagePath])

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
        setHovered(true)
    }, [])

    const handlePointerOut = useCallback(() => {
        document.body.style.cursor = 'default'
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
    onImageClick,
    onBack
}) {
    const { camera, gl } = useThree()
    const groupRef = useRef()

    // Camera rotation state
    const rotationRef = useRef({ x: 0, y: 0 })
    const targetRotationRef = useRef({ x: 0, y: 0 })
    const isDragging = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })

    // Fibonacci sphere configuration - same distribution as external sphere
    const SPHERE_RADIUS = 12
    const TOTAL_IMAGES = 60  // Same as external sphere

    // Get all images with collection info
    const allImages = useMemo(() => {
        const images = []
        collections.forEach(col => {
            if (col.images) {
                col.images.forEach(img => {
                    images.push({
                        path: img.replace('/full/', '/thumb/'),
                        collectionId: col.id,
                        collectionTitle: col.title
                    })
                })
            }
        })
        return images
    }, [collections])

    // Sample random images (stable during session)
    const sampledImages = useMemo(() => {
        if (allImages.length === 0) return []

        const seed = Math.floor(Date.now() / 10000)
        const seededRandom = (i) => {
            const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
            return x - Math.floor(x)
        }

        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(i) * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        return shuffled.slice(0, Math.min(TOTAL_IMAGES, shuffled.length))
    }, [allImages])

    // Generate fibonacci sphere positions - same as external sphere
    const spherePositions = useMemo(() => {
        return fibonacciSphereInner(sampledImages.length, SPHERE_RADIUS)
    }, [sampledImages.length])

    // Initialize camera at center
    useEffect(() => {
        camera.position.set(0, 0, 0)
        camera.rotation.set(0, 0, 0)
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

    // Animation loop - smooth camera rotation
    useFrame(() => {
        const damping = 0.06
        rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * damping
        rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * damping

        camera.rotation.order = 'YXZ'
        camera.rotation.y = rotationRef.current.y
        camera.rotation.x = rotationRef.current.x
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

            {/* Gallery images on fibonacci sphere */}
            <group ref={groupRef}>
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
