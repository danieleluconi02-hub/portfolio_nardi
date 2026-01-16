# 📘 Manuale di Gestione Autonoma del Portfolio

Questo documento è il tuo libretto di istruzioni per gestire, aggiornare e modificare il tuo sito web in totale autonomia.

## 🛠️ 1. Accendere i Motori (Avvio Locale)
Prima di fare qualsiasi modifica, devi avviare il sito sul tuo computer per vedere quello che stai facendo.

1.  Apri il terminale (o la console di VS Code).
2.  Assicurati di essere nella cartella del progetto.
3.  Digita:
    ```bash
    npm run dev
    ```
4.  Vedrai comparire un link (solitamente `http://localhost:5173`). Cliccaci tenendo premuto `Ctrl` (o `Cmd` su Mac) per aprire il sito nel browser.
5.  Ora il sito è "vivo" sul tuo computer. Ogni modifica che farai ai file verrà subito mostrata nel browser.

---

## 📝 2. Come Modificare i Contenuti

### Testi e Descrizioni
La maggior parte dei testi si trova nei "Componenti".
*   Vai nella cartella `src/components`.
*   Apri file come `FashionFilmPage.jsx`, `LandingMenu.jsx`, o `AboutPage.jsx` (se presente).
*   Cerca il testo che vuoi cambiare (è quello bianco, circondato da virgolette o tag HTML) e modificalo. Salva il file (`Ctrl+S`) e guarda il browser aggiornarsi.

### Gestione Collezioni e Immagini (Importante!)
Il tuo sito usa un sistema intelligente per le immagini. Non basta trascinarle nella cartella, bisogna "ottimizzarle" per mantenere il sito veloce.

**Per aggiungere una nuova collezione o immagini:**

1.  **Metti le foto originali**: Vai nella cartella `public/assets`. Crea una sottocartella (es. `NuovaCollezione`) e mettici dentro le tue foto (meglio se `.jpg` o `.png`).
2.  **Ottimizza**: Apri un **nuovo** terminale (lascia quello di `npm run dev` aperto se vuoi, o usane un altro) e lancia:
    ```bash
    npm run optimize-images
    ```
    Questo script creerà automaticamente le versioni "leggere" delle tue foto nella cartella `optimized`.
3.  **Aggiorna il manifest**: Per dire al sito che ci sono nuove foto, lancia:
    ```bash
    npm run generate-manifest-optimized
    ```
    *(Nota: spesso lo script di ottimizzazione fa questo passaggio da solo, ma nel dubbio lancialo).*

---

## 🚀 3. Pubblicare le Modifiche (Andare Online)
Hai fatto le modifiche e in locale (`localhost`) è tutto perfetto. Ora vuoi che il mondo lo veda.

Devi inviare le modifiche a GitHub. Vercel le prenderà da lì automaticamente.

Esegui questi 3 comandi in sequenza nel terminale:

1.  **Aggiungi tutto alla "scatola" di spedizione:**
    ```bash
    git add .
    ```
2.  **Chiudi la scatola e metti un'etichetta (descrivi cosa hai fatto):**
    ```bash
    git commit -m "Descrizione delle modifiche (es. aggiornato testo about)"
    ```
3.  **Spedisci il pacco:**
    ```bash
    git push
    ```

Appena `git push` finisce senza errori, Vercel inizierà a lavorare. Aspetta 1-2 minuti e il tuo sito online (il dominio vero) sarà aggiornato.

---

## ⚠️ Risoluzione Problemi Comuni

*   **Errore "UnauthorizedAccess"**: Se PowerShell ti blocca i comandi, prova a scrivere `cmd` nel terminale per passare al prompt dei comandi classico, oppure regola i permessi (ma di solito `npm run ...` funziona).
*   **Le immagini non si vedono**: Hai lanciato `npm run generate-manifest-optimized`? Il file `manifest.json` deve contenere i percorsi delle nuove immagini.
*   **Il sito online è vecchio**: Sei sicuro di aver fatto `git push`? Controlla anche sulla dashboard di Vercel se ci sono errori di "Build".
