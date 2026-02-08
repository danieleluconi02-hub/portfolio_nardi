import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

/**
 * SketchySphereGrid - Hand-drawn spherical wireframe
 * 
 * Features:
 * - Truly freehand-looking lines with visible irregularity
 * - More lines for richer visual texture
 * - Lines render behind images (renderOrder -1)
 */
export default function SketchySphereGrid({
    radius,
    color = '#ffffff',
    opacity = 0.4,
    lineWidth = 1.5,
    renderOrder = -1,
    imagePositions = [],
    imageScale = 1.0
}) {
    const groupRef = useRef()

    // Generate truly hand-drawn lines with visible wobble
    const lines = useMemo(() => {
        const generatedLines = []
        const segments = 80

        // STRONG hand-drawn parameters - visible freehand effect
        const wobbleAmp = 0.035 * radius  // Strong wobble - really looks hand-drawn
        const wobbleFreq = 3  // Low frequency = big flowing curves

        // Generate a truly freehand ring
        const generateFreehandRing = (axis, constVal, isLat = false, seed = 0) => {
            const points = []

            // Each line has unique character
            const lineCharacter = Math.sin(seed * 77.7) * 0.4
            const speedVariation = 0.8 + Math.sin(seed * 33.3) * 0.4

            for (let j = 0; j <= segments; j++) {
                const ratio = j / segments
                const theta = ratio * Math.PI * 2

                let x, y, z
                if (isLat) {
                    const rRing = Math.sqrt(Math.max(0, radius * radius - constVal * constVal))
                    x = Math.cos(theta) * rRing
                    y = constVal
                    z = Math.sin(theta) * rRing
                } else {
                    const rRing = radius
                    const cx = Math.sin(theta) * rRing
                    const cy = Math.cos(theta) * rRing
                    const cz = 0

                    const v = new THREE.Vector3(cx, cy, cz)
                    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), constVal)
                    x = v.x
                    y = v.y
                    z = v.z
                }

                // TRULY FREEHAND EFFECT
                // Primary wave - big, sweeping hand motion
                const wave1 = Math.sin(theta * wobbleFreq * speedVariation + seed) * wobbleAmp

                // Secondary wave - adds complexity
                const wave2 = Math.sin(theta * (wobbleFreq * 2.3) + seed * 1.7 + lineCharacter) * wobbleAmp * 0.45

                // Tertiary wave - medium frequency variation
                const wave3 = Math.cos(theta * (wobbleFreq * 3.7) + seed * 0.9) * wobbleAmp * 0.25

                // Hand tremor - quick small shakes
                const tremor = Math.sin(theta * 12 + seed * 5.1) * wobbleAmp * 0.15

                // Random "mistakes" - occasional bigger deviations
                const mistake = Math.sin(j * 17.3 + seed * 2.2) > 0.85
                    ? Math.sin(j * 3.7) * wobbleAmp * 0.3
                    : 0

                // Combine all for truly organic feel
                const totalOffset = wave1 + wave2 + wave3 + tremor + mistake

                const v = new THREE.Vector3(x, y, z)
                const normalized = v.clone().normalize()

                // Apply offset
                v.x += normalized.x * totalOffset
                v.y += normalized.y * totalOffset * 0.8
                v.z += normalized.z * totalOffset

                // Ink spread effect
                const inkSpread = (Math.sin(j * 47.7 + seed * 3.3) - 0.5) * radius * 0.006
                v.x += normalized.x * inkSpread
                v.z += normalized.z * inkSpread

                points.push(v)
            }

            return points
        }

        // 1. Longitude Lines (Meridians) - 10 lines
        const longitudes = 10
        for (let i = 0; i < longitudes; i++) {
            const angle = (i / longitudes) * Math.PI * 2
            const points = generateFreehandRing('y', angle, false, i * 7.3)

            // Variable pressure effect
            const pressure = 0.7 + Math.sin(i * 1.5) * 0.3

            generatedLines.push({
                points,
                opacity: opacity * pressure,
                lineWidth: lineWidth * (0.8 + Math.sin(i * 0.9) * 0.25)
            })
        }

        // 2. Latitude Lines (Parallels) - 7 lines
        const latitudes = 7
        for (let i = 1; i <= latitudes; i++) {
            const t = i / (latitudes + 1)
            const yNorm = -0.85 + t * 1.7  // Covers more of sphere
            const y = yNorm * radius

            const polarFactor = 1 - Math.abs(yNorm) * 0.2
            const points = generateFreehandRing('y', y, true, i * 13.7 + 100)

            generatedLines.push({
                points,
                opacity: opacity * polarFactor * 0.85,
                lineWidth: lineWidth * polarFactor * (0.85 + Math.cos(i * 0.7) * 0.15)
            })
        }

        return generatedLines
    }, [radius, opacity, lineWidth])

    return (
        <group ref={groupRef}>
            {lines.map((line, i) => (
                <Line
                    key={i}
                    points={line.points}
                    color={color}
                    lineWidth={line.lineWidth}
                    transparent
                    opacity={line.opacity}
                    depthWrite={false}
                    renderOrder={renderOrder}
                />
            ))}
        </group>
    )
}
