# Prompt da usare nel workspace con i 10 progetti Play Store

Copia-incolla il testo qui sotto come primo messaggio nella nuova sessione.

---

In questo workspace ho 10 progetti Android/Ionic-Capacitor già pronti per (o già pubblicati su) Google Play Store. Per ognuno dei 10 progetti, in totale autonomia e uno dopo l'altro, esegui questo stesso schema di lavoro:

## 1. Rimozione totale della pubblicità
- Fai un audit completo del codice per trovare **tutti** i riferimenti a pubblicità/ads: AdMob App ID (in `AndroidManifest.xml`, `strings.xml`, config Capacitor), Ad Unit ID (banner/interstitial/rewarded/native), plugin/dipendenze ads (es. `@capacitor-community/admob` o simili) in `package.json`/`build.gradle`, inizializzazioni SDK nel codice TS/JS, permessi o meta-data specifici ads nel manifest.
- Rimuovi **completamente** tutto questo: 0 pubblicità nell'app risultante, nessun codice morto che la richiami.
- Prima di rimuovere, **salva tutto in un file fisico dentro il repo del progetto** (es. `docs/ADS_BACKUP.md`), non solo a parole: per ogni ID/blocco di codice rimosso riporta il valore esatto, il file e la riga/contesto originali, e le istruzioni precise per reintrodurlo in futuro (che dipendenza reinstallare, dove reinserire l'inizializzazione, dove rimettere i placement). Deve essere sufficiente a ripristinare le ads in una sessione futura senza dover ricostruire nulla da zero.

## 2. Build APK firmato
- Genera (o riusa se già esiste ed è valido) un keystore di firma dedicato per il progetto, mai committato (va in `.gitignore`, coerente con come già gestito in `keystore-privato/` e `android/keystore.properties` nel progetto Dispensina Digitale).
- Genera la build firmata (`.apk` e `.aab`), verifica la firma con `keytool`/`jarsigner -verify`/`apksigner verify` confrontando l'impronta col keystore, esattamente come fatto per Dispensina Digitale.

## 3. Privacy policy
- Crea/aggiorna la pagina privacy policy (IT/EN) del progetto.
- Pubblicala sul repository/bucket GitHub Pages che ti indicherò io per quel progetto specifico (te lo fornisco io, uno per progetto o uno condiviso — chiedimelo se non te l'ho ancora dato per il progetto su cui stai lavorando).
- Verifica che la pagina sia effettivamente online e raggiungibile (200 OK) prima di considerarla fatta.

## 4. Documento di pubblicazione Play Store
- Scrivi un documento `docs/GUIDA_PUBBLICAZIONE_PLAY_STORE.md` per il progetto, con lo stesso livello di dettaglio usato per Dispensina Digitale: nome app, descrizione breve ed estesa, categoria, parole chiave, email di contatto, URL privacy policy IT/EN, risposte al questionario content rating (IARC), risposte complete al Data Safety form (**dichiarando esplicitamente 0 pubblicità/ads**, coerente col punto 1), tabella permessi e relative motivazioni, checklist pre-pubblicazione.

## 5. Documentazione di sessione
- Per ogni progetto tieni aggiornati `docs/CHATLOG.md` e `docs/STATO_PUBBLICAZIONE.md` con lo stesso stile usato in questo progetto (Dispensina Digitale): cosa hai fatto, decisioni prese, problemi incontrati e come risolti, stato attuale (fatto / in corso / da fare).

## Modalità di lavoro
- Procedi sui 10 progetti in autonomia, uno dopo l'altro, senza fermarti a chiedere conferma tra un progetto e il successivo.
- Fermati e chiedimi input solo per blocchi reali che non puoi risolvere da solo: es. bucket/repo GitHub Pages non ancora fornito per quel progetto, credenziali/keystore mancanti, ambiguità sul nome/branding dell'app, decisioni che riguardano account Play Console (quelle restano sempre a me).
- Non toccare account Play Console, non fare submit/rollout: quello lo faccio io manualmente con i materiali che mi prepari.
- Se un progetto non ha ads da rimuovere, salta il punto 1 (ma verificalo esplicitamente, non darlo per scontato) e passa comunque agli altri punti.

---
