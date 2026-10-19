# Archivio

Materiale della vecchia gestione statica delle immagini, prima che Supabase
diventasse l'unica fonte delle collezioni. Non è usato dal sito e non viene
pubblicato (sta fuori da `public/`), ma è conservato qui per sicurezza.

- `design/` — disegni originali (JPG/PNG)
- `assets-optimized/` — vecchie copie WebP (full + thumb) generate da
  `scripts/optimize-images.js`

Gli script in `scripts/` (generate-manifest, optimize-images,
migrate-images-to-supabase) puntano ancora ai vecchi percorsi in `public/`:
se servissero di nuovo, vanno aggiornati a `archive/`.
