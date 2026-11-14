import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const visible = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');

for (const [file, slug, service] of [['pressure-cleaning.html', 'pressure-cleaning', 'pressure_cleaning'], ['vinyl-flooring.html', 'vinyl-flooring', 'vinyl_flooring']]) {
  test(file + ' is a complete service page with the quote form', () => {
    const html = read(file);
    assert.match(html, /<form[^>]*id="leadForm"/);
    assert.match(html, new RegExp('<option value="' + service + '" selected>'));
    assert.match(html, /name="heard_about"/);
    assert.match(html, /name="service_details"/);
    assert.match(html, /GTM-WJD9DQS5/);
    assert.match(html, /G-D7FQXH0TTJ/);
    assert.match(html, /src="\/lead-capture\.js"/);
    assert.match(html, /emailjs\.init\("0UbAC3h4lfmDB7YpU"\)/);
    assert.match(html, new RegExp('<link rel="canonical" href="https://csservicesfl.com/' + slug + '">'));
    assert.match(html, /954-263-1159/);
    assert.ok(!visible(html).includes('—'), 'no em dash in visible text');
    assert.ok(!/\$\s?\d/.test(visible(html)), 'no prices');
  });
  test(file + ' is routed and in the sitemap', () => {
    assert.ok(read('sitemap.xml').includes('https://csservicesfl.com/' + slug + '<'));
    assert.ok(JSON.parse(read('vercel.json')).rewrites.some(r => r.source === '/' + slug && r.destination === '/' + file));
  });
}

const FORM_PAGES = {
  'index.html': null, 'services.html': null, 'siman-method.html': null, 'testimonials.html': null,
  'painting.html': 'painting', 'custom-remodeling.html': 'remodeling', 'property-maintenance.html': 'property_maintenance',
  'hoa-maintenance.html': 'hoa_maintenance', 'hoa-maintenance-delray-beach.html': 'hoa_maintenance',
  'hoa-maintenance-boca-raton.html': 'hoa_maintenance', 'hoa-maintenance-boynton-beach.html': 'hoa_maintenance',
  'hoa-maintenance-pompano-beach.html': 'hoa_maintenance', 'hoa-maintenance-fort-lauderdale.html': 'hoa_maintenance',
  'parking-lot-striping.html': 'parking_lot'
};
for (const [file, service] of Object.entries(FORM_PAGES)) {
  test(file + ' quote form feeds the Agency OS leads inbox', () => {
    const html = read(file);
    assert.match(html, /src="\/lead-capture\.js"/);
    assert.ok(!html.includes('emailjs.send('), 'old inline handler removed');
    assert.match(html, /name="heard_about"/);
    if (service) assert.match(html, new RegExp('<input type="hidden" name="service" value="' + service + '">'));
    else for (const s of ['painting', 'hoa_maintenance', 'remodeling', 'property_maintenance', 'pressure_cleaning', 'vinyl_flooring'])
      assert.match(html, new RegExp('<option value="' + s + '"'));
    assert.match(html, /emailjs\.init\("0UbAC3h4lfmDB7YpU"\)/);
  });
}

test('careers keeps its own application handler', () => {
  const html = read('careers.html');
  assert.ok(!html.includes('/lead-capture.js'));
  assert.ok(html.includes("emailjs.send('service_0bphc1j', 'template_z0409cp'"));
});

test('every page with the mobile menu links the new service pages', () => {
  for (const f of fs.readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.html'))) {
    const html = read(f);
    if (!html.includes('mnav-panel')) continue;
    assert.ok(html.includes('href="pressure-cleaning"') && html.includes('href="vinyl-flooring"'), f);
  }
});

test('services page lists pressure cleaning and vinyl flooring', () => {
  const html = read('services.html');
  assert.match(html, /href="\/pressure-cleaning"/);
  assert.match(html, /href="\/vinyl-flooring"/);
});

test('unit count is the official 1,200+ on every page', () => {
  for (const f of fs.readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.html'))) {
    assert.ok(!/\b400\+/.test(read(f)), f + ' still says 400+');
  }
  assert.match(read('service-areas.html'), /1,200\+ units served/);
});

const visibleAll = html => html.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
const pages = () => fs.readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.html')).concat(['link/index.html']);

test('no em or en dashes anywhere a visitor or Google reads', () => {
  for (const f of pages()) {
    const hit = visibleAll(read(f)).match(/.{0,30}[–—].{0,30}/);
    assert.equal(hit, null, f + ': ' + (hit && hit[0]));
  }
});

test('pressure cleaning and vinyl flooring use the standard service page layout', () => {
  for (const f of ['pressure-cleaning.html', 'vinyl-flooring.html']) {
    const html = read(f);
    assert.ok(!/pv-|service-premium/.test(html), f + ' still has premium-only markup');
    assert.match(html, /<section class="svc-hero">/);
    assert.match(html, /<div class="gal-grid">/);
    assert.match(html, /Mon to Fri, 9 AM to 5 PM/);
  }
});

test('parking lot page is a complete service page with before, during and after photos', () => {
  const html = read('parking-lot-striping.html');
  assert.match(html, /<section class="svc-hero">/);
  assert.match(html, new RegExp('<link rel="canonical" href="https://csservicesfl.com/parking-lot-striping">'));
  for (const p of ['before', 'during', 'after']) for (const n of [1, 2, 3]) assert.ok(html.includes('images/services/parking-' + p + '-' + n + '.jpg'), p + n);
  assert.match(html, /<input type="hidden" name="service" value="parking_lot">/);
  assert.match(html, /<video[^>]*src="images\/services\/parking-striping\.mp4"[^>]*muted[^>]*playsinline/);
  assert.match(html, /poster="images\/services\/parking-striping-poster\.jpg"/);
  assert.match(html, /src="\/lead-capture\.js"/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.ok(read('sitemap.xml').includes('https://csservicesfl.com/parking-lot-striping<'));
  assert.ok(JSON.parse(read('vercel.json')).rewrites.some(r => r.source === '/parking-lot-striping' && r.destination === '/parking-lot-striping.html'));
  for (const f of pages()) if (read(f).includes('mnav-panel')) assert.ok(read(f).includes('href="parking-lot-striping"'), f);
});
