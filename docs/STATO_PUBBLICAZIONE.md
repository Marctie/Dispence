# Stato pubblicazione — Dispensina Digitale

Ultimo aggiornamento: 2026-08-25

## Riepilogo
App Ionic/Angular + Capacitor per la gestione della dispensa domestica. Ribattezzata da "Dispensa Alimentare" a "Dispensina Digitale". Segue lo stesso processo/qualità del progetto FinanzAI verso la pubblicazione su Play Store.

## Fatto
- [x] Audit completo del codice esistente
- [x] Rebranding: nome app, appId (`com.dispensinadigitale.app`), package.json, ionic.config.json, capacitor.config.ts, manifest, index.html
- [x] Rimossi tutti i riferimenti personali (nome, link personali) da settings, footer, package.json
- [x] Repository git inizializzato, remote privato `Marctie/Dispence`, .gitignore configurato (esclude keystore, credenziali, android/build, node_modules, www)
- [x] Repo pubblico dedicato per privacy policy: `Marctie/DispenceAi-privacy`
- [x] Categorie personalizzate (create/modifica/elimina) tramite `CategoryService` + pagina `/manage-categories`
- [x] Scansione codici a barre: `@capacitor-mlkit/barcode-scanning` (Google ML Kit on-device, no Firebase) + cache locale (`BarcodeCacheService`) + arricchimento opzionale via Open Food Facts solo se online, fallback manuale sempre disponibile
- [x] Notifiche di scadenza locali reali: `@capacitor/local-notifications`, ripianificate reattivamente a ogni modifica prodotti/preferenze; canale "expiry-alerts" creato all'avvio (verificato via log di sistema su emulatore)
- [x] Filtri in Dispensa: posizione, categoria, stato scadenza (in scadenza/scaduti), testo libero
- [x] Backup/export JSON con checksum SHA-256 (`BackupService`) + backup automatico silenzioso a ogni avvio + ripristino da file o da backup interno
- [x] Dati demo (`DemoDataService`): seed al primo avvio se dispensa vuota, badge "Esempio" in UI, rimozione con backup di sicurezza automatico prima
- [x] Splash screen nativa configurata e collegata al ciclo di avvio, verificata visivamente su emulatore
- [x] Guida in-app / FAQ (`/help`, linkata da Impostazioni)
- [x] Prezzo opzionale prodotto + statistiche: valore stimato sprecato, prodotti più ricomprati
- [x] Progetto nativo Android creato, permessi camera/notifiche in AndroidManifest
- [x] Icone app/launcher Android e splash rigenerate dal logo esistente (originale, tema dispensa) con `@capacitor/assets`
- [x] Gestione robusta degli errori in `app.component.ts` (avvio e completamento onboarding non bloccano più la UI in caso di eccezione in un side-effect come backup automatico o seed dati demo)
- [x] Test unitari (Jasmine/Karma): 11/11 verdi — `CategoryService` (categorie predefinite protette, categorie custom CRUD, persistenza), `BackupService` (checksum valido, rifiuto backup manomesso, ripristino corretto)
- [x] **JDK 21 portable** installato in locale (bypassando un blocco di Windows Installer) senza toccare il JDK 25 di sistema — usato solo per le build Android
- [x] **Keystore di firma generato** con `keytool` (RSA 2048, validità 10000 giorni), password casuali sicure salvate solo in `keystore-privato/` (escluso da git)
- [x] `signingConfig` esplicito in `android/app/build.gradle`, credenziali lette da `android/keystore.properties` (escluso da git)
- [x] **Build `bundleRelease` (.aab) e `assembleRelease` (.apk) generate e firmate** con successo
- [x] **Firma verificata**: impronta SHA-256 del certificato nel `.aab`/`.apk` confrontata byte-per-byte con quella del keystore tramite `keytool`, `jarsigner` e `apksigner` — tutte coincidenti
- [x] App installata e testata su emulatore Android reale: avvio, splash screen, home, onboarding renderizzano correttamente; screenshot catturati via `adb exec-out screencap` (non da browser)
- [x] Rimosso blocco Firebase morto (try/catch `google-services.json`) da `build.gradle`, mai referenziato altrove — coerente col requisito "no Firebase"

## Da fare — funzionalità core
- [ ] Test interattivo completo di scanner barcode e flusso notifiche end-to-end: l'automazione dei tap via ADB si è rivelata inaffidabile su questo emulatore (tap che non vengono consegnati in modo intermittente, verificato anche su schermate di sistema non legate all'app) — non è stato possibile completare in automatico il click-through dell'onboarding e delle altre schermate. **Consigliato un test manuale rapido da parte dell'utente**, toccando fisicamente lo schermo dell'emulatore o di un device reale, specialmente per: permesso fotocamera + scansione barcode, permesso notifiche + ricezione notifica di scadenza.

## Da fare — pubblicazione
- [ ] Screenshot store definitivi (dopo il test manuale sopra, con dati reali in dispensa per mostrare le funzionalità)
- [ ] Privacy policy IT+EN: pushata su `Marctie/DispenceAi-privacy`, **manca l'abilitazione manuale di GitHub Pages** nelle impostazioni del repository (Settings → Pages → Source: main branch) — richiede accesso non disponibile via API
- [x] Data Safety form e content rating: risposte pronte in `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md`
- [x] `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` con testi scheda store pronti (nome, descrizioni, categoria, permessi, checklist)
- [ ] Creazione app su Google Play Console, upload `.aab`, compilazione schede (segue guida passo passo)

## Backlog (richieste future, non prioritarie ora)
_(vuoto per ora)_

## Note tecniche
- Plugin Capacitor morti rimossi dal progetto originale: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar` (installati ma mai usati nel codice).
- Nessun `server` remoto in capacitor.config.ts — corretto, punta a `www/` locale.
- Stato gestito con servizi Angular + RxJS BehaviorSubject + localStorage (no NgRx, no Signals).
- JDK 21 portable si trova fuori dal repo in `../jdk21/jdk-21.0.12.1+1` (non versionato). Per build future: `export JAVA_HOME=.../jdk21/jdk-21.0.12.1+1` prima di `./gradlew`.
- Keystore e credenziali in `keystore-privato/` e `android/keystore.properties`, entrambi in `.gitignore` — **da conservare con cura**: perderli impedirebbe di pubblicare aggiornamenti futuri con lo stesso certificato.
