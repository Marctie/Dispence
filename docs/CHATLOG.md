# Chatlog — Dispensina Digitale

## Sessione 2026-08-25

- Analizzato lo stato del progetto esistente (era "Dispensa Alimentare"): nessuna cartella Android nativa, nessun repository git, funzionalità core parzialmente implementate (prodotti, categorie predefinite, lista spesa, tema chiaro/scuro), notifiche di scadenza solo come toggle UI senza logica reale, scansione barcode/backup-export/splash screen/guida in-app/dati demo completamente assenti.
- Trovati e rimossi riferimenti personali nel codice: nome e link personali dell'autore in `settings.page.html` e `app-footer.component.html`, più `author`/`homepage` in `package.json`.
- Decisioni utente:
  - Nome definitivo app: **Dispensina Digitale** (era "Dispensa Alimentare"). Nuovo appId: `com.dispensinadigitale.app`.
  - Repo di lavoro: `Marctie/Dispence` (privato, confermato dall'utente).
  - Repo pubblico dedicato alla privacy policy (GitHub Pages): `Marctie/DispenceAi-privacy`.
  - Autore commit: `Dispensina Digitale <marco.p.develop@gmail.com>` (email dedicata, non quella personale).
- Inizializzato git in locale, remote `origin` collegato a `Marctie/Dispence`, `.gitignore` creato (esclude keystore/firma, `android/build`, `node_modules`, `www`, secrets).
- Aggiornati package.json, ionic.config.json, capacitor.config.ts con il nuovo branding.
- Creati `docs/STATO_PUBBLICAZIONE.md` e questo `docs/CHATLOG.md` per tracciare il lavoro.
