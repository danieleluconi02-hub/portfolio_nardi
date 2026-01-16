/**
 * SCRIPT: Ottimizza immagini per il portfolio (con sottocartelle/collezioni)
 * 
 * Struttura supportata:
 * public/assets/
 * ├── design/
 * │   ├── Collection1/      ← Collezione
 * │   │   └── *.jpg
 * │   └── Collection2/
 * │       └── *.jpg
 * └── styling/
 *     └── Editorial1/
 *         └── *.jpg
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG = {
    inputDir: path.join(__dirname, '../public/assets'),
    outputDir: path.join(__dirname, '../public/assets-optimized'),
    categories: ['design', 'styling'],

    sizes: {
        thumb: { width: 400 },   // Per la sfera 3D
        full: { width: 1600 }    // Per la galleria
    },

    quality: 80
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

async function optimizeImage(inputPath, outputPath, width, quality) {
    try {
        const dir = path.dirname(outputPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        await sharp(inputPath)
            .resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({ quality })
            .toFile(outputPath)

        return true
    } catch (error) {
        console.error(`  ❌ Errore: ${path.basename(inputPath)} - ${error.message}`)
        return false
    }
}

async function processCollection(category, collectionName, inputPath) {
    const files = fs.readdirSync(inputPath)
        .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))

    if (files.length === 0) return { processed: 0, skipped: 0, collection: collectionName }

    console.log(`\n   📁 ${collectionName}: ${files.length} immagini`)

    let processed = 0
    let skipped = 0

    for (const file of files) {
        const filePath = path.join(inputPath, file)
        const baseName = path.basename(file, path.extname(file))

        for (const [sizeName, sizeConfig] of Object.entries(CONFIG.sizes)) {
            const outputDir = path.join(CONFIG.outputDir, category, collectionName, sizeName)
            const outputPath = path.join(outputDir, `${baseName}.webp`)

            if (fs.existsSync(outputPath)) {
                skipped++
                continue
            }

            const success = await optimizeImage(filePath, outputPath, sizeConfig.width, CONFIG.quality)
            if (success) {
                processed++
                process.stdout.write(`      ✅ ${baseName} (${sizeName})\n`)
            }
        }
    }

    return { processed, skipped, collection: collectionName, count: files.length }
}

async function processCategory(category) {
    const categoryPath = path.join(CONFIG.inputDir, category)

    if (!fs.existsSync(categoryPath)) {
        console.log(`⚠️  Cartella non trovata: ${category}/`)
        return { processed: 0, skipped: 0, collections: [] }
    }

    console.log(`\n📦 ${category.toUpperCase()}`)

    const items = fs.readdirSync(categoryPath, { withFileTypes: true })
    const subdirs = items.filter(item => item.isDirectory())

    let totalProcessed = 0
    let totalSkipped = 0
    const collections = []

    // Processa ogni sottocartella come collezione
    for (const subdir of subdirs) {
        const result = await processCollection(
            category,
            subdir.name,
            path.join(categoryPath, subdir.name)
        )
        totalProcessed += result.processed
        totalSkipped += result.skipped
        if (result.count > 0) {
            collections.push({ name: subdir.name, count: result.count })
        }
    }

    // Processa anche file direttamente nella cartella categoria (retrocompatibilità)
    const directFiles = items.filter(item =>
        !item.isDirectory() &&
        SUPPORTED_EXTENSIONS.includes(path.extname(item.name).toLowerCase())
    )

    if (directFiles.length > 0) {
        console.log(`\n   📁 (root): ${directFiles.length} immagini`)
        for (const file of directFiles) {
            const filePath = path.join(categoryPath, file.name)
            const baseName = path.basename(file.name, path.extname(file.name))

            for (const [sizeName, sizeConfig] of Object.entries(CONFIG.sizes)) {
                const outputDir = path.join(CONFIG.outputDir, category, '_root', sizeName)
                const outputPath = path.join(outputDir, `${baseName}.webp`)

                if (fs.existsSync(outputPath)) {
                    totalSkipped++
                    continue
                }

                const success = await optimizeImage(filePath, outputPath, sizeConfig.width, CONFIG.quality)
                if (success) {
                    totalProcessed++
                    process.stdout.write(`      ✅ ${baseName} (${sizeName})\n`)
                }
            }
        }
        collections.push({ name: '_root', count: directFiles.length })
    }

    return { processed: totalProcessed, skipped: totalSkipped, collections }
}

function getDirectorySize(dir) {
    if (!fs.existsSync(dir)) return 0
    let size = 0
    const files = fs.readdirSync(dir, { withFileTypes: true })
    for (const file of files) {
        const filePath = path.join(dir, file.name)
        if (file.isDirectory()) {
            size += getDirectorySize(filePath)
        } else {
            size += fs.statSync(filePath).size
        }
    }
    return size
}

async function main() {
    console.log('\n🖼️  OTTIMIZZAZIONE IMMAGINI PORTFOLIO')
    console.log('=====================================')
    console.log(`📂 Input:  ${CONFIG.inputDir}`)
    console.log(`📂 Output: ${CONFIG.outputDir}`)
    console.log(`🎯 Qualità: ${CONFIG.quality}%`)

    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true })
    }

    let totalProcessed = 0
    let totalSkipped = 0
    const allCollections = {}

    for (const category of CONFIG.categories) {
        const result = await processCategory(category)
        totalProcessed += result.processed
        totalSkipped += result.skipped
        allCollections[category] = result.collections
    }

    const originalSize = (getDirectorySize(CONFIG.inputDir) / 1024 / 1024).toFixed(2)
    const optimizedSize = (getDirectorySize(CONFIG.outputDir) / 1024 / 1024).toFixed(2)
    const saved = ((1 - optimizedSize / originalSize) * 100).toFixed(1)

    console.log('\n=====================================')
    console.log('📊 RIEPILOGO')
    console.log(`   ✅ Processate: ${totalProcessed}`)
    console.log(`   ⏭️  Saltate: ${totalSkipped}`)

    console.log('\n📁 COLLEZIONI:')
    for (const [cat, cols] of Object.entries(allCollections)) {
        console.log(`   ${cat}: ${cols.map(c => `${c.name}(${c.count})`).join(', ')}`)
    }

    console.log(`\n💾 SPAZIO:`)
    console.log(`   📁 Originali:  ${originalSize} MB`)
    console.log(`   📁 Ottimizzate: ${optimizedSize} MB`)
    console.log(`   🎉 Risparmiato: ${saved}%`)

    console.log('\n✨ Fatto! Ora esegui: npm run generate-manifest-optimized\n')
}

main().catch(console.error)
