# Stato pubblicazione — Dispensina Digitale

Ultimo aggiornamento: 2026-08-25

## Riepilogo
App Ionic/Angular + Capacitor per la gestione della dispensa domestica. Ribattezzata da "Dispensa Alimentare" a "Dispensina Digitale". Segue lo stesso processo/qualità del progetto FinanzAI verso la pubblicazione su Play Store.

## Fatto
- [x] Audit completo del codice esistente
- [x] Rebranding: nome app, appId (`com.dispensinadigitale.app`), package.json, ionic.config.json, capacitor.config.ts
- [x] Rimossi tutti i riferimenti personali (nome, link personali) da settings e footer
- [x] Repository git inizializzato, remote privato `Marctie/Dispence`, .gitignore configurato (esclude keystore, android/build, node_modules, www)
- [x] Repo pubblico dedicato per privacy policy: `Marctie/DispenceAi-privacy` (GitHub Pages)

## Fatto (continua)
- [x] Categorie personalizzate (create/modifica/elimina) tramite `CategoryService` + pagina `/manage-categories`
- [x] Scansione codici a barre: `@capacitor-mlkit/barcode-scanning` (Google ML Kit on-device, no Firebase) + cache locale (`BarcodeCacheService`) + arricchimento opzionale via Open Food Facts solo se online, fallback manuale sempre disponibile
- [x] Notifiche di scadenza locali reali: `@capacitor/local-notifications`, ripianificate reattivamente a ogni modifica prodotti/preferenze
- [x] Filtri in Dispensa: posizione, categoria, stato scadenza (in scadenza/scaduti), testo libero
- [x] Backup/export JSON con checksum SHA-256 (`BackupService`) + backup automatico silenzioso a ogni avvio + ripristino da file o da backup interno
- [x] Dati demo (`DemoDataService`): seed al primo avvio se dispensa vuota, badge "Esempio" in UI, rimozione con backup di sicurezza automatico prima
- [x] Splash screen nativa configurata in `capacitor.config.ts` e collegata al ciclo di avvio (`SplashScreen.hide()` dopo init)
- [x] Guida in-app / FAQ (`/help`, linkata da Impostazioni)
- [x] Prezzo opzionale prodotto + statistiche: valore stimato sprecato, prodotti più ricomprati
- [x] Progetto nativo Android creato (`npx cap add android`), permessi camera/notifiche in AndroidManifest

## Da fare — funzionalità core
- [x] Icone app/launcher Android e splash rigenerate dal logo esistente (`resources/*.svg`, tema dispensa originale) con `@capacitor/assets` — completato
- [ ] Test manuali approfonditi di scanner barcode + notifiche su emulatore reale (bloccato: serve una build compilabile, vedi problema JDK sotto)

## Problemi noti
- **JDK di sistema incompatibile**: la macchina ha solo JDK 25 installato, non supportato da Gradle/AGP per la build Android (`Unsupported class file major version 69`). L'installazione di Temurin JDK 21 via winget fallisce ripetutamente con errore Windows Installer 1618 ("un'altra installazione è già in corso") — mutex di sistema bloccato, probabilmente da un Windows Update pendente. **Serve un riavvio del PC** da parte dell'utente prima di ritentare l'installazione JDK 21. Nessun'altra azione è possibile lato codice finché questo non si sblocca: build Android, keystore/firma e test su emulatore sono tutti in attesa di questo.

## Da fare — pubblicazione
- [ ] (bloccato da JDK) Generare keystore, configurare signingConfig, build firmata (`bundleRelease`), verifica firma con apksigner/openssl
- [ ] (bloccato da JDK) Test su emulatore Android reale (screenshot via adb), in particolare barcode scanner e notifiche locali
- [x] Privacy policy IT+EN scritta e pubblicata (push) su `Marctie/DispenceAi-privacy` — **manca ancora l'abilitazione manuale di GitHub Pages nelle impostazioni del repository** (Settings → Pages → Source: main branch), operazione che l'utente deve fare perché richiede accesso non disponibile via API senza token
- [x] Data Safety form e content rating: risposte pronte in `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md`
- [x] `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` con testi scheda store pronti (nome, descrizioni, categoria, permessi, checklist)

## Backlog (richieste future, non prioritarie ora)
_(vuoto per ora)_

## Note tecniche
- Plugin Capacitor installati ma mai usati nel codice (dead config): `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar` — da valutare se rimuovere o effettivamente utilizzare.
- Nessun `server` remoto in capacitor.config.ts — corretto, punta a `www/` locale.
- Stato gestito con servizi Angular + RxJS BehaviorSubject + localStorage (no NgRx, no Signals).
