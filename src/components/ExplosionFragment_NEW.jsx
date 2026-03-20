// Temporary file to hold the new ExplosionFragment implementation
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Explosion Fragment Component - Confetti with real images!
export function ExplosionFragment({ fragment, imagePath, index }) {
    const meshRef = useRef()
    const [pos, setPos] = useState(new THREE.Vector3(0, 0, 0))

    // Confetti size - slightly larger to be clearly visible
    const confettiWidth = 0.8 + Math.random() * 0.4 // Random size variation
    const confettiHeight = confettiWidth * 1.2 // Slightly rectangular for confetti effect

    // Load the actual image texture
    const texture = useMemo(() => {
        if (!imagePath) return null
        return new THREE.TextureLoader().load(imagePath)
    }, [imagePath])

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Update position with velocity
            setPos(p => {
                const newPos = p.clone()
                newPos.add(fragment.vel.clone().multiplyScalar(delta * 10))
                // Add gravity
                fragment.vel.y -= delta * 2
                return newPos
            })
            meshRef.current.position.copy(pos)

            // Tumbling rotation for confetti effect
            meshRef.current.rotation.x += delta * (3 + Math.random() * 4)
            meshRef.current.rotation.y += delta * (2 + Math.random() * 3)
            meshRef.current.rotation.z += delta * (1 + Math.random() * 2)
        }
    })

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[confettiWidth, confettiHeight]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={0.95}
                side={THREE.DoubleSide}
            />
        </mesh>
    )
}
