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
 * If the file is HEIC/HEIF, convert it to JPEG via the server-side API route
 * (/api/convert-heic) which uses sharp for full HEVC codec support.
 * Returns the original file unchanged for all other formats.
 */
async function maybeDecodeHeic(file) {
    const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        /\.(heic|heif)$/i.test(file.name)

    if (!isHeic) return file

    const resp = await fetch('/api/convert-heic', {
        method: 'POST',
        body: file,
    })

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }))
        throw new Error(err.error || 'HEIC conversion failed')
    }

    return new Blob([await resp.arrayBuffer()], { type: 'image/jpeg' })
}

/**
 * Load a File/Blob into an HTMLImageElement.
 * Returns the loaded image element.
 */
function loadImage(source) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(source)
        img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img) }
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Browser cannot decode this image')) }
        img.src = objectUrl
    })
}

/**
 * Draw an image to a canvas at the target size and encode it.
 * Tries WebP first, falls back to JPEG (Safari < 16 doesn't support WebP encoding).
 * Returns a Blob.
 */
function encodeCanvas(canvas) {
    return new Promise((resolve, reject) => {
        // Try WebP
        canvas.toBlob((webpBlob) => {
            if (webpBlob && webpBlob.size > 0) {
                return resolve(webpBlob)
            }
            // Fallback to JPEG
            canvas.toBlob((jpegBlob) => {
                if (jpegBlob && jpegBlob.size > 0) {
                    return resolve(jpegBlob)
                }
                reject(new Error('Canvas encoding failed for both WebP and JPEG'))
            }, 'image/jpeg', 0.85)
        }, 'image/webp', 0.85)
    })
}

/**
 * Resize a File/Blob via canvas. Returns a Blob (WebP or JPEG).
 */
async function processImage(source, maxWidth) {
    const img = await loadImage(source)

    const scale = Math.min(1, maxWidth / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return encodeCanvas(canvas)
}

/**
 * Upload one image to Supabase Storage.
 * Produces both a /full/ (2000px) and /thumb/ (600px) version.
 * HEIC/HEIF files are decoded to JPEG first, then resized via canvas.
 *
 * Returns { fullUrl, thumbUrl }
 */
export async function uploadImage(file, category, slug) {
    // Step 1: HEIC decode (no-op for JPEG/PNG/WebP)
    let source
    try {
        source = await maybeDecodeHeic(file)
    } catch (err) {
        throw new Error(`HEIC decode failed: ${err.message}`)
    }

    // Step 2: Resize via canvas
    let fullBlob, thumbBlob
    try {
        ;[fullBlob, thumbBlob] = await Promise.all([
            processImage(source, 2000),
            processImage(source, 600),
        ])
    } catch (err) {
        throw new Error(`Image processing failed: ${err.message}`)
    }

    // Step 3: Upload to Supabase Storage
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const filename = `${uniqueId}.webp`
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

    if (fullResult.error) throw new Error(`Storage upload (full) failed: ${fullResult.error.message}`)
    if (thumbResult.error) throw new Error(`Storage upload (thumb) failed: ${thumbResult.error.message}`)

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
