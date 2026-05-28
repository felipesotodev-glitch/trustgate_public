(function (global) {
  const existing = global.TrustGateWidgetSDK || {};

  function normalizeString(value) {
    return String(value ?? '').trim();
  }

  function normalizeMode(value, fallback = 'modal') {
    return ['banner', 'modal', 'inline'].includes(value) ? value : fallback;
  }

  function normalizeConfig(widgetConfig = {}) {
    return {
      clientKey: normalizeString(widgetConfig.clientKey),
      identifier: normalizeString(widgetConfig.identifier),
      email: normalizeString(widgetConfig.email),
      rut: normalizeString(widgetConfig.rut),
      mode: normalizeMode(widgetConfig.mode, 'modal'),
      targetId: normalizeString(widgetConfig.targetId),
      title: normalizeString(widgetConfig.title),
      description: normalizeString(widgetConfig.description),
      token: normalizeString(widgetConfig.token),
      authorizationUrl: normalizeString(widgetConfig.authorizationUrl),
      onReady: widgetConfig.onReady,
      onComplete: widgetConfig.onComplete,
      onError: widgetConfig.onError,
      onOpen: widgetConfig.onOpen,
      onClose: widgetConfig.onClose
    };
  }

  function resolveTarget(targetId) {
    if (!targetId) {
      return null;
    }
    return document.getElementById(targetId);
  }

  function ensureHost(targetId, mode, hostAttrName) {
    const host = document.createElement('div');
    host.setAttribute(hostAttrName, 'true');
    host.setAttribute('data-trustgate-widget-mode', mode);

    if (mode === 'inline') {
      const target = resolveTarget(targetId);
      if (!target) {
        throw new Error('No se encontro el contenedor inline indicado por targetId.');
      }
      target.innerHTML = '';
      target.appendChild(host);
    } else {
      document.body.appendChild(host);
    }

    const shadow = host.attachShadow({ mode: 'open' });
    return { host, shadow };
  }

  function destroyHost(instance) {
    if (instance && instance.host && instance.host.parentNode) {
      instance.host.parentNode.removeChild(instance.host);
    }
    instance.host = null;
    instance.shadow = null;
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[data-trustgate-src="${src}"]`);
      if (existingScript) {
        if (existingScript.getAttribute('data-loaded') === 'true') {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error(`No fue posible cargar ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-trustgate-src', src);
      script.addEventListener('load', () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`No fue posible cargar ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function buildIframeUrl(basePath, token, params = {}) {
    const url = new URL(basePath, window.location.origin);
    if (token) {
      url.pathname = url.pathname.replace(/\/$/, '') + '/' + encodeURIComponent(token);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && String(value).length > 0) {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  }

  function emitEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  global.TrustGateWidgetSDK = {
    ...existing,
    normalizeString,
    normalizeMode,
    normalizeConfig,
    resolveTarget,
    ensureHost,
    destroyHost,
    loadScriptOnce,
    buildIframeUrl,
    emitEvent
  };
})(window);
