/**
 * trustgate-widget.js — placeholder
 *
 * Este archivo es un placeholder. En producción, reemplázalo con
 * el widget real de TrustGate compilado.
 *
 * El widget debe:
 * 1. Leer window.TrustGateConfig
 * 2. Exponer window.TrustGateWidget con métodos open() y close()
 * 3. Llamar onGranted, onRevoked, onError según corresponda
 */
(function () {
  const config = window.TrustGateConfig || {};
  console.info('[TrustGate Widget] Cargado en modo placeholder');
  console.info('[TrustGate Widget] Config:', JSON.stringify({ ...config, clientKey: '***' }));

  window.TrustGateWidget = {
    open() {
      console.info('[TrustGate Widget] open() llamado (placeholder)');
      if (typeof config.onError === 'function') {
        config.onError({ code: 'PLACEHOLDER', message: 'Este es un widget de demostración. Integra el widget real en producción.' });
      }
    },
    close() {
      console.info('[TrustGate Widget] close() llamado (placeholder)');
    }
  };

  if (config.mode !== 'inline') {
    window.TrustGateWidget.open();
  }
})();
