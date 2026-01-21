import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Get random cover image from collection
function getRandomCoverImage(collection) {
    const images = collection.images || []
    if (images.length === 0) return null
    const randomIndex = Math.floor(Math.random() * images.length)
    return images[randomIndex]
}

// Generate points on inner surface of sphere (user is at center, looking outward)
function fibonacciSphereInward(samples, radius = 1) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2
        const radiusAtY = Math.sqrt(1 - y * y)
        const theta = phi * i

        const x = Math.cos(theta) * radiusAtY
        const z = Math.sin(theta) * radiusAtY

        points.push(new THREE.Vector3(x * radius, y * radius, z * radius))
    }

    return points
}

// Collection plane that faces INWARD (toward the user at center)
function InwardFacingPlane({
    position,
    collection,
    onSelect,
    scale = 1.5
}) {
    const meshRef = useRef()
    const [hovered, setHovered] = useState(false)
    const [texture, setTexture] = useState(null)

    useEffect(() => {
        const imagePath = getRandomCoverImage(collection)
        if (imagePath) {
            const loader = new THREE.TextureLoader()
            loader.load(
                imagePath,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    setTexture(tex)
                }
            )
        }
    }, [collection])

    // Make plane face INWARD (toward center where user is)
    const quaternion = useMemo(() => {
        // Plane faces toward origin (user position)
        const direction = position.clone().normalize()
        const up = new THREE.Vector3(0, 1, 0)
        const matrix = new THREE.Matrix4()
        // lookAt FROM position TOWARD origin
        matrix.lookAt(new THREE.Vector3(0, 0, 0), position, up)
        const quat = new THREE.Quaternion()
        quat.setFromRotationMatrix(matrix)
        return quat
    }, [position])

    // Subtle floating animation
    useFrame((state) => {
        if (meshRef.current) {
            const offset = position.x * 0.2 + position.z * 0.3
            meshRef.current.position.y = position.y +
                Math.sin(state.clock.elapsedTime * 0.15 + offset) * 0.02
        }
    })

    const currentScale = hovered ? scale * 1.03 : scale
    const opacity = hovered ? 1 : 0.94

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            scale={[currentScale * 1.8, currentScale * 2.4, 1]}
            onPointerOver={(e) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
                setHovered(false)
                document.body.style.cursor = 'grab'
            }}
            onClick={(e) => {
                e.stopPropagation()
                onSelect(collection)
            }}
        >
            <planeGeometry args={[1, 1]} />
            {texture ? (
                <meshBasicMaterial
                    map={texture}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={opacity}
                />
            ) : (
                <meshBasicMaterial
                    color="#1a1a1a"
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.4}
                />
            )}
        </mesh>
    )
}

// Loopable camera controller - infinite/circular navigation
function LoopableCameraController({ isActive, sphereRadius }) {
    const { camera } = useThree()
    const isDragging = useRef(false)
    const previousMouse = useRef({ x: 0, y: 0 })
    const velocity = useRef({ x: 0, y: 0 })

    // Spherical coordinates for camera rotation (loopable)
    const rotation = useRef({ theta: 0, phi: Math.PI / 2 })

    useEffect(() => {
        if (!isActive) return

        const handleMouseDown = (e) => {
            if (e.target.tagName === 'BUTTON') return
            isDragging.current = true
            previousMouse.current = { x: e.clientX, y: e.clientY }
            document.body.style.cursor = 'grabbing'
        }

        const handleMouseUp = () => {
            isDragging.current = false
            document.body.style.cursor = 'grab'
        }

        const handleMouseMove = (e) => {
            if (!isDragging.current) return

            const deltaX = (e.clientX - previousMouse.current.x) * 0.003
            const deltaY = (e.clientY - previousMouse.current.y) * 0.003

            // Natural movement: drag right = sphere rotates right
            velocity.current.x = -deltaX
            velocity.current.y = -deltaY

            previousMouse.current = { x: e.clientX, y: e.clientY }
        }

        // Touch support
        const handleTouchStart = (e) => {
            isDragging.current = true
            const touch = e.touches[0]
            previousMouse.current = { x: touch.clientX, y: touch.clientY }
        }

        const handleTouchEnd = () => {
            isDragging.current = false
        }

        const handleTouchMove = (e) => {
            if (!isDragging.current) return
            const touch = e.touches[0]

            const deltaX = (touch.clientX - previousMouse.current.x) * 0.003
            const deltaY = (touch.clientY - previousMouse.current.y) * 0.003

            // Natural movement: drag right = sphere rotates right
            velocity.current.x = -deltaX
            velocity.current.y = -deltaY

            previousMouse.current = { x: touch.clientX, y: touch.clientY }
        }

        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('touchstart', handleTouchStart, { passive: true })
        window.addEventListener('touchend', handleTouchEnd)
        window.addEventListener('touchmove', handleTouchMove, { passive: true })

        return () => {
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('touchstart', handleTouchStart)
            window.removeEventListener('touchend', handleTouchEnd)
            window.removeEventListener('touchmove', handleTouchMove)
            document.body.style.cursor = ''
        }
    }, [isActive])

    useFrame(() => {
        if (!isActive) return

        // Apply velocity to rotation (LOOPABLE - theta wraps around)
        rotation.current.theta += velocity.current.x
        rotation.current.phi += velocity.current.y

        // Clamp phi to prevent flipping (but allow full vertical range)
        rotation.current.phi = Math.max(0.3, Math.min(Math.PI - 0.3, rotation.current.phi))

        // Theta loops infinitely (no hard limits)
        // This creates the seamless, circular navigation

        // Camera stays at center, looking outward in the direction of rotation
        camera.position.set(0, 0, 0)

        // Calculate look-at point on the sphere surface
        const lookX = Math.sin(rotation.current.phi) * Math.cos(rotation.current.theta) * sphereRadius
        const lookY = Math.cos(rotation.current.phi) * sphereRadius
        const lookZ = Math.sin(rotation.current.phi) * Math.sin(rotation.current.theta) * sphereRadius

        camera.lookAt(lookX, lookY, lookZ)

        // Apply friction (inertial, slow, smooth)
        velocity.current.x *= 0.92
        velocity.current.y *= 0.92
    })

    return null
}

// 3D Scene - Interior of sphere with inward-facing planes
function InternalSphereScene({ collections, onSelectCollection, isActive }) {
    // Larger radius for internal view
    const sphereRadius = 10

    // Scale based on collection count - LARGER for internal visibility
    const imageScale = collections.length <= 2 ? 3.5 :
        collections.length <= 3 ? 3.0 :
            collections.length <= 5 ? 2.5 :
                collections.length <= 8 ? 2.0 : 1.6

    // Generate positions on inner surface
    const positions = useMemo(() =>
        fibonacciSphereInward(collections.length, sphereRadius),
        [collections.length, sphereRadius]
    )

    return (
        <>
            {/* Soft ambient lighting */}
            <ambientLight intensity={0.9} />

            {/* Loopable camera controller */}
            <LoopableCameraController isActive={isActive} sphereRadius={sphereRadius} />

            {/* Collection planes - facing INWARD */}
            {collections.map((collection, index) => (
                <InwardFacingPlane
                    key={collection.id}
                    position={positions[index] || new THREE.Vector3(0, 0, sphereRadius)}
                    collection={collection}
                    onSelect={onSelectCollection}
                    scale={imageScale}
                />
            ))}
        </>
    )
}

// Main Spatial Explorer - Interior of the sphere
export default function SpatialExplorer({
    category,
    collections,
    onSelectCollection,
    onBack
}) {
    const { t } = useLanguage()
    const [isReady, setIsReady] = useState(false)

    // Delay activation for smooth transition from entering animation
    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 500)
        return () => clearTimeout(timer)
    }, [])

    const categoryTitle = category === 'design' ? t.menu.fashionDesign : t.menu.styling

    return (
        <motion.div
            className="spatial-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Category label removed as per user request */}

            {/* Navigation Hint */}
            <motion.p
                className="spatial-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ delay: 1.2, duration: 0.5 }}
            >
                {t.ui.dragToExplore}
            </motion.p>

            {/* 3D Canvas - User at center looking outward at inner sphere surface */}
            <Canvas
                camera={{ position: [0, 0, 0], fov: 60 }}
                dpr={[1, 2]}
                style={{ cursor: 'grab' }}
            >
                <InternalSphereScene
                    collections={collections}
                    onSelectCollection={onSelectCollection}
                    isActive={isReady}
                />
            </Canvas>
        </motion.div>
    )
}
