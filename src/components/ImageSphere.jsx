import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Generate Fibonacci sphere points for even distribution
function fibonacciSphere(samples) {
    const points = []
    const phi = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2
        const radius = Math.sqrt(1 - y * y)
        const theta = phi * i

        const x = Math.cos(theta) * radius
        const z = Math.sin(theta) * radius

        points.push(new THREE.Vector3(x, y, z))
    }

    return points
}

// Single image plane
function ImagePlane({ position, imagePath, color, scale = 0.55 }) {
    const meshRef = useRef()
    const [hovered, setHovered] = useState(false)
    const [texture, setTexture] = useState(null)

    // Load texture on mount
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
                }
            )
        }
    }, [imagePath])

    // Make plane face outward from center
    const quaternion = useMemo(() => {
        const lookAt = new THREE.Vector3(0, 0, 0)
        const up = new THREE.Vector3(0, 1, 0)
        const matrix = new THREE.Matrix4()
        matrix.lookAt(position, lookAt, up)
        const quat = new THREE.Quaternion()
        quat.setFromRotationMatrix(matrix)
        return quat
    }, [position])

    const currentScale = hovered ? scale * 1.15 : scale

    return (
        <mesh
            ref={meshRef}
            position={position}
            quaternion={quaternion}
            scale={[currentScale, currentScale * 1.3, 1]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
            onPointerOut={() => setHovered(false)}
        >
            <planeGeometry args={[1, 1]} />
            {texture ? (
                <meshBasicMaterial
                    map={texture}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={hovered ? 1 : 0.95}
                />
            ) : (
                <meshBasicMaterial
                    color={color || '#2a2a2a'}
                    side={THREE.DoubleSide}
                />
            )}
        </mesh>
    )
}

export default function ImageSphere({
    images,
    position = [0, 0, 0],
    radius = 2,
    rotationSpeed = 0.0008,
    onClick,
    interactive = true
}) {
    const groupRef = useRef()
    const [hovered, setHovered] = useState(false)

    // Generate evenly distributed points
    const points = useMemo(() => {
        if (!images || images.length === 0) return []
        return fibonacciSphere(images.length).map(p =>
            p.multiplyScalar(radius)
        )
    }, [images?.length, radius])

    // Continuous rotation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += rotationSpeed
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
        }
    })

    if (!images || images.length === 0) return null

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={() => interactive && setHovered(true)}
            onPointerOut={() => interactive && setHovered(false)}
            scale={hovered ? 1.02 : 1}
        >
            {/* Invisible click sphere */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation()
                    if (interactive && onClick) onClick()
                }}
            >
                <sphereGeometry args={[radius * 1.2, 32, 32]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Image planes */}
            {images.map((img, index) => (
                <ImagePlane
                    key={img.id || `img-${index}`}
                    position={points[index]}
                    imagePath={img.image}
                    color={img.color}
                />
            ))}
        </group>
    )
}
