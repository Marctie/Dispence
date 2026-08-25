import { TestBed } from '@angular/core/testing';
import { BackupService } from './backup.service';
import { ProductService } from './product.service';

describe('BackupService', () => {
  let backupService: BackupService;
  let productService: ProductService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    backupService = TestBed.inject(BackupService);
    productService = TestBed.inject(ProductService);
  });

  it('exports a backup whose checksum verifies successfully', async () => {
    productService.add({
      name: 'Latte', category: 'latticini', location: 'fridge',
      quantity: 1, unit: 'l', expiryDate: null, notes: '',
      price: null, lowStockThreshold: null,
    });

    await backupService.runSilentAutoBackup();
    const backup = backupService.getAutoBackup();
    expect(backup).toBeTruthy();
    expect(await backupService.verify(backup!)).toBeTrue();
  });

  it('rejects a tampered backup file (checksum mismatch)', async () => {
    productService.add({
      name: 'Pasta', category: 'cereali', location: 'pantry',
      quantity: 1, unit: 'conf', expiryDate: null, notes: '',
      price: null, lowStockThreshold: null,
    });

    await backupService.runSilentAutoBackup();
    const backup = backupService.getAutoBackup()!;
    backup.data.products[0].name = 'Manomesso';
    const tamperedJson = JSON.stringify(backup);

    await expectAsync(backupService.restoreFromJson(tamperedJson)).toBeRejected();
  });

  it('restores products from a valid backup', async () => {
    productService.add({
      name: 'Riso', category: 'cereali', location: 'pantry',
      quantity: 1, unit: 'kg', expiryDate: null, notes: '',
      price: null, lowStockThreshold: null,
    });
    await backupService.runSilentAutoBackup();
    const backup = backupService.getAutoBackup()!;
    const json = JSON.stringify(backup);

    productService.replaceAll([]);
    expect(productService.getAll().length).toBe(0);

    await backupService.restoreFromJson(json);
    expect(productService.getAll().length).toBe(1);
    expect(productService.getAll()[0].name).toBe('Riso');
  });
});
