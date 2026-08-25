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

## Da fare — funzionalità core
- [ ] Categorie personalizzate (create/modifica/elimina) — attualmente solo le 12 predefinite
- [ ] Scansione codici a barre (plugin Capacitor community, no Firebase) + cache locale prodotti scansionati + arricchimento opzionale via Open Food Facts (solo online, fallback manuale sempre disponibile)
- [ ] Notifiche di scadenza locali reali (plugin `@capacitor/local-notifications`) — attualmente solo toggle UI senza logica
- [ ] Filtri/ricerca in inventario (da verificare/completare)
- [ ] Backup/export JSON con checksum + backup automatico silenzioso all'avvio + ripristino da impostazioni
- [ ] Dati demo distinguibili e rimovibili con un tap (con backup di sicurezza automatico prima della rimozione)
- [ ] Splash screen nativa (plugin `@capacitor/splash-screen`)
- [ ] Guida in-app / FAQ (pagina `/help` referenziata da Impostazioni, da creare)
- [ ] Suggerimenti intelligenti aggiuntivi (da valutare: "consuma prima questo", ecc.)

## Da fare — pubblicazione
- [ ] Creare progetto nativo Android (`npx cap add android`)
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
