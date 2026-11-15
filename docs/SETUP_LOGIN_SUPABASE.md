# Attivare login e account (versione web)

Riguarda solo la versione web (GitHub Pages / iPhone). L'app Android pubblicata su Play Store **non cambia**: niente login, dati solo sul telefono.

Finché `supabase.url` e `supabase.publishableKey` in `src/environments/environment.prod.ts` restano vuoti, la web app funziona come prima, senza login.

## Come funziona

- Ognuno si crea un account con email e password; la dispensa di ogni utente è salvata in una riga della tabella `pantries`.
- **Row Level Security**: il database permette di leggere e scrivere una riga solo a chi ha effettuato l'accesso con l'account proprietario. La chiave nell'app ("publishable") è pubblica per definizione: da sola non dà accesso a nessun dato.
- Sul telefono i dati restano anche in locale, così l'app funziona offline; le modifiche si sincronizzano appena c'è connessione. Se si modifica la stessa dispensa da due dispositivi contemporaneamente, vince la modifica più recente.
- Al primo accesso, i dati già presenti sul telefono vengono uniti a quelli dell'account (non si perde nulla).
- "Esci" cancella i dati da quel dispositivo (restano nell'account). "Elimina account" cancella definitivamente account e dati online.

## Configurazione (circa 10 minuti, gratis)

1. **Crea il progetto**: vai su https://supabase.com, registrati e crea un nuovo progetto. Come regione scegli *Central EU (Frankfurt)* e salva la password del database in un posto sicuro (all'app non serve).
2. **Crea la tabella**: apri *SQL Editor* → *New query*, incolla tutto il contenuto di [`supabase/schema.sql`](../supabase/schema.sql) e premi *Run*. Deve rispondere "Success".
3. **Indirizzi dell'app**: apri *Authentication* → *URL Configuration*:
   - *Site URL*: `https://marctie.github.io/Dispence/`
   - *Redirect URLs*: aggiungi `https://marctie.github.io/Dispence/**` e `http://localhost:4200/**`
4. **Regole delle password**: in *Authentication* → *Sign In / Providers* → *Email*, imposta la lunghezza minima della password a **8** (la stessa che controlla l'app).
5. **Email (conferma account e password dimenticata)**: il servizio email incluso in Supabase invia messaggi **solo agli indirizzi dei membri del tuo team Supabase**, e pochi all'ora. Per gli altri utenti hai due strade:
   - *Per partire subito*: in *Sign In / Providers* → *Email* disattiva **Confirm email**. La registrazione dà subito accesso; però "Password dimenticata" non funzionerà per gli altri utenti finché non fai il passo successivo.
   - *Configurazione completa (consigliata)*: crea un account gratuito su un servizio SMTP (ad esempio Brevo, 300 email al giorno gratis, con mittente verificato) e inserisci i dati in *Authentication* → *Emails* → *SMTP Settings*. A quel punto puoi riattivare **Confirm email**.
6. **Chiavi da inserire nell'app**: apri *Project Settings* → *API Keys* e copia:
   - *Project URL* (tipo `https://abcdefgh.supabase.co`)
   - la **Publishable key** (inizia con `sb_publishable_`)

   Inseriscile in `src/environments/environment.prod.ts` (e, se vuoi provare in locale, anche in `environment.ts`), poi fai commit e push: GitHub Pages si aggiorna da solo. **Non usare mai la "secret key" o la "service_role key"**: quelle danno accesso completo al database e non devono mai finire nel codice.

## Da sapere

- **Progetto in pausa**: un progetto gratuito Supabase viene messo in pausa dopo circa una settimana senza alcun utilizzo. I dati non si perdono: si riattiva con un clic dalla dashboard. Se l'app si usa regolarmente non succede.
- **Privacy**: nella versione web con account i dati della dispensa sono salvati anche sui server Supabase (UE). La privacy policy attuale descrive l'app Android (nessun dato raccolto): prima di aprire la registrazione a persone esterne va aggiunta una sezione dedicata alla versione web.
- **Limite**: ogni dispensa può pesare al massimo circa 2 MB, molto più di quanto serva a una dispensa domestica. Il limite esiste per evitare abusi dello spazio gratuito.
