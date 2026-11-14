import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(new URL('../lead-capture.js', import.meta.url), 'utf8'),
    { window, URLSearchParams, setTimeout, clearTimeout, Promise, JSON, Object, String });
  return window.CSLead;
}

function memory() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('captures utm on first visit only', () => {
  const L = load(), s = memory();
  const first = L.captureAttribution({ search: '?utm_source=google&utm_medium=cpc&utm_campaign=pc&gclid=abc', pathname: '/pressure-cleaning' }, 'https://www.google.com/', s);
  assert.equal(first.utm_source, 'google');
  assert.equal(first.gclid, 'abc');
  assert.equal(first.landing_page, '/pressure-cleaning');
  assert.equal(first.referrer, 'https://www.google.com/');
  const later = L.captureAttribution({ search: '?utm_source=facebook', pathname: '/' }, '', s);
  assert.equal(later.utm_source, 'google');
  assert.equal(later.landing_page, '/pressure-cleaning');
});

test('buildPayload maps fields and keeps honeypot as website', () => {
  const L = load();
  const p = L.buildPayload({ name: 'Ana', phone: '1', email: 'a@x.com', address: 'Delray', service: 'vinyl_flooring',
    service_details: '900 sq ft', heard_about: 'referral', message: 'hi', website: 'bot' }, { utm_source: 'google', landing_page: '/' }, '/vinyl-flooring');
  assert.equal(p.service, 'vinyl_flooring');
  assert.equal(p.city, 'Delray');
  assert.equal(p.website, 'bot');
  assert.equal(p.utm_source, 'google');
  assert.equal(p.page, '/vinyl-flooring');
});

const ok = () => Promise.resolve(true), fail = () => Promise.reject(new Error('x')), never = () => new Promise(() => {});

test('submit resolves true when only Agency OS succeeds', async () => {
  const L = load();
  assert.equal(await L.submit({}, { sendEmail: fail, sendSheet: fail, sendAgency: ok, timeoutMs: 50 }), true);
});

test('submit resolves true when Agency OS times out but email succeeds', async () => {
  const L = load();
  assert.equal(await L.submit({}, { sendEmail: ok, sendSheet: ok, sendAgency: never, timeoutMs: 50 }), true);
});

test('submit resolves false when both fail', async () => {
  const L = load();
  assert.equal(await L.submit({}, { sendEmail: fail, sendSheet: ok, sendAgency: never, timeoutMs: 50 }), false);
});

test('sheetSource names every page with a quote form', () => {
  const L = load();
  const cases = { '/painting.html': 'Painting Page', '/painting': 'Painting Page', '/custom-remodeling.html': 'Remodeling Page',
    '/property-maintenance.html': 'Property Maintenance Page', '/hoa-maintenance-boca-raton.html': 'HOA Page',
    '/siman-method.html': 'Siman Method Page', '/testimonials.html': 'Reviews Page', '/services.html': 'Services Page',
    '/pressure-cleaning': 'Pressure Cleaning Page', '/vinyl-flooring': 'Vinyl Flooring Page', '/': 'Homepage' };
  for (const [p, want] of Object.entries(cases)) assert.equal(L.sheetSource(p), want, p);
});
