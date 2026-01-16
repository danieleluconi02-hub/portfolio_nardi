/**
 * Video Optimization Script for Fashion Film Section
 * 
 * This script helps you optimize large video files for web use.
 * It requires FFmpeg to be installed on your system.
 * 
 * USAGE:
 * 1. Install FFmpeg: https://ffmpeg.org/download.html
 * 2. Place your original videos in: public/assets/videos/originals/
 * 3. Run: node scripts/optimize-videos.js
 * 
 * This will:
 * - Compress videos to ~20-40MB while maintaining good quality
 * - Create thumbnail images from the first frame
 * - Output optimized videos to public/assets/videos/
 * - Output thumbnails to public/assets/videos/thumbnails/
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    inputDir: path.join(__dirname, '../public/assets/videos/originals'),
    outputDir: path.join(__dirname, '../public/assets/videos'),
    thumbDir: path.join(__dirname, '../public/assets/videos/thumbnails'),
    // Video settings - adjust CRF for quality (lower = better, 18-28 is good range)
    videoCRF: 23,
    // Video resolution - 1080p max
    maxWidth: 1920,
    maxHeight: 1080,
    // Audio bitrate
    audioBitrate: '128k',
};

// Check if FFmpeg is installed
function checkFFmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Get video duration
function getVideoDuration(inputPath) {
    try {
        const result = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
            { encoding: 'utf-8' }
        );
        return parseFloat(result.trim());
    } catch {
        return 0;
    }
}

// Generate thumbnail from video
function generateThumbnail(inputPath, outputPath) {
    console.log(`  Generating thumbnail...`);
    try {
        // Take a frame from 1 second into the video (or first frame if shorter)
        execSync(
            `ffmpeg -y -i "${inputPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`,
            { stdio: 'inherit' }
        );
        return true;
    } catch (error) {
        console.error(`  Failed to generate thumbnail: ${error.message}`);
        return false;
    }
}

// Optimize video
function optimizeVideo(inputPath, outputPath) {
    const inputSize = fs.statSync(inputPath).size / (1024 * 1024);
    console.log(`  Input size: ${inputSize.toFixed(2)} MB`);

    try {
        // H.264 encoding with good compression
        const command = [
            'ffmpeg -y',
            `-i "${inputPath}"`,
            // Video codec
            '-c:v libx264',
            `-crf ${CONFIG.videoCRF}`,
            '-preset slow',
            // Scale to max resolution while maintaining aspect ratio
            `-vf "scale='min(${CONFIG.maxWidth},iw)':'min(${CONFIG.maxHeight},ih)':force_original_aspect_ratio=decrease"`,
            // Audio codec
            '-c:a aac',
            `-b:a ${CONFIG.audioBitrate}`,
            // Optimize for web streaming
            '-movflags +faststart',
            // Output
            `"${outputPath}"`
        ].join(' ');

        console.log(`  Compressing video...`);
        execSync(command, { stdio: 'inherit' });

        const outputSize = fs.statSync(outputPath).size / (1024 * 1024);
        const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);
        console.log(`  Output size: ${outputSize.toFixed(2)} MB (${reduction}% reduction)`);

        return true;
    } catch (error) {
        console.error(`  Failed to optimize video: ${error.message}`);
        return false;
    }
}

// Main function
async function main() {
    console.log('='.repeat(60));
    console.log('Fashion Film Video Optimizer');
    console.log('='.repeat(60));

    // Check FFmpeg
    if (!checkFFmpeg()) {
        console.error('\n❌ FFmpeg is not installed!');
        console.log('\nPlease install FFmpeg from: https://ffmpeg.org/download.html');
        console.log('\nOn Windows with Chocolatey: choco install ffmpeg');
        console.log('On Windows with Winget: winget install ffmpeg');
        process.exit(1);
    }

    console.log('✓ FFmpeg found\n');

    // Create directories if they don't exist
    [CONFIG.inputDir, CONFIG.outputDir, CONFIG.thumbDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });

    // Check for input videos
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const inputFiles = fs.readdirSync(CONFIG.inputDir).filter(file =>
        videoExtensions.includes(path.extname(file).toLowerCase())
    );

    if (inputFiles.length === 0) {
        console.log('\n⚠️  No videos found in originals folder!');
        console.log(`\nPlace your videos in: ${CONFIG.inputDir}`);
        console.log('\nSupported formats: .mp4, .mov, .avi, .mkv, .webm');
        return;
    }

    console.log(`Found ${inputFiles.length} video(s) to process:\n`);

    // Process each video
    for (let i = 0; i < inputFiles.length; i++) {
        const file = inputFiles[i];
        const baseName = path.basename(file, path.extname(file));
        const inputPath = path.join(CONFIG.inputDir, file);
        const outputPath = path.join(CONFIG.outputDir, `${baseName}.mp4`);
        const thumbPath = path.join(CONFIG.thumbDir, `${baseName}-thumb.jpg`);

        console.log(`[${i + 1}/${inputFiles.length}] Processing: ${file}`);
        console.log('-'.repeat(40));

        // Optimize video
        if (optimizeVideo(inputPath, outputPath)) {
            // Generate thumbnail
            generateThumbnail(outputPath, thumbPath);
        }

        console.log('');
    }

    console.log('='.repeat(60));
    console.log('✓ Video optimization complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update FashionFilmPage.jsx with your video details');
    console.log('2. Videos are in: public/assets/videos/');
    console.log('3. Thumbnails are in: public/assets/videos/thumbnails/');
}

main().catch(console.error);
