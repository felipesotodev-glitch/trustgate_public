(function (global) {
  // US-6201 (funcional): punto de entrada embebible para widget de consentimientos, manteniendo compatibilidad con el widget legado.
  const sdk = global.TrustGateWidgetSDK || {};

  class TrustGateConsentWidgetBridge {
    constructor(widgetConfig = {}) {
      this.config = sdk.normalizeConfig ? sdk.normalizeConfig(widgetConfig) : widgetConfig;
      this.loaded = false;
    }

    async mount() {
      if (global.TrustGateWidget && typeof global.TrustGateWidget.destroy === 'function') {
        global.TrustGateWidget.destroy();
      }

      global.TrustGateConfig = {
        clientKey: this.config.clientKey,
        identifier: this.config.identifier,
        email: this.config.email,
        rut: this.config.rut,
        mode: this.config.mode,
        targetId: this.config.targetId,
        purposeIds: this.config.purposeIds,
        channelIds: this.config.channelIds,
        channelCodes: this.config.channelCodes,
        skipInitialStatusCheck: this.config.skipInitialStatusCheck,
        statusEndpoint: this.config.statusEndpoint,
        onGranted: this.config.onGranted,
        onRevoked: this.config.onRevoked,
        onError: this.config.onError
      };

      await (sdk.loadScriptOnce
        ? sdk.loadScriptOnce('/assets/trustgate-widget.js')
        : Promise.resolve());

      this.loaded = true;
      return global.TrustGateWidget || null;
    }

    open() {
      if (global.TrustGateWidget && typeof global.TrustGateWidget.open === 'function') {
        global.TrustGateWidget.open();
      }
    }

    close() {
      if (global.TrustGateWidget && typeof global.TrustGateWidget.close === 'function') {
        global.TrustGateWidget.close();
      }
    }

    reload() {
      if (global.TrustGateWidget && typeof global.TrustGateWidget.reload === 'function') {
        return global.TrustGateWidget.reload();
      }
      return Promise.resolve();
    }

    destroy() {
      if (global.TrustGateWidget && typeof global.TrustGateWidget.destroy === 'function') {
        global.TrustGateWidget.destroy();
      }
      this.loaded = false;
    }
  }

  global.TrustGateConsentWidget = {
    mount(widgetConfig = {}) {
      const bridge = new TrustGateConsentWidgetBridge(widgetConfig);
      return bridge.mount().then(() => {
        global.TrustGateConsentWidget.open = () => bridge.open();
        global.TrustGateConsentWidget.close = () => bridge.close();
        global.TrustGateConsentWidget.reload = () => bridge.reload();
        global.TrustGateConsentWidget.destroy = () => bridge.destroy();
        return global.TrustGateConsentWidget;
      });
    },
    open() {},
    close() {},
    reload() { return Promise.resolve(); },
    destroy() {}
  };

  const bootstrapConfig = global.TrustGateConsentConfig || global.TrustGateConfig;
  if (bootstrapConfig) {
    void global.TrustGateConsentWidget.mount(bootstrapConfig);
  }
})(window);
