import { Component } from '@angular/core';

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
      question: 'Come ricevo le notifiche di scadenza?',
      answer: 'Dalle Impostazioni puoi attivare le notifiche e scegliere con quanti giorni di anticipo vuoi essere avvisato. Le notifiche sono generate localmente sul dispositivo, non richiedono connessione e non passano da server esterni.',
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
      question: 'Come funziona la lista della spesa automatica?',
      answer: 'Se attivi la soglia di scorta minima su un prodotto, quando la quantità scende sotto quella soglia l\'app lo suggerisce nella Lista della spesa. Puoi accettare il suggerimento con un tap oppure aggiungere voci manualmente in qualsiasi momento.',
    },
  ];
}
