import { useEffect } from 'react'
import * as THREE from 'three'

/**
 * PreloadManager - Silently loads textures in the background
 * Uses the EXACT same seeding logic as CategorySphere to ensure we load the right images.
 */
export default function PreloadManager({ manifest, seed }) {
    useEffect(() => {
        if (!manifest || !seed) return

        const TARGET_IMAGE_COUNT = 60 // Must match CategorySphere

        // 1. Gather all images (thumbs)
        const allImages = []
        Object.keys(manifest).forEach(category => {
            const collections = manifest[category]?.collections || []
            collections.forEach(col => {
                if (col.images) {
                    col.images.forEach(img => {
                        allImages.push(img.replace('/full/', '/thumb/'))
                    })
                }
            })
        })

        if (allImages.length === 0) return

        // 2. Replicate the Seeding Logic exactly
        const seededRandom = (i) => {
            const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
            return x - Math.floor(x)
        }

        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(i) * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const imagesToLoad = shuffled.slice(0, Math.min(TARGET_IMAGE_COUNT, shuffled.length))

        // 3. Preload logic
        const loader = new THREE.TextureLoader()

        // Low priority loading
        let loadedCount = 0

        const loadNext = (index) => {
            if (index >= imagesToLoad.length) return

            const imgPath = imagesToLoad[index]

            loader.load(
                imgPath,
                (texture) => {
                    // Cache logic is handled internally by THREE.TextureLoader
                    // as long as we use the same URL.
                    loadedCount++
                    // Chain load next to avoid blocking main thread too hard
                    setTimeout(() => loadNext(index + 1), 20)
                },
                undefined, // onProgress
                () => {
                    loadNext(index + 1)
                }
            )
        }

        // Start loading
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => loadNext(0))
        } else {
            setTimeout(() => loadNext(0), 1000)
        }

    }, [manifest, seed])

    return null // Invisible component
}
