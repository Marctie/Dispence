import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help',
  templateUrl: 'help.page.html',
  styleUrls: ['help.page.scss'],
  standalone: false,
})
export class HelpPage {
  readonly faqs: FaqItem[] = [
    {
      question: 'Dove vengono salvati i miei dati?',
      answer: 'Tutto viene salvato solo sul tuo dispositivo. Non c\'è alcun account e nessun dato viene inviato a server esterni, a parte una ricerca facoltativa su Open Food Facts quando scansioni un codice a barre non ancora presente nella tua cache locale (solo se sei online).',
    },
    {
      question: 'Come funziona la scansione del codice a barre?',
      answer: 'Tocca "Scansiona codice a barre" quando aggiungi un nuovo prodotto e inquadra il codice con la fotocamera. Se il prodotto è già stato scansionato o inserito in passato, i dati vengono precompilati dalla cache locale. Se è la prima volta e sei online, l\'app prova a recuperare nome e informazioni da Open Food Facts; se non trova nulla o sei offline, puoi comunque compilare i campi a mano.',
    },
    {
      question: 'Come funzionano le notifiche?',
      answer: 'Dalle Impostazioni → Notifiche scegli l’orario e cosa ricevere: prodotti in scadenza (con quanti giorni di anticipo), il giorno stesso della scadenza, i prodotti scaduti, le scorte basse e, se condividi la dispensa, i prodotti aggiunti dagli altri. Puoi ricevere un unico riepilogo al giorno oppure una notifica per ogni prodotto, e inviarti una notifica di prova. Su iPhone aggiungi prima l’app alla schermata Home da Safari (Condividi → “Aggiungi alla schermata Home”): così le notifiche arrivano anche ad app chiusa.',
    },
    {
      question: 'Posso creare categorie personalizzate?',
      answer: 'Sì. Vai in Impostazioni → Gestisci categorie e tocca "+" per crearne una nuova con nome, emoji e colore. Le categorie predefinite non possono essere modificate o eliminate, ma puoi comunque crearne quante ne vuoi di tue.',
    },
    {
      question: 'Come faccio un backup dei miei dati?',
      answer: 'In Impostazioni → Backup e dati puoi esportare un file JSON che puoi salvare dove preferisci e ripristinare in qualsiasi momento. L\'app crea inoltre automaticamente un backup interno di sicurezza a ogni avvio, ripristinabile dalla stessa schermata.',
    },
    {
      question: 'Cosa sono i dati di esempio?',
      answer: 'Se l\'app è vuota al primo avvio, viene precaricata con alcuni prodotti di esempio (contrassegnati con l\'etichetta "Esempio") per farti vedere come funziona. Puoi rimuoverli in ogni momento da Impostazioni: verrà creato automaticamente un backup di sicurezza prima della rimozione.',
    },
    {
      question: 'Come condivido la dispensa con altre persone?',
      answer: 'In Impostazioni → Dispensa condivisa trovi il tuo codice invito: toccalo per copiarlo oppure usa “Invita qualcuno”. Chi lo riceve, dopo aver creato il suo account, va in Impostazioni → “Entra con un codice”. Da quel momento vedete e modificate la stessa dispensa e le modifiche arrivano a tutti in tempo reale. Chi ha creato la dispensa può togliere un membro o generare un nuovo codice; chiunque può uscire e tenersi una copia dei prodotti.',
    },
    {
      question: 'Come funziona la lista della spesa automatica?',
      answer: 'Se attivi la soglia di scorta minima su un prodotto, quando la quantità scende sotto quella soglia l\'app lo suggerisce nella Lista della spesa. Puoi accettare il suggerimento con un tap oppure aggiungere voci manualmente in qualsiasi momento.',
    },
  ];

  constructor(auth: AuthService) {
    if (auth.enabled) {
      // Versione web con account: i dati sono anche salvati online, nello spazio privato dell'utente.
      this.faqs[0] = {
        question: 'Dove vengono salvati i miei dati?',
        answer: 'Sul tuo dispositivo e, in copia, nel tuo account: così li ritrovi anche cambiando telefono. La dispensa online è privata: il database permette di leggerla e modificarla solo a chi ha effettuato l’accesso con il tuo account. Se esci dall’account i dati vengono rimossi da questo dispositivo, e dalle Impostazioni puoi eliminare definitivamente account e dati online.',
      };
    }
  }
}
