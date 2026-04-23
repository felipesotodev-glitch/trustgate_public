(function () {
  const config = window.TrustGateSimpleConfig || {};

  class TrustGateSimpleWidget {
    constructor(widgetConfig = {}) {
      // Primero definir el locale y theme
      const locale = widgetConfig.locale || 'es';
      const theme = {
        primaryColor: widgetConfig.theme?.primaryColor || '#0b5fff',
        borderRadius: widgetConfig.theme?.borderRadius || '12px',
        fontFamily: widgetConfig.theme?.fontFamily || 'Inter, system-ui, sans-serif'
      };
      
      // Luego construir el config completo
      this.config = {
        clientKey: typeof widgetConfig.clientKey === 'string' ? widgetConfig.clientKey.trim() : '',
        apiUrl: typeof widgetConfig.apiUrl === 'string' ? widgetConfig.apiUrl.trim() : '',
        mode: widgetConfig.mode || 'inline',
        targetId: widgetConfig.targetId,
        onSuccess: widgetConfig.onSuccess,
        onError: widgetConfig.onError,
        onPrivacyPolicyClick: widgetConfig.onPrivacyPolicyClick,
        locale: locale,
        privacyPolicyUrl: widgetConfig.privacyPolicyUrl || '',
        finalidadIds: widgetConfig.finalidadIds || [],
        canalIds: widgetConfig.canalIds || [],
        marketingConsent: null,
        theme: theme
      };
      
      this.state = {
        loading: false,
        formData: {
          nombre: '',
          telefono: '',
          email: '',
          acceptPolicy: false,
          acceptMarketing: false
        },
        errors: {},
        successMessage: '',
        errorMessage: '',
        selectedChannels: [], // Vacío por defecto
        showConsentModal: false
      };
      
      this.host = null;
      this.shadow = null;
      
      this.texts = this.getTexts();
    }

    getTexts() {
      const translations = {
        es: {
          title: 'Completa los datos y sigamos conectados',
          subtitle: 'Actualiza tus datos de contacto para recibir información importante.',
          nameLabel: 'Nombre completo',
          namePlaceholder: 'Ingresa tu nombre',
          phoneLabel: 'Teléfono',
          phonePlaceholder: 'Ingresa tu número',
          emailLabel: 'Correo electrónico',
          emailPlaceholder: 'Ingresa tu correo',
          policyLabel: 'Acepto la',
          policyLinkText: 'Política de privacidad de datos',
          policyRequired: '*',
          marketingLabel: 'Acepto recibir comunicaciones comerciales.',
          marketingLink: 'Conocer más',
          submitButton: 'Actualizar datos',
          submitting: 'Actualizando...',
          closeButton: 'Cerrar',
          consentModalTitle: 'Detalle consentimiento comunicaciones comerciales',
          consentModalChannels: 'Canales disponibles:',
          consentModalConfirm: 'Confirmar mis preferencias',
          consentModalContinueWithout: 'Continuar sin aceptar',
          successMessage: '¡Datos actualizados correctamente!',
          errorRequired: 'Este campo es obligatorio',
          errorEmail: 'Ingresa un correo válido',
          errorPhone: 'Ingresa un número de teléfono válido',
          errorPolicy: 'Debes aceptar la política de privacidad'
        },
        en: {
          title: 'Complete your data and let\'s stay connected',
          subtitle: 'Update your contact information to receive important news.',
          nameLabel: 'Full name',
          namePlaceholder: 'Enter your name',
          phoneLabel: 'Phone',
          phonePlaceholder: 'Enter your phone number',
          emailLabel: 'Email',
          emailPlaceholder: 'Enter your email',
          policyLabel: 'I accept the',
          policyLinkText: 'Privacy Policy',
          policyRequired: '*',
          marketingLabel: 'I accept to receive marketing communications.',
          marketingLink: 'Learn more',
          submitButton: 'Update data',
          submitting: 'Updating...',
          closeButton: 'Close',
          consentModalTitle: 'Marketing communications consent details',
          consentModalChannels: 'Available channels:',
          consentModalConfirm: 'Confirm my preferences',
          consentModalContinueWithout: 'Continue without accepting',
          successMessage: 'Data updated successfully!',
          errorRequired: 'This field is required',
          errorEmail: 'Enter a valid email',
          errorPhone: 'Enter a valid phone number',
          errorPolicy: 'You must accept the privacy policy'
        }
      };
      
      return translations[this.config.locale] || translations.es;
    }

    getDefaultMarketingConsent(locale = 'es') {
      const defaultConfig = {
        es: {
          finalidad: {
            id: 1,
            nombre: 'Marketing y Comunicaciones Comerciales',
            descripcion: 'Envío de ofertas, promociones, novedades de productos y servicios, encuestas de satisfacción e información relevante sobre nuestros servicios.'
          },
          canales: [
            { id: 1, nombre: 'WhatsApp', icono: '📱', descripcion: 'Mensajes a través de WhatsApp' },
            { id: 3, nombre: 'Email', icono: '📧', descripcion: 'Correos electrónicos' },
            { id: 5, nombre: 'SMS', icono: '💬', descripcion: 'Mensajes de texto SMS' },
            { id: 7, nombre: 'Llamada telefónica', icono: '☎️', descripcion: 'Llamadas telefónicas' }
          ]
        },
        en: {
          finalidad: {
            id: 1,
            nombre: 'Marketing and Commercial Communications',
            descripcion: 'Sending offers, promotions, product and service updates, satisfaction surveys, and relevant information about our services.'
          },
          canales: [
            { id: 1, nombre: 'WhatsApp', icono: '📱', descripcion: 'Messages via WhatsApp' },
            { id: 3, nombre: 'Email', icono: '📧', descripcion: 'Email messages' },
            { id: 5, nombre: 'SMS', icono: '💬', descripcion: 'SMS text messages' },
            { id: 7, nombre: 'Phone call', icono: '☎️', descripcion: 'Telephone calls' }
          ]
        }
      };
      
      return defaultConfig[locale] || defaultConfig.es;
    }

    async loadMarketingConsentFromApi() {
      try {
        // Si no hay API URL o client key, usar datos por defecto
        if (!this.config.apiUrl || !this.config.clientKey) {
          console.warn('TrustGate: No se puede cargar marketing consent desde API. Usando datos por defecto.');
          this.config.marketingConsent = this.getDefaultMarketingConsent(this.config.locale);
          return;
        }

        // Cargar finalidades con canales desde el endpoint correcto
        const response = await fetch(`${this.config.apiUrl}/api/v1/public/consent/purposes`, {
          headers: {
            'Content-Type': 'application/json',
            'x-client-key': this.config.clientKey
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const purposes = await response.json();
        
        // Filtrar por IDs configurados
        let selectedPurpose = null;
        let selectedChannels = [];

        if (this.config.finalidadIds && this.config.finalidadIds.length > 0) {
          // Buscar la primera finalidad que coincida con los IDs configurados
          selectedPurpose = purposes.find(p => this.config.finalidadIds.includes(p.id));
        }

        if (!selectedPurpose && purposes.length > 0) {
          // Si no se especificó o no se encontró, usar la primera
          selectedPurpose = purposes[0];
        }

        if (!selectedPurpose) {
          throw new Error('No se encontraron finalidades activas');
        }

        // Filtrar canales si se especificaron IDs
        if (this.config.canalIds && this.config.canalIds.length > 0) {
          selectedChannels = selectedPurpose.canales.filter(c => this.config.canalIds.includes(c.id));
        } else {
          selectedChannels = selectedPurpose.canales;
        }

        if (selectedChannels.length === 0) {
          throw new Error('No hay canales disponibles');
        }

        // Construir el objeto de marketing consent
        this.config.marketingConsent = {
          finalidad: {
            id: selectedPurpose.id,
            nombre: selectedPurpose.nombre,
            descripcion: selectedPurpose.descripcion
          },
          canales: selectedChannels.map(c => ({
            id: c.id,
            nombre: c.nombre,
            icono: this.getChannelIcon(c.codigo),
            descripcion: `Mensajes vía ${c.nombre}`
          }))
        };
      } catch (error) {
        console.error('Error cargando marketing consent desde API:', error);
        this.config.marketingConsent = this.getDefaultMarketingConsent(this.config.locale);
      }
    }

    getChannelIcon(codigo) {
      const icons = {
        'whatsapp': '📱',
        'email': '📧',
        'sms': '💬',
        'messenger': '💬',
        'telegram': '✈️',
        'instagram': '📷',
        'web': '🌐'
      };
      return icons[codigo.toLowerCase()] || '📞';
    }

    async init() {
      try {
        this.validateConfig();
        await this.loadMarketingConsentFromApi();
        this.mount();
        this.render();
      } catch (error) {
        this.reportError(error);
      }
    }

    validateConfig() {
      if (!this.config.clientKey) {
        throw new Error('clientKey es obligatorio para inicializar el widget.');
      }
      if (!this.config.apiUrl) {
        throw new Error('apiUrl es obligatorio para inicializar el widget.');
      }
      if (this.config.mode === 'inline' && !this.resolveInlineTarget()) {
        throw new Error('No se encontró el contenedor inline indicado por targetId.');
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
      this.host.setAttribute('data-trustgate-simple-widget', 'true');
      this.shadow = this.host.attachShadow({ mode: 'open' });

      if (this.config.mode === 'inline') {
        const target = this.resolveInlineTarget();
        target.innerHTML = '';
        target.appendChild(this.host);
      } else {
        document.body.appendChild(this.host);
      }
    }

    validateForm() {
      const errors = {};
      
      if (!this.state.formData.nombre.trim()) {
        errors.nombre = this.texts.errorRequired;
      }
      
      if (!this.state.formData.telefono.trim()) {
        errors.telefono = this.texts.errorRequired;
      } else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(this.state.formData.telefono)) {
        errors.telefono = this.texts.errorPhone;
      }
      
      if (!this.state.formData.email.trim()) {
        errors.email = this.texts.errorRequired;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.formData.email)) {
        errors.email = this.texts.errorEmail;
      }
      
      if (!this.state.formData.acceptPolicy) {
        errors.acceptPolicy = this.texts.errorPolicy;
      }
      
      return errors;
    }

    async handleSubmit(event) {
      event.preventDefault();
      
      this.state.errors = {};
      this.state.successMessage = '';
      this.state.errorMessage = '';
      
      const validationErrors = this.validateForm();
      
      if (Object.keys(validationErrors).length > 0) {
        this.state.errors = validationErrors;
        this.render();
        return;
      }
      
      this.state.loading = true;
      this.render();
      
      try {
        // 1. Crear/actualizar titular
        const titularResponse = await this.fetchJson(
          `${this.config.apiUrl}/api/v1/public/titulares`,
          {
            method: 'POST',
            body: {
              email: this.state.formData.email,
              nombre: this.state.formData.nombre,
              telefono: this.state.formData.telefono
            }
          }
        );
        
        // 2. Si aceptó marketing, otorgar consentimiento
        if (this.state.formData.acceptMarketing && this.state.selectedChannels.length > 0) {
          await this.fetchJson(
            `${this.config.apiUrl}/api/v1/public/consent/grant`,
            {
              method: 'POST',
              body: {
                identifier: this.state.formData.email,
                purposes: [
                  {
                    idFinalidad: 1, // ID de la finalidad de marketing
                    idCanales: this.state.selectedChannels // Canales seleccionados por el usuario
                  }
                ],
                acceptanceAction: 'WIDGET_SIMPLE',
                clientMetadata: this.buildClientMetadata()
              }
            }
          );
        }
        
        this.state.successMessage = this.texts.successMessage;
        this.state.formData = {
          nombre: '',
          telefono: '',
          email: '',
          acceptPolicy: false,
          acceptMarketing: false
        };
        
        if (typeof this.config.onSuccess === 'function') {
          this.config.onSuccess({
            titular: titularResponse,
            marketingConsent: this.state.formData.acceptMarketing
          });
        }
        
      } catch (error) {
        this.state.errorMessage = error.message || 'Error al procesar la solicitud';
        this.reportError(error);
      } finally {
        this.state.loading = false;
        this.render();
      }
    }

    buildClientMetadata() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      return {
        pageUrl: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        connectionType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      };
    }

    async fetchJson(url, options = {}) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-client-key': this.config.clientKey,
            ...this.buildMetadataHeaders()
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') 
          ? await response.json() 
          : await response.text();
        
        if (response.ok) {
          return data;
        }
        
        const message = this.extractMessage(data) || 'Error en la solicitud';
        const error = new Error(message);
        error.status = response.status;
        error.payload = data;
        throw error;
        
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('La solicitud excedió el tiempo de espera');
        }
        throw error;
      }
    }

    buildMetadataHeaders() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      return {
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Language': navigator.language,
        'X-Client-Platform': navigator.platform,
        'X-Client-Screen': `${screen.width}x${screen.height}`,
        'X-Client-Viewport': `${window.innerWidth}x${window.innerHeight}`,
        'X-Client-Hardware-Concurrency': String(navigator.hardwareConcurrency || 0),
        'X-Client-Device-Memory': String(navigator.deviceMemory || 0),
        'X-Client-Connection-Type': connection?.effectiveType || 'unknown',
        'X-Page-Url': window.location.href,
        'X-Client-Referrer': document.referrer
      };
    }

    extractMessage(payload) {
      if (!payload) return '';
      if (typeof payload === 'string') return payload;
      if (typeof payload.detail === 'string') return payload.detail;
      if (typeof payload.message === 'string') return payload.message;
      if (typeof payload.error === 'string') return payload.error;
      return '';
    }

    handleInput(field, value) {
      this.state.formData[field] = value;
      if (this.state.errors[field]) {
        delete this.state.errors[field];
        this.render();
      }
    }

    handleCheckbox(field, checked) {
      this.state.formData[field] = checked;
      
      // Si es el checkbox de marketing
      if (field === 'acceptMarketing') {
        if (checked) {
          // Si se marca, seleccionar todos los canales
          this.state.selectedChannels = [1, 3, 5, 7];
        } else {
          // Si se desmarca, limpiar todos los canales
          this.state.selectedChannels = [];
        }
      }
      
      if (this.state.errors[field]) {
        delete this.state.errors[field];
        this.render();
      }
    }

    handlePolicyLinkClick(e) {
      const policyType = e.target.dataset.policyType;
      
      if (policyType === 'privacy' && this.config.onPrivacyPolicyClick) {
        e.preventDefault();
        this.config.onPrivacyPolicyClick();
      } else if (policyType === 'marketing') {
        e.preventDefault();
        // Mostrar modal interno de consentimiento
        this.showMarketingConsentModal();
      }
      // Si no hay callback, dejar que el navegador maneje el enlace normalmente
    }

    showMarketingConsentModal() {
      this.state.showConsentModal = true;
      this.renderConsentModal();
    }

    hideMarketingConsentModal() {
      const modalOverlay = this.shadow.querySelector('.tgs-consent-modal-overlay');
      if (modalOverlay) {
        modalOverlay.remove();
      }
      this.state.showConsentModal = false;
      
      // Remover listener de Escape
      if (this.consentModalEscapeHandler) {
        document.removeEventListener('keydown', this.consentModalEscapeHandler);
        this.consentModalEscapeHandler = null;
      }
    }

    handleChannelToggle(channelId, checked) {
      if (checked) {
        if (!this.state.selectedChannels.includes(channelId)) {
          this.state.selectedChannels.push(channelId);
        }
      } else {
        this.state.selectedChannels = this.state.selectedChannels.filter(id => id !== channelId);
      }
      
      // Sincronización bidireccional con checkbox de marketing
      const marketingCheckbox = this.shadow.querySelector('input[data-field="acceptMarketing"]');
      
      if (this.state.selectedChannels.length === 0) {
        // Si no hay canales seleccionados, desmarcar el checkbox de marketing
        this.state.formData.acceptMarketing = false;
        if (marketingCheckbox) {
          marketingCheckbox.checked = false;
        }
      } else if (this.state.selectedChannels.length > 0) {
        // Si hay al menos un canal seleccionado, marcar el checkbox de marketing
        this.state.formData.acceptMarketing = true;
        if (marketingCheckbox) {
          marketingCheckbox.checked = true;
        }
      }
      
      // Re-renderizar solo los checkboxes del modal
      this.updateConsentModalCheckboxes();
    }

    updateConsentModalCheckboxes() {
      const checkboxes = this.shadow.querySelectorAll('.tgs-consent-channel-checkbox');
      checkboxes.forEach(checkbox => {
        const channelId = parseInt(checkbox.dataset.channelId);
        checkbox.checked = this.state.selectedChannels.includes(channelId);
      });
      
      // Actualizar estado del botón confirmar
      const confirmButton = this.shadow.querySelector('[data-action="confirm"]');
      if (confirmButton) {
        confirmButton.disabled = this.state.selectedChannels.length === 0;
      }
    }

    renderConsentModal() {
      const consent = this.config.marketingConsent;
      
      const modalHTML = `
        <div class="tgs-consent-modal-overlay">
          <div class="tgs-consent-modal">
            <div class="tgs-consent-modal-header">
              <h3 class="tgs-consent-modal-title">${this.escapeHtml(this.texts.consentModalTitle)}</h3>
              <button class="tgs-consent-modal-close" aria-label="${this.escapeHtml(this.texts.closeButton)}">&times;</button>
            </div>
            <div class="tgs-consent-modal-body">
              <div class="tgs-consent-finalidad">
                <h4 class="tgs-consent-finalidad-title">${this.escapeHtml(consent.finalidad.nombre)}</h4>
                <p class="tgs-consent-finalidad-desc">${this.escapeHtml(consent.finalidad.descripcion)}</p>
              </div>
              <div class="tgs-consent-canales">
                <h4 class="tgs-consent-canales-title">${this.escapeHtml(this.texts.consentModalChannels)}</h4>
                <div class="tgs-consent-canales-list">
                  ${consent.canales.map(canal => `
                    <label class="tgs-consent-canal-item">
                      <input 
                        type="checkbox" 
                        class="tgs-consent-channel-checkbox" 
                        data-channel-id="${canal.id}"
                        ${this.state.selectedChannels.includes(canal.id) ? 'checked' : ''}
                      />
                      <div class="tgs-consent-canal-content">
                        <div class="tgs-consent-canal-header">
                          <span class="tgs-consent-canal-icon">${canal.icono}</span>
                          <span class="tgs-consent-canal-name">${this.escapeHtml(canal.nombre)}</span>
                        </div>
                        <p class="tgs-consent-canal-desc">${this.escapeHtml(canal.descripcion)}</p>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
            <div class="tgs-consent-modal-footer">
              <button class="tgs-consent-button tgs-consent-button-primary" data-action="confirm" ${this.state.selectedChannels.length === 0 ? 'disabled' : ''}>
                ${this.escapeHtml(this.texts.consentModalConfirm)}
              </button>
              <button class="tgs-consent-button tgs-consent-button-secondary" data-action="continue-without">
                ${this.escapeHtml(this.texts.consentModalContinueWithout)}
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Insertar el modal en el shadow DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHTML;
      const modalElement = tempDiv.firstElementChild;
      this.shadow.appendChild(modalElement);
      
      // Bind events
      const closeButton = modalElement.querySelector('.tgs-consent-modal-close');
      closeButton.addEventListener('click', () => this.hideMarketingConsentModal());
      
      // Cerrar al hacer clic en el overlay
      modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
          this.hideMarketingConsentModal();
        }
      });
      
      // Bind channel checkboxes
      const channelCheckboxes = modalElement.querySelectorAll('.tgs-consent-channel-checkbox');
      channelCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const channelId = parseInt(e.target.dataset.channelId);
          this.handleChannelToggle(channelId, e.target.checked);
        });
      });
      
      // Bind action buttons
      const confirmButton = modalElement.querySelector('[data-action="confirm"]');
      const continueWithoutButton = modalElement.querySelector('[data-action="continue-without"]');
      
      confirmButton.addEventListener('click', () => {
        // Verificar que haya al menos un canal seleccionado
        if (this.state.selectedChannels.length === 0) {
          // Si no hay canales, desmarcar el checkbox de marketing
          this.state.formData.acceptMarketing = false;
          const marketingCheckbox = this.shadow.querySelector('input[data-field="acceptMarketing"]');
          if (marketingCheckbox) {
            marketingCheckbox.checked = false;
          }
        }
        // Cerrar el modal
        this.hideMarketingConsentModal();
      });
      
      continueWithoutButton.addEventListener('click', () => {
        // Deseleccionar todos los canales
        this.state.selectedChannels = [];
        this.updateConsentModalCheckboxes();
        
        // Desmarcar el checkbox de marketing
        this.state.formData.acceptMarketing = false;
        const marketingCheckbox = this.shadow.querySelector('input[data-field="acceptMarketing"]');
        if (marketingCheckbox) {
          marketingCheckbox.checked = false;
        }
        
        // Cerrar el modal
        this.hideMarketingConsentModal();
      });
      
      // Cerrar con tecla Escape
      this.consentModalEscapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.hideMarketingConsentModal();
        }
      };
      document.addEventListener('keydown', this.consentModalEscapeHandler);
    }

    bindEvents() {
      if (!this.shadow) return;
      
      const form = this.shadow.querySelector('form');
      if (form) {
        form.addEventListener('submit', (e) => this.handleSubmit(e));
      }
      
      const inputs = this.shadow.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
      inputs.forEach(input => {
        input.addEventListener('input', (e) => {
          this.handleInput(e.target.dataset.field, e.target.value);
        });
      });
      
      const checkboxes = this.shadow.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          this.handleCheckbox(e.target.dataset.field, e.target.checked);
        });
      });
      
      // Bind policy links
      const policyLinks = this.shadow.querySelectorAll('.tgs-policy-link');
      policyLinks.forEach(link => {
        link.addEventListener('click', (e) => this.handlePolicyLinkClick(e));
      });
      
      // Bind close button (modal mode)
      const closeButton = this.shadow.querySelector('.tgs-close-button');
      if (closeButton) {
        closeButton.addEventListener('click', () => this.closeModal());
      }
      
      // Close modal on overlay click (modal mode)
      if (this.config.mode === 'modal') {
        const modalOverlay = this.shadow.querySelector('.tgs-modal');
        if (modalOverlay) {
          modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
              this.closeModal();
            }
          });
        }
        
        // Close modal on Escape key
        this.escapeKeyHandler = (e) => {
          if (e.key === 'Escape') {
            this.closeModal();
          }
        };
        document.addEventListener('keydown', this.escapeKeyHandler);
      }
    }

    render() {
      if (!this.shadow) return;
      
      const containerClass = this.config.mode === 'modal' ? 'tgs-modal' : 'tgs-inline';
      
      this.shadow.innerHTML = `
        <style>${this.styles()}</style>
        <div class="${containerClass}">
          <div class="tgs-card">
            ${this.config.mode === 'modal' ? `<button class="tgs-close-button" aria-label="${this.escapeHtml(this.texts.closeButton)}">&times;</button>` : ''}
            <div class="tgs-header">
              <h2 class="tgs-title">${this.escapeHtml(this.texts.title)}</h2>
              <p class="tgs-subtitle">${this.escapeHtml(this.texts.subtitle)}</p>
            </div>
            
            <form class="tgs-form">
              ${this.state.successMessage ? `
                <div class="tgs-alert tgs-alert--success">
                  ${this.escapeHtml(this.state.successMessage)}
                </div>
              ` : ''}
              
              ${this.state.errorMessage ? `
                <div class="tgs-alert tgs-alert--error">
                  ${this.escapeHtml(this.state.errorMessage)}
                </div>
              ` : ''}
              
              <div class="tgs-form-group ${this.state.errors.nombre ? 'tgs-form-group--error' : ''}">
                <label class="tgs-label">${this.escapeHtml(this.texts.nameLabel)}</label>
                <input 
                  type="text" 
                  class="tgs-input" 
                  placeholder="${this.escapeHtml(this.texts.namePlaceholder)}"
                  data-field="nombre"
                  value="${this.escapeHtml(this.state.formData.nombre)}"
                  ${this.state.loading ? 'disabled' : ''}
                >
                ${this.state.errors.nombre ? `
                  <span class="tgs-error-text">${this.escapeHtml(this.state.errors.nombre)}</span>
                ` : ''}
              </div>
              
              <div class="tgs-form-group ${this.state.errors.telefono ? 'tgs-form-group--error' : ''}">
                <label class="tgs-label">${this.escapeHtml(this.texts.phoneLabel)}</label>
                <input 
                  type="tel" 
                  class="tgs-input" 
                  placeholder="${this.escapeHtml(this.texts.phonePlaceholder)}"
                  data-field="telefono"
                  value="${this.escapeHtml(this.state.formData.telefono)}"
                  ${this.state.loading ? 'disabled' : ''}
                >
                ${this.state.errors.telefono ? `
                  <span class="tgs-error-text">${this.escapeHtml(this.state.errors.telefono)}</span>
                ` : ''}
              </div>
              
              <div class="tgs-form-group ${this.state.errors.email ? 'tgs-form-group--error' : ''}">
                <label class="tgs-label">${this.escapeHtml(this.texts.emailLabel)}</label>
                <input 
                  type="email" 
                  class="tgs-input" 
                  placeholder="${this.escapeHtml(this.texts.emailPlaceholder)}"
                  data-field="email"
                  value="${this.escapeHtml(this.state.formData.email)}"
                  ${this.state.loading ? 'disabled' : ''}
                >
                ${this.state.errors.email ? `
                  <span class="tgs-error-text">${this.escapeHtml(this.state.errors.email)}</span>
                ` : ''}
              </div>
              
              <div class="tgs-checkbox-group ${this.state.errors.acceptPolicy ? 'tgs-checkbox-group--error' : ''}">
                <label class="tgs-checkbox-label">
                  <input 
                    type="checkbox" 
                    class="tgs-checkbox"
                    data-field="acceptPolicy"
                    ${this.state.formData.acceptPolicy ? 'checked' : ''}
                    ${this.state.loading ? 'disabled' : ''}
                  >
                  <span class="tgs-checkbox-text">
                    ${this.escapeHtml(this.texts.policyLabel)} 
                    ${this.config.privacyPolicyUrl || this.config.onPrivacyPolicyClick ? `
                      <a href="${this.config.onPrivacyPolicyClick ? '#' : this.escapeHtml(this.config.privacyPolicyUrl)}" 
                         class="tgs-policy-link" 
                         data-policy-type="privacy"
                         ${!this.config.onPrivacyPolicyClick ? 'target="_blank" rel="noopener noreferrer"' : ''}
                         onclick="event.stopPropagation()">
                        ${this.escapeHtml(this.texts.policyLinkText)}
                      </a>
                    ` : this.escapeHtml(this.texts.policyLinkText)}
                    <span class="tgs-required">${this.texts.policyRequired}</span>
                  </span>
                </label>
                ${this.state.errors.acceptPolicy ? `
                  <span class="tgs-error-text">${this.escapeHtml(this.state.errors.acceptPolicy)}</span>
                ` : ''}
              </div>
              
              <div class="tgs-checkbox-group">
                <label class="tgs-checkbox-label">
                  <input 
                    type="checkbox" 
                    class="tgs-checkbox"
                    data-field="acceptMarketing"
                    ${this.state.formData.acceptMarketing ? 'checked' : ''}
                    ${this.state.loading ? 'disabled' : ''}
                  >
                  <span class="tgs-checkbox-text">
                    ${this.escapeHtml(this.texts.marketingLabel)}
                    ${this.config.marketingInfoUrl || this.config.onMarketingInfoClick ? `
                      <a href="${this.config.onMarketingInfoClick ? '#' : this.escapeHtml(this.config.marketingInfoUrl)}" 
                         class="tgs-policy-link" 
                         data-policy-type="marketing"
                         ${!this.config.onMarketingInfoClick ? 'target="_blank" rel="noopener noreferrer"' : ''}
                         onclick="event.stopPropagation()">
                        ${this.escapeHtml(this.texts.marketingLink)}
                      </a>
                    ` : ''}
                  </span>
                </label>
              </div>
              
              <button 
                type="submit" 
                class="tgs-submit-button"
                ${this.state.loading ? 'disabled' : ''}
              >
                ${this.state.loading ? this.texts.submitting : this.texts.submitButton}
              </button>
            </form>
          </div>
        </div>
      `;
      
      this.bindEvents();
    }

    styles() {
      return `
        :host {
          all: initial;
          display: block;
        }
        
        * {
          box-sizing: border-box;
        }
        
        .tgs-inline,
        .tgs-modal {
          font-family: ${this.config.theme.fontFamily};
          color: #1a1a1a;
          line-height: 1.5;
        }
        
        .tgs-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }
        
        .tgs-card {
          position: relative;
          background: #ffffff;
          border-radius: ${this.config.theme.borderRadius};
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        .tgs-modal .tgs-card {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        
        .tgs-close-button {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 32px;
          line-height: 1;
          color: #666666;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .tgs-close-button:hover {
          color: #1a1a1a;
          background: #f5f5f5;
        }
        
        .tgs-close-button:focus {
          outline: 2px solid ${this.config.theme.primaryColor};
          outline-offset: 2px;
        }
        
        .tgs-header {
          margin-bottom: 28px;
          text-align: center;
        }
        
        .tgs-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.3;
        }
        
        .tgs-subtitle {
          margin: 0;
          font-size: 15px;
          color: #666666;
          line-height: 1.5;
        }
        
        .tgs-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .tgs-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .tgs-label {
          font-size: 14px;
          font-weight: 600;
          color: #333333;
        }
        
        .tgs-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          color: #1a1a1a;
          transition: all 0.2s ease;
          background: #ffffff;
        }
        
        .tgs-input:focus {
          outline: none;
          border-color: ${this.config.theme.primaryColor};
          box-shadow: 0 0 0 3px ${this.config.theme.primaryColor}22;
        }
        
        .tgs-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .tgs-input::placeholder {
          color: #999999;
        }
        
        .tgs-form-group--error .tgs-input {
          border-color: #dc2626;
        }
        
        .tgs-form-group--error .tgs-input:focus {
          box-shadow: 0 0 0 3px #dc262622;
        }
        
        .tgs-error-text {
          font-size: 13px;
          color: #dc2626;
          margin-top: -4px;
        }
        
        .tgs-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .tgs-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        
        .tgs-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
          appearance: none;
          background: #ffffff;
          transition: all 0.2s ease;
        }
        
        .tgs-checkbox:checked {
          background: ${this.config.theme.primaryColor};
          border-color: ${this.config.theme.primaryColor};
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          background-size: 14px;
        }
        
        .tgs-checkbox:focus {
          outline: none;
          box-shadow: 0 0 0 3px ${this.config.theme.primaryColor}22;
        }
        
        .tgs-checkbox:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .tgs-checkbox-text {
          font-size: 14px;
          color: #333333;
          line-height: 1.5;
        }
        
        .tgs-policy-link {
          color: ${this.config.theme.primaryColor};
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }
        
        .tgs-policy-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        
        .tgs-policy-link:focus {
          outline: 2px solid ${this.config.theme.primaryColor};
          outline-offset: 2px;
          border-radius: 2px;
        }
        
        .tgs-required {
          color: #dc2626;
          font-weight: 700;
        }
        
        .tgs-checkbox-group--error .tgs-checkbox {
          border-color: #dc2626;
        }
        
        .tgs-submit-button {
          width: 100%;
          padding: 14px 24px;
          background: ${this.config.theme.primaryColor};
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }
        
        .tgs-submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${this.config.theme.primaryColor}44;
        }
        
        .tgs-submit-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .tgs-submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .tgs-alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .tgs-alert--success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        
        .tgs-alert--error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        
        @media (max-width: 640px) {
          .tgs-card {
            padding: 24px;
          }
          
          .tgs-title {
            font-size: 20px;
          }
          
          .tgs-subtitle {
            font-size: 14px;
          }
        }
        
        /* Estilos del modal de consentimiento */
        .tgs-consent-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 10000;
          animation: tgs-fade-in 0.2s ease;
        }
        
        @keyframes tgs-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .tgs-consent-modal {
          background: #ffffff;
          border-radius: ${this.config.theme.borderRadius};
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: tgs-slide-up 0.3s ease;
        }
        
        @keyframes tgs-slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .tgs-consent-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        
        .tgs-consent-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          flex: 1;
        }
        
        .tgs-consent-modal-close {
          background: none;
          border: none;
          font-size: 28px;
          line-height: 1;
          color: #666666;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .tgs-consent-modal-close:hover {
          color: #1a1a1a;
          background: #f5f5f5;
        }
        
        .tgs-consent-modal-close:focus {
          outline: 2px solid ${this.config.theme.primaryColor};
          outline-offset: 2px;
        }
        
        .tgs-consent-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        
        .tgs-consent-finalidad {
          margin-bottom: 24px;
        }
        
        .tgs-consent-finalidad-title {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .tgs-consent-finalidad-desc {
          margin: 0;
          font-size: 14px;
          color: #666666;
          line-height: 1.6;
        }
        
        .tgs-consent-canales-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .tgs-consent-canales-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .tgs-consent-canal-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .tgs-consent-canal-item:hover {
          border-color: ${this.config.theme.primaryColor};
          background: #f9fafb;
        }
        
        .tgs-consent-channel-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
          accent-color: ${this.config.theme.primaryColor};
        }
        
        .tgs-consent-canal-content {
          flex: 1;
        }
        
        .tgs-consent-canal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .tgs-consent-canal-icon {
          font-size: 20px;
          line-height: 1;
        }
        
        .tgs-consent-canal-name {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .tgs-consent-canal-desc {
          margin: 0;
          font-size: 13px;
          color: #666666;
          line-height: 1.5;
        }
        
        .tgs-consent-modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e5e5e5;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .tgs-consent-button {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          line-height: 1.5;
        }
        
        .tgs-consent-button-primary {
          background: ${this.config.theme.primaryColor};
          color: #ffffff;
        }
        
        .tgs-consent-button-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(11, 95, 255, 0.3);
        }
        
        .tgs-consent-button-primary:active {
          transform: translateY(0);
        }
        
        .tgs-consent-button-primary:focus {
          outline: 2px solid ${this.config.theme.primaryColor};
          outline-offset: 2px;
        }
        
        .tgs-consent-button-primary:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
          box-shadow: none;
        }
        
        .tgs-consent-button-primary:disabled:hover {
          opacity: 0.6;
          transform: none;
          box-shadow: none;
        }
        
        .tgs-consent-button-secondary {
          background: transparent;
          color: #666666;
          border: 1px solid #d1d5db;
        }
        
        .tgs-consent-button-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          color: #1a1a1a;
        }
        
        .tgs-consent-button-secondary:active {
          background: #f3f4f6;
        }
        
        .tgs-consent-button-secondary:focus {
          outline: 2px solid ${this.config.theme.primaryColor};
          outline-offset: 2px;
        }
        
        @media (max-width: 640px) {
          .tgs-consent-modal {
            max-width: 100%;
            max-height: 90vh;
          }
          
          .tgs-consent-modal-header {
            padding: 16px 20px;
          }
          
          .tgs-consent-modal-title {
            font-size: 16px;
          }
          
          .tgs-consent-modal-body {
            padding: 20px;
          }
          
          .tgs-consent-modal-footer {
            padding: 16px 20px;
          }
          
          .tgs-consent-canal-item {
            padding: 10px;
          }
        }
      `;
    }

    escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    closeModal() {
      if (this.config.mode === 'modal') {
        // Remove Escape key listener
        if (this.escapeKeyHandler) {
          document.removeEventListener('keydown', this.escapeKeyHandler);
          this.escapeKeyHandler = null;
        }
        this.destroy();
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
      console.error('[TrustGate Simple Widget]', error);
      if (typeof this.config.onError === 'function') {
        this.config.onError({
          code: error.status || 'WIDGET_ERROR',
          message: error.message || 'Error desconocido'
        });
      }
    }
  }

  window.TrustGateSimpleWidget = TrustGateSimpleWidget;

  // Auto-init solo si está habilitado Y hay configuración válida
  if (config.autoInit !== false && config.clientKey) {
    document.addEventListener('DOMContentLoaded', () => {
      const widget = new TrustGateSimpleWidget(config);
      widget.init();
    });
  }
})();
