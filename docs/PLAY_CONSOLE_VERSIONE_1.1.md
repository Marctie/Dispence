# Play Console — cosa aggiornare per la versione 1.1

La versione 1.1 introduce **account (email e password), dispensa condivisa, notifiche personalizzabili e tracciamento di utilizzo ed errori**. Le risposte date per la 1.0 ("nessun dato raccolto") non sono più valide: vanno aggiornate **prima** di pubblicare la 1.1, altrimenti Google può rifiutare l'aggiornamento o sospendere l'app.

Ordine consigliato: 1) privacy policy online → 2) Sicurezza dei dati → 3) Accesso all'app → 4) Eliminazione account → 5) nuova release.

## 1. Privacy policy

Il testo aggiornato (IT/EN) è in `privacy-policy/it/index.html` e `privacy-policy/en/index.html`. Va pubblicato nel repo `Marctie/DispenceAi-privacy` (cartelle `it/` ed `en/`), lo stesso indirizzo già registrato su Play Console: l'URL non cambia.

## 2. Contenuti dell'app → Sicurezza dei dati

**La tua app raccoglie o condivide uno dei tipi di dati utente richiesti?** Sì

**Tutti i dati raccolti sono criptati in transito?** Sì

**Fornisci agli utenti un modo per richiedere l'eliminazione dei dati?** Sì (vedi punto 4)

**Tipi di dati** (per tutti: *Raccolti* sì, *Condivisi* **no**; Supabase e Telegram sono fornitori di servizi che trattano i dati per conto dello sviluppatore, quindi per Google non è "condivisione"; anche la condivisione della dispensa con altri membri è avviata dall'utente ed è esente):

| Categoria Play | Tipo | Obbligatorio? | Finalità |
|---|---|---|---|
| Informazioni personali | **Indirizzo email** | Obbligatorio | Funzionalità dell'app, Gestione dell'account |
| Informazioni personali | **ID utente** | Obbligatorio | Funzionalità dell'app, Gestione dell'account |
| Attività nelle app | **Interazioni con le app** | Obbligatorio | Analisi |
| Attività nelle app | **Altri contenuti generati dagli utenti** (prodotti, lista della spesa, categorie) | Obbligatorio | Funzionalità dell'app |
| Informazioni e prestazioni delle app | **Log degli arresti anomali** | Obbligatorio | Analisi |
| Informazioni e prestazioni delle app | **Diagnostica** | Obbligatorio | Analisi |

Per ogni tipo: *Trattati in modo temporaneo?* **No**.

Non raccolti: posizione, contatti, foto/video (la fotocamera elabora il codice a barre solo sul dispositivo), file, calendario, dati finanziari, salute, messaggi, ID dispositivo/pubblicità (le iscrizioni push riguardano solo la web app, non l'app Android).

## 3. Contenuti dell'app → Accesso all'app

Ora l'app richiede l'accesso. Scegli **"L'accesso a tutte le funzionalità o ad alcune è limitato"** e aggiungi le istruzioni:

- Nome: `Account di revisione`
- Nome utente / password: vedi `keystore-privato/play-review-account.txt` (file locale, non versionato)
- Istruzioni: `Apri l'app e accedi con le credenziali indicate (nessuna verifica email o codice richiesti). Per provare la condivisione: Impostazioni → Dispensa condivisa.`

Non eliminare questo account finché l'app è pubblicata: i revisori lo usano a ogni aggiornamento.

## 4. Eliminazione dell'account

Play richiede sia l'eliminazione dall'app sia un link web.

- Nell'app: **Impostazioni → Account → Elimina account** (cancella account, preferenze e iscrizioni push; la dispensa se non ha altri membri).
- **URL per la richiesta di eliminazione**: `https://marctie.github.io/DispenceAi-privacy/it/#eliminazione-account` (la sezione della privacy policy spiega come farlo dall'app o per email). In alternativa basta l'URL della privacy policy.
- Dati eliminati: account, email, preferenze, iscrizioni push, dispensa (se senza altri membri). Dati conservati: eventi di utilizzo ed errori fino a 12 mesi (dichiararlo se richiesto).

## 5. Nuova release

- File: `android/app/build/outputs/bundle/release/app-release.aab` (**versionCode 4**, versionName 1.1). Le versioni 2 e 3 non vanno usate: la 2 conteneva un bug delle notifiche Android, la 3 chiedeva il permesso solo dall'interruttore. Se hai già caricato la 2, eliminala dalla release e carica questa., generato con `gradlew bundleRelease` usando il JDK 21 portable in `..\..\jdk21\jdk-21.0.12.1+1`.
- Note di rilascio (it-IT):

```
Novità della versione 1.1:
• Account personale: ritrovi la tua dispensa su tutti i tuoi dispositivi
• Dispensa condivisa: invita familiari con un codice e gestite la spesa insieme, in tempo reale
• Notifiche personalizzabili: orario, giorni di preavviso, giorno della scadenza, prodotti scaduti, scorte basse, riepilogo unico giornaliero
• Avviso quando qualcuno aggiunge prodotti alla dispensa condivisa
• Correzioni e miglioramenti
```

- Note di rilascio (en-US):

```
What's new in 1.1:
• Personal account: your pantry on all your devices
• Shared pantry: invite family members with a code and manage groceries together in real time
• Customizable notifications: time, days in advance, expiry day, expired items, low stock, single daily summary
• Alert when someone adds products to the shared pantry
• Fixes and improvements
```

## Attenzione: APK installati a mano

Chi ha installato l'APK a mano (non dal Play Store) può aggiornare installando l'APK nuovo sopra quello vecchio, perché sono firmati con la stessa chiave. Non può invece passare all'aggiornamento dal Play Store senza disinstallare, perché Google firma le app con una chiave diversa (Play App Signing). Prima di disinstallare, conviene fare il login: così i dati restano nell'account.
