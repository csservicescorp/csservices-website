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
