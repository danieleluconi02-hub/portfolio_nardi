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
 * If the file is HEIC/HEIF, convert it to JPEG using heic2any (lazy-loaded).
 * Returns the original file unchanged for all other formats.
 */
async function maybeDecodeHeic(file) {
    const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        /\.(heic|heif)$/i.test(file.name)

    if (!isHeic) return file

    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 })
    // heic2any may return an array for multi-frame images; take the first
    return Array.isArray(converted) ? converted[0] : converted
}

/**
 * Resize an image using canvas and encode to WebP (with JPEG fallback for
 * browsers that don't support WebP encoding, e.g. Safari < 16).
 * Returns { blob, contentType }.
 */
async function processImage(source, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(source)

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const scale = Math.min(1, maxWidth / img.width)
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Try WebP first; fall back to JPEG for browsers that don't support WebP encoding
            canvas.toBlob(
                (blob) => {
                    if (blob) return resolve({ blob, contentType: 'image/webp' })
                    // WebP not supported (Safari < 16) — fall back to JPEG
                    canvas.toBlob(
                        (jpegBlob) => {
                            if (jpegBlob) resolve({ blob: jpegBlob, contentType: 'image/jpeg' })
                            else reject(new Error('Image encoding failed'))
                        },
                        'image/jpeg',
                        quality
                    )
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
 * HEIC/HEIF files are decoded to JPEG first, then converted to WebP.
 *
 * Returns { fullUrl, thumbUrl }
 */
export async function uploadImage(file, category, slug) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Convert HEIC/HEIF → JPEG before canvas processing
    const source = await maybeDecodeHeic(file)

    // Process full and thumb in parallel
    const [full, thumb] = await Promise.all([
        processImage(source, 2000, 0.82),
        processImage(source, 600, 0.65),
    ])

    // Use the extension that matches the actual encoded format
    const ext = full.contentType === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${uniqueId}.${ext}`

    const fullPath = `${category}/${slug}/full/${filename}`
    const thumbPath = `${category}/${slug}/thumb/${filename}`

    const [fullResult, thumbResult] = await Promise.all([
        supabase.storage.from('portfolio-assets').upload(fullPath, full.blob, {
            contentType: full.contentType,
            upsert: false,
        }),
        supabase.storage.from('portfolio-assets').upload(thumbPath, thumb.blob, {
            contentType: thumb.contentType,
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
