import { supabase } from './supabase'

// ─── Public ─────────────────────────────────────────────────────────────────

/** Fetch all published collections (for the frontend) */
export async function fetchPublishedCollections() {
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** Fetch all collections including unpublished (admin only) */
export async function fetchAllCollections() {
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

/** Create a new collection */
export async function createCollection(payload) {
    const { data, error } = await supabase
        .from('collections')
        .insert([payload])
        .select()
        .single()

    if (error) throw error
    return data
}

/** Update an existing collection by id */
export async function updateCollection(id, updates) {
    const { data, error } = await supabase
        .from('collections')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

/** Delete a collection and its associated storage images */
export async function deleteCollection(id) {
    const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ─── Image upload ────────────────────────────────────────────────────────────

/**
 * Resize & convert a File to WebP using the canvas API.
 * Returns a Blob.
 */
async function processImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const scale = Math.min(1, maxWidth / img.width)
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob)
                    else reject(new Error('canvas.toBlob returned null'))
                },
                'image/webp',
                quality
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Image load failed'))
        }

        img.src = objectUrl
    })
}

/**
 * Upload one image to Supabase Storage.
 * Produces both a /full/ (2000px, 0.82) and /thumb/ (600px, 0.65) version.
 *
 * Returns { fullUrl, thumbUrl }
 */
export async function uploadImage(file, category, slug) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const filename = `${uniqueId}.webp`

    // Process full and thumb in parallel
    const [fullBlob, thumbBlob] = await Promise.all([
        processImage(file, 2000, 0.82),
        processImage(file, 600, 0.65),
    ])

    const fullPath = `${category}/${slug}/full/${filename}`
    const thumbPath = `${category}/${slug}/thumb/${filename}`

    const [fullResult, thumbResult] = await Promise.all([
        supabase.storage.from('portfolio-assets').upload(fullPath, fullBlob, {
            contentType: 'image/webp',
            upsert: false,
        }),
        supabase.storage.from('portfolio-assets').upload(thumbPath, thumbBlob, {
            contentType: 'image/webp',
            upsert: false,
        }),
    ])

    if (fullResult.error) throw fullResult.error
    if (thumbResult.error) throw thumbResult.error

    const { data: fullData } = supabase.storage.from('portfolio-assets').getPublicUrl(fullPath)
    const { data: thumbData } = supabase.storage.from('portfolio-assets').getPublicUrl(thumbPath)

    return { fullUrl: fullData.publicUrl, thumbUrl: thumbData.publicUrl }
}

/**
 * Delete images from Supabase Storage given their public URLs.
 * Silently ignores errors (best-effort cleanup).
 */
export async function deleteImages(urls) {
    if (!urls?.length) return
    const paths = urls
        .map((url) => {
            const match = url.match(/portfolio-assets\/(.+)$/)
            return match ? match[1] : null
        })
        .filter(Boolean)

    if (paths.length) {
        await supabase.storage.from('portfolio-assets').remove(paths)
    }
}
