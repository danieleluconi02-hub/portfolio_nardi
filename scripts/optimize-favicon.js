
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '../public/assets/ui/FN.png');
const OUTPUT_PATH = path.join(__dirname, '../public/favicon_fn_optimized.png');

async function optimizeFavicon() {
    try {
        console.log(`Processing ${INPUT_PATH}...`);

        // 1. Load image and trim transparent pixels
        const image = sharp(INPUT_PATH);
        const metadata = await image.metadata();

        console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);

        // Trim transparent pixels
        const trimmed = await image.trim().toBuffer();
        const trimmedImage = sharp(trimmed);
        const trimmedMetadata = await trimmedImage.metadata();

        console.log(`Trimmed dimensions: ${trimmedMetadata.width}x${trimmedMetadata.height}`);

        // 2. Make it square by adding transparent padding
        const maxDim = Math.max(trimmedMetadata.width, trimmedMetadata.height);
        // Add a little padding (10%) so it's not touching edges
        const targetSize = Math.ceil(maxDim * 1.1);

        const padded = await trimmedImage
            .resize({
                width: targetSize,
                height: targetSize,
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // 3. Resize to standard favicon size (512x512)
        await sharp(padded)
            .resize(512, 512)
            .toFile(OUTPUT_PATH);

        console.log(`Saved optimized favicon to ${OUTPUT_PATH}`);

    } catch (error) {
        console.error('Error optimizing favicon:', error);
        process.exit(1);
    }
}

optimizeFavicon();
