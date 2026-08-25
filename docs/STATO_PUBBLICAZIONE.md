# Stato pubblicazione — Dispensina Digitale

Ultimo aggiornamento: 2026-08-25

## ⏸️ Pausa sessione — ripartire da qui

**Siamo a metà della compilazione della scheda "Norme sui contenuti dell'app" / Store Listing su Google Play Console.** L'utente aveva già account sviluppatore attivo e ha creato l'app. Prossimo passo quando si riprende: chiedere all'utente a che punto esatto è arrivato nella console (probabilmente Store Listing → categoria/tipo app) e continuare da lì. Tutti i testi e gli asset necessari sono già pronti (vedi sotto), non serve rigenerare nulla.

**Cosa mandare all'utente appena richiesto, già pronti:**
- Testi Store Listing (nome, descrizione breve/estesa, categoria) → `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md`
- Icona 512×512, feature graphic 1024×500, 6 screenshot reali (chiaro+scuro) → `docs/store-assets/`
- File `.aab` firmato e aggiornato (con fix tema scuro) → `android/app/build/outputs/bundle/release/app-release.aab`
- Risposte Data Safety form e content rating → `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md`

## Riepilogo
App Ionic/Angular + Capacitor per la gestione della dispensa domestica. Ribattezzata da "Dispensa Alimentare" a "Dispensina Digitale". Segue lo stesso processo/qualità del progetto FinanzAI verso la pubblicazione su Play Store.

## Fatto
- [x] Audit completo del codice esistente
- [x] Rebranding completo (nome, appId `com.dispensinadigitale.app`, package.json, manifest, index.html), nessun riferimento personale residuo
- [x] Repository privato `Marctie/Dispence` + repo pubblico `Marctie/DispenceAi-privacy` per la privacy policy
- [x] Tutte le funzionalità core: categorie personalizzate, scanner barcode (ML Kit + Open Food Facts), notifiche locali reali, filtri avanzati, backup/export con checksum + backup automatico silenzioso, dati demo rimovibili, splash screen, guida FAQ, statistiche (spreco economico, prodotti più ricomprati)
- [x] Progetto Android nativo, icone/splash rigenerate dal logo originale
- [x] Test unitari 11/11 verdi (CategoryService, BackupService)
- [x] JDK 21 portable installato (bypass blocco Windows Installer), non tocca il JDK 25 di sistema — vedi note tecniche per il path
- [x] Keystore di firma generato, `signingConfig` esplicito, credenziali solo locali (mai in git)
- [x] Build `.aab`/`.apk` firmate e **verificate** (impronta SHA-256 coincidente tra keystore e bundle, controllata con keytool/jarsigner/apksigner)
- [x] App testata su emulatore Android reale (avvio, splash, home, onboarding, canale notifiche) tramite Chrome DevTools Protocol — l'automazione dei tap via `adb shell input tap` si è rivelata inaffidabile su questo emulatore, risolta collegandosi al WebView via CDP (`chrome://inspect` protocol) per pilotare l'app in modo affidabile
- [x] **Bug reale trovato e corretto**: il tema "scuro" selezionato manualmente nelle Impostazioni non si applicava se il sistema operativo era in chiaro (variabili CSS dark legate solo a `@media prefers-color-scheme`, mai alla classe che il ThemeService imposta). Corretto con un mixin SCSS condiviso + gestione esplicita anche della scelta "chiaro" per sovrascrivere un sistema in dark mode. Verificato visivamente dopo il fix.
- [x] Privacy policy IT/EN pubblicata e **online e raggiungibile** (GitHub Pages attivato dall'utente, verificato con 200 OK su entrambe le lingue)
- [x] Tutti i testi Play Console pronti in `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` (store listing, content rating, Data Safety, permessi)
- [x] Asset store generati: icona 512×512, feature graphic 1024×500, 6 screenshot reali (chiaro+scuro) con dati demo popolati, in `docs/store-assets/`
- [x] App creata su Google Play Console dall'utente (account sviluppatore già attivo)

## In corso — sessione Play Console (da riprendere)
- [ ] Categoria/tipo app — l'utente era su questo step quando si è interrotta la sessione
- [ ] Store Listing completo (icona, feature graphic, screenshot, descrizioni) — testi e asset pronti, da incollare/caricare
- [ ] App content: Privacy Policy URL, Ads (no), Content rating (questionario), Target audience, **Data Safety form** (risposte dettagliate pronte in `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md`, non ancora compilate in console)
- [ ] Creazione release (consigliato: partire da un test interno prima della produzione), upload `.aab`
- [ ] Countries/pricing (gratuita, tutti i paesi o selezione)
- [ ] Rollout finale

## Da fare — funzionalità core (non bloccante per submit)
- [ ] Test interattivo manuale di scanner barcode e notifiche su device reale (il test via emulatore con permessi camera reali non è stato possibile in questa sessione)

## Backlog (richieste future, non prioritarie ora)
_(vuoto per ora)_

## Note tecniche
- Plugin Capacitor morti rimossi dal progetto originale: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar`.
- Nessun `server` remoto in capacitor.config.ts — corretto, punta a `www/` locale.
- Stato gestito con servizi Angular + RxJS BehaviorSubject + localStorage (no NgRx, no Signals).
- **JDK 21 portable**: `../jdk21/jdk-21.0.12.1+1` (fuori dal repo, non versionato). Per build future: `export JAVA_HOME=".../jdk21/jdk-21.0.12.1+1"` prima di `./gradlew`. Il JDK 25 di sistema resta quello di default, non toccato.
- Keystore e credenziali in `keystore-privato/` e `android/keystore.properties`, entrambi in `.gitignore` — **da conservare con cura**: perderli impedirebbe di pubblicare aggiornamenti futuri con lo stesso certificato.
- Per rigenerare gli asset store in futuro: erano generati con uno script Node temporaneo usando `sharp` (già rimosso dopo l'uso, non serve conservarlo — i PNG finali sono in `docs/store-assets/`).
- Per debug futuro via Chrome DevTools Protocol su WebView: installare l'APK **debug** (non release, che non è debuggable), poi `adb forward tcp:9222 localabstract:webview_devtools_remote_<PID>` e usare `Runtime.evaluate` via websocket — molto più affidabile dei tap ADB su questo emulatore.
