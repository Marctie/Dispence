import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { buildShareMessage } from '../shared/recipe-share.util';
import { shareText } from '../shared/share.util';
import { Subscription } from 'rxjs';
import { RecipeService, RecipeWithScore } from '../services/recipe.service';
import { DIFFICULTY_LABELS, Recipe } from '../models/recipe.model';
import { RecipeFormComponent } from './recipe-form/recipe-form.component';

type Filter = 'all' | 'available' | 'almost' | 'antiwaste' | 'mine';

@Component({
  selector: 'app-recipes',
  templateUrl: 'recipes.page.html',
  styleUrls: ['recipes.page.scss'],
  standalone: false,
})
export class RecipesPage implements OnInit, OnDestroy {
  filter: Filter = 'all';
  search = '';
  selectedRecipe: RecipeWithScore | null = null;
  readonly difficultyLabels = DIFFICULTY_LABELS;

  private _all: RecipeWithScore[] = [];
  private sub?: Subscription;

  constructor(
    private recipeService: RecipeService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this._all = this.recipeService.getSorted();
    this.sub = this.recipeService.getCustom$().subscribe(() => (this._all = this.recipeService.getSorted()));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this._all = this.recipeService.getSorted();
    const pending = this.recipeService.pendingImport;
    if (pending) {
      this.recipeService.pendingImport = null;
      void this.confirmImport(pending);
    }
  }

  get filtered(): RecipeWithScore[] {
    let list: RecipeWithScore[];
    switch (this.filter) {
      case 'available':  list = this.recipeService.getAvailable();  break;
      case 'almost':     list = this.recipeService.getAlmostReady(); break;
      case 'antiwaste':  list = this.recipeService.getAntiWaste();  break;
      case 'mine':       list = this._all.filter(r => r.custom);    break;
      default:           list = this._all;
    }
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get availableCount(): number { return this.recipeService.getAvailable().length; }
  get almostCount(): number    { return this.recipeService.getAlmostReady().length; }
  get antiwasteCount(): number { return this.recipeService.getAntiWaste().length; }
  get mineCount(): number      { return this.recipeService.getCustom().length; }

  scorePercent(r: RecipeWithScore): number {
    return Math.round(r.matchScore * 100);
  }

  scoreColor(r: RecipeWithScore): string {
    if (r.matchScore >= 0.8) return 'success';
    if (r.matchScore >= 0.5) return 'warning';
    return 'medium';
  }

  openDetail(r: RecipeWithScore): void {
    this.selectedRecipe = r;
  }

  closeDetail(): void {
    this.selectedRecipe = null;
  }

  /** Crea una nuova ricetta personale, o modifica quella indicata. */
  async openForm(recipe?: Recipe): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RecipeFormComponent,
      componentProps: { recipe },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'save' || !data) return;
    if (recipe) {
      this.recipeService.updateCustom(recipe.id, data);
      this.selectedRecipe = this.recipeService.getWithScores().find(r => r.id === recipe.id) ?? null;
    } else {
      const created = this.recipeService.addCustom(data);
      this.filter = 'mine';
      this.selectedRecipe = this.recipeService.getWithScores().find(r => r.id === created.id) ?? null;
    }
  }

  async confirmDelete(recipe: Recipe): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Elimina ricetta',
      message: `Vuoi eliminare "${recipe.name}"?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive', handler: () => {
            this.recipeService.deleteCustom(recipe.id);
            this.closeDetail();
          },
        },
      ],
    });
    await alert.present();
  }

  get hiddenCount(): number { return this.recipeService.hiddenCount; }

  /** Rimuove una ricetta inclusa nell'app (si può ripristinare). */
  async confirmHide(recipe: Recipe): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rimuovi ricetta',
      message: `Vuoi togliere "${recipe.name}" dalle ricette? Potrai ripristinarla in fondo alla lista.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Rimuovi', role: 'destructive', handler: () => {
            this.recipeService.hideBuiltin(recipe.id);
            this.closeDetail();
          },
        },
      ],
    });
    await alert.present();
  }

  async restoreHidden(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Ripristina ricette',
      message: `Rimettere le ${this.hiddenCount} ricette che avevi rimosso?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Ripristina', handler: () => this.recipeService.restoreHidden() },
      ],
    });
    await alert.present();
  }

  async share(recipe: Recipe): Promise<void> {
    const res = await shareText(recipe.name, buildShareMessage(recipe, environment.webUrl));
    if (res === 'copied') await this.toast('Ricetta copiata: incollala in un messaggio');
  }

  /** Importa una ricetta da un messaggio o link incollato. */
  async openImport(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Importa ricetta',
      message: 'Incolla qui il messaggio o il link che ti hanno mandato.',
      inputs: [{ name: 'text', type: 'textarea', placeholder: 'Incolla il messaggio...', attributes: { rows: 5 } }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Importa', handler: v => {
            const data = this.recipeService.parseShared(String(v?.text ?? ''));
            if (!data) {
              void this.toast('Nel testo non c\'è una ricetta di Dispensina: incolla il messaggio completo');
              return false;
            }
            void this.confirmImport(data);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmImport(data: Omit<Recipe, 'id' | 'custom' | 'createdAt'>): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Ricetta ricevuta',
      message: `${data.emoji ?? ''} ${data.name} · ${data.ingredients.length} ingredienti` +
        (data.steps?.length ? `, ${data.steps.length} passaggi` : '') + '. Vuoi salvarla tra le tue ricette?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Salva', handler: () => {
            const created = this.recipeService.importShared(data);
            this.filter = 'mine';
            this.selectedRecipe = this.recipeService.getWithScores().find(r => r.id === created.id) ?? null;
            void this.toast('Ricetta salvata in "Le mie"');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
