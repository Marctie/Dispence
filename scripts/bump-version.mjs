// Aggiorna il numero di versione del progetto in tutti i punti in cui compare.
// Uso: npm run version:bump [-- patch|minor|major]   (predefinito: patch)
//
// Fonte unica: "version" in package.json (es. 1.2.1). Lo script la incrementa e la copia in:
//   - package-lock.json (versione del progetto)
//   - src/environments/environment*.ts (appVersion, mostrata in Impostazioni e nella telemetria)
//   - android/app/build.gradle (versionName = stessa versione, versionCode + 1 per il Play Store)
import { readFileSync, writeFileSync } from 'node:fs';

const level = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Livello non valido: ${level} (usa patch, minor o major)`);
  process.exit(1);
}

const read = p => readFileSync(p, 'utf8').replace(/^﻿/, '');
const write = (p, s) => writeFileSync(p, s, 'utf8'); // senza BOM: Gradle non lo accetta

const pkg = JSON.parse(read('package.json'));
const [maj, min, pat] = pkg.version.split('.').map(Number);
const next = level === 'major' ? `${maj + 1}.0.0` : level === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;

pkg.version = next;
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

const lock = JSON.parse(read('package-lock.json'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
write('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

for (const p of ['src/environments/environment.ts', 'src/environments/environment.prod.ts']) {
  write(p, read(p).replace(/appVersion: '[^']*'/, `appVersion: '${next}'`));
}

const gradlePath = 'android/app/build.gradle';
let gradle = read(gradlePath);
let code = 0;
gradle = gradle
  .replace(/versionCode (\d+)/, (_, c) => `versionCode ${(code = Number(c) + 1)}`)
  .replace(/versionName "[^"]*"/, `versionName "${next}"`);
write(gradlePath, gradle);

console.log(`Versione ${next} (versionCode ${code})`);
