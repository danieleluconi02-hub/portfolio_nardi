/**
 * migrate-images-to-supabase.js
 *
 * Uploads all local /assets-optimized/ images to Supabase Storage
 * and updates each collection's image_urls / thumb_urls in the database.
 *
 * Usage:  node scripts/migrate-images-to-supabase.js
 * Resume: safe to re-run — skips files that are already uploaded.
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ASSETS_DIR = path.join(ROOT, 'public', 'assets-optimized')

const SUPABASE_HOST = 'fgqedqcpodcmoexgfwwk.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncWVkcWNwb2RjbW9leGdmd3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NDgzNywiZXhwIjoyMDg5NTcwODM3fQ.1FPT-JS9kgmemBTbNCh1pAzjQvTls3bdBNjqcBxYzSU'
const BUCKET = 'portfolio-assets'
const CONCURRENCY = 4 // parallel uploads

// ─── HTTP helpers ──────────────────────────────────────────────────────────

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = https.request({
      hostname: SUPABASE_HOST,
      path,
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function uploadFile(storagePath, fileBuffer) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SUPABASE_HOST,
      path: `/storage/v1/object/${BUCKET}/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'image/webp',
        'Content-Length': fileBuffer.length,
        'x-upsert': 'false', // skip if exists
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.write(fileBuffer)
    req.end()
  })
}

function publicUrl(storagePath) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `https://${SUPABASE_HOST}/storage/v1/object/public/${BUCKET}/${encoded}`
}

// ─── Concurrency pool ──────────────────────────────────────────────────────

async function runPool(tasks, concurrency) {
  const results = []
  const queue = [...tasks]
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const task = queue.shift()
      results.push(await task())
    }
  })
  await Promise.all(workers)
  return results
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Load manifest
  const manifestPath = path.join(ROOT, 'src', 'data', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  let totalFiles = 0
  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const [category, catData] of Object.entries(manifest)) {
    if (!catData.collections) continue

    for (const col of catData.collections) {
      console.log(`\n📁 ${category}/${col.id} (${col.images.length} images)`)

      const newFullUrls = []
      const newThumbUrls = []

      // Build upload tasks for this collection
      const tasks = col.images.map((imgUrl) => async () => {
        // Local path: /assets-optimized/design/Fw2026/full/img.webp
        const localFull = path.join(ROOT, 'public', imgUrl)
        const localThumb = path.join(ROOT, 'public', imgUrl.replace('/full/', '/thumb/'))
        const filename = path.basename(imgUrl)

        // Storage paths
        const storageFull = `${category}/${col.id}/full/${filename}`
        const storageThumb = `${category}/${col.id}/thumb/${filename}`

        let fullUrl = publicUrl(storageFull)
        let thumbUrl = publicUrl(storageThumb)

        totalFiles++

        // Upload full image
        if (fs.existsSync(localFull)) {
          const buf = fs.readFileSync(localFull)
          const res = await uploadFile(storageFull, buf)
          if (res.status === 200 || res.status === 201) {
            process.stdout.write('.')
            uploaded++
          } else if (res.status === 400 && res.body.includes('already exists')) {
            process.stdout.write('·')
            skipped++
          } else {
            process.stdout.write('✗')
            errors++
          }
        }

        // Upload thumb if it exists
        if (fs.existsSync(localThumb)) {
          const buf = fs.readFileSync(localThumb)
          await uploadFile(storageThumb, buf)
        } else {
          // No thumb on disk — thumb URL same as full
          thumbUrl = fullUrl
        }

        return { fullUrl, thumbUrl }
      })

      const results = await runPool(tasks, CONCURRENCY)
      results.forEach(r => {
        if (r) {
          newFullUrls.push(r.fullUrl)
          newThumbUrls.push(r.thumbUrl)
        }
      })

      // Update DB record with Supabase URLs
      if (newFullUrls.length) {
        const res = await apiRequest(
          'PATCH',
          `/rest/v1/collections?slug=eq.${encodeURIComponent(col.id)}`,
          { image_urls: newFullUrls, thumb_urls: newThumbUrls }
        )
        if (res.status < 300) {
          console.log(`\n  ✅ DB updated — ${newFullUrls.length} URLs`)
        } else {
          console.log(`\n  ⚠ DB update failed: ${res.status} ${res.body.slice(0, 80)}`)
        }
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Total files:  ${totalFiles}`)
  console.log(`Uploaded:     ${uploaded}`)
  console.log(`Skipped:      ${skipped} (already in Storage)`)
  console.log(`Errors:       ${errors}`)
  console.log('Migration complete ✅')
}

main().catch(e => { console.error(e); process.exit(1) })
