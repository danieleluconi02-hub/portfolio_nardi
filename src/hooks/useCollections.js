import { useState, useEffect } from 'react'
import { fetchPublishedCollections } from '../lib/collectionsApi'
import staticManifest from '../data/manifest.json'

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL

/** Convert a Supabase collection row → manifest collection entry */
function toManifestEntry(col) {
    return {
        id: col.slug,
        title: col.title,
        year: col.year || '',
        brand: col.category === 'design' ? 'Fashion Design' : 'Styling',
        description: col.description || '',
        images: col.image_urls || [],
        thumbnails: col.thumb_urls || col.image_urls || [],
    }
}

/**
 * Merge Supabase dynamic collections on top of the static manifest.
 *
 * Priority rules:
 * - If a slug exists in BOTH sources, Supabase wins (fresher description, metadata).
 * - If Supabase has an empty image_urls array for a known slug, the static image
 *   paths are preserved so the site never shows a blank collection.
 * - Collections that only exist in Supabase are appended.
 * - Collections that only exist in static manifest are kept as-is (fallback).
 */
function buildMergedManifest(supabaseCollections) {
    const merged = {
        design: {
            title: staticManifest.design?.title || 'Fashion Design',
            collections: [...(staticManifest.design?.collections || [])],
        },
        styling: {
            title: staticManifest.styling?.title || 'Styling',
            collections: [...(staticManifest.styling?.collections || [])],
        },
    }

    for (const col of supabaseCollections) {
        const category = col.category // 'design' | 'styling'
        if (!merged[category]) {
            merged[category] = { title: category, collections: [] }
        }

        const entry = toManifestEntry(col)
        const existingIdx = merged[category].collections.findIndex((c) => c.id === col.slug)

        if (existingIdx !== -1) {
            // Supabase overrides static — but preserve static image URLs if Supabase has none yet
            if (!entry.images.length) {
                entry.images = merged[category].collections[existingIdx].images
                entry.thumbnails = merged[category].collections[existingIdx].thumbnails
            }
            merged[category].collections[existingIdx] = entry
        } else {
            merged[category].collections.push(entry)
        }
    }

    return merged
}

/**
 * Hook that provides the manifest compatible with the existing App.jsx contract.
 * - Immediately returns the static manifest so the UI is never blocked.
 * - Upgrades to the merged manifest once Supabase responds.
 */
export function useCollections() {
    const [manifest, setManifest] = useState(staticManifest)
    const [loading, setLoading] = useState(SUPABASE_CONFIGURED)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!SUPABASE_CONFIGURED) return

        let cancelled = false

        fetchPublishedCollections()
            .then((collections) => {
                if (!cancelled) setManifest(buildMergedManifest(collections))
            })
            .catch((err) => {
                if (!cancelled) setError(err)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    return { manifest, loading, error }
}
