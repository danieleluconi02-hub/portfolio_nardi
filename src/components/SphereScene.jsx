import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import ImageSphere from './ImageSphere'

export default function SphereScene({
    appState,
    sphereImages,
    onSphereClick,
    onCategorySelect,
    onTransformComplete
}) {
    const { camera } = useThree()
    const hasCompletedRef = useRef(false)

    // Split images by category
    const designImages = useMemo(() =>
        sphereImages.filter(img => img.category === 'design'),
        [sphereImages]
    )

    const stylingImages = useMemo(() =>
        sphereImages.filter(img => img.category === 'styling'),
        [sphereImages]
    )

    // Reset completion flag when going back to sphere
    useEffect(() => {
        if (appState === 'sphere') {
            hasCompletedRef.current = false
        }
    }, [appState])

    // Simple, fast spring config
    const fastConfig = { mass: 0.5, tension: 280, friction: 24 }

    // Main sphere - visible only in 'sphere' state
    const mainSpring = useSpring({
        scale: appState === 'sphere' ? 1 : 0,
        opacity: appState === 'sphere' ? 1 : 0,
        config: fastConfig
    })

    // Left sphere - Design
    const leftSpring = useSpring({
        positionX: appState === 'split' ? -4.0 : 0,
        scale: appState === 'split' ? 1 : 0,
        config: fastConfig,
        onRest: () => {
            if (appState === 'transforming' && !hasCompletedRef.current) {
                hasCompletedRef.current = true
                if (onTransformComplete) onTransformComplete()
            }
        }
    })

    // Right sphere - Styling
    const rightSpring = useSpring({
        positionX: appState === 'split' ? 4.0 : 0,
        scale: appState === 'split' ? 1 : 0,
        config: fastConfig
    })

    // Handle click on main sphere
    const handleMainClick = useCallback(() => {
        if (appState === 'sphere') {
            onSphereClick()
        }
    }, [appState, onSphereClick])

    // Camera position
    useFrame(() => {
        if (appState === 'sphere') {
            camera.position.z = 12 + Math.sin(Date.now() * 0.001) * 0.3
        } else if (appState === 'split' || appState === 'transforming') {
            camera.position.z = 14
        }
    })

    // Trigger transform complete after a short delay
    useEffect(() => {
        if (appState === 'transforming' && !hasCompletedRef.current) {
            const timer = setTimeout(() => {
                hasCompletedRef.current = true
                if (onTransformComplete) onTransformComplete()
            }, 600)
            return () => clearTimeout(timer)
        }
    }, [appState, onTransformComplete])

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={1} />
            <pointLight position={[0, 10, 10]} intensity={0.3} />

            {/* Main sphere */}
            {appState === 'sphere' && (
                <animated.group scale={mainSpring.scale}>
                    <ImageSphere
                        images={sphereImages}
                        radius={3.5}
                        rotationSpeed={0.0004}
                        onClick={handleMainClick}
                        interactive={true}
                    />
                </animated.group>
            )}

            {/* Split spheres - always render when split or transforming */}
            {(appState === 'split' || appState === 'transforming') && (
                <>
                    {/* Left - Design */}
                    <animated.group
                        position-x={leftSpring.positionX}
                        scale={leftSpring.scale}
                    >
                        <ImageSphere
                            images={designImages.length > 0 ? designImages : sphereImages.slice(0, Math.ceil(sphereImages.length / 2))}
                            radius={3}
                            rotationSpeed={0.0004}
                            onClick={() => onCategorySelect('design')}
                            interactive={appState === 'split'}
                        />
                    </animated.group>

                    {/* Right - Styling */}
                    <animated.group
                        position-x={rightSpring.positionX}
                        scale={rightSpring.scale}
                    >
                        <ImageSphere
                            images={stylingImages.length > 0 ? stylingImages : sphereImages.slice(Math.ceil(sphereImages.length / 2))}
                            radius={3}
                            rotationSpeed={0.0004}
                            onClick={() => onCategorySelect('styling')}
                            interactive={appState === 'split'}
                        />
                    </animated.group>
                </>
            )}
        </>
    )
}
