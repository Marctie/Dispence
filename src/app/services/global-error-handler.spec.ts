import { GlobalErrorHandler } from './global-error-handler';
import { TelemetryService } from './telemetry.service';

describe('GlobalErrorHandler', () => {
  it('registra l\'errore nella telemetria e continua a scriverlo in console', () => {
    const t = new TelemetryService();
    const capture = spyOn(t, 'captureError');
    const raw = spyOn(t, 'consoleErrorRaw');
    const err = new Error('rotto nel template');
    new GlobalErrorHandler(t).handleError(err);
    expect(capture).toHaveBeenCalledWith(err, 'angular');
    expect(raw).toHaveBeenCalledWith('ERROR', err);
  });

  it('per le promesse rifiutate invia l\'errore originale', () => {
    const t = new TelemetryService();
    const capture = spyOn(t, 'captureError');
    spyOn(t, 'consoleErrorRaw');
    const inner = new Error('vero motivo');
    new GlobalErrorHandler(t).handleError({ rejection: inner, message: 'Uncaught (in promise)' });
    expect(capture).toHaveBeenCalledWith(inner, 'angular');
  });

  it('non va in errore anche se la console fallisce', () => {
    const t = new TelemetryService();
    spyOn(t, 'consoleErrorRaw').and.callThrough();
    expect(() => new GlobalErrorHandler(t).handleError('stringa')).not.toThrow();
  });
});
