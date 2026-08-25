# Guida alla pubblicazione su Google Play Store — Dispensina Digitale

Questo documento raccoglie tutti i testi e le risposte pronte per la Play Console, così da poter compilare ogni schermata senza dover improvvisare. Verrà completato con screenshot e checklist finale non appena la build firmata sarà verificata su emulatore.

## Scheda store

**Nome app:** Dispensina Digitale

**Descrizione breve** (max 80 caratteri):
```
Gestisci la dispensa, riduci gli sprechi: scadenze, scanner e lista spesa
```

**Descrizione completa** (max 4000 caratteri):
```
Dispensina Digitale ti aiuta a tenere sotto controllo tutto quello che hai in dispensa, frigo e freezer, senza sprechi e senza pensieri.

COSA PUOI FARE
• Aggiungi prodotti in pochi secondi, anche scansionando il codice a barre con la fotocamera
• Organizza tutto per categoria (predefinite o personalizzate), posizione e data di scadenza
• Ricevi notifiche quando un prodotto sta per scadere, con soglia di preavviso personalizzabile
• Cerca e filtra la tua dispensa per categoria, posizione o stato di scadenza
• Genera automaticamente la lista della spesa a partire dai prodotti in esaurimento o scaduti
• Consulta statistiche su categorie più presenti, valore economico sprecato e prodotti più ricomprati

PRIVACY PRIMA DI TUTTO
Dispensina Digitale funziona interamente offline: nessun account, nessun server, nessuna pubblicità. Tutti i tuoi dati restano sul tuo dispositivo. Puoi esportare un backup in qualsiasi momento e l'app ne crea automaticamente uno interno di sicurezza a ogni avvio.

Nessun dato viene mai condiviso con terze parti, a eccezione di una ricerca facoltativa e anonima su Open Food Facts (solo il codice a barre scansionato) quando aggiungi un prodotto non ancora presente nel tuo archivio locale, e solo se sei online.

Semplice, veloce, senza sprechi: la tua dispensa, sempre sotto controllo.
```

**Categoria:** Stile di vita (Lifestyle) — alternativa: Produttività

**Tag/parole chiave:** dispensa, scadenze, lista spesa, scanner codice a barre, cibo, sprechi alimentari, frigo, organizzazione casa

**Email di contatto sviluppatore:** marco.p.develop@gmail.com

**Sito web:** (facoltativo — es. pagina privacy policy) https://marctie.github.io/DispenceAi-privacy/it/

**Privacy policy URL:**
- IT: https://marctie.github.io/DispenceAi-privacy/it/
- EN: https://marctie.github.io/DispenceAi-privacy/en/

## Content rating (questionario IARC)

Risposte suggerite per un'app di utilità senza contenuti generati dagli utenti, senza violenza, senza contenuti per adulti:

| Domanda | Risposta |
|---|---|
| Violenza | Nessuna |
| Contenuti sessuali | Nessuno |
| Linguaggio volgare | Nessuno |
| Sostanze controllate | Nessun riferimento |
| Gioco d'azzardo simulato | No |
| Contenuti generati dagli utenti condivisi con altri | No |
| Condivisione posizione | No |
| Acquisti in-app | No |
| Interazione tra utenti / chat | No |

Risultato atteso: **PEGI 3 / Everyone**.

## Data Safety form

**L'app raccoglie o condivide dati utente con terze parti?** No.

| Tipo di dato | Raccolto | Condiviso | Motivo | Note |
|---|---|---|---|---|
| Dati personali (nome, email, ecc.) | No | No | — | Nessun account richiesto |
| Posizione | No | No | — | — |
| Foto/video (fotocamera) | No | No | Elaborazione locale | Usata solo per lo scanner barcode, immagini mai salvate/trasmesse |
| Dati sull'app (crash, diagnostica) | No | No | — | Nessun SDK di analytics/crash reporting integrato |
| Dati finanziari | No | No | — | — |

**Crittografia dati in transito:** N/A per la maggior parte del traffico (nessun dato personale trasmesso). L'unica chiamata di rete è verso l'API pubblica Open Food Facts (HTTPS) per il solo codice a barre scansionato, senza identificativi utente.

**L'utente può richiedere la cancellazione dei dati?** Sì — tutti i dati sono locali: disinstallare l'app o usare la funzione di rimozione dati nelle Impostazioni cancella tutto.

**Sicurezza dei dati:**
- I dati sono cifrati in transito? Sì, dove applicabile (HTTPS verso Open Food Facts)
- L'utente può eliminare i propri dati? Sì

## Permessi richiesti e giustificazione

| Permesso | Motivo |
|---|---|
| Fotocamera (`CAMERA`) | Scansione codici a barre per aggiungere prodotti rapidamente |
| Notifiche (`POST_NOTIFICATIONS`) | Avvisi locali di prodotti in scadenza |

Nessun permesso di posizione, contatti, microfono, storage esteso o telefono richiesto.

## Checklist pre-pubblicazione

- [ ] Build `bundleRelease` generata e firmata con keystore dedicato
- [ ] Firma verificata con `apksigner`/`openssl` (impronta confrontata col keystore)
- [ ] App testata su emulatore Android reale (barcode scanner, notifiche, backup/restore)
- [ ] Screenshot reali catturati via `adb` (non da browser) — almeno 2 per telefono, opzionali per tablet
- [ ] Icona store 512×512 e feature graphic 1024×500 pronte
- [ ] Privacy policy IT/EN online e raggiungibile pubblicamente
- [ ] Data Safety form compilato come sopra
- [ ] Content rating completato
- [ ] Versione/versionCode impostati correttamente in `android/app/build.gradle`

## Screenshot

Da catturare su emulatore reale (non browser) con `adb exec-out screencap`, dopo il test end-to-end. Schermate consigliate: Home con prodotti, Dispensa con filtri, scanner barcode in azione, notifiche di scadenza, statistiche in Impostazioni.
