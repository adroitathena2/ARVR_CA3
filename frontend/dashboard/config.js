'use strict';
/* AR Passport — Web Dashboard config.
 * Resolves the backend API base URL with this precedence:
 *   1. ?api= query override (persisted, parity with frontend/ar)
 *   2. window.__API_BASE_URL (inline override for hosted deploys)
 *   3. localStorage key "AR_API_BASE_URL" (persisted via the header setting)
 *   4. "http://localhost:3000" (local dev default only — never a prod URL)
 * No production API URL is hardcoded here; set it via 1 or 2 above.
 *
 * AR scanner link resolution (frontend-to-frontend navigation, not the API):
 *   1. ?ar= query override (persisted)
 *   2. window.__AR_SCANNER_URL (deploy env AR_SCANNER_URL via env.js)
 *   3. localStorage key "AR_SCANNER_URL"
 *   4. Default "https://arvrca3.netlify.app/" (separate Netlify site; the
 *      dashboard site has no /ar/ path, so a relative link 404s).
 */
(function (global) {
  var STORAGE_KEY = 'AR_API_BASE_URL';
  var DEV_DEFAULT = 'http://localhost:3000';
  var AR_STORAGE_KEY = 'AR_SCANNER_URL';
  var AR_DEFAULT = 'https://arvrca3.netlify.app/';

  function normalize(url) {
    if (!url || typeof url !== 'string') return '';
    return url.trim().replace(/\/+$/, '');
  }

  function normalizeDir(url) {
    var clean = normalize(url);
    return clean ? clean + '/' : '';
  }

  function readStored(key) {
    try {
      if (global.localStorage) return normalize(global.localStorage.getItem(key));
    } catch (e) { /* storage unavailable (private mode) — fall through */ }
    return '';
  }

  function writeStored(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, value);
    } catch (e) { /* non-fatal: keep in-memory only */ }
  }

  function readQuery(name) {
    try {
      if (!global.location || !global.location.search) return '';
      var q = new URLSearchParams(global.location.search);
      return normalize(q.get(name) || '');
    } catch (e) { return ''; }
  }

  // Apply ?api= / ?ar= overrides once at load (persisted for later visits).
  try {
    var qApi = readQuery('api');
    if (qApi && /^https?:\/\//i.test(qApi)) {
      writeStored(STORAGE_KEY, qApi);
      global.__API_BASE_URL = qApi;
    }
    var qAr = readQuery('ar');
    if (qAr && /^https?:\/\//i.test(qAr)) {
      writeStored(AR_STORAGE_KEY, qAr);
      global.__AR_SCANNER_URL = qAr;
    }
  } catch (e) { /* never break page load on override parsing */ }

  function getApiBaseUrl() {
    var fromWindow = normalize(global.__API_BASE_URL);
    if (fromWindow) return fromWindow;
    try {
      var stored = normalize(global.localStorage && global.localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch (e) { /* storage unavailable (private mode) — fall through */ }
    return DEV_DEFAULT;
  }

  function setApiBaseUrl(url) {
    var clean = normalize(url);
    if (!clean) throw new Error('API base URL must not be empty.');
    if (!/^https?:\/\//i.test(clean)) throw new Error('API base URL must start with http:// or https://.');
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, clean);
    } catch (e) { /* non-fatal: keep in-memory only */ }
    global.__API_BASE_URL = clean;
    return clean;
  }

  function getArScannerUrl() {
    var fromWindow = normalize(global.__AR_SCANNER_URL);
    if (fromWindow) return normalizeDir(fromWindow);
    var stored = readStored(AR_STORAGE_KEY);
    if (stored) return normalizeDir(stored);
    return AR_DEFAULT;
  }

  function setArScannerUrl(url) {
    var clean = normalize(url);
    if (!clean) throw new Error('AR scanner URL must not be empty.');
    if (!/^https?:\/\//i.test(clean)) throw new Error('AR scanner URL must start with http:// or https://.');
    writeStored(AR_STORAGE_KEY, clean);
    global.__AR_SCANNER_URL = clean;
    return normalizeDir(clean);
  }

  global.ARPassportConfig = {
    storageKey: STORAGE_KEY,
    devDefault: DEV_DEFAULT,
    getApiBaseUrl: getApiBaseUrl,
    setApiBaseUrl: setApiBaseUrl,
    arStorageKey: AR_STORAGE_KEY,
    arDefault: AR_DEFAULT,
    getArScannerUrl: getArScannerUrl,
    setArScannerUrl: setArScannerUrl
  };
})(typeof window !== 'undefined' ? window : this);
