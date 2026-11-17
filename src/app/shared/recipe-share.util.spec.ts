import { Recipe } from '../models/recipe.model';
import { buildShareMessage, decodeSharedRecipe, encodeRecipe } from './recipe-share.util';

describe('recipe-share.util', () => {
  const recipe: Recipe = {
    id: 'custom-1', name: 'Lasagne della nonna', emoji: '🍝', custom: true,
    description: 'Con ragù e besciamella, però leggera',
    difficulty: 'hard', time: 120, servings: 6,
    ingredients: ['500 g carne macinata', 'sfoglia', 'besciamella'],
    steps: ['Prepara il ragù.', 'Alterna gli strati.', 'Inforna a 180 °C.'],
  };

  it('ricostruisce la ricetta dal messaggio completo (accenti ed emoji compresi)', () => {
    const msg = buildShareMessage(recipe, 'https://example.org/app/');
    const back = decodeSharedRecipe(msg)!;
    expect(back.name).toBe(recipe.name);
    expect(back.emoji).toBe('🍝');
    expect(back.description).toBe(recipe.description);
    expect(back.difficulty).toBe('hard');
    expect(back.servings).toBe(6);
    expect(back.ingredients).toEqual(recipe.ingredients);
    expect(back.steps).toEqual(recipe.steps);
  });

  it('legge anche il solo link', () => {
    const back = decodeSharedRecipe(`https://example.org/app/#ricetta=${encodeRecipe(recipe)}`);
    expect(back?.name).toBe(recipe.name);
  });

  it('rifiuta testi senza ricetta o codici rovinati', () => {
    expect(decodeSharedRecipe('ciao, ecco la ricetta')).toBeNull();
    expect(decodeSharedRecipe('DISPENSINA-RICETTA:abcdefghijkl')).toBeNull();
  });
});
