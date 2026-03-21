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
    // CORS headers for the admin panel
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
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
