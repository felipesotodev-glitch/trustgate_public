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
        statusEndpoint: typeof widgetConfig.statusEndpoint === 'string' ? widgetConfig.statusEndpoint.trim() : '',
        purposeIds: this.normalizeNumericList(widgetConfig.purposeIds),
        channelIds: this.normalizeNumericList(widgetConfig.channelIds),
        channelCodes: this.normalizeStringList(widgetConfig.channelCodes),
        skipInitialStatusCheck: widgetConfig.skipInitialStatusCheck === true,
        onGranted: widgetConfig.onGranted,
        onRevoked: widgetConfig.onRevoked,
        onError: widgetConfig.onError
      };
      this.state = {
        open: this.config.mode === 'inline',
        loading: false,
        loadingMessage: 'Cargando finalidades y estado actual...',
        busyAction: '',
        purposes: [],
        consents: [],
        selections: {},
        error: '',
        info: '',
        scrollTop: 0,
        hasSkippedInitialStatusCheck: false
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
      const preserveLayout = this.state.purposes.length > 0;
      this.state.loading = true;
      this.state.loadingMessage = 'Cargando finalidades y estado actual...';
      this.state.error = '';
      this.state.info = '';
      if (preserveLayout) {
        this.syncSelectionUi();
      } else {
        this.render();
      }

      try {
        const purposesPromise = this.fetchJson('/api/v1/public/consent/purposes');
        const statusUrl = (this.config.statusEndpoint || '/api/v1/public/consent/status')
          + '?identifier=' + encodeURIComponent(this.config.identifier);
        const skipInitialStatusCheck = this.config.skipInitialStatusCheck && !this.state.hasSkippedInitialStatusCheck;
        const statusPromise = skipInitialStatusCheck
          ? Promise.resolve(null)
          : this.fetchJson(
              statusUrl,
              { allowNotFound: true }
            );

        const [purposes, status] = await Promise.all([purposesPromise, statusPromise]);
        this.state.purposes = this.filterPurposes(purposes);
        this.state.consents = status ? this.filterConsents(status.consents) : [];
        if (skipInitialStatusCheck) {
          this.state.hasSkippedInitialStatusCheck = true;
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

    normalizeNumericList(value) {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    }

    normalizeStringList(value) {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item) => item.length > 0);
    }

    filterPurposes(purposes) {
      const purposeIds = new Set(this.config.purposeIds);
      const channelIds = new Set(this.config.channelIds);
      const channelCodes = new Set(this.config.channelCodes);
      const filterByPurpose = purposeIds.size > 0;
      const filterByChannel = channelIds.size > 0 || channelCodes.size > 0;

      return (Array.isArray(purposes) ? purposes : [])
        .filter((purpose) => !filterByPurpose || purposeIds.has(purpose.id))
        .map((purpose) => ({
          ...purpose,
          canales: (purpose.canales || []).filter((channel) => {
            if (!filterByChannel) {
              return true;
            }

            return channelIds.has(channel.id) || channelCodes.has(String(channel.codigo || '').trim().toLowerCase());
          })
        }))
        .filter((purpose) => purpose.canales.length > 0 || !filterByChannel);
    }

    filterConsents(consents) {
      const purposeIds = new Set(this.config.purposeIds);
      const channelIds = new Set(this.config.channelIds);
      const channelCodes = new Set(this.config.channelCodes);
      const filterByPurpose = purposeIds.size > 0;
      const filterByChannel = channelIds.size > 0 || channelCodes.size > 0;

      return (Array.isArray(consents) ? consents : []).filter((item) => {
        if (filterByPurpose && !purposeIds.has(item.purposeId)) {
          return false;
        }

        if (!filterByChannel) {
          return true;
        }

        return channelIds.has(item.channelId) || channelCodes.has(String(item.channel || '').trim().toLowerCase());
      });
    }

    getConsentStatus(purposeId, channelCode) {
      const match = this.state.consents.find(
        (item) => item.purposeId === purposeId && item.channel === channelCode
      );
      return match ? match.status : 'sin_registro';
    }

    isActiveStatus(status) {
      return status === 'vigente' || status === 'por_vencer';
    }

    getSelectedCount() {
      return this.getSelectedGroups().reduce((total, item) => total + item.idCanales.length, 0);
    }

    selectionKey(purposeId, channelId) {
      return String(purposeId) + ':' + String(channelId);
    }

    toggleSelection(purposeId, channelId) {
      const key = this.selectionKey(purposeId, channelId);
      this.state.selections[key] = !this.state.selections[key];
      this.state.error = '';
      this.syncSelectionUi();
    }

    syncSelectionUi() {
      if (!this.shadow) {
        return;
      }

      const selectedCountNode = this.shadow.querySelector('[data-selected-count="true"]');
      if (selectedCountNode) {
        selectedCountNode.textContent = String(this.getSelectedCount());
      }

      const errorNode = this.shadow.querySelector('[data-role="widget-error"]');
      if (errorNode && !this.state.error) {
        errorNode.remove();
      }

      const infoNode = this.shadow.querySelector('[data-role="widget-info"]');
      if (infoNode && !this.state.info) {
        infoNode.remove();
      }

      this.syncLoadingUi();
      this.syncActionButtons();
    }

    syncLoadingUi() {
      if (!this.shadow) {
        return;
      }

      const loadingNode = this.shadow.querySelector('[data-role="widget-loading"]');
      if (!loadingNode) {
        return;
      }

      loadingNode.classList.toggle('tg-hidden', !(this.state.loading && this.state.purposes.length > 0));

      const loadingMessageNode = this.shadow.querySelector('[data-role="widget-loading-message"]');
      if (loadingMessageNode) {
        loadingMessageNode.textContent = this.state.loadingMessage;
      }
    }

    syncActionButtons() {
      if (!this.shadow) {
        return;
      }

      const busy = this.state.busyAction !== '' || this.state.loading;
      const refreshButton = this.shadow.querySelector('[data-action="refresh"]');
      if (refreshButton) {
        refreshButton.disabled = busy;
      }

      const revokeButton = this.shadow.querySelector('[data-action="revoke"]');
      if (revokeButton) {
        revokeButton.disabled = busy;
        revokeButton.textContent = this.state.busyAction === 'revoke'
          ? 'Revocando...'
          : 'Revocar seleccionados';
      }

      const grantButton = this.shadow.querySelector('[data-action="grant"]');
      if (grantButton) {
        grantButton.disabled = busy;
        grantButton.textContent = this.state.busyAction === 'grant'
          ? 'Otorgando...'
          : 'Otorgar seleccionados';
      }
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
      this.state.loading = true;
      this.state.loadingMessage = action === 'grant'
        ? 'Otorgando consentimiento y actualizando estado...'
        : 'Revocando consentimiento y actualizando estado...';
      this.state.error = '';
      this.state.info = '';
      this.syncSelectionUi();

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

        if (action === 'revoke') {
          this.clearSelections();
        }
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
        this.state.loading = false;
        this.state.busyAction = '';
        this.syncSelectionUi();
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
      const scrollRegion = this.shadow.querySelector('[data-scroll-region="true"]');
      if (scrollRegion) {
        scrollRegion.scrollTop = this.state.scrollTop || 0;
        scrollRegion.addEventListener('scroll', () => {
          this.state.scrollTop = scrollRegion.scrollTop;
        });
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
            this.state.loadingMessage = 'Actualizando estado del consentimiento...';
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
      const busy = this.state.busyAction !== '' || this.state.loading;
      const selectedCount = this.getSelectedCount();
      const showInitialLoading = this.state.loading && this.state.purposes.length === 0;

      const purposesMarkup = this.state.purposes.length === 0 && !showInitialLoading
        ? '<div class="tg-empty">No hay finalidades activas disponibles para este cliente.</div>'
        : this.state.purposes.map((purpose) => {
            const channelsMarkup = (purpose.canales || []).map((channel) => {
              const key = this.selectionKey(purpose.id, channel.id);
              const status = this.getConsentStatus(purpose.id, channel.codigo);
              const checked = this.state.selections[key] ? 'checked' : '';
              const activeClass = this.isActiveStatus(status) ? ' tg-channel-row--active' : '';
              return (
                '<label class="tg-channel-row' + activeClass + '">'
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
        + '<header class="tg-header-shell">'
        + '<div class="tg-topbar">'
        + '<div>'
        + '<span class="tg-badge">TrustGate</span>'
        + '<h2>Centro de consentimiento</h2>'
        + '<p>Gestiona tus permisos por finalidad y canal.</p>'
        + '</div>'
        + (this.config.mode === 'inline' ? '' : '<button class="tg-close" type="button" data-action="close" aria-label="Cerrar">Cerrar</button>')
        + '</div>'
        + '<div class="tg-meta">'
        + '<span><strong>Identificador:</strong> ' + this.escapeHtml(this.config.identifier) + '</span>'
        + '<span><strong>Seleccionados:</strong> <span data-selected-count="true">' + selectedCount + '</span></span>'
        + '</div>'
        + '</header>'
        + '<div class="tg-body" data-scroll-region="true">'
        + (this.state.error ? '<div class="tg-alert tg-alert--error" data-role="widget-error">' + this.escapeHtml(this.state.error) + '</div>' : '')
        + (this.state.info ? '<div class="tg-alert tg-alert--info" data-role="widget-info">' + this.escapeHtml(this.state.info) + '</div>' : '')
        + (showInitialLoading ? '<div class="tg-loading">' + this.escapeHtml(this.state.loadingMessage) + '</div>' : purposesMarkup)
        + '<div class="tg-loading-overlay ' + (this.state.loading && this.state.purposes.length > 0 ? '' : 'tg-hidden') + '" data-role="widget-loading">'
        + '<div class="tg-loading-overlay__card">'
        + '<span class="tg-spinner" aria-hidden="true"></span>'
        + '<span data-role="widget-loading-message">' + this.escapeHtml(this.state.loadingMessage) + '</span>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '<footer class="tg-footer-shell">'
        + '<div class="tg-actions">'
        + '<button class="tg-btn tg-btn--ghost" type="button" data-action="refresh" ' + (busy ? 'disabled' : '') + '>Actualizar</button>'
        + '<button class="tg-btn tg-btn--danger" type="button" data-action="revoke" ' + (busy ? 'disabled' : '') + '>' + (this.state.busyAction === 'revoke' ? 'Revocando...' : 'Revocar seleccionados') + '</button>'
        + '<button class="tg-btn tg-btn--primary" type="button" data-action="grant" ' + (busy ? 'disabled' : '') + '>' + (this.state.busyAction === 'grant' ? 'Otorgando...' : 'Otorgar seleccionados') + '</button>'
        + '</div>'
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
        + '.tg-card { background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%); border: 1px solid #d6e4f8; border-radius: 24px; box-shadow: 0 24px 60px rgba(16, 36, 62, 0.18); overflow: hidden; display: flex; flex-direction: column; }'
        + '.tg-card--modal { width: min(760px, 100%); max-height: min(88vh, 920px); }'
        + '.tg-card--banner { width: min(480px, calc(100vw - 48px)); max-height: min(72vh, 680px); pointer-events: auto; }'
        + '.tg-card--inline { width: min(920px, 100%); max-height: min(72vh, 680px); }'
        + '.tg-header-shell { flex: 0 0 auto; background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.98) 100%); border-bottom: 1px solid rgba(214,228,248,0.9); }'
        + '.tg-body { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; padding-top: 16px; }'
        + '.tg-footer-shell { flex: 0 0 auto; background: linear-gradient(180deg, rgba(245,249,255,0.92) 0%, #f5f9ff 100%); border-top: 1px solid rgba(214,228,248,0.9); }'
        + '.tg-topbar { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 24px 24px 16px; background: radial-gradient(circle at top right, #dceaff 0%, rgba(220,234,255,0) 42%); }'
        + '.tg-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dceaff; color: #0b5fff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }'
        + '.tg-topbar h2 { margin: 0; font-size: 28px; line-height: 1.15; }'
        + '.tg-topbar p { margin: 8px 0 0; color: #4a6282; font-size: 14px; }'
        + '.tg-card--banner .tg-topbar, .tg-card--inline .tg-topbar { padding: 18px 18px 12px; }'
        + '.tg-card--banner .tg-topbar h2, .tg-card--inline .tg-topbar h2 { font-size: 22px; }'
        + '.tg-card--banner .tg-topbar p, .tg-card--inline .tg-topbar p { font-size: 13px; }'
        + '.tg-close { border: 0; background: transparent; color: #355175; font-weight: 700; cursor: pointer; padding: 8px 10px; border-radius: 10px; }'
        + '.tg-close:hover { background: rgba(11, 95, 255, 0.08); }'
        + '.tg-meta { display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 0 24px 16px; color: #4a6282; font-size: 13px; }'
        + '.tg-card--banner .tg-meta, .tg-card--inline .tg-meta { padding: 0 18px 12px; gap: 8px 12px; font-size: 12px; }'
        + '.tg-alert { margin: 0 24px 16px; padding: 12px 14px; border-radius: 14px; font-size: 14px; }'
        + '.tg-alert--error { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }'
        + '.tg-alert--info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }'
        + '.tg-card--banner .tg-alert, .tg-card--inline .tg-alert { margin: 0 18px 12px; font-size: 13px; }'
        + '.tg-loading, .tg-empty { margin: 0 24px 24px; padding: 18px; border-radius: 16px; background: #eff6ff; color: #1e3a5f; font-size: 14px; }'
        + '.tg-loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(245,249,255,0.72); backdrop-filter: blur(2px); }'
        + '.tg-loading-overlay__card { display: inline-flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 16px; background: rgba(255,255,255,0.95); border: 1px solid #d6e4f8; box-shadow: 0 16px 40px rgba(16, 36, 62, 0.12); color: #1e3a5f; font-size: 14px; font-weight: 600; }'
        + '.tg-spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #bfdbfe; border-top-color: #0b5fff; animation: tg-spin 0.8s linear infinite; }'
        + '.tg-card--banner .tg-loading, .tg-card--banner .tg-empty, .tg-card--inline .tg-loading, .tg-card--inline .tg-empty { margin: 0 18px 16px; padding: 14px; font-size: 13px; }'
        + '.tg-card--banner .tg-loading-overlay, .tg-card--inline .tg-loading-overlay { padding: 18px; }'
        + '.tg-card--banner .tg-loading-overlay__card, .tg-card--inline .tg-loading-overlay__card { width: 100%; justify-content: center; font-size: 13px; }'
        + '.tg-purpose-card { margin: 0 24px 18px; padding: 18px; border: 1px solid #d6e4f8; background: rgba(255,255,255,0.88); border-radius: 18px; }'
        + '.tg-card--banner .tg-purpose-card, .tg-card--inline .tg-purpose-card { margin: 0 18px 12px; padding: 14px; border-radius: 16px; }'
        + '.tg-purpose-header { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }'
        + '.tg-purpose-header h3 { margin: 0; font-size: 18px; }'
        + '.tg-purpose-header p { margin: 6px 0 0; color: #4a6282; font-size: 14px; }'
        + '.tg-card--banner .tg-purpose-header, .tg-card--inline .tg-purpose-header { gap: 10px; margin-bottom: 10px; }'
        + '.tg-card--banner .tg-purpose-header h3, .tg-card--inline .tg-purpose-header h3 { font-size: 16px; }'
        + '.tg-card--banner .tg-purpose-header p, .tg-card--inline .tg-purpose-header p { font-size: 12px; }'
        + '.tg-legal { display: inline-flex; align-items: center; justify-content: center; background: #eef4ff; color: #30527b; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 600; }'
        + '.tg-channel-list { display: grid; gap: 10px; }'
        + '.tg-channel-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 14px; background: #f8fbff; border: 1px solid #e4edf9; cursor: pointer; }'
        + '.tg-channel-row--active { background: #eefbf3; border-color: #9ae6b4; }'
        + '.tg-card--banner .tg-channel-list, .tg-card--inline .tg-channel-list { gap: 8px; }'
        + '.tg-card--banner .tg-channel-row, .tg-card--inline .tg-channel-row { padding: 10px 12px; border-radius: 12px; }'
        + '.tg-channel-left { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }'
        + '.tg-card--banner .tg-channel-left, .tg-card--inline .tg-channel-left { font-size: 13px; }'
        + '.tg-channel-left input { width: 16px; height: 16px; accent-color: #0b5fff; }'
        + '.tg-status { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }'
        + '.tg-card--banner .tg-status, .tg-card--inline .tg-status { font-size: 11px; padding: 3px 8px; }'
        + '.tg-status--vigente { background: #dcfce7; color: #166534; }'
        + '.tg-status--revocado_total, .tg-status--revocado_parcial { background: #fee2e2; color: #991b1b; }'
        + '.tg-status--sin_registro { background: #eef2ff; color: #4338ca; }'
        + '.tg-status--por_vencer { background: #fef3c7; color: #92400e; }'
        + '.tg-status--expirado, .tg-status--suspendido { background: #e5e7eb; color: #374151; }'
        + '.tg-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding: 16px 24px 24px; }'
        + '.tg-card--banner .tg-actions, .tg-card--inline .tg-actions { padding: 14px 18px 18px; background: linear-gradient(180deg, rgba(245,249,255,0) 0%, #f5f9ff 28%, #f5f9ff 100%); }'
        + '.tg-btn { border: 0; border-radius: 14px; padding: 12px 16px; font-size: 14px; font-weight: 700; cursor: pointer; }'
        + '.tg-card--banner .tg-btn, .tg-card--inline .tg-btn { padding: 10px 14px; font-size: 13px; }'
        + '.tg-btn:disabled { opacity: 0.6; cursor: wait; }'
        + '.tg-btn--primary { background: #0b5fff; color: #ffffff; }'
        + '.tg-btn--danger { background: #fff1f2; color: #be123c; }'
        + '.tg-btn--ghost { background: #eaf1fb; color: #24456a; }'
        + '@keyframes tg-spin { to { transform: rotate(360deg); } }'
        + '@media (max-width: 720px) {'
        + '.tg-overlay { padding: 12px; }'
        + '.tg-banner { left: 12px; right: 12px; bottom: 12px; }'
        + '.tg-card--banner { width: min(100%, calc(100vw - 24px)); max-height: min(78vh, 720px); }'
        + '.tg-card--modal { max-height: min(92vh, 920px); }'
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
