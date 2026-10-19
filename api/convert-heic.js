import sharp from 'sharp'

// Disable Vercel's built-in body parser so we can read raw binary
export const config = {
    api: { bodyParser: false },
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
    })
}

export default async function handler(req, res) {
    // No CORS headers: the admin panel calls this from the same origin, and a
    // wildcard let any other site use the function on this account's quota.
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    try {
        const buffer = await readBody(req)

        if (!buffer.length) {
            return res.status(400).json({ error: 'Empty body' })
        }

        // Convert to JPEG using sharp (handles HEIC/HEIF with HEVC, AVIF, TIFF, etc.)
        const jpegBuffer = await sharp(buffer)
            .jpeg({ quality: 92 })
            .toBuffer()

        res.setHeader('Content-Type', 'image/jpeg')
        res.setHeader('Content-Length', jpegBuffer.length)
        return res.status(200).send(jpegBuffer)
    } catch (err) {
        console.error('convert-heic error:', err.message)
        return res.status(500).json({ error: `Conversion failed: ${err.message}` })
    }
}
