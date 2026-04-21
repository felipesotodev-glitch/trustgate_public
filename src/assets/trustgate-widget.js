(function () {
  const config = window.TrustGateConfig || {};
  const allowedModes = new Set(['banner', 'modal', 'inline']);

  class TrustGateDemoWidget {
    constructor(widgetConfig) {
      this.config = {
        clientKey: typeof widgetConfig.clientKey === 'string' ? widgetConfig.clientKey.trim() : '',
        identifier: typeof widgetConfig.identifier === 'string' ? widgetConfig.identifier.trim() : '',
        mode: allowedModes.has(widgetConfig.mode) ? widgetConfig.mode : 'banner',
        targetId: widgetConfig.targetId,
        skipInitialStatusCheck: widgetConfig.skipInitialStatusCheck === true,
        onGranted: widgetConfig.onGranted,
        onRevoked: widgetConfig.onRevoked,
        onError: widgetConfig.onError
      };
      this.state = {
        open: this.config.mode === 'inline',
        loading: false,
        busyAction: '',
        purposes: [],
        consents: [],
        selections: {},
        error: '',
        info: ''
      };
      this.host = null;
      this.shadow = null;
      this.overlayClickHandler = null;
    }

    async init() {
      try {
        this.validateConfig();
        this.mount();
        await this.loadData();
        this.render();
      } catch (error) {
        this.reportError(error);
      }
    }

    validateConfig() {
      if (!this.config.clientKey) {
        throw new Error('clientKey es obligatorio para inicializar el widget.');
      }
      if (!this.config.identifier) {
        throw new Error('identifier es obligatorio para inicializar el widget.');
      }
      if (this.config.mode === 'inline' && !this.resolveInlineTarget()) {
        throw new Error('No se encontro el contenedor inline indicado por targetId.');
      }
    }

    resolveInlineTarget() {
      if (!this.config.targetId) {
        return null;
      }
      return document.getElementById(this.config.targetId);
    }

    mount() {
      this.destroy();

      this.host = document.createElement('div');
      this.host.setAttribute('data-trustgate-widget-host', 'true');
      this.shadow = this.host.attachShadow({ mode: 'open' });

      if (this.config.mode === 'inline') {
        const target = this.resolveInlineTarget();
        target.innerHTML = '';
        target.appendChild(this.host);
      } else {
        document.body.appendChild(this.host);
      }
    }

    async loadData() {
      this.state.loading = true;
      this.state.error = '';
      this.state.info = '';
      this.render();

      try {
        const purposesPromise = this.fetchJson('/api/v1/public/consent/purposes');
        const statusPromise = this.config.skipInitialStatusCheck
          ? Promise.resolve(null)
          : this.fetchJson(
              '/api/v1/public/consent/status?identifier=' + encodeURIComponent(this.config.identifier),
              { allowNotFound: true }
            );

        const [purposes, status] = await Promise.all([purposesPromise, statusPromise]);
        this.state.purposes = Array.isArray(purposes) ? purposes : [];
        this.state.consents = status && Array.isArray(status.consents) ? status.consents : [];
        if (this.config.skipInitialStatusCheck) {
          this.state.info = 'Estado inicial omitido para la demo; puedes otorgar consentimiento y luego actualizar.';
        } else if (status && status.notFound) {
          this.state.info = 'El titular aun no registra consentimientos; puedes otorgarlos desde este widget.';
        }
      } finally {
        this.state.loading = false;
      }
    }

    async fetchJson(url, options) {
      const response = await fetch(url, {
        method: options && options.method ? options.method : 'GET',
        headers: this.buildHeaders(),
        body: options && options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();

      if (response.ok) {
        return data;
      }

      if (options && options.allowNotFound && response.status === 404) {
        return { notFound: true, detail: this.extractMessage(data) };
      }

      const message = this.extractMessage(data) || 'La solicitud al widget no pudo procesarse.';
      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    buildHeaders() {
      return {
        'Content-Type': 'application/json',
        'x-client-key': this.config.clientKey
      };
    }

    extractMessage(payload) {
      if (!payload) {
        return '';
      }
      if (typeof payload === 'string') {
        return payload;
      }
      if (typeof payload.detail === 'string') {
        return payload.detail;
      }
      if (typeof payload.message === 'string') {
        return payload.message;
      }
      if (typeof payload.error === 'string') {
        return payload.error;
      }
      return '';
    }

    getConsentStatus(purposeId, channelCode) {
      const match = this.state.consents.find(
        (item) => item.purposeId === purposeId && item.channel === channelCode
      );
      return match ? match.status : 'sin_registro';
    }

    selectionKey(purposeId, channelId) {
      return String(purposeId) + ':' + String(channelId);
    }

    toggleSelection(purposeId, channelId) {
      const key = this.selectionKey(purposeId, channelId);
      this.state.selections[key] = !this.state.selections[key];
      this.render();
    }

    getSelectedGroups() {
      const grouped = new Map();

      this.state.purposes.forEach((purpose) => {
        (purpose.canales || []).forEach((channel) => {
          const key = this.selectionKey(purpose.id, channel.id);
          if (!this.state.selections[key]) {
            return;
          }
          const purposeKey = String(purpose.id);
          if (!grouped.has(purposeKey)) {
            grouped.set(purposeKey, {
              idFinalidad: purpose.id,
              idCanales: []
            });
          }
          grouped.get(purposeKey).idCanales.push(channel.id);
        });
      });

      return Array.from(grouped.values());
    }

    clearSelections() {
      this.state.selections = {};
    }

    async grantSelected() {
      await this.submitSelection('grant');
    }

    async revokeSelected() {
      await this.submitSelection('revoke');
    }

    async submitSelection(action) {
      const purposes = this.getSelectedGroups();
      if (purposes.length === 0) {
        this.state.error = 'Selecciona al menos una finalidad/canal antes de continuar.';
        this.render();
        return;
      }

      this.state.busyAction = action;
      this.state.error = '';
      this.state.info = '';
      this.render();

      try {
        const body = {
          identifier: this.config.identifier,
          purposes: purposes,
          clientMetadata: {
            pageUrl: window.location.href,
            userAgent: navigator.userAgent
          }
        };

        if (action === 'grant') {
          body.acceptanceAction = 'WIDGET_DEMO';
        } else {
          body.reason = 'Revocacion solicitada desde widget demo';
        }

        const endpoint = action === 'grant'
          ? '/api/v1/public/consent/grant'
          : '/api/v1/public/consent/revoke';

        const response = await this.fetchJson(endpoint, {
          method: 'POST',
          body: body
        });

        this.clearSelections();
        await this.loadData();
        this.state.info = action === 'grant'
          ? 'Consentimiento otorgado correctamente.'
          : 'Consentimiento revocado correctamente.';

        if (action === 'grant' && typeof this.config.onGranted === 'function') {
          this.config.onGranted(response);
        }
        if (action === 'revoke' && typeof this.config.onRevoked === 'function') {
          this.config.onRevoked(response);
        }
        this.render();
      } catch (error) {
        this.reportError(error);
      } finally {
        this.state.busyAction = '';
        this.render();
      }
    }

    open() {
      this.state.open = true;
      this.render();
    }

    close() {
      if (this.config.mode !== 'inline') {
        this.state.open = false;
        this.render();
      }
    }

    destroy() {
      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
      this.host = null;
      this.shadow = null;
    }

    reportError(error) {
      const message = error instanceof Error ? error.message : 'Error desconocido en el widget.';
      this.state.error = message;
      this.state.info = '';
      this.render();
      if (typeof this.config.onError === 'function') {
        this.config.onError({
          code: error && error.status ? String(error.status) : 'WIDGET_ERROR',
          message: message,
          detail: error && error.payload ? error.payload : undefined
        });
      }
    }

    bindEvents() {
      if (!this.shadow) {
        return;
      }

      this.shadow.querySelectorAll('[data-toggle]').forEach((element) => {
        element.addEventListener('change', (event) => {
          const target = event.currentTarget;
          const purposeId = Number(target.getAttribute('data-purpose-id'));
          const channelId = Number(target.getAttribute('data-channel-id'));
          this.toggleSelection(purposeId, channelId);
        });
      });

      const grantButton = this.shadow.querySelector('[data-action="grant"]');
      if (grantButton) {
        grantButton.addEventListener('click', () => {
          this.grantSelected();
        });
      }

      const revokeButton = this.shadow.querySelector('[data-action="revoke"]');
      if (revokeButton) {
        revokeButton.addEventListener('click', () => {
          this.revokeSelected();
        });
      }

      const closeButton = this.shadow.querySelector('[data-action="close"]');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.close();
        });
      }

      const refreshButton = this.shadow.querySelector('[data-action="refresh"]');
      if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
          try {
            await this.loadData();
            this.render();
          } catch (error) {
            this.reportError(error);
          }
        });
      }

      const overlay = this.shadow.querySelector('[data-overlay="true"]');
      if (overlay && this.config.mode === 'modal') {
        overlay.addEventListener('click', (event) => {
          if (event.target === overlay) {
            this.close();
          }
        });
      }
    }

    render() {
      if (!this.shadow) {
        return;
      }

      const hiddenClass = this.state.open ? '' : 'tg-hidden';
      const busy = this.state.busyAction !== '';
      const selectedGroups = this.getSelectedGroups();
      const selectedCount = selectedGroups.reduce((total, item) => total + item.idCanales.length, 0);

      const purposesMarkup = this.state.purposes.length === 0 && !this.state.loading
        ? '<div class="tg-empty">No hay finalidades activas disponibles para este cliente.</div>'
        : this.state.purposes.map((purpose) => {
            const channelsMarkup = (purpose.canales || []).map((channel) => {
              const key = this.selectionKey(purpose.id, channel.id);
              const checked = this.state.selections[key] ? 'checked' : '';
              const status = this.getConsentStatus(purpose.id, channel.codigo);
              return (
                '<label class="tg-channel-row">'
                + '<span class="tg-channel-left">'
                + '<input type="checkbox" data-toggle="true" data-purpose-id="' + purpose.id + '" data-channel-id="' + channel.id + '" ' + checked + ' />'
                + '<span>' + this.escapeHtml(channel.nombre) + '</span>'
                + '</span>'
                + '<span class="tg-status tg-status--' + this.normalizeStatus(status) + '">' + this.escapeHtml(this.describeStatus(status)) + '</span>'
                + '</label>'
              );
            }).join('');

            return (
              '<article class="tg-purpose-card">'
              + '<header class="tg-purpose-header">'
              + '<div>'
              + '<h3>' + this.escapeHtml(purpose.nombre) + '</h3>'
              + '<p>' + this.escapeHtml(purpose.descripcion || 'Gestiona el consentimiento por canal.') + '</p>'
              + '</div>'
              + '<span class="tg-legal">' + this.escapeHtml(purpose.baseLegal || 'Consentimiento') + '</span>'
              + '</header>'
              + '<div class="tg-channel-list">' + channelsMarkup + '</div>'
              + '</article>'
            );
          }).join('');

      const containerClass = this.config.mode === 'inline'
        ? 'tg-shell tg-shell--inline'
        : this.config.mode === 'modal'
          ? 'tg-overlay ' + hiddenClass
          : 'tg-banner ' + hiddenClass;

      const cardClass = this.config.mode === 'modal'
        ? 'tg-card tg-card--modal'
        : this.config.mode === 'banner'
          ? 'tg-card tg-card--banner'
          : 'tg-card tg-card--inline';

      this.shadow.innerHTML = ''
        + '<style>' + this.styles() + '</style>'
        + '<div class="' + containerClass + '" data-overlay="' + (this.config.mode === 'modal' ? 'true' : 'false') + '">'
        + '<section class="' + cardClass + '" role="dialog" aria-label="Centro de consentimiento TrustGate">'
        + '<header class="tg-topbar">'
        + '<div>'
        + '<span class="tg-badge">TrustGate</span>'
        + '<h2>Centro de consentimiento</h2>'
        + '<p>Gestiona tus permisos por finalidad y canal.</p>'
        + '</div>'
        + (this.config.mode === 'inline' ? '' : '<button class="tg-close" type="button" data-action="close" aria-label="Cerrar">Cerrar</button>')
        + '</header>'
        + '<div class="tg-meta">'
        + '<span><strong>Identificador:</strong> ' + this.escapeHtml(this.config.identifier) + '</span>'
        + '<span><strong>Seleccionados:</strong> ' + selectedCount + '</span>'
        + '</div>'
        + (this.state.error ? '<div class="tg-alert tg-alert--error">' + this.escapeHtml(this.state.error) + '</div>' : '')
        + (this.state.info ? '<div class="tg-alert tg-alert--info">' + this.escapeHtml(this.state.info) + '</div>' : '')
        + (this.state.loading ? '<div class="tg-loading">Cargando finalidades y estado actual...</div>' : purposesMarkup)
        + '<footer class="tg-actions">'
        + '<button class="tg-btn tg-btn--ghost" type="button" data-action="refresh" ' + (busy ? 'disabled' : '') + '>Actualizar</button>'
        + '<button class="tg-btn tg-btn--danger" type="button" data-action="revoke" ' + (busy ? 'disabled' : '') + '>Revocar seleccionados</button>'
        + '<button class="tg-btn tg-btn--primary" type="button" data-action="grant" ' + (busy ? 'disabled' : '') + '>' + (this.state.busyAction === 'grant' ? 'Otorgando...' : 'Otorgar seleccionados') + '</button>'
        + '</footer>'
        + '</section>'
        + '</div>';

      this.bindEvents();
    }

    normalizeStatus(status) {
      return String(status || 'sin_registro').replace(/[^a-z_]/gi, '_').toLowerCase();
    }

    describeStatus(status) {
      switch (status) {
        case 'vigente':
          return 'Vigente';
        case 'revocado_total':
          return 'Revocado total';
        case 'revocado_parcial':
          return 'Revocado parcial';
        case 'por_vencer':
          return 'Por vencer';
        case 'expirado':
          return 'Expirado';
        case 'suspendido':
          return 'Suspendido';
        default:
          return 'Sin registro';
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

    styles() {
      return ''
        + ':host { all: initial; }'
        + '.tg-hidden { display: none !important; }'
        + '.tg-overlay, .tg-banner, .tg-shell { font-family: Inter, system-ui, sans-serif; color: #10243e; }'
        + '.tg-overlay { position: fixed; inset: 0; background: rgba(7, 18, 37, 0.48); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; }'
        + '.tg-banner { position: fixed; left: 24px; right: 24px; bottom: 24px; z-index: 9999; display: flex; justify-content: flex-end; align-items: flex-end; pointer-events: none; }'
        + '.tg-shell--inline { display: block; }'
        + '.tg-card { background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%); border: 1px solid #d6e4f8; border-radius: 24px; box-shadow: 0 24px 60px rgba(16, 36, 62, 0.18); overflow: hidden; }'
        + '.tg-card--modal { width: min(760px, 100%); max-height: min(88vh, 920px); overflow: auto; }'
        + '.tg-card--banner { width: min(480px, calc(100vw - 48px)); max-height: min(72vh, 680px); overflow: auto; pointer-events: auto; }'
        + '.tg-card--inline { width: min(920px, 100%); }'
        + '.tg-topbar { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 24px 24px 16px; background: radial-gradient(circle at top right, #dceaff 0%, rgba(220,234,255,0) 42%); }'
        + '.tg-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dceaff; color: #0b5fff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }'
        + '.tg-topbar h2 { margin: 0; font-size: 28px; line-height: 1.15; }'
        + '.tg-topbar p { margin: 8px 0 0; color: #4a6282; font-size: 14px; }'
        + '.tg-card--banner .tg-topbar { padding: 18px 18px 12px; }'
        + '.tg-card--banner .tg-topbar h2 { font-size: 22px; }'
        + '.tg-card--banner .tg-topbar p { font-size: 13px; }'
        + '.tg-close { border: 0; background: transparent; color: #355175; font-weight: 700; cursor: pointer; padding: 8px 10px; border-radius: 10px; }'
        + '.tg-close:hover { background: rgba(11, 95, 255, 0.08); }'
        + '.tg-meta { display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 0 24px 16px; color: #4a6282; font-size: 13px; }'
        + '.tg-card--banner .tg-meta { padding: 0 18px 12px; gap: 8px 12px; font-size: 12px; }'
        + '.tg-alert { margin: 0 24px 16px; padding: 12px 14px; border-radius: 14px; font-size: 14px; }'
        + '.tg-alert--error { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }'
        + '.tg-alert--info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }'
        + '.tg-card--banner .tg-alert { margin: 0 18px 12px; font-size: 13px; }'
        + '.tg-loading, .tg-empty { margin: 0 24px 24px; padding: 18px; border-radius: 16px; background: #eff6ff; color: #1e3a5f; font-size: 14px; }'
        + '.tg-card--banner .tg-loading, .tg-card--banner .tg-empty { margin: 0 18px 16px; padding: 14px; font-size: 13px; }'
        + '.tg-purpose-card { margin: 0 24px 18px; padding: 18px; border: 1px solid #d6e4f8; background: rgba(255,255,255,0.88); border-radius: 18px; }'
        + '.tg-card--banner .tg-purpose-card { margin: 0 18px 12px; padding: 14px; border-radius: 16px; }'
        + '.tg-purpose-header { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }'
        + '.tg-purpose-header h3 { margin: 0; font-size: 18px; }'
        + '.tg-purpose-header p { margin: 6px 0 0; color: #4a6282; font-size: 14px; }'
        + '.tg-card--banner .tg-purpose-header { gap: 10px; margin-bottom: 10px; }'
        + '.tg-card--banner .tg-purpose-header h3 { font-size: 16px; }'
        + '.tg-card--banner .tg-purpose-header p { font-size: 12px; }'
        + '.tg-legal { display: inline-flex; align-items: center; justify-content: center; background: #eef4ff; color: #30527b; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 600; }'
        + '.tg-channel-list { display: grid; gap: 10px; }'
        + '.tg-channel-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 14px; background: #f8fbff; border: 1px solid #e4edf9; cursor: pointer; }'
        + '.tg-card--banner .tg-channel-list { gap: 8px; }'
        + '.tg-card--banner .tg-channel-row { padding: 10px 12px; border-radius: 12px; }'
        + '.tg-channel-left { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }'
        + '.tg-card--banner .tg-channel-left { font-size: 13px; }'
        + '.tg-channel-left input { width: 16px; height: 16px; accent-color: #0b5fff; }'
        + '.tg-status { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }'
        + '.tg-card--banner .tg-status { font-size: 11px; padding: 3px 8px; }'
        + '.tg-status--vigente { background: #dcfce7; color: #166534; }'
        + '.tg-status--revocado_total, .tg-status--revocado_parcial { background: #fee2e2; color: #991b1b; }'
        + '.tg-status--sin_registro { background: #eef2ff; color: #4338ca; }'
        + '.tg-status--por_vencer { background: #fef3c7; color: #92400e; }'
        + '.tg-status--expirado, .tg-status--suspendido { background: #e5e7eb; color: #374151; }'
        + '.tg-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding: 0 24px 24px; }'
        + '.tg-card--banner .tg-actions { position: sticky; bottom: 0; padding: 14px 18px 18px; background: linear-gradient(180deg, rgba(245,249,255,0) 0%, #f5f9ff 28%, #f5f9ff 100%); }'
        + '.tg-btn { border: 0; border-radius: 14px; padding: 12px 16px; font-size: 14px; font-weight: 700; cursor: pointer; }'
        + '.tg-card--banner .tg-btn { padding: 10px 14px; font-size: 13px; }'
        + '.tg-btn:disabled { opacity: 0.6; cursor: wait; }'
        + '.tg-btn--primary { background: #0b5fff; color: #ffffff; }'
        + '.tg-btn--danger { background: #fff1f2; color: #be123c; }'
        + '.tg-btn--ghost { background: #eaf1fb; color: #24456a; }'
        + '@media (max-width: 720px) {'
        + '.tg-overlay { padding: 12px; }'
        + '.tg-banner { left: 12px; right: 12px; bottom: 12px; }'
        + '.tg-card--banner { width: min(100%, calc(100vw - 24px)); max-height: min(78vh, 720px); }'
        + '.tg-topbar, .tg-meta, .tg-actions { padding-left: 16px; padding-right: 16px; }'
        + '.tg-purpose-card, .tg-alert, .tg-loading, .tg-empty { margin-left: 16px; margin-right: 16px; }'
        + '.tg-purpose-header, .tg-channel-row { flex-direction: column; align-items: stretch; }'
        + '.tg-actions { justify-content: stretch; }'
        + '.tg-btn { width: 100%; }'
        + '}';
    }
  }

  if (window.TrustGateWidget && typeof window.TrustGateWidget.destroy === 'function') {
    window.TrustGateWidget.destroy();
  }

  const widget = new TrustGateDemoWidget(config);
  window.TrustGateWidget = {
    open() {
      widget.open();
    },
    close() {
      widget.close();
    },
    destroy() {
      widget.destroy();
    },
    reload() {
      return widget.loadData().then(() => {
        widget.render();
      });
    }
  };

  widget.init().then(() => {
    if (config.mode !== 'inline') {
      window.TrustGateWidget.open();
    }
  });
})();
