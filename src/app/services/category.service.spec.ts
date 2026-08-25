import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { DEFAULT_CATEGORIES } from '../models/category.model';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryService);
  });

  it('starts with only the default categories', () => {
    expect(service.getAll().length).toBe(DEFAULT_CATEGORIES.length);
  });

  it('adds a custom category and marks it as custom', () => {
    const cat = service.add('Snack', '🍿', '#ff9800');
    expect(service.getById(cat.id)?.name).toBe('Snack');
    expect(service.isCustom(cat.id)).toBeTrue();
  });

  it('rejects a duplicate category name', () => {
    service.add('Snack', '🍿', '#ff9800');
    expect(() => service.add('Snack', '🍿', '#ff9800')).toThrow();
  });

  it('refuses to update or delete a default category', () => {
    const defaultId = DEFAULT_CATEGORIES[0].id;
    expect(() => service.update(defaultId, { name: 'Nuovo nome' })).toThrow();
    expect(() => service.delete(defaultId)).toThrow();
  });

  it('updates and deletes a custom category', () => {
    const cat = service.add('Snack', '🍿', '#ff9800');
    service.update(cat.id, { name: 'Snack salati' });
    expect(service.getById(cat.id)?.name).toBe('Snack salati');

    service.delete(cat.id);
    expect(service.getById(cat.id)).toBeUndefined();
  });

  it('persists custom categories across service instances', () => {
    service.add('Snack', '🍿', '#ff9800');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(CategoryService);
    expect(reloaded.getAll().length).toBe(DEFAULT_CATEGORIES.length + 1);
  });
});
