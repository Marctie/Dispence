import { Injectable } from '@angular/core';
import { Recipe } from '../models/recipe.model';
import { ProductService } from './product.service';
import { RECIPES_DATASET } from '../data/recipes.data';

export interface RecipeWithScore extends Recipe {
  matchScore: number;
  matchedCount: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  readonly all: Recipe[] = RECIPES_DATASET;

  constructor(private productService: ProductService) {}

  getWithScores(): RecipeWithScore[] {
    const products = this.productService.getAll();
    const names = products.map(p => p.name.toLowerCase().trim());

    return this.all.map(recipe => {
      const matched: string[] = [];
      const missing: string[] = [];

      for (const ing of recipe.ingredients) {
        const ingLower = ing.toLowerCase();
        const found = names.some(n => n.includes(ingLower) || ingLower.includes(n));
        (found ? matched : missing).push(ing);
      }

      return {
        ...recipe,
        matchScore: matched.length / recipe.ingredients.length,
        matchedCount: matched.length,
        matchedIngredients: matched,
        missingIngredients: missing,
      };
    });
  }

  getSorted(): RecipeWithScore[] {
    return this.getWithScores().sort((a, b) => b.matchScore - a.matchScore);
  }

  getAvailable(): RecipeWithScore[] {
    return this.getWithScores()
      .filter(r => r.matchScore >= 0.7)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  getAlmostReady(): RecipeWithScore[] {
    return this.getWithScores()
      .filter(r => r.matchScore >= 0.4 && r.matchScore < 0.7)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  getAntiWaste(): RecipeWithScore[] {
    const expiring = this.productService.getExpiringWithinDays(7).map(p => p.name.toLowerCase());
    return this.getWithScores()
      .filter(r => r.matchedIngredients.some(ing => expiring.some(e => e.includes(ing) || ing.includes(e))))
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}
