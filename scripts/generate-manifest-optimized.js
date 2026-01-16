/**
 * SCRIPT: Genera manifest.json dalle immagini ottimizzate (con collezioni)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.join(__dirname, '../public/assets-optimized')
const MANIFEST_PATH = path.join(__dirname, '../src/data/manifest.json')
const CATEGORIES = ['design', 'styling']

function getCollections(category) {
    const categoryPath = path.join(ASSETS_DIR, category)

    if (!fs.existsSync(categoryPath)) {
        console.log(`⚠️  Cartella non trovata: ${category}`)
        return { collections: [], sphereImages: [] }
    }

    const items = fs.readdirSync(categoryPath, { withFileTypes: true })
    const subdirs = items.filter(item => item.isDirectory())

    const collections = []
    let sphereImages = []

    for (const subdir of subdirs) {
        const collectionName = subdir.name
        const thumbPath = path.join(categoryPath, collectionName, 'thumb')
        const fullPath = path.join(categoryPath, collectionName, 'full')

        if (!fs.existsSync(thumbPath)) continue

        const thumbFiles = fs.readdirSync(thumbPath)
            .filter(f => f.endsWith('.webp'))
            .sort()

        const fullFiles = fs.existsSync(fullPath)
            ? fs.readdirSync(fullPath).filter(f => f.endsWith('.webp')).sort()
            : thumbFiles

        if (thumbFiles.length === 0) continue

        // Check for custom description in source directory
        const sourceDescPath = path.join(__dirname, '../public/assets', category, collectionName, 'description.txt')
        let description = `${collectionName} - ${thumbFiles.length} images`

        if (fs.existsSync(sourceDescPath)) {
            try {
                description = fs.readFileSync(sourceDescPath, 'utf-8').trim()
                console.log(`      📝 Descrizione caricata da file per ${collectionName}`)
            } catch (err) {
                console.error(`      ⚠️ Errore lettura descrizione per ${collectionName}:`, err.message)
            }
        }

        // Aggiungi collezione
        collections.push({
            id: `${category}-${collectionName.toLowerCase().replace(/\s+/g, '-')}`,
            title: collectionName,
            year: '2024',
            brand: category === 'design' ? 'Fashion Design' : 'Styling',
            description: description,
            images: fullFiles.map(f => `/assets-optimized/${category}/${collectionName}/full/${f}`)
        })

        // Aggiungi a sphereImages
        thumbFiles.forEach((file, index) => {
            sphereImages.push({
                id: `${category}-${collectionName}-${index + 1}`,
                image: `/assets-optimized/${category}/${collectionName}/thumb/${file}`,
                fullImage: `/assets-optimized/${category}/${collectionName}/full/${file}`,
                category: category,
                collection: collectionName
            })
        })

        console.log(`   📁 ${collectionName}: ${thumbFiles.length} immagini`)
    }

    return { collections, sphereImages }
}

function generateManifest() {
    console.log('\n🔄 Generando manifest.json (collezioni)...\n')

    const designData = getCollections('design')
    const stylingData = getCollections('styling')

    const manifest = {
        design: {
            title: "Fashion Design",
            collections: designData.collections.length > 0
                ? designData.collections
                : [{ id: 'design-empty', title: 'Fashion Design', year: '2024', brand: 'Portfolio', description: 'No collections', images: [] }]
        },
        styling: {
            title: "Styling",
            collections: stylingData.collections.length > 0
                ? stylingData.collections
                : [{ id: 'styling-empty', title: 'Styling', year: '2024', brand: 'Portfolio', description: 'No collections', images: [] }]
        },
        sphereImages: [...designData.sphereImages, ...stylingData.sphereImages]
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))

    console.log(`\n✅ Manifest generato!`)
    console.log(`   📊 Sfera: ${manifest.sphereImages.length} immagini`)
    console.log(`   🎨 Design: ${designData.collections.length} collezioni`)
    console.log(`   👗 Styling: ${stylingData.collections.length} collezioni`)
    console.log(`   📄 Output: ${MANIFEST_PATH}\n`)
}

generateManifest()
