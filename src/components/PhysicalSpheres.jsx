import React, { useRef, useMemo, useState, forwardRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import manifest from '../data/manifest.json'

// --- Helpers ---

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

const getRandomImages = (categoryKey, count = 40) => {
    const collections = manifest[categoryKey]?.collections || []
    if (!collections.length) return []

    const allImages = []
    const seenPaths = new Set()

    collections.forEach(col => {
        col.images.forEach(img => {
            const thumbPath = img.replace('/full/', '/thumb/')
            if (!seenPaths.has(thumbPath)) {
                seenPaths.add(thumbPath)
                allImages.push(thumbPath)
            }
        })
    })

    if (!allImages.length) return []

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

const ParticleMesh = forwardRef(({ image, initPos }, ref) => {
    const texture = useMemo(() => {
        if (!image) return null
        return new THREE.TextureLoader().load(image)
    }, [image])

    // Use initial position just for spawn
    return (
        <mesh ref={ref} position={initPos} scale={0.4}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    )
})
ParticleMesh.displayName = 'ParticleMesh'

function ExplosionParticles({ images, origin, radius, onReassemble }) {
    const { viewport } = useThree()
    const particlesRef = useRef([])
    const startTime = useRef(Date.now())

    // Calculate target positions on the sphere surface (relative to origin)
    const targetPositions = useMemo(() => fibonacciSphere(images.length, radius), [images.length, radius])

    // Initialize particles state
    const [particles] = useState(() => {
        return images.map(img => ({
            pos: origin.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            )),
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4 + 0.2, // Slight upward burst
                (Math.random() - 0.5) * 0.4
            ),
            rot: new THREE.Euler(Math.random(), Math.random(), Math.random()),
            rotVel: { x: (Math.random()-0.5)*0.2, y: (Math.random()-0.5)*0.2 },
            image: img
        }))
    })

    useFrame((state, delta) => {
        const timeSinceExplosion = Date.now() - startTime.current
        const isReassembling = timeSinceExplosion > 2000

        let allReassembled = true

        particles.forEach((p, i) => {
            const mesh = particlesRef.current[i]
            if (!mesh) return

            if (isReassembling) {
                // Fly back to target position on surface
                const targetPos = targetPositions[i].clone().add(origin)
                const dist = p.pos.distanceTo(targetPos)

                if (dist > 0.1) {
                    allReassembled = false
                    // Lerp towards target
                    p.pos.lerp(targetPos, delta * 4)
                } else {
                    p.pos.copy(targetPos)
                }
            } else {
                // Physics
                p.vel.y -= 9.8 * delta * 0.05 // Gravity
                p.pos.add(p.vel)

                // Bounds (VisualViewport logic handled here simply using useThree viewport for particles for speed)
                // Actually need to consider bottom of screen.
                const floorY = -viewport.height/2
                if (p.pos.y < floorY) {
                    p.pos.y = floorY
                    p.vel.y *= -0.6 // Dampened bounce
                }
                const wallX = viewport.width/2
                if (p.pos.x > wallX) { p.pos.x = wallX; p.vel.x *= -1 }
                if (p.pos.x < -wallX) { p.pos.x = -wallX; p.vel.x *= -1 }

                allReassembled = false
            }

            // Rotation
            p.rot.x += p.rotVel.x
            p.rot.y += p.rotVel.y

            // Update Mesh
            mesh.position.copy(p.pos)
            mesh.rotation.x = p.rot.x
            mesh.rotation.y = p.rot.y
        })

        if (isReassembling && allReassembled) {
            onReassemble()
        }
    })

    return (
        <group>
            {particles.map((p, i) => (
                <ParticleMesh
                    key={i}
                    ref={el => particlesRef.current[i] = el}
                    image={p.image}
                    initPos={p.pos}
                />
            ))}
        </group>
    )
}

function CompositeSphere({ images, radius, opacity, isBackground }) {
    const positions = useMemo(() => fibonacciSphere(images.length, radius), [images.length, radius])
    const quaternions = useMemo(() => {
        return positions.map(pos => {
            const lookMatrix = new THREE.Matrix4()
            lookMatrix.lookAt(pos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
            return new THREE.Quaternion().setFromRotationMatrix(lookMatrix)
        })
    }, [positions])

    const planeScale = useMemo(() => {
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

function PhysicsGroup({ id, config, onInteract, opacity, isBackground }) {
    const groupRef = useRef()
    const meshRef = useRef()
    const lastClick = useRef(0)

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Apply Physics Position
            groupRef.current.position.copy(config.pos)

            // Apply Spin
            groupRef.current.rotation.x += delta * config.rotationSpeed.x
            groupRef.current.rotation.y += delta * config.rotationSpeed.y

            // Apply Scale & Shake
            let targetScale = isBackground ? 0.9 : 1.0

            // Shake Effect
            if (config.shake && Date.now() - config.shake < 500) {
                 const time = Date.now() - config.shake
                 const intensity = 1 - time / 500
                 const wobble = Math.sin(time * 0.05) * 0.15 * intensity
                 targetScale += wobble
            }

            groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
        }
    })

    if (config.isExploded) {
        return (
            <ExplosionParticles
                images={config.images}
                origin={config.pos}
                radius={config.radius}
                onReassemble={() => onInteract(id, 'reassemble')}
            />
        )
    }

    return (
        <group ref={groupRef}>
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation()
                    const now = Date.now()
                    if (now - lastClick.current < 300) {
                        onInteract(id, 'explode')
                        lastClick.current = 0
                    } else {
                        onInteract(id, 'shake')
                        lastClick.current = now
                    }
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <sphereGeometry args={[config.radius, 16, 16]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            <CompositeSphere
                images={config.images}
                radius={config.radius}
                opacity={opacity}
                isBackground={isBackground}
            />
        </group>
    )
}

function PhysicsScene() {
    const { viewport } = useThree()

    const radius = Math.min(viewport.width, viewport.height) * 0.18
    const IMAGE_COUNT = 25

    const [spheres, setSpheres] = useState(() => {
        const startY = viewport.height / 2 + radius * 3

        return [
            {
                id: 'design',
                pos: new THREE.Vector3(-viewport.width * 0.1, startY, 0),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.15, -0.2, 0),
                rotationSpeed: { x: 0.2, y: 0.15 },
                images: getRandomImages('design', IMAGE_COUNT),
                radius: radius,
                isBackground: false,
                isEntering: true,
                opacity: 1,
                shake: 0,
                isExploded: false
            },
            {
                id: 'styling',
                pos: new THREE.Vector3(viewport.width * 0.1, startY * 1.5, -1),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.15, -0.25, 0),
                rotationSpeed: { x: 0.15, y: 0.2 },
                images: getRandomImages('styling', IMAGE_COUNT),
                radius: radius,
                isBackground: true,
                isEntering: true,
                opacity: 0.4,
                shake: 0,
                isExploded: false
            }
        ]
    })

    const handleInteract = (id, type) => {
        setSpheres(curr => curr.map(s => {
            if (s.id !== id) return s
            if (type === 'shake') return { ...s, shake: Date.now() }
            if (type === 'explode') return { ...s, isExploded: true }
            if (type === 'reassemble') return { ...s, isExploded: false, shake: 0 }
            return s
        }))
    }

    useFrame((state, delta) => {
        setSpheres(currentSpheres => {
            const newSpheres = currentSpheres.map(s => ({
                ...s,
                pos: s.pos.clone(),
                vel: s.vel.clone()
            }))

            const s1 = newSpheres[0]
            const s2 = newSpheres[1]

            newSpheres.forEach(s => {
                if (s.isExploded) return // Don't move exploded spheres (particles will handle themselves)

                const r = s.radius
                const vv = window.visualViewport
                const width = vv ? vv.width / viewport.factor : viewport.width
                const height = vv ? vv.height / viewport.factor : viewport.height

                const boundsX = width / 2 - r
                const boundsY = height / 2 - r

                s.pos.add(s.vel)

                if (s.isEntering) {
                    if (s.pos.y < boundsY) {
                        s.isEntering = false
                    }
                } else {
                    if (s.pos.x > boundsX) { s.pos.x = boundsX; s.vel.x *= -1 }
                    if (s.pos.x < -boundsX) { s.pos.x = -boundsX; s.vel.x *= -1 }
                    if (s.pos.y > boundsY) { s.pos.y = boundsY; s.vel.y *= -1 }
                    if (s.pos.y < -boundsY) { s.pos.y = -boundsY; s.vel.y *= -1 }
                }
            })

            // Elastic Collision (only if not exploded)
             if (!s1.isEntering && !s2.isEntering && !s1.isExploded && !s2.isExploded) {
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

            // Visual Logic
            if (!s1.isExploded && !s2.isExploded) {
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
            }

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
                    onInteract={handleInteract}
                />
            ))}
        </group>
    )
}

export default function PhysicalSpheres() {
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
                <PhysicsScene />
            </Canvas>
        </div>
    )
}
