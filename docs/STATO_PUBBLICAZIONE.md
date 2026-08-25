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
- [ ] Icone app/launcher Android e splash ancora placeholder di default Capacitor: da rigenerare dal logo esistente (`src/assets/icon/icon-512.svg`, già originale/a tema dispensa) con `@capacitor/assets`
- [ ] Test manuali approfonditi di scanner barcode + notifiche su emulatore reale

## Problemi noti
- **JDK di sistema incompatibile**: la macchina ha solo JDK 25 installato, non supportato da Gradle/AGP per la build Android (`Unsupported class file major version 69`). Installazione di Temurin JDK 21 in corso via winget (dedicato solo alle build Android, JDK 25 lasciato intatto per il resto).

## Da fare — pubblicazione
- [ ] Generare keystore, configurare signingConfig, build firmata (`bundleRelease`), verifica firma con apksigner/openssl
- [ ] Test su emulatore Android reale (screenshot via adb), in particolare barcode scanner e notifiche locali
- [ ] Privacy policy IT+EN pubblicata su `Marctie/DispenceAi-privacy` via GitHub Pages
- [ ] Data Safety form e content rating per Play Console
- [ ] `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` con testi scheda store pronti

## Backlog (richieste future, non prioritarie ora)
_(vuoto per ora)_

## Note tecniche
- Plugin Capacitor installati ma mai usati nel codice (dead config): `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar` — da valutare se rimuovere o effettivamente utilizzare.
- Nessun `server` remoto in capacitor.config.ts — corretto, punta a `www/` locale.
- Stato gestito con servizi Angular + RxJS BehaviorSubject + localStorage (no NgRx, no Signals).
