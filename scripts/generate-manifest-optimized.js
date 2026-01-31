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
        return { collections: [], sphereImages: [] }
    }

    // 1. First Pass: Identify Main Collections (exclude 'Disegni')
    const items = fs.readdirSync(categoryPath, { withFileTypes: true })
    const mainFolders = items.filter(d => d.isDirectory() && d.name !== 'Disegni')

    // Map to store collections for easy merging: { "Folder Name": CollectionObj }
    const collectionsMap = {}
    const sphereImages = []

    // Helper: Process a folder and add to collection
    const processFolder = (dirName, relativePath, targetCollectionName = null) => {
        const fullPath = path.join(ASSETS_DIR, category, relativePath)
        const thumbPath = path.join(fullPath, 'thumb')
        const fullPathDir = path.join(fullPath, 'full')

        if (!fs.existsSync(thumbPath)) return

        const thumbFiles = fs.readdirSync(thumbPath).filter(f => f.endsWith('.webp')).sort()
        const fullFiles = fs.existsSync(fullPathDir)
            ? fs.readdirSync(fullPathDir).filter(f => f.endsWith('.webp')).sort()
            : thumbFiles

        if (thumbFiles.length === 0) return

        // Determine which collection object to attach to
        const nameToUse = targetCollectionName || dirName

        // If collection doesn't exist yet, create it (Standard Collection)
        if (!collectionsMap[nameToUse]) {
            const title = nameToUse
            const id = `${category}-${title.toLowerCase().replace(/\s+/g, '-')}`

            // Try load description
            let description = `${title} - ${thumbFiles.length} images`
            const descPath = path.join(__dirname, '../public/assets', category, relativePath, 'description.txt')
            if (fs.existsSync(descPath)) {
                try { description = fs.readFileSync(descPath, 'utf-8').trim() } catch (e) { }
            }

            collectionsMap[nameToUse] = {
                id,
                title,
                year: '2024',
                brand: category === 'design' ? 'Fashion Design' : 'Styling',
                description,
                images: []
            }
        }

        // Add Images to Collection
        const collection = collectionsMap[nameToUse]
        const newImages = fullFiles.map(f => `/assets-optimized/${category}/${relativePath.replace(/\\/g, '/')}/full/${f}`)
        collection.images.push(...newImages)

        // Add to Global Sphere Images
        thumbFiles.forEach((file, index) => {
            // Unique ID: collection-subpath-index
            const uniqueSubId = relativePath.replace(/[\\/]/g, '-')
            sphereImages.push({
                id: `${category}-${uniqueSubId}-${index}`,
                image: `/assets-optimized/${category}/${relativePath.replace(/\\/g, '/')}/thumb/${file}`,
                fullImage: `/assets-optimized/${category}/${relativePath.replace(/\\/g, '/')}/full/${file}`,
                category: category,
                collection: collection.title
            })
        })

        console.log(`   Processed ${relativePath} -> Merged into "${collection.title}" (${newImages.length} images)`)
    }

    // Step 1: Process Main Collections
    mainFolders.forEach(folder => {
        processFolder(folder.name, folder.name)
    })

    // Step 2: Process "Disegni" (Drawings)
    // Look for public/assets-optimized/design/Disegni/[CollectionName]
    const disegniPath = path.join(categoryPath, 'Disegni')
    if (fs.existsSync(disegniPath)) {
        const disegniItems = fs.readdirSync(disegniPath, { withFileTypes: true })
        const drawingFolders = disegniItems.filter(d => d.isDirectory())

        drawingFolders.forEach(folder => {
            const collectionName = folder.name // e.g., "GreenHeart"

            // Check if we have a main collection with this name
            if (collectionsMap[collectionName]) {
                // Merge these drawings into the main collection
                processFolder(collectionName, `Disegni/${collectionName}`, collectionName)
            } else {
                console.log(`   ⚠️ Orphan Drawing Folder: "Disegni/${collectionName}" (No matching main collection found)`)
                // Optional: Create standalone? User implied they belong to collections. 
                // We will create it as a standalone if missing.
                processFolder(collectionName, `Disegni/${collectionName}`)
            }
        })
    }

    return {
        collections: Object.values(collectionsMap),
        sphereImages
    }
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
