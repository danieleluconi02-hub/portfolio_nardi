/**
 * SCRIPT: Genera manifest.json automaticamente dalle immagini
 * 
 * USO:
 * 1. Metti le tue immagini in:
 *    - public/assets/design/   (per Fashion Design)
 *    - public/assets/styling/  (per Styling)
 * 
 * 2. Esegui: node scripts/generate-manifest.js
 * 
 * 3. Il file src/data/manifest.json verrà aggiornato automaticamente
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSETS_DIR = path.join(__dirname, '../public/assets')
const MANIFEST_PATH = path.join(__dirname, '../src/data/manifest.json')

// Estensioni immagini supportate
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function getImagesFromDir(dirPath, category) {
    const fullPath = path.join(ASSETS_DIR, dirPath)

    if (!fs.existsSync(fullPath)) {
        console.log(`📁 Creando cartella: ${fullPath}`)
        fs.mkdirSync(fullPath, { recursive: true })
        return []
    }

    const files = fs.readdirSync(fullPath)
    const images = files
        .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
        .sort() // Ordina alfabeticamente
        .map((file, index) => ({
            id: `${category}-${index + 1}`,
            image: `/assets/${dirPath}/${file}`,
            category: category
        }))

    console.log(`📷 Trovate ${images.length} immagini in ${dirPath}/`)
    return images
}

function generateManifest() {
    console.log('\n🔄 Generando manifest.json...\n')

    const designImages = getImagesFromDir('design', 'design')
    const stylingImages = getImagesFromDir('styling', 'styling')

    // Crea le collezioni basate sulle sottocartelle o raggruppando per prefisso
    const designCollections = groupIntoCollections(designImages, 'design')
    const stylingCollections = groupIntoCollections(stylingImages, 'styling')

    const manifest = {
        design: {
            title: "Fashion Design",
            collections: designCollections
        },
        styling: {
            title: "Styling",
            collections: stylingCollections
        },
        sphereImages: [...designImages, ...stylingImages]
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))

    console.log(`\n✅ Manifest generato con successo!`)
    console.log(`   📊 Totale immagini: ${manifest.sphereImages.length}`)
    console.log(`   🎨 Design: ${designImages.length}`)
    console.log(`   👗 Styling: ${stylingImages.length}`)
    console.log(`   📄 File: ${MANIFEST_PATH}\n`)
}

function groupIntoCollections(images, category) {
    if (images.length === 0) {
        return [{
            id: `${category}-placeholder`,
            title: category === 'design' ? 'Design Collection' : 'Styling Works',
            year: '2024',
            brand: 'Portfolio',
            description: 'Add your images to see them here.',
            images: []
        }]
    }

    // Raggruppa per prefisso del nome file (es. "collection1_01.jpg" → "collection1")
    const groups = {}

    images.forEach(img => {
        const filename = path.basename(img.image)
        // Cerca un pattern tipo "nome_numero" o "nome-numero"
        const match = filename.match(/^([a-zA-Z0-9]+)[_-]/)
        const groupName = match ? match[1] : 'main'

        if (!groups[groupName]) {
            groups[groupName] = []
        }
        groups[groupName].push(img.image)
    })

    // Converti in array di collezioni
    return Object.entries(groups).map(([name, imageList], index) => ({
        id: `${category}-${index + 1}`,
        title: name.charAt(0).toUpperCase() + name.slice(1),
        year: '2024',
        brand: category === 'design' ? 'Design Studio' : 'Editorial',
        description: `Collection containing ${imageList.length} images.`,
        images: imageList
    }))
}

// Esegui
generateManifest()
