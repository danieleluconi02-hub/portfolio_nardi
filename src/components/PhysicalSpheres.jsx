import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import manifest from '../data/manifest.json'

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
    // Generate positions
    const positions = useMemo(() => fibonacciSphere(images.length, radius), [images.length, radius])

    // Generate quaternions (facing outwards)
    const quaternions = useMemo(() => {
        return positions.map(pos => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
        })
    }, [positions])

    // Image scale based on sphere size and count to cover it roughly
    // A sphere surface is 4*PI*r^2. N planes of area s^2.
    // We want N*s^2 ~ k * 4*PI*r^2 (where k is coverage factor, e.g. 0.8)
    const planeScale = useMemo(() => {
        // Approximate calculation
        return (radius * 4) / Math.sqrt(images.length)
    }, [radius, images.length])

    return (
        <group>
            {images.map((img, i) => (
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

function PhysicsGroup({ id, config, onNavigate, opacity, scale, isBackground }) {
    const groupRef = useRef()
    const meshRef = useRef() // Invisible click target

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Apply Physics Position from parent state
            groupRef.current.position.copy(config.pos)

            // Apply Spin
            groupRef.current.rotation.x += delta * config.rotationSpeed.x
            groupRef.current.rotation.y += delta * config.rotationSpeed.y

            // Apply Scale
            const targetScale = isBackground ? 0.9 : 1.0
             // Interpolate scale manually or rely on parent passing interpolated scale?
             // Let's do simple lerp here for smoothness if props change abruptly
             groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
        }
    })

    return (
        <group ref={groupRef}>
             {/* Invisible Sphere for Interaction */}
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation()
                    onNavigate(id)
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
                visible={false}
            >
                <sphereGeometry args={[config.radius, 16, 16]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>

            {/* Visual Composite Sphere */}
            <CompositeSphere
                images={config.images}
                radius={config.radius}
                opacity={opacity}
                isBackground={isBackground}
            />
        </group>
    )
}

function PhysicsScene({ onNavigate }) {
    const { viewport } = useThree()

    // Configuration
    const radius = Math.min(viewport.width, viewport.height) * 0.18
    const IMAGE_COUNT = 45

    // Initial State setup
    const [spheres, setSpheres] = useState(() => {
        const startY = viewport.height / 2 + radius * 3

        return [
            {
                id: 'design',
                pos: new THREE.Vector3(-viewport.width * 0.2, startY, 0),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, -0.15, 0),
                rotationSpeed: { x: 0.2, y: 0.15 },
                images: getRandomImages('design', IMAGE_COUNT),
                radius: radius,
                isBackground: false,
                isEntering: true,
                opacity: 1
            },
            {
                id: 'styling',
                pos: new THREE.Vector3(viewport.width * 0.2, startY * 1.5, -1),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, -0.15, 0),
                rotationSpeed: { x: 0.15, y: 0.2 },
                images: getRandomImages('styling', IMAGE_COUNT),
                radius: radius,
                isBackground: true,
                isEntering: true,
                opacity: 0.4
            }
        ]
    })

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
                if (s.isEntering) {
                    s.pos.add(s.vel)
                    if (s.pos.y < viewport.height * 0.2 && s.pos.y > -viewport.height * 0.2) {
                        s.isEntering = false
                        const angle = Math.random() * Math.PI * 2
                        const speed = 0.03 + Math.random() * 0.03 // Slower for nicer look
                        s.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0)
                    }
                } else {
                    s.pos.add(s.vel)
                    const boundsX = viewport.width / 2 - r
                    const boundsY = viewport.height / 2 - r
                    if (s.pos.x > boundsX) { s.pos.x = boundsX; s.vel.x *= -1 }
                    if (s.pos.x < -boundsX) { s.pos.x = -boundsX; s.vel.x *= -1 }
                    if (s.pos.y > boundsY) { s.pos.y = boundsY; s.vel.y *= -1 }
                    if (s.pos.y < -boundsY) { s.pos.y = -boundsY; s.vel.y *= -1 }
                }
            })

            // Elastic Collision
             if (!s1.isEntering && !s2.isEntering) {
                const dx = s2.pos.x - s1.pos.x
                const dy = s2.pos.y - s1.pos.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                const minDist = s1.radius + s2.radius

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

            return newSpheres
        })
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
                />
            ))}
        </group>
    )
}

export default function PhysicalSpheres({ onNavigate }) {
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
                <PhysicsScene onNavigate={onNavigate} />
            </Canvas>
        </div>
    )
}
