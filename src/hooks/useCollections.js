import { useState, useEffect } from 'react'
import { fetchPublishedCollections } from '../lib/collectionsApi'

const EMPTY_MANIFEST = {
    design: { title: 'Fashion Design', collections: [] },
    styling: { title: 'Styling', collections: [] },
}

/** Convert a Supabase collection row → manifest-compatible entry */
function toManifestEntry(col) {
    return {
        id: col.slug,
        title: col.title,
        year: col.year || '',
        brand: col.category === 'design' ? 'Fashion Design' : 'Styling',
        description: col.description || '',
        credits: col.credits || '',
        images: col.image_urls || [],
        thumbnails: col.thumb_urls || col.image_urls || [],
    }
}

/**
 * Build the manifest entirely from Supabase collections.
 * Collections with no images are excluded — they won't appear on the site.
 */
function buildManifest(supabaseCollections) {
    const manifest = {
        design: { title: 'Fashion Design', collections: [] },
        styling: { title: 'Styling', collections: [] },
    }

    for (const col of supabaseCollections) {
        const category = col.category
        if (!manifest[category]) {
            manifest[category] = { title: category, collections: [] }
        }

        const entry = toManifestEntry(col)
        // Only include collections that have images — ghost/empty collections are excluded
        if (entry.images.length) {
            manifest[category].collections.push(entry)
        }
    }

    return manifest
}

/**
 * Single source of truth: Supabase is the ONLY data source.
 * - Starts with an empty manifest (no flash of stale static data)
 * - Populates once Supabase responds
 * - If Supabase fails or returns nothing, the site shows no collections
 */
export function useCollections() {
    const [manifest, setManifest] = useState(EMPTY_MANIFEST)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        fetchPublishedCollections()
            .then((collections) => {
                if (!cancelled) setManifest(buildManifest(collections))
            })
            .catch((err) => {
                if (!cancelled) setError(err)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [])

    return { manifest, loading, error }
}
