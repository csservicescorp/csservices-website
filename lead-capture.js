/* CS Services quote forms: remember where the visit came from and send each request to
   EmailJS (email to the office), the Google Sheet and the Agency OS leads inbox, in parallel.
   The visitor sees success when the email OR the Agency OS accepted the request. */
(function (window) {
  var ENDPOINT = 'https://agency.csservicesfl.com/intake/lead';
  var SHEET = 'https://script.google.com/macros/s/AKfycbyUeCVIqlc7CG6uSFsvm2cEG15Eo5YqVVRjk2ZJSf7TmD_bWjJCeZ_-p1uSYWIJIItV/exec';
  var KEY = 'cs_attr';
  var FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'];
  var SERVICE_NAMES = { pressure_cleaning: 'Pressure cleaning', vinyl_flooring: 'Vinyl flooring', other: 'Other' };

  function captureAttribution(location, referrer, storage) {
    try {
      var saved = storage && storage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* storage blocked: fall through */ }
    var params = new URLSearchParams(location.search || '');
    var attr = { referrer: String(referrer || '').slice(0, 500), landing_page: String(location.pathname || '/').slice(0, 500) };
    FIELDS.forEach(function (k) { attr[k] = (params.get(k) || '').slice(0, 200); });
    try { if (storage) storage.setItem(KEY, JSON.stringify(attr)); } catch (e) { /* private mode */ }
    return attr;
  }

  function buildPayload(data, attr, pagePath) {
    var p = {
      name: data.name || '', phone: data.phone || '', email: data.email || '', address: data.address || '',
      city: data.city || data.address || '', service: data.service || 'other', service_details: data.service_details || '',
      heard_about: data.heard_about || 'other', message: data.message || '', website: data.website || '', page: pagePath || ''
    };
    Object.keys(attr || {}).forEach(function (k) { p[k] = attr[k]; });
    return p;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function settle(p) { return p.then(function () { return true; }, function () { return false; }); }

  function submit(payload, opts) {
    var call = function (fn) { try { return Promise.resolve(fn(payload)); } catch (e) { return Promise.reject(e); } };
    var email = settle(call(opts.sendEmail));
    var agency = settle(withTimeout(call(opts.sendAgency), opts.timeoutMs || 8000));
    settle(call(opts.sendSheet));
    return Promise.all([email, agency]).then(function (r) { return r[0] || r[1]; });
  }

  function sendAgency(payload) {
    return window.fetch(ENDPOINT, { method: 'POST', mode: 'cors', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) }).then(function (r) { if (!r.ok) throw new Error('agency ' + r.status); return true; });
  }

  function sendEmail(payload) {
    if (!window.emailjs) return Promise.reject(new Error('emailjs missing'));
    var extra = [payload.service !== 'other' ? 'Service: ' + (SERVICE_NAMES[payload.service] || payload.service) : '',
      payload.service_details ? 'Details: ' + payload.service_details : '',
      payload.heard_about ? 'Heard about us: ' + payload.heard_about : ''].filter(Boolean).join('\n');
    return window.emailjs.send('service_0bphc1j', 'template_t6r44vb', {
      from_name: payload.name, from_email: payload.email, phone: payload.phone, address: payload.address,
      message: [payload.message, extra].filter(Boolean).join('\n\n'), to_email: 'info@csservicecorp.com'
    });
  }

  function sendSheet(payload) {
    var path = payload.page || '';
    var source = path.indexOf('pressure') !== -1 ? 'Pressure Cleaning Page' : path.indexOf('vinyl') !== -1 ? 'Vinyl Flooring Page'
      : path.indexOf('hoa') !== -1 ? 'HOA Page' : path.indexOf('siman') !== -1 ? 'Siman Method Page' : 'Homepage';
    return window.fetch(SHEET, { method: 'POST', body: JSON.stringify({ name: payload.name, email: payload.email, phone: payload.phone,
      address: payload.address, message: payload.message, source: source, service: payload.service, heard_about: payload.heard_about }) });
  }

  function track(service) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'form_submit_success');
      window.gtag('event', 'generate_lead', { service: service });
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'gtm_generate_lead', service: service });
  }

  function bindForm(form) {
    if (!form) return;
    var attr = captureAttribution(window.location, window.document.referrer, window.sessionStorage);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"], .lf-submit');
      var label = btn ? btn.textContent : '';
      var data = Object.fromEntries(new window.FormData(form));
      var payload = buildPayload(data, attr, window.location.pathname);
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
      var done = function () {
        if (btn) { btn.textContent = 'Message Sent ✓'; btn.style.background = '#16a34a'; }
        form.reset();
        setTimeout(function () { if (btn) { btn.textContent = label; btn.style.background = ''; btn.disabled = false; } }, 4000);
      };
      if (payload.website) { sendAgency(payload).catch(function () {}); done(); return; } // bots: recorded as spam, no email
      submit(payload, { sendEmail: sendEmail, sendSheet: sendSheet, sendAgency: sendAgency, timeoutMs: 8000 }).then(function (ok) {
        if (ok) { track(payload.service); done(); return; }
        if (btn) { btn.textContent = label; btn.disabled = false; }
        window.alert('Something went wrong sending your message. Please call us at 954-263-1159 or email info@csservicecorp.com directly.');
      });
    });
  }

  window.CSLead = { captureAttribution: captureAttribution, buildPayload: buildPayload, submit: submit, bindForm: bindForm };
  if (window.document && window.document.readyState) {
    var start = function () { bindForm(window.document.getElementById('leadForm')); };
    if (window.document.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', start); else start();
  }
})(window);
