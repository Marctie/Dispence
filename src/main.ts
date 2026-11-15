import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';

import { AppModule } from './app/app.module';
import { AUTH_HASH_KEY } from './app/services/auth.service';

// Link da email (conferma account / reimposta password): il router Angular cancellerebbe il
// frammento #access_token=..., quindi lo salviamo prima dell'avvio e ripuliamo l'indirizzo.
if (/(access_token|error_description)=/.test(location.hash)) {
  try { sessionStorage.setItem(AUTH_HASH_KEY, location.hash); } catch { /* non disponibile */ }
  history.replaceState(null, '', location.pathname + location.search);
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));

// PWA (solo web, es. GitHub Pages / iPhone): nell'app nativa il service worker non serve.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && location.protocol === 'https:') {
  // Chiede al browser di non cancellare i dati locali (localStorage) per liberare spazio
  (navigator as any).storage?.persist?.().catch(() => undefined);
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI).href)
      .catch(e => console.error('Registrazione service worker non riuscita', e));
  });
}
