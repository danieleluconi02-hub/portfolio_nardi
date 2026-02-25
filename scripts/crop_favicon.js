import sharp from 'sharp';
import path from 'path';

const baseDir = 'c:/Users/danie/.gemini/antigravity/scratch/cyberpunk-portfolio';

async function cropFavicon() {
    const inputPath = path.join(baseDir, 'public', 'assets', 'ui', 'FN_LOGO.png');
    const faviconPath = path.join(baseDir, 'public', 'favicon.png');
    const appleIconPath = path.join(baseDir, 'public', 'apple-touch-icon.png');

    try {
        console.log(`Processing ${inputPath}...`);

        // Trim transparent edges and resize to 512x512
        // We use contain to maintain aspect ratio and fill with transparency
        await sharp(inputPath)
            .trim()
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(faviconPath);

        console.log(`Created ${faviconPath}`);

        // Create apple-touch-icon (180x180)
        await sharp(inputPath)
            .trim()
            .resize(180, 180, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(appleIconPath);

        console.log(`Created ${appleIconPath}`);
        console.log('Done!');
    } catch (err) {
        console.error('Error processing image:', err);
        process.exit(1);
    }
}

cropFavicon();
