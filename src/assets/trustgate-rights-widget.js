(function (global) {
  // US-6202 (funcional): widget embebible para derechos ARCO-P usando la ruta segura de autorización como flujo inicial.
  const sdk = global.TrustGateWidgetSDK || {};

  class TrustGateRightsWidget {
    constructor(widgetConfig = {}) {
      this.config = sdk.normalizeConfig ? sdk.normalizeConfig(widgetConfig) : widgetConfig;
      this.host = null;
      this.shadow = null;
      this.error = '';
      this.isOpen = this.config.mode !== 'inline';
    }

    validateConfig() {
      const runtimeSdk = global.TrustGateWidgetSDK || sdk;
      if (!this.config.token && !this.config.authorizationUrl) {
        throw new Error('token o authorizationUrl son obligatorios para inicializar el widget de derechos.');
      }
      if (this.config.mode === 'inline' && !(runtimeSdk.resolveTarget ? runtimeSdk.resolveTarget(this.config.targetId) : document.getElementById(this.config.targetId))) {
        throw new Error('No se encontro el contenedor inline indicado por targetId.');
      }
    }

    mount() {
      const runtimeSdk = global.TrustGateWidgetSDK || sdk;
      this.validateConfig();
      this.destroy();

      const mountTarget = runtimeSdk.ensureHost
        ? runtimeSdk.ensureHost(this.config.targetId, this.config.mode, 'data-trustgate-rights-widget-host')
        : (() => {
            const host = document.createElement('div');
            host.setAttribute('data-trustgate-rights-widget-host', 'true');
            if (this.config.mode === 'inline') {
              const target = runtimeSdk.resolveTarget ? runtimeSdk.resolveTarget(this.config.targetId) : document.getElementById(this.config.targetId);
              if (!target) {
                throw new Error('No se encontro el contenedor inline indicado por targetId.');
              }
              target.innerHTML = '';
              target.appendChild(host);
            } else {
              document.body.appendChild(host);
            }
            return { host, shadow: host.attachShadow({ mode: 'open' }) };
          })();

      this.host = mountTarget.host;
      this.shadow = mountTarget.shadow;
      this.render();
      if (typeof this.config.onReady === 'function') {
        this.config.onReady({ token: this.config.token, mode: this.config.mode });
      }
      return this;
    }

    buildIframeUrl() {
      const runtimeSdk = global.TrustGateWidgetSDK || sdk;
      const basePath = this.config.authorizationUrl || '/autorizacion';
      return runtimeSdk.buildIframeUrl
        ? runtimeSdk.buildIframeUrl(basePath, this.config.token, {
            title: this.config.title,
            description: this.config.description
          })
        : (() => {
            const normalizedBasePath = basePath.replace(/\/$/, '');
            const path = this.config.token ? `${normalizedBasePath}/${encodeURIComponent(this.config.token)}` : normalizedBasePath;
            const url = new URL(path, window.location.origin);
            if (this.config.title) {
              url.searchParams.set('title', this.config.title);
            }
            if (this.config.description) {
              url.searchParams.set('description', this.config.description);
            }
            return url.toString();
          })();
    }

    open() {
      this.isOpen = true;
      this.render();
      if (typeof this.config.onOpen === 'function') {
        this.config.onOpen({ token: this.config.token });
      }
    }

    close() {
      if (this.config.mode === 'inline') {
        return;
      }
      this.isOpen = false;
      this.render();
      if (typeof this.config.onClose === 'function') {
        this.config.onClose({ token: this.config.token });
      }
    }

    reload() {
      this.render();
      return Promise.resolve();
    }

    destroy() {
      const runtimeSdk = global.TrustGateWidgetSDK || sdk;
      if (runtimeSdk.destroyHost) {
        runtimeSdk.destroyHost(this);
      } else if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
        this.host = null;
        this.shadow = null;
      }
    }

    reportError(message) {
      this.error = message;
      this.render();
      if (typeof this.config.onError === 'function') {
        this.config.onError({ code: 'WIDGET_ERROR', message });
      }
    }

    render() {
      if (!this.shadow) {
        return;
      }

      const iframeUrl = this.buildIframeUrl();
      const hiddenClass = this.isOpen ? '' : 'tg-hidden';
      const rootClass = this.config.mode === 'inline' ? 'tg-rights-shell tg-rights-shell--inline' : 'tg-rights-overlay ' + hiddenClass;
      const cardClass = this.config.mode === 'inline' ? 'tg-rights-card tg-rights-card--inline' : 'tg-rights-card tg-rights-card--modal';

      this.shadow.innerHTML = `
        <style>
          :host { all: initial; }
          .tg-hidden { display: none !important; }
          .tg-rights-overlay { position: fixed; inset: 0; background: rgba(7, 18, 40, 0.72); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .tg-rights-shell--inline { display: block; }
          .tg-rights-card { width: min(1024px, 100%); max-height: min(92vh, 960px); background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); border-radius: 24px; overflow: hidden; border: 1px solid #d6e5f2; box-shadow: 0 24px 60px rgba(7, 18, 40, 0.26); display: flex; flex-direction: column; font-family: Inter, system-ui, sans-serif; }
          .tg-rights-card--inline { width: 100%; max-height: 760px; }
          .tg-rights-head { padding: 24px; border-bottom: 1px solid #d6e5f2; background: radial-gradient(circle at top right, #eaf2ff 0%, #f7fbff 50%); display: flex; align-items: start; justify-content: space-between; gap: 16px; }
          .tg-rights-head h2 { margin: 0; font-size: 26px; color: #0f2d53; }
          .tg-rights-head p { margin: 8px 0 0; color: #47607c; font-size: 14px; }
          .tg-rights-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 4px 10px; background: #eaf2ff; color: #2563eb; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
          .tg-rights-close { border: 0; background: #eaf2ff; color: #123456; border-radius: 12px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
          .tg-rights-body { flex: 1 1 auto; min-height: 0; }
          .tg-rights-frame { width: 100%; height: min(72vh, 760px); border: 0; display: block; background: #fff; }
          .tg-rights-card--inline .tg-rights-frame { height: 680px; }
          .tg-rights-error { margin: 16px 24px 0; padding: 12px 14px; border-radius: 14px; background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; font-size: 14px; }
          .tg-rights-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px 24px; }
          .tg-rights-button { border: 0; border-radius: 14px; padding: 12px 16px; font-size: 14px; font-weight: 700; cursor: pointer; }
          .tg-rights-button--primary { background: #2563eb; color: #fff; }
          .tg-rights-button--ghost { background: #eaf2ff; color: #123456; }
          @media (max-width: 720px) {
            .tg-rights-overlay { padding: 12px; }
            .tg-rights-head, .tg-rights-footer { padding-left: 16px; padding-right: 16px; }
            .tg-rights-card { max-height: 94vh; }
            .tg-rights-frame { height: 72vh; }
          }
        </style>
        <div class="${rootClass}">
          <section class="${cardClass}" role="dialog" aria-label="Widget de derechos TrustGate">
            <header class="tg-rights-head">
              <div>
                <span class="tg-rights-badge">TrustGate</span>
                <h2>${this.escapeHtml(this.config.title || 'Centro de derechos ARCO-P')}</h2>
                <p>${this.escapeHtml(this.config.description || 'Gestiona solicitudes de acceso, rectificación, cancelación, oposición y portabilidad desde tu portal de clientes.')}</p>
              </div>
              ${this.config.mode === 'inline' ? '' : '<button type="button" class="tg-rights-close" data-action="close">Cerrar</button>'}
            </header>
            ${this.error ? `<div class="tg-rights-error">${this.escapeHtml(this.error)}</div>` : ''}
            <div class="tg-rights-body">
              <iframe class="tg-rights-frame" src="${this.escapeHtml(iframeUrl)}" title="Widget de derechos TrustGate" loading="lazy" referrerpolicy="no-referrer"></iframe>
            </div>
            <footer class="tg-rights-footer">
              <button type="button" class="tg-rights-button tg-rights-button--ghost" data-action="reload">Recargar</button>
              <button type="button" class="tg-rights-button tg-rights-button--primary" data-action="open">Abrir widget</button>
            </footer>
          </section>
        </div>
      `;

      const closeButton = this.shadow.querySelector('[data-action="close"]');
      if (closeButton) {
        closeButton.addEventListener('click', () => this.close());
      }

      const reloadButton = this.shadow.querySelector('[data-action="reload"]');
      if (reloadButton) {
        reloadButton.addEventListener('click', () => this.reload());
      }

      const openButton = this.shadow.querySelector('[data-action="open"]');
      if (openButton) {
        openButton.addEventListener('click', () => this.open());
      }
    }

    escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  global.TrustGateRightsWidget = {
    mount(widgetConfig = {}) {
      const widget = new TrustGateRightsWidget(widgetConfig);
      widget.mount();
      global.TrustGateRightsWidget.open = () => widget.open();
      global.TrustGateRightsWidget.close = () => widget.close();
      global.TrustGateRightsWidget.reload = () => widget.reload();
      global.TrustGateRightsWidget.destroy = () => widget.destroy();
      return global.TrustGateRightsWidget;
    },
    open() {},
    close() {},
    reload() { return Promise.resolve(); },
    destroy() {}
  };

  const bootstrapConfig = global.TrustGateRightsConfig || global.TrustGateConfig;
  if (bootstrapConfig) {
    global.TrustGateRightsWidget.mount(bootstrapConfig);
  }
})(window);
