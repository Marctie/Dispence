# Chatlog — Dispensina Digitale

## Sessione 2026-08-25

- Analizzato lo stato del progetto esistente (era "Dispensa Alimentare"): nessuna cartella Android nativa, nessun repository git, funzionalità core parzialmente implementate (prodotti, categorie predefinite, lista spesa, tema chiaro/scuro), notifiche di scadenza solo come toggle UI senza logica reale, scansione barcode/backup-export/splash screen/guida in-app/dati demo completamente assenti.
- Trovati e rimossi riferimenti personali nel codice: nome e link personali dell'autore in `settings.page.html` e `app-footer.component.html`, più `author`/`homepage` in `package.json`.
- Decisioni utente:
  - Nome definitivo app: **Dispensina Digitale** (era "Dispensa Alimentare"). Nuovo appId: `com.dispensinadigitale.app`.
  - Repo di lavoro: `Marctie/Dispence` (privato, confermato dall'utente).
  - Repo pubblico dedicato alla privacy policy (GitHub Pages): `Marctie/DispenceAi-privacy`.
  - Autore commit: `Dispensina Digitale <marco.p.develop@gmail.com>` (email dedicata, non quella personale).
- Inizializzato git in locale, remote `origin` collegato a `Marctie/Dispence`, `.gitignore` creato (esclude keystore/firma, `android/build`, `node_modules`, `www`, secrets).
- Aggiornati package.json, ionic.config.json, capacitor.config.ts con il nuovo branding.
- Creati `docs/STATO_PUBBLICAZIONE.md` e questo `docs/CHATLOG.md` per tracciare il lavoro.
- Implementate le funzionalità core mancanti: categorie personalizzate (`CategoryService` + pagina `/manage-categories`), backup/export JSON con checksum SHA-256 e backup automatico silenzioso all'avvio (`BackupService`), scanner barcode con ML Kit on-device e cache locale + arricchimento opzionale via Open Food Facts (`BarcodeService`), notifiche di scadenza locali reali (`NotificationService`, sostituisce il toggle inerte), dati demo distinguibili e rimovibili con backup di sicurezza (`DemoDataService`), filtri per categoria/scadenza in Dispensa, prezzo opzionale prodotto e statistiche di spreco economico/prodotti più ricomprati, pagina Guida/FAQ, splash screen nativa collegata al ciclo di avvio.
- Aggiunti test unitari Jasmine per `CategoryService` e `BackupService` (validazione checksum, rifiuto di categorie predefinite modificate, ripristino da backup manomesso) — tutti i 11 test passano su Chrome Headless.
- Creato il progetto Android nativo (`npx cap add android`) e dichiarati i permessi camera/notifiche in `AndroidManifest.xml`.
- **Problema riscontrato**: la macchina ha solo JDK 25 installato, incompatibile con Gradle/Android Gradle Plugin (`Unsupported class file major version 69`). Avviata installazione di Eclipse Temurin JDK 21 via winget, da usare solo per le build Android senza toccare il JDK 25 di sistema.
- Scritta e pubblicata la privacy policy IT/EN come pagine statiche su `Marctie/DispenceAi-privacy` (push su branch `main` completato). GitHub Pages non risultava ancora attivo per il repo al momento della verifica (richiede abilitazione manuale una tantum nelle impostazioni del repository).
- Creato `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` con testi scheda store (nome, descrizione breve/estesa, categoria, parole chiave), risposte al questionario content rating e al Data Safety form, tabella permessi/motivazioni, checklist pre-pubblicazione.
