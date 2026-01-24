# Guida alla Gestione dei Contenuti

Questa guida spiega come modificare i contenuti del portfolio senza toccare il codice.

---

## 📁 File di Configurazione

### 1. Collezioni Immagini (`manifest.json`)
**Percorso:** `src/data/manifest.json`

Questo file viene **generato automaticamente** dallo script. Per aggiungere nuove immagini:

1. Aggiungi le immagini nella cartella appropriata:
   - `public/assets-optimized/design/[NomeCollezione]/` per Fashion Design
   - `public/assets-optimized/styling/[NomeCollezione]/` per Styling

2. Esegui: `npm run generate-manifest-optimized`

---

### 2. Descrizioni Testuali (`content.json`)
**Percorso:** `src/data/content.json`

Modifica manualmente per aggiornare:
- Bio nella sezione About
- Contatti (email, Instagram, LinkedIn)
- Descrizioni delle collezioni

**Esempio - Aggiungere una nuova collezione:**
```json
"collections": {
    "nome-collezione": {
        "description": "La tua descrizione qui..."
    }
}
```

---

### 3. Traduzioni (`translations.js`)
**Percorso:** `src/data/translations.js`

Contiene le traduzioni dell'interfaccia in 5 lingue:
- Italiano (it)
- Inglese (en)
- Francese (fr)
- Spagnolo (es)
- Giapponese (ja)

---

### 4. Video Fashion Film
**Percorso:** `src/components/FashionFilmPage.jsx`

Per aggiungere un nuovo video, modifica l'array `videos` all'inizio del file:

```javascript
const videos = [
    {
        id: 'id-univoco',
        title: 'Titolo Video',
        description: 'Descrizione breve.',
        src: '/assets/videos/nome-file.mp4',
    },
    // ... altri video
]
```

**⚠️ Importante:** I video devono pesare meno di 100MB per Vercel.

---

## 🚀 Deploy

Dopo aver modificato i contenuti:

```bash
git add -A
git commit -m "Aggiornamento contenuti"
git push origin main
```

Vercel farà automaticamente il deploy.
