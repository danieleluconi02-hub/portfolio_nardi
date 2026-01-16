# 🚀 Guida alla Pubblicazione del Sito

Il tuo sito è costruito con **React e Vite**. Ecco come portarlo online con il tuo dominio personale.

## Scegli il metodo

### METODO 1: Il più Semplice (Drag & Drop)
Ideale se vuoi andare online subito senza configurare account complessi.

1. **Assicurati di aver fatto la build**
   - Apri il terminale nella cartella del progetto.
   - Esegui: `npm run build`
   - Attendi che finisca. Si creerà una cartella chiamata `dist`.

2. **Carica su Netlify**
   - Vai su [Netlify Drop](https://app.netlify.com/drop).
   - Prendi la cartella `dist` dal tuo computer e trascinala nel box tratteggiato nel browser.
   - Il sito sarà online in pochi secondi con un link temporaneo.

3. **Collega il Dominio**
   - Clicca su "Set up a custom domain".
   - Inserisci il tuo dominio (es. `mariorossi.com`).
   - Segui le istruzioni per configurare i DNS (dovrai andare dove hai comprato il dominio e inserire i record che ti dice Netlify).

---

### METODO 2: Il più Professionale (Vercel + GitHub)
Consigliato perché il sito si aggiorna automaticamente ogni volta che salvi modifiche, ed è molto veloce.

1. **Crea un account GitHub** (se non ce l'hai) e carica questo progetto in un nuovo repository.

2. **Registrati su Vercel.com**
   - Usa il tuo account GitHub per accedere.

3. **Importa il progetto**
   - Nella dashboard di Vercel, clicca **"Add New..."** -> **"Project"**.
   - Seleziona il repository del tuo portfolio.
   - Clicca **"Deploy"**. Non devi cambiare nessuna impostazione (Vercel riconosce che è Vite).

4. **Collega il Dominio**
   - Una volta online, vai nella dashboard del progetto su Vercel.
   - Clicca su **Settings** -> **Domains**.
   - Inserisci il tuo dominio personale.
   - Vercel ti darà dei valori (Record A o CNAME) da copiare e incollare nel pannello di controllo di dove hai comprato il dominio (es. GoDaddy, Aruba, Namecheap).

---

## 💡 Consigli Importanti

- **SEO**: Controlla di aver messo un buon titolo e descrizione in `index.html`.
- **Favicon**: Assicurati che l'iconcina del sito sia quella che vuoi.
- **Immagini**: Se hai aggiunto molte immagini pesanti, il primo caricamento potrebbe essere lento. Assicurati di aver lanciato `node scripts/optimize-images.js` prima della build.
