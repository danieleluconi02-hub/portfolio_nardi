import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.join(__dirname, '../src/assets/about')
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'] // We will convert these to webp

async function processDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
        const fullPath = path.join(dir, item.name)

        if (item.isDirectory()) {
            await processDirectory(fullPath)
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase()

            if (SUPPORTED_EXTENSIONS.includes(ext)) {
                const baseName = path.basename(item.name, path.extname(item.name))
                const outputPath = path.join(dir, `${baseName}.webp`)

                // Skip if output already exists (case where we have _DSC1234.JPG and _DSC1234.webp already)
                if (fs.existsSync(outputPath) && ext !== '.webp') {
                    console.log(`Skipping (already optimized): ${item.name}`)
                    // Still delete the original if it's a raw format
                    if (ext !== '.webp') fs.unlinkSync(fullPath)
                    continue
                }

                console.log(`Optimizing: ${item.name} -> ${baseName}.webp`)

                try {
                    await sharp(fullPath)
                        .webp({ quality: 80 })
                        .toFile(outputPath)

                    // Delete the original file after successful conversion
                    fs.unlinkSync(fullPath)
                    console.log(`Deleted original: ${item.name}`)
                } catch (error) {
                    console.error(`Failed to optimize ${item.name}:`, error)
                }
            }
        }
    }
}

async function main() {
    console.log(`Scanning ${INPUT_DIR} for images to optimize...`)
    if (fs.existsSync(INPUT_DIR)) {
        await processDirectory(INPUT_DIR)
        console.log("Optimization complete.")
    } else {
        console.error(`Directory not found: ${INPUT_DIR}`)
    }
}

main()
