import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DIFFICULTY_LABELS, Recipe } from '../../models/recipe.model';

/** Modulo per creare o modificare una ricetta personale (stessa struttura di quelle incluse). */
@Component({
  selector: 'app-recipe-form',
  templateUrl: 'recipe-form.component.html',
  styleUrls: ['recipe-form.component.scss'],
  standalone: false,
})
export class RecipeFormComponent implements OnInit {
  @Input() recipe?: Recipe;

  name = '';
  emoji = '🍽️';
  description = '';
  difficulty: Recipe['difficulty'] = 'easy';
  time: number | null = 20;
  servings: number | null = 2;
  ingredients: { text: string }[] = [{ text: '' }];
  steps: { text: string }[] = [{ text: '' }];

  readonly emojis = ['🍽️', '🍝', '🍕', '🥗', '🍲', '🥘', '🍛', '🍳', '🥩', '🍗', '🐟', '🥦', '🍰', '🍪', '🥞', '🥪', '🍜', '🌮'];
  readonly difficultyOptions = Object.entries(DIFFICULTY_LABELS) as [Recipe['difficulty'], string][];

  get isEdit(): boolean { return !!this.recipe; }

  get isValid(): boolean {
    return this.name.trim().length > 0 && this.cleanIngredients.length > 0;
  }

  private get cleanIngredients(): string[] {
    return this.ingredients.map(i => i.text.trim()).filter(Boolean);
  }

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    const r = this.recipe;
    if (!r) return;
    this.name = r.name;
    this.emoji = r.emoji ?? '🍽️';
    this.description = r.description;
    this.difficulty = r.difficulty;
    this.time = r.time;
    this.servings = r.servings ?? null;
    this.ingredients = r.ingredients.length ? r.ingredients.map(text => ({ text })) : [{ text: '' }];
    this.steps = r.steps?.length ? r.steps.map(text => ({ text })) : [{ text: '' }];
  }

  addIngredient(): void { this.ingredients.push({ text: '' }); }
  removeIngredient(i: number): void {
    this.ingredients.splice(i, 1);
    if (!this.ingredients.length) this.ingredients.push({ text: '' });
  }

  addStep(): void { this.steps.push({ text: '' }); }
  removeStep(i: number): void {
    this.steps.splice(i, 1);
    if (!this.steps.length) this.steps.push({ text: '' });
  }
  moveStep(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= this.steps.length) return;
    [this.steps[i], this.steps[j]] = [this.steps[j], this.steps[i]];
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    if (!this.isValid) return;
    const data: Omit<Recipe, 'id' | 'custom' | 'createdAt'> = {
      name: this.name.trim(),
      emoji: this.emoji,
      description: this.description.trim(),
      difficulty: this.difficulty,
      time: Math.max(1, Math.round(Number(this.time) || 0)) || 20,
      servings: this.servings ? Math.max(1, Math.round(Number(this.servings))) : undefined,
      ingredients: this.cleanIngredients,
      steps: this.steps.map(s => s.text.trim()).filter(Boolean),
    };
    void this.modalCtrl.dismiss(data, 'save');
  }
}
