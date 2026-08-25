import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Category } from '../models/category.model';
import { CategoryService } from '../services/category.service';

const EMOJI_CHOICES = ['🥦','🍎','🧀','🥩','🐟','🌾','🥫','🧃','🍫','🧂','🧊','📦','🧻','🧴','🍞','☕','🍷','🐾'];
const COLOR_CHOICES = ['#4caf50','#e53935','#fdd835','#f4511e','#039be5','#fb8c00','#8d6e63','#00acc1','#ab47bc','#78909c','#42a5f5','#90a4ae'];

@Component({
  selector: 'app-manage-categories',
  templateUrl: 'manage-categories.page.html',
  styleUrls: ['manage-categories.page.scss'],
  standalone: false,
})
export class ManageCategoriesPage implements OnInit {
  categories: Category[] = [];

  constructor(
    private categoryService: CategoryService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ionViewWillEnter(): void {
    this.load();
  }

  private load(): void {
    this.categories = this.categoryService.getAll();
  }

  isCustom(cat: Category): boolean {
    return this.categoryService.isCustom(cat.id);
  }

  async addCategory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nuova categoria',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nome (es. Snack)' },
        { name: 'emoji', type: 'text', placeholder: `Emoji (es. ${EMOJI_CHOICES[0]})`, value: EMOJI_CHOICES[0] },
        { name: 'color', type: 'text', placeholder: `Colore hex (es. ${COLOR_CHOICES[0]})`, value: COLOR_CHOICES[0] },
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Crea',
          handler: async (data) => {
            const name = (data.name || '').trim();
            if (!name) { this.showToast('Il nome è obbligatorio'); return false; }
            try {
              this.categoryService.add(name, data.emoji || '📦', data.color || COLOR_CHOICES[0]);
              this.load();
              this.showToast('Categoria creata');
              return true;
            } catch (e: any) {
              this.showToast(e.message ?? 'Errore nella creazione');
              return false;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async editCategory(cat: Category): Promise<void> {
    if (!this.isCustom(cat)) {
      this.showToast('Le categorie predefinite non sono modificabili');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Modifica categoria',
      inputs: [
        { name: 'name', type: 'text', value: cat.name },
        { name: 'emoji', type: 'text', value: cat.emoji },
        { name: 'color', type: 'text', value: cat.color },
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva',
          handler: (data) => {
            const name = (data.name || '').trim();
            if (!name) { this.showToast('Il nome è obbligatorio'); return false; }
            this.categoryService.update(cat.id, { name, emoji: data.emoji, color: data.color });
            this.load();
            this.showToast('Categoria aggiornata');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteCategory(cat: Category): Promise<void> {
    if (!this.isCustom(cat)) {
      this.showToast('Le categorie predefinite non possono essere eliminate');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Eliminare categoria?',
      message: `I prodotti già assegnati a "${cat.name}" manterranno il riferimento ma la categoria non sarà più selezionabile.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.categoryService.delete(cat.id);
            this.load();
            this.showToast('Categoria eliminata');
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
