import { AiImportService } from './ai-import.service';
import { Product } from '../models/product.model';

describe('AiImportService (dati dall\'assistente)', () => {
  it('ripulisce un prodotto arrivato dal server', () => {
    const it = AiImportService.sanitizeItem({
      name: '  Latte   intero ', quantity: -2, unit: 'vaschetta', category: '../x', location: 'cantina',
      expiryDate: '2026-13-45', expiryEstimated: true, expiryText: 'boh',
    });
    expect(it).toEqual({
      name: 'Latte intero', quantity: 1, unit: 'pz', category: 'altro', location: 'pantry',
      expiryDate: null, expiryEstimated: false, expiryText: 'boh',
    });
    expect(AiImportService.sanitizeItem({ name: '   ' })).toBeNull();
    expect(AiImportService.sanitizeItem('testo')).toBeNull();
  });

  it('legge un elenco del server e scarta i prodotti non validi', () => {
    const job = AiImportService.toJob({
      id: 'a1', status: 'done', input_text: 'latte', created_at: '2026-11-19T10:00:00Z', attempts: 1,
      result: { items: [
        { name: 'Latte', quantity: 2, unit: 'l', category: 'latticini', location: 'fridge', expiryDate: '2026-11-25', expiryEstimated: true },
        { name: '' },
      ], notUnderstood: ['boh'], seconds: 12 },
    });
    expect(job.status).toBe('done');
    expect(job.items.length).toBe(1);
    expect(job.items[0].expiryEstimated).toBeTrue();
    expect(job.notUnderstood).toEqual(['boh']);
    expect(AiImportService.toJob({ id: 'b', status: 'strano' }).status).toBe('pending');
  });

  it('riconosce lo stesso prodotto già in dispensa', () => {
    const p: Product = {
      id: 'p1', name: 'Latte', category: 'latticini', location: 'fridge', quantity: 1, unit: 'l',
      expiryDate: '2026-11-25', notes: '', addedAt: '', lowStockThreshold: null, price: null,
    };
    const item = { name: 'latte ', quantity: 2, unit: 'l', category: 'latticini', location: 'fridge' as const,
      expiryDate: '2026-11-25', expiryEstimated: false, expiryText: '' };
    expect(AiImportService.findSame([p], item)?.id).toBe('p1');
    expect(AiImportService.findSame([p], { ...item, location: 'freezer' })).toBeNull();
    expect(AiImportService.findSame([p], { ...item, expiryDate: null })).toBeNull();
  });
});
