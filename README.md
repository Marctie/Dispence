# Dispensina Digitale

App per gestire la dispensa di casa: prodotti con scadenze, lista della spesa, ricette con quello che hai, notifiche di scadenza e dispensa condivisa con famiglia e amici.

| Dove | Come si installa |
|---|---|
| **Android** | Google Play Store, oppure APK installato a mano |
| **iPhone / iPad** | Web app: https://marctie.github.io/Dispence/ → Safari → *Aggiungi alla schermata Home* |
| **Computer** | Lo stesso indirizzo web, da qualsiasi browser |

Tutti usano lo **stesso account** e vedono gli stessi dati.

---

## Indice

1. [Guida per chi usa l'app](#1-guida-per-chi-usa-lapp)
2. [iPhone: installazione e notifiche](#2-iphone-installazione-e-notifiche)
3. [Android: installazione e notifiche](#3-android-installazione-e-notifiche)
4. [Dispensa condivisa](#4-dispensa-condivisa)
5. [Notifiche: come funzionano](#5-notifiche-come-funzionano)
6. [Privacy e dati](#6-privacy-e-dati)
7. [Problemi frequenti](#7-problemi-frequenti)
8. [Per lo sviluppatore: architettura](#8-per-lo-sviluppatore-architettura)
9. [Per lo sviluppatore: compilare, pubblicare, manutenere](#9-per-lo-sviluppatore-compilare-pubblicare-manutenere)

---

## 1. Guida per chi usa l'app

**Primo accesso.** All'apertura compare la schermata *Accedi*. La prima volta tocca *Non hai un account? Registrati*, inserisci email e una password di almeno 8 caratteri: entri subito, senza email di conferma. Le volte successive l'accesso resta salvato.

**Codice di recupero (importante).** Subito dopo la registrazione l'app mostra il tuo **codice di recupero** (es. `ABCD-EFGH-JKLM-NPQR`): **salvalo** (Copia, Salva/invia, o uno screenshot). Serve per reimpostare la password se la dimentichi, senza bisogno di email. Puoi crearne uno nuovo in qualsiasi momento da *Impostazioni → Account → Codice di recupero* (il vecchio smette di valere). Chi aveva già un account prima di questa funzione riceve un invito a crearlo al primo accesso.

**Prodotti di esempio (da eliminare al primo avvio).** Dopo la presentazione iniziale l'app inserisce alcuni prodotti di esempio per mostrarti come funziona: in Home compare un avviso **"Questi sono prodotti di esempio"** con il pulsante **Elimina i prodotti di esempio**. Toccalo quando hai dato un'occhiata, prima di iniziare con i tuoi prodotti (si può fare anche da *Impostazioni → Backup e dati*). I prodotti di esempio non vengono mai portati in una dispensa condivisa.

**Schede principali**
- **Home**: riepilogo dei prodotti in scadenza, scaduti e sotto scorta.
- **Dispensa**: tutti i prodotti, con filtri per posizione (dispensa, frigo, freezer), categoria e scadenza. Con il **+** in alto aggiungi un prodotto (su Android puoi anche scansionare il codice a barre). Tocca un prodotto per modificarlo.
- **Spesa**: lista della spesa in stile "to-do". Con il **+** aggiungi una voce, toccando il cerchio la spunti come comprata (finisce in *Già comprati*), con il cestino la elimini, con l'icona in alto svuoti tutte le voci spuntate. In alto trovi i suggerimenti automatici (prodotti scaduti o sotto la scorta minima): toccane uno per aggiungerlo alla lista.
- **Ricette**: ricette che puoi preparare con quello che hai, con la percentuale di ingredienti già in casa.
- **Impostazioni**: account, dispensa condivisa, notifiche, tema chiaro/scuro, categorie personalizzate, statistiche, backup.

**Inserisci con l'assistente (✨ in Dispensa).** Scrivi o incolla i prodotti appena comprati, anche alla buona (es. *"2 litri di latte, 6 uova, petto di pollo 500 g scade venerdì, 3 scatolette di tonno, gelato"*) e tocca *Invia all'assistente*. Un'intelligenza artificiale che gira sul PC di casa capisce nome, quantità, categoria, dove conservarlo (dispensa, frigo, freezer) e la scadenza (quella che hai scritto, oppure una **stimata**, segnata come tale). Quando è pronto vedi il **riepilogo**: quanti prodotti e dove finiscono, quali si sommano a prodotti già presenti, le scadenze stimate da controllare. Tocca un prodotto per modificarlo, togli la spunta per escluderlo, poi *Inserisci*: solo allora i prodotti entrano in dispensa. Se il PC è spento l'elenco **resta in coda** e viene letto appena si accende (puoi chiudere l'app: alla riapertura un avviso ti dice che è pronto); senza rete l'elenco resta sul telefono e parte da solo dopo. Serve l'account.

**Scorta minima.** Quando aggiungi o modifichi un prodotto puoi attivare la *scorta minima*: se la quantità scende sotto quel valore, il prodotto viene suggerito nella lista della spesa e, se vuoi, ricevi una notifica.

**Backup.** In *Impostazioni → Backup e dati* puoi esportare un file con tutti i dati e ripristinarlo. Con l'account i dati sono comunque già salvati online e li ritrovi su ogni dispositivo.

**Password dimenticata.** Nella schermata di accesso tocca *Password dimenticata?*, inserisci email, **codice di recupero** e la nuova password: entri subito e ricevi un nuovo codice da salvare (quello usato non vale più). Dopo 5 tentativi sbagliati in un'ora il recupero per quell'email si blocca per un'ora. In alternativa c'è *Ricevi un link via email* (funziona per tutti solo dopo aver collegato un servizio email, vedi sezione 9).

**Uscire / eliminare l'account.** *Impostazioni → Account → Esci* (i dati restano nell'account e vengono tolti da quel telefono) oppure *Elimina account* (cancellazione definitiva).

---

## 2. iPhone: installazione e notifiche

Su iPhone non serve l'App Store: si usa la **web app**, che una volta aggiunta alla schermata Home si comporta come un'app vera (icona, schermo intero, funziona anche offline, notifiche).

### Installazione (una volta sola)
1. Apri **Safari** (deve essere Safari: da Chrome o altri browser non si può installare) e vai su **https://marctie.github.io/Dispence/**
2. Tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto, in basso al centro).
3. Scorri e tocca **"Aggiungi alla schermata Home"** → **Aggiungi**.
4. Da ora apri l'app **sempre dall'icona** sulla schermata Home, non da Safari: sono due "spazi" separati, con accesso e dati separati.

### Attivare le notifiche
Requisiti: **iOS 16.4 o successivo** (Impostazioni → Generali → Info → Versione iOS) e app aperta **dall'icona** della schermata Home.

1. Apri l'app dall'icona e accedi. Dopo la presentazione iniziale l'app chiede **"Vuoi ricevere gli avvisi?"** → tocca **Attiva**.
2. iPhone chiede *"Dispensina vorrebbe inviarti notifiche"* → **Consenti**.
3. Se avevi risposto *Non ora*: **Impostazioni → Notifiche** → accendi l'interruttore **Notifiche** (è acceso solo quando il permesso c'è davvero).
4. Tocca **"Invia una notifica di prova"**: entro qualche secondo deve arrivare *"Le notifiche funzionano 👍"*. Sotto la voce compare *"Arrivano anche ad app chiusa"*.
5. Scegli orario e tipi di avviso (vedi [sezione 5](#5-notifiche-come-funzionano)).

Se avevi risposto *Non consentire*: Impostazioni di iPhone → Notifiche → Dispensina → Consenti notifiche, poi ripeti dal punto 2.

**Come funzionano su iPhone.** Le notifiche partono da un piccolo server (Supabase) che ogni 15 minuti controlla chi deve ricevere gli avvisi del giorno all'orario scelto, e quando qualcuno aggiunge prodotti o voci della spesa a una dispensa condivisa. Arrivano tramite il servizio push di Apple anche con l'app chiusa e il telefono bloccato. Rispettano la modalità *Full immersion/Non disturbare* di iPhone. Sull'icona dell'app compare anche il numero dei prodotti scaduti o in scadenza.

**Limiti di iOS da conoscere**
- Senza "Aggiungi alla schermata Home" le notifiche **non** funzionano (limite di Apple per i siti web).
- Se elimini l'icona dalla schermata Home, iPhone cancella anche i dati locali e l'iscrizione alle notifiche: rientrando con l'account i dati tornano, ma le notifiche vanno riattivate (punto 2).
- La scansione del codice a barre non è disponibile su iPhone (Safari non lo supporta): il prodotto si inserisce a mano.

---

## 3. Android: installazione e notifiche

**Installazione.** Dal Play Store, oppure installando l'APK ricevuto (Android chiede di consentire l'installazione da quella app/origine: accetta). Un APK nuovo si installa sopra quello vecchio senza perdere nulla.

**Notifiche.** Dopo il primo accesso l'app chiede **"Vuoi ricevere gli avvisi?"** → **Attiva** → Android chiede il permesso → **Consenti**. (Se rispondi *Non ora*, puoi attivarle in qualsiasi momento da *Impostazioni → Notifiche*; se il permesso è stato negato, l'app spiega come riattivarlo dalle impostazioni di Android.) Gli avvisi di scadenza e scorte basse sono **pianificati direttamente sul telefono** per i 30 giorni successivi e arrivano anche ad app chiusa e senza internet; vengono ripianificati ogni volta che apri l'app o modifichi la dispensa. Nelle impostazioni di Android trovi due canali separati, *Avvisi scadenza* e *Dispensa condivisa*, che puoi regolare (suono, vibrazione) o disattivare singolarmente.

**Prodotti aggiunti da altri** (dispensa condivisa): su Android l'avviso arriva quando l'app è aperta o in secondo piano; con l'app completamente chiusa vedi le novità alla riapertura. (Per riceverli anche ad app chiusa servirebbe Firebase Cloud Messaging, escluso per scelta.)

---

## 4. Dispensa condivisa

Ogni account ha **una dispensa**. All'inizio è solo tua; puoi condividerla con chi vuoi.

**Invitare qualcuno**
1. *Impostazioni → Dispensa condivisa*: vedi il tuo **codice invito** (es. `AXFQ-4RGE`). Toccalo per copiarlo, oppure tocca **Invita qualcuno** per mandarlo con WhatsApp, SMS, email…
2. L'altra persona installa l'app, crea il suo account e va in *Impostazioni → Dispensa condivisa → **Entra con un codice*** e inserisce il codice (maiuscole/minuscole e trattino non contano).
3. Fatto: i prodotti che l'altra persona aveva già (esclusi quelli di esempio) vengono **aggiunti** alla dispensa condivisa, senza perdere niente.

**Cosa si condivide:** prodotti, lista della spesa, categorie personalizzate, storico acquisti, codici a barre già usati. Tutti i membri possono fare **tutte le operazioni**. **Restano personali:** tema e impostazioni delle notifiche (ognuno sceglie i propri orari e avvisi).

**In tempo reale.** Le modifiche arrivano agli altri in pochi secondi, anche senza ricaricare. Se due persone modificano nello stesso momento non si perde nulla: l'app unisce le modifiche prodotto per prodotto (se due persone cambiano proprio lo stesso prodotto, vale l'ultima modifica). Offline puoi continuare a usare l'app: le modifiche vengono inviate appena torni online.

**Gestione**
- Chi ha creato la dispensa (★) può **togliere un membro** (✕ accanto al nome) e **generare un nuovo codice** (il vecchio smette di funzionare; chi è già dentro resta).
- Chiunque può **uscire** (*Esci dalla dispensa condivisa*): riceve una nuova dispensa tutta sua con una copia dei prodotti del momento. Se esce il proprietario, la proprietà passa al membro più anziano.
- Il link d'invito (`…/Dispence/?invito=CODICE`) funziona sul web; su iPhone conviene usare il codice, perché il link si apre in Safari e non nell'app installata.

---

## 5. Notifiche: come funzionano

Si configurano in **Impostazioni → Notifiche** (ogni persona ha le sue):

| Opzione | Cosa fa |
|---|---|
| **Notifiche** | Interruttore generale |
| **Orario degli avvisi** | Ora del giorno in cui arrivano gli avvisi (predefinito 09:00) |
| **Riepilogo unico giornaliero** | Acceso: una sola notifica al giorno con tutto. Spento: una notifica per ogni prodotto |
| **Prodotti in scadenza** + giorni | Avviso N giorni prima della scadenza (1–30, predefinito 7) |
| **Il giorno della scadenza** | Avviso anche il giorno stesso |
| **Prodotti scaduti** | Promemoria il giorno dopo la scadenza |
| **Scorte basse** | Prodotti sotto la scorta minima impostata |
| **Prodotti aggiunti da altri** | Quando un membro aggiunge prodotti alla dispensa o voci alla lista della spesa (solo con account e dispensa condivisa) |
| **Invia una notifica di prova** | Verifica che tutto funzioni |

Esempio di riepilogo: *"3 prodotti da controllare — Scade oggi: Latte · Scade tra 7 giorni: Pane · Scaduto ieri: Yogurt · Scorte basse: Caffè"*.

Le notifiche considerano solo i prodotti **con una data di scadenza** inserita (le scorte basse valgono per tutti quelli con scorta minima).

---

## 6. Privacy e dati

- Informativa: https://marctie.github.io/DispenceAi-privacy/it/ (copia in `privacy-policy/`).
- Dati salvati su **Supabase** (server UE, Irlanda), sempre cifrati in transito. Le regole del database (Row Level Security) impediscono a chiunque di vedere o modificare una dispensa di cui non è membro: verificato con test reali.
- Gli elenchi scritti per l'**assistente** vengono salvati su Supabase, letti da un programma sul PC dello sviluppatore (modello di intelligenza artificiale locale, Ollama: nessun servizio di IA esterno) e inviati in dettaglio, con il contenuto, sul Telegram dell'amministratore; gli elenchi chiusi vengono cancellati dopo 30 giorni.
- Nessuna pubblicità, nessun tracker di terze parti. Vengono registrati eventi tecnici di utilizzo (senza il contenuto della dispensa) ed errori dell'app, per correggere i problemi (vedi [sezione 8](#8-per-lo-sviluppatore-architettura)).

---

## 7. Problemi frequenti

| Problema | Soluzione |
|---|---|
| iPhone: nessuna notifica | Controlla iOS ≥ 16.4, che l'app sia aperta **dall'icona** e non da Safari, il permesso in Impostazioni iPhone → Notifiche → Dispensina, poi spegni/riaccendi *Notifiche* nell'app e invia la prova |
| iPhone: "Arrivano solo quando apri l'app" sotto la notifica di prova | L'iscrizione push non è riuscita: spegni e riaccendi *Notifiche* con internet attivo |
| Android: nessuna notifica | Impostazioni Android → App → Dispensina → Notifiche: consenti e controlla i due canali; disattiva il risparmio energetico aggressivo per l'app |
| "Salvataggio online non riuscito, riproverò" | Problema di rete temporaneo: i dati sono al sicuro sul telefono e vengono inviati al prossimo tentativo |
| Codice invito non valido | Il proprietario potrebbe averlo rigenerato: fatti mandare quello nuovo |
| Password dimenticata | *Password dimenticata?* → email + codice di recupero + nuova password. Senza codice: il link via email arriva solo se è configurato un servizio email (SMTP) in Supabase (`docs/SETUP_LOGIN_SUPABASE.md`); altrimenti lo sviluppatore può reimpostarla dalla dashboard Supabase (Authentication → Users) |

---

## 8. Per lo sviluppatore: architettura

```
            ┌──────────────┐        ┌───────────────────────────── Supabase (UE) ─────────────────────────────┐
 Android ───┤              │ HTTPS  │ Auth (email+password)                                                    │
 (Capacitor)│  App Ionic/  ├───────►│ Postgres + RLS: pantries · pantry_members · user_settings ·              │
 iPhone/web─┤  Angular     │◄───────┤                 push_subscriptions · (eventi/errori)                     │
 (PWA)      │              │Realtime│ Realtime (aggiornamenti dispensa)                                        │
            └──────┬───────┘        │ Edge Functions: notify-additions · push-test · daily-reminders           │
                   │                │ pg_cron ogni 15 min ──► daily-reminders ──► Web Push (VAPID)             │
     notifiche     │                └──────────────────────────────────────────────┬──────────────────────────┘
     locali Android▼                                                               ▼
                                                                   servizi push Apple/Google/Microsoft ──► iPhone/browser
```

**App** (`src/app`) — Ionic 8 + Angular 20 (NgModule) + Capacitor 8.
- `localStorage` resta la fonte di lavoro (offline-first); i servizi esistenti (`ProductService`, `ShoppingService`, `CategoryService`, ecc.) non sanno nulla del cloud.
- `StorageService.changes$` emette ogni scrittura; `SyncService` la intercetta e sincronizza.
- `AuthService`: Supabase Auth; attivo se `environment.supabase` è configurato (web e Android). I link email aprono sempre la web app (`environment.webUrl`).
- `SyncService` + `merge.util.ts`: **unione a tre vie** (ultima versione sincronizzata dal dispositivo, versione locale, versione online) per elemento (`id`) di prodotti, spesa, categorie, cache barcode, storico acquisti. Salvataggio con **optimistic locking** sul campo `version` (`update … where version = letta`); se qualcun altro ha salvato nel frattempo si rilegge e si riunisce (fino a 4 tentativi). Realtime su `pantries` per ricevere le modifiche altrui. Le preferenze sono personali (`user_settings`), non nella dispensa.
- `notifications/planner.ts`: **unico pianificatore** degli avvisi (puro, senza dipendenze), usato dall'app (notifiche locali Android, riepilogo web di riserva) e copiato nelle funzioni server da `scripts/deploy-functions.mjs`.
- `NotificationService`: Android → `@capacitor/local-notifications` (30 giorni, max 60, `allowWhileIdle`, canali `expiry-alerts` e `pantry-updates`); web → iscrizione Web Push (`pushManager.subscribe` con chiave VAPID pubblica) salvata in `push_subscriptions`.
- `src/sw.js`: service worker (cache offline network-first, ricezione `push`, apertura app al tocco). Registrato solo sul web https.

**Database** (`supabase/schema.sql`, rieseguibile): `pantries` (data jsonb, version, invite_code), `pantry_members` (un account = una dispensa; ruoli owner/member), `user_settings` (prefs, timezone, last_daily_push), `push_subscriptions`. RLS su tutto, permessi per colonna (i membri possono cambiare solo `data`/`version` e il proprio nome), funzioni `security definer`: `my_pantry`, `join_pantry`, `leave_pantry`, `regenerate_invite_code`, `remove_member`, `delete_my_account`.

**Recupero password** (`supabase/recovery.sql` + funzione `recover-password`): codice personale di 16 caratteri salvato solo come hash bcrypt (`recovery_codes`, nessun accesso dai client), verifica e limite di 5 tentativi falliti/ora per email (`recovery_attempts`) in funzioni `security definer` eseguibili solo dal server; la funzione imposta la nuova password con l'API admin e sostituisce il codice usato.

**Funzioni server** (`supabase/functions`, Deno): `recover-password`, `notify-additions` (push agli altri membri, rispettando le loro preferenze), `push-test`, `daily-reminders` (chiamata da pg_cron ogni 15 minuti con un segreto nel Vault; invia una volta al giorno all'orario dell'utente nel suo fuso orario). Segreti delle funzioni: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (copia locale in `keystore-privato/supabase-push-secrets.json`, mai su git).

**Telemetria e bot** (`TelemetryService`, `global-error-handler.ts`, `supabase/telemetry.sql`): l'app registra interazioni (senza contenuti: niente nomi prodotto) e **tutti gli errori** (ErrorHandler Angular, `window.onerror`, promesse non gestite, `console.error`, errori di sincronizzazione) in una coda locale (`telemetry_queue`) inviata alla tabella `app_events` (i client possono solo inserire; il nome utente lo mette il server). Il bot Telegram **Dispence-Track** (`Bot Telegram\Dispence-Track`, avviato dal Bot Control Center) legge la tabella ogni 15 s e manda i messaggi all'amministratore; se è spento gli eventi restano in coda e vengono consegnati alla riaccensione. Comandi: `/stato`, `/oggi`, `/utenti`, `/errori`, `/errore N`, `/risolto N`, `/ultimi N`, `/notifiche on|off`, `/aiuto`. Dettagli nel README del bot.

**Assistente di inserimento** (`AiImportService`, pagina `ai-import`, `supabase/ai-import.sql`): l'app inserisce l'elenco in `ai_import_jobs` (solo `input_text` e `context` = data del giorno e categorie; senza rete resta in `dispensa_ai_outbox`); il programma `ai_worker.py` nella cartella del bot Dispence-Track (voce "Dispensina Assistente" nel Bot Control Center) lo prende con `ai_import_claim()`, chiama Ollama sul PC con uno schema JSON, calcola le scadenze dalle parole dell'utente e scrive `result`. Nessuna porta aperta sul PC. L'app legge le proprie richieste (RLS), mostra il riepilogo, inserisce i prodotti localmente (quindi passano dalla sincronizzazione normale) e chiude l'elenco con `ai_import_close('applied'|'discarded', esito)`. Ogni stato viene notificato su Telegram (`ai_import_to_notify()`, colonna `notified_state`). `ai_worker_status` dice all'app se l'assistente è acceso. Dettagli nel README del bot.

**Notifiche Android (attenzione)**: con `@capacitor/local-notifications` 8 ogni notifica va pianificata con `isExactNotification: false`, altrimenti senza il permesso "Sveglie e promemoria" il plugin apre le impostazioni di sistema a ogni pianificazione e la chiamata resta in attesa.

**Test**: `npx ng test --watch=false --browsers=ChromeHeadless` — unione dati, pianificatore notifiche, sincronizzazione condivisa con un finto Supabase (concorrenza, cancellazioni, lista spesa, isolamento tra account), backup, categorie.

---

## 9. Per lo sviluppatore: compilare, pubblicare, manutenere

| Cosa | Comando / dove |
|---|---|
| Sviluppo locale | `npm start` (http://localhost:4200) |
| Test | `npx ng test --watch=false --browsers=ChromeHeadless` |
| Build web (GitHub Pages) | automatica a ogni push su `main` (`.github/workflows/pages.yml`); a mano: `npm run build:pages` da **PowerShell** (Git Bash storpia `--base-href`) |
| Build Android | `npm run build:prod` → `npx cap sync android` → in `android/`: `gradlew assembleRelease` (APK) o `bundleRelease` (AAB) con `JAVA_HOME` = JDK 21 portable in `..\..\jdk21\jdk-21.0.12.1+1` |
| Firma Android | `keystore-privato/` + `android/keystore.properties` (percorso relativo), **mai su git, da conservare**: senza non si possono pubblicare aggiornamenti |
| Versione Android | `android/app/build.gradle` (`versionCode` +1 a ogni pubblicazione) |
| Schema database | `supabase/schema.sql`, poi `supabase/recovery.sql` e `supabase/ai-import.sql` nel SQL Editor di Supabase |
| Cron avvisi | `supabase/cron.sql` (sostituire `__CRON_SECRET__`) |
| Funzioni server | `SUPABASE_ACCESS_TOKEN=sbp_… node scripts/deploy-functions.mjs` |
| Configurazione Supabase / email | `docs/SETUP_LOGIN_SUPABASE.md` |
| Play Console (versione 1.1) | `docs/PLAY_CONSOLE_VERSIONE_1.1.md` |
| Storico del lavoro | `docs/CHATLOG.md`, `docs/STATO_PUBBLICAZIONE.md` |

**Progetto Supabase**: `yzufrpbmraqmacodcsza` (piano gratuito: si mette in pausa dopo circa 7 giorni senza alcun utilizzo; con l'uso regolare dell'app non succede, e in caso si riattiva con un clic dalla dashboard senza perdere dati). La chiave nell'app è la *publishable key*, pubblica per definizione: la sicurezza è data da RLS.
