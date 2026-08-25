import { Component, OnInit } from '@angular/core';
import { RecipeService, RecipeWithScore } from '../services/recipe.service';
import { DIFFICULTY_LABELS } from '../models/recipe.model';

type Filter = 'all' | 'available' | 'almost' | 'antiwaste';

@Component({
  selector: 'app-recipes',
  templateUrl: 'recipes.page.html',
  styleUrls: ['recipes.page.scss'],
  standalone: false,
})
export class RecipesPage implements OnInit {
  filter: Filter = 'all';
  search = '';
  selectedRecipe: RecipeWithScore | null = null;
  readonly difficultyLabels = DIFFICULTY_LABELS;

  private _all: RecipeWithScore[] = [];

  constructor(private recipeService: RecipeService) {}

  ngOnInit(): void {
    this._all = this.recipeService.getSorted();
  }

  ionViewWillEnter(): void {
    this._all = this.recipeService.getSorted();
  }

  get filtered(): RecipeWithScore[] {
    let list: RecipeWithScore[];
    switch (this.filter) {
      case 'available':  list = this.recipeService.getAvailable();  break;
      case 'almost':     list = this.recipeService.getAlmostReady(); break;
      case 'antiwaste':  list = this.recipeService.getAntiWaste();  break;
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
}
