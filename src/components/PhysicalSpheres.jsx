import React, { useRef, useMemo, useState, forwardRef, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
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
    // Optimization: useLoader handles caching automatically
    const texture = useLoader(THREE.TextureLoader, imagePath)

    // Optimization: Reuse geometry and material props where possible, but here unique opacity/map requires distinct mats
    // We can at least ensure texture settings are correct once
    useMemo(() => {
        if (texture) {
            texture.colorSpace = THREE.SRGBColorSpace
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
        }
    }, [texture])

    return (
        <mesh
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
                depthWrite={false} // Optimization for transparent objects
            />
        </mesh>
    )
}

const ParticleMesh = forwardRef(({ image, initPos }, ref) => {
    const texture = useLoader(THREE.TextureLoader, image)
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

    const targetPositions = useMemo(() => fibonacciSphere(images.length, radius), [images.length, radius])

    // State for physics calc only (no re-renders needed for physics steps)
    const physicsState = useRef(
        images.map(img => ({
            pos: origin.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            )),
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4 + 0.2,
                (Math.random() - 0.5) * 0.4
            ),
            rot: new THREE.Euler(Math.random(), Math.random(), Math.random()),
            rotVel: { x: (Math.random()-0.5)*0.2, y: (Math.random()-0.5)*0.2 },
            image: img
        }))
    )

    useFrame((state, delta) => {
        const timeSinceExplosion = Date.now() - startTime.current
        const isReassembling = timeSinceExplosion > 2000

        let allReassembled = true
        const particles = physicsState.current

        particles.forEach((p, i) => {
            const mesh = particlesRef.current[i]
            if (!mesh) return

            if (isReassembling) {
                const targetPos = targetPositions[i].clone().add(origin)
                const dist = p.pos.distanceTo(targetPos)

                if (dist > 0.1) {
                    allReassembled = false
                    p.pos.lerp(targetPos, delta * 4)
                } else {
                    p.pos.copy(targetPos)
                }
            } else {
                p.vel.y -= 9.8 * delta * 0.05
                p.pos.add(p.vel)

                const floorY = -viewport.height/2
                if (p.pos.y < floorY) {
                    p.pos.y = floorY
                    p.vel.y *= -0.6
                }
                const wallX = viewport.width/2
                if (p.pos.x > wallX) { p.pos.x = wallX; p.vel.x *= -1 }
                if (p.pos.x < -wallX) { p.pos.x = -wallX; p.vel.x *= -1 }

                allReassembled = false
            }

            p.rot.x += p.rotVel.x
            p.rot.y += p.rotVel.y

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
            {images.map((img, i) => (
                <ParticleMesh
                    key={i}
                    ref={el => particlesRef.current[i] = el}
                    image={img}
                    initPos={physicsState.current[i].pos}
                />
            ))}
        </group>
    )
}

function CompositeSphere({ images, radius, opacity }) {
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

function PhysicsGroup({ id, radius, images, opacityRef, isExploded, onInteract }) {
    const groupRef = useRef()
    const meshRef = useRef()
    const lastClick = useRef(0)

    // IMPORTANT: The parent controls position via Refs, so we just handle local spin/shake/opacity here
    // But actually, for performant ref-based physics, the parent needs direct access to this group
    // or we pass a ref down.
    // To keep it clean: We will forward the group ref up to the scene manager or let the scene manager
    // update the group's position directly.
    // In this refactor, PhysicsScene manages the refs.

    // However, for the React structure, we render this component.
    // We need to attach the ref that PhysicsScene uses.

    // Better pattern: PhysicsScene renders the primitives and updates them.
    // But to keep component separation:
    // We will use an imperative handle or just pass the ref from parent.
    // Let's assume parent (PhysicsScene) passes a `sceneRef` for this object.

    return null // Logic moved to PhysicsScene for centralized Ref management
}

function PhysicsScene() {
    const { viewport } = useThree()
    const groupRefs = useRef({})

    const radius = Math.min(viewport.width, viewport.height) * 0.18
    const IMAGE_COUNT = 25

    // Initial static configuration
    const [config] = useState(() => {
         const startY = viewport.height / 2 + radius * 3
         return [
            {
                id: 'design',
                images: getRandomImages('design', IMAGE_COUNT),
                radius: radius,
                initialPos: new THREE.Vector3(-viewport.width * 0.1, startY, 0),
                initialVel: new THREE.Vector3((Math.random() - 0.5) * 0.15, -0.2, 0),
                rotationSpeed: { x: 0.2, y: 0.15 }
            },
            {
                id: 'styling',
                images: getRandomImages('styling', IMAGE_COUNT),
                radius: radius,
                initialPos: new THREE.Vector3(viewport.width * 0.1, startY * 1.5, -1),
                initialVel: new THREE.Vector3((Math.random() - 0.5) * 0.15, -0.25, 0),
                rotationSpeed: { x: 0.15, y: 0.2 }
            }
         ]
    })

    // Mutable physics state (no re-renders)
    const physicsState = useRef(config.map(c => ({
        ...c,
        pos: c.initialPos.clone(),
        vel: c.initialVel.clone(),
        rot: new THREE.Euler(0, 0, 0),
        isEntering: true,
        isBackground: false,
        opacity: 1.0,
        shakeStartTime: 0,
        isExploded: false
    })))

    // React state only for major mode switches (Normal <-> Exploded)
    // We track which IDs are exploded to conditionally render particles
    const [explodedIds, setExplodedIds] = useState({})

    const handleInteract = (id, type) => {
        const idx = config.findIndex(c => c.id === id)
        if (idx === -1) return

        const state = physicsState.current[idx]

        if (type === 'shake') {
            state.shakeStartTime = Date.now()
        } else if (type === 'explode') {
            state.isExploded = true
            setExplodedIds(prev => ({ ...prev, [id]: true }))
        } else if (type === 'reassemble') {
            state.isExploded = false
            state.shakeStartTime = 0
            setExplodedIds(prev => ({ ...prev, [id]: false }))
        }
    }

    const lastClick = useRef({})

    useFrame((_, delta) => {
        const spheres = physicsState.current
        const s1 = spheres[0]
        const s2 = spheres[1]

        // 1. Update Physics
        spheres.forEach((s, i) => {
            if (s.isExploded) return

            const group = groupRefs.current[s.id]
            if (!group) return

            // Move
            s.pos.add(s.vel)

            // Bounds
            const r = s.radius
            const vv = window.visualViewport
            const width = vv ? vv.width / viewport.factor : viewport.width
            const height = vv ? vv.height / viewport.factor : viewport.height

            const boundsX = width / 2 - r
            const boundsY = height / 2 - r

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

            // Spin
            s.rot.x += delta * s.rotationSpeed.x
            s.rot.y += delta * s.rotationSpeed.y

            // Apply to Object
            group.position.copy(s.pos)
            group.rotation.x = s.rot.x
            group.rotation.y = s.rot.y

            // Shake Scale
            let targetScale = s.isBackground ? 0.9 : 1.0
            if (s.shakeStartTime && Date.now() - s.shakeStartTime < 500) {
                 const time = Date.now() - s.shakeStartTime
                 const intensity = 1 - time / 500
                 const wobble = Math.sin(time * 0.05) * 0.15 * intensity
                 targetScale += wobble
            }
            // Smooth scale
            group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
        })

        // 2. Collisions
        if (!s1.isEntering && !s2.isEntering && !s1.isExploded && !s2.isExploded) {
            const dx = s2.pos.x - s1.pos.x
            const dy = s2.pos.y - s1.pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const minDist = s1.radius + s2.radius

            if (dist < minDist) {
                const nx = dx / dist
                const ny = dy / dist
                // Simple elastic impulse
                const dvx = s1.vel.x - s2.vel.x
                const dvy = s1.vel.y - s2.vel.y
                const dot = dvx * nx + dvy * ny

                if (dot > 0) {
                    const impulse = dot
                    s1.vel.x -= impulse * nx
                    s1.vel.y -= impulse * ny
                    s2.vel.x += impulse * nx
                    s2.vel.y += impulse * ny

                    // Separate
                    const overlap = minDist - dist
                    s1.pos.x -= nx * overlap * 0.5
                    s1.pos.y -= ny * overlap * 0.5
                    s2.pos.x += nx * overlap * 0.5
                    s2.pos.y += ny * overlap * 0.5
                }
            }
        }

        // 3. Depth/Background Logic
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

        // 4. Update Opacity (Lerp for smoothness)
        spheres.forEach(s => {
            const targetOp = s.isBackground ? 0.4 : 1.0
            s.opacity = THREE.MathUtils.lerp(s.opacity, targetOp, 0.1)

            // We need to pass this opacity down to the materials.
            // Since we can't easily traverse the scene graph every frame efficiently without refs to materials,
            // we'll rely on the CompositeSphere to check its parent or use a dedicated OpacityController.
            // OR: simpler, we assume accessing children of the group is fast enough for 25 items.
            const group = groupRefs.current[s.id]
            if (group && group.children[1]) { // [0] is hitbox, [1] is CompositeSphere
                const composite = group.children[1]
                 composite.children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = s.opacity
                    }
                })
            }
        })
    })

    return (
        <group>
            {config.map((item, i) => {
                const isExploded = explodedIds[item.id]

                if (isExploded) {
                    return (
                        <ExplosionParticles
                            key={`explode-${item.id}`}
                            images={item.images}
                            origin={physicsState.current[i].pos}
                            radius={item.radius}
                            onReassemble={() => handleInteract(item.id, 'reassemble')}
                        />
                    )
                }

                return (
                    <group
                        key={item.id}
                        ref={el => groupRefs.current[item.id] = el}
                    >
                         {/* Interaction Mesh */}
                        <mesh
                            onClick={(e) => {
                                e.stopPropagation()
                                const now = Date.now()
                                const last = lastClick.current[item.id] || 0
                                if (now - last < 300) {
                                    handleInteract(item.id, 'explode')
                                    lastClick.current[item.id] = 0
                                } else {
                                    handleInteract(item.id, 'shake')
                                    lastClick.current[item.id] = now
                                }
                            }}
                            onPointerOver={() => document.body.style.cursor = 'pointer'}
                            onPointerOut={() => document.body.style.cursor = 'auto'}
                        >
                            <sphereGeometry args={[item.radius, 16, 16]} />
                            <meshBasicMaterial visible={false} />
                        </mesh>

                        <CompositeSphere
                            images={item.images}
                            radius={item.radius}
                            opacity={1} // Controlled by useFrame
                        />
                    </group>
                )
            })}
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
                dpr={[1, 1.5]} // Optimization: Limit DPR on high-res screens
                style={{ pointerEvents: 'auto' }}
                gl={{
                    antialias: false, // Optimization: Disable AA for performance if using high DPR
                    powerPreference: "high-performance"
                }}
            >
                <ambientLight intensity={1.5} />
                <PhysicsScene />
            </Canvas>
        </div>
    )
}
