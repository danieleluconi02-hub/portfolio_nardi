import * as THREE from 'three'

// Shared between CategorySphere, ImmersiveSphere and PreloadManager so they
// all pick the SAME images for a given seed and reuse the SAME textures.

export const SPHERE_IMAGE_COUNT = 90     // CategorySphere
export const IMMERSIVE_IMAGE_COUNT = 60  // ImmersiveSphere (first 60 of the same shuffle)

/** Unique thumbnail entries for a category's collections, in manifest order */
function collectThumbs(collections) {
    const seen = new Set()
    const images = []
    collections.forEach(col => {
        (col.images || []).forEach(img => {
            const path = img.replace('/full/', '/thumb/')
            if (!seen.has(path)) {
                seen.add(path)
                images.push({ path, collectionId: col.id, collectionTitle: col.title })
            }
        })
    })
    return images
}

/** Deterministic seeded shuffle of a category's thumbs, truncated to `count` */
export function sampleSphereImages(collections, seed, count) {
    const all = collectThumbs(collections || [])
    if (all.length === 0) return []

    const seededRandom = (i) => {
        const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
        return x - Math.floor(x)
    }

    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(i) * (i + 1))
            ;[all[i], all[j]] = [all[j], all[i]]
    }

    return all.slice(0, Math.min(count, all.length))
}

// ─── Texture cache ──────────────────────────────────────────────────────────
// One download/decode per URL for the whole session. Textures are kept alive
// across sphere mounts (a new <Canvas> re-uploads them to its own GL context).

const textureCache = new Map()
const loader = new THREE.TextureLoader()
loader.setCrossOrigin('anonymous')

export function loadTexture(url) {
    let entry = textureCache.get(url)
    if (!entry) {
        entry = new Promise((resolve, reject) => {
            loader.load(
                url,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = false // not used with LinearFilter; saves GPU memory
                    // Decode off the main thread before the texture is first drawn, so
                    // images popping in don't stutter the sphere animation
                    const img = tex.image
                    if (img && typeof img.decode === 'function') {
                        img.decode().catch(() => { }).then(() => resolve(tex))
                    } else {
                        resolve(tex)
                    }
                },
                undefined,
                (err) => {
                    textureCache.delete(url) // allow a retry later
                    reject(err)
                }
            )
        })
        textureCache.set(url, entry)
    }
    return entry
}
