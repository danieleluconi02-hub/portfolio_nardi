import { useEffect } from 'react'

const PRELOAD_PER_CATEGORY = 30 // the rest stream in during the 5s sphere intro
const START_DELAY = 4000        // let the landing page finish loading first

/**
 * PreloadManager - Silently warms the sphere texture cache in the background.
 * Uses the shared sampler, so it loads exactly the images CategorySphere and
 * ImmersiveSphere will show, into the same cache they read from.
 * three.js is imported dynamically so it stays out of the landing bundle.
 */
export default function PreloadManager({ manifest, seed }) {
    useEffect(() => {
        if (!manifest) return

        let cancelled = false
        let idleId = null

        const run = async () => {
            const { sampleSphereImages, loadTexture } = await import('../lib/sphereImages')
            if (cancelled) return

            // Interleave categories so both get their first images early
            const lists = Object.values(manifest).map(cat =>
                sampleSphereImages(cat?.collections, seed, PRELOAD_PER_CATEGORY)
            )
            const queue = []
            for (let i = 0; i < PRELOAD_PER_CATEGORY; i++) {
                lists.forEach(list => { if (list[i]) queue.push(list[i].path) })
            }

            // Sequential, low priority
            for (const url of queue) {
                if (cancelled) return
                await loadTexture(url).catch(() => { })
            }
        }

        const timer = setTimeout(() => {
            if (window.requestIdleCallback) {
                idleId = window.requestIdleCallback(run)
            } else {
                run()
            }
        }, START_DELAY)

        return () => {
            cancelled = true
            clearTimeout(timer)
            if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId)
        }
    }, [manifest, seed])

    return null // Invisible component
}
