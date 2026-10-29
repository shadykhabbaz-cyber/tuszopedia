// QA poradnika. Wynik musi być 0. Uruchom: node qa.js [--dir=dist] [--allow-drafts]
// --allow-drafts tylko dla podglądu (dist-preview): szkice dozwolone, ale muszą mieć noindex i nie mogą być w sitemap/llms.txt.
const fs = require('fs'), path = require('path'), C = require('./config');
const ARGS = process.argv.slice(2), arg = n => (ARGS.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const S = path.resolve(__dirname, arg('dir') || 'dist'), ALLOW_DRAFTS = ARGS.includes('--allow-drafts');
const BASE = C.BASE_URL, BP = new URL(BASE).pathname;
let bad = 0, warn = 0; const E = (...a) => { bad++; console.log('FAIL', ...a); }, W = (...a) => { warn++; console.log('WARN', ...a); };
if (!fs.existsSync(S)) { E('brak katalogu', S); process.exit(1); }
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const ALL = walk(S), R = f => path.relative(S, f).split(path.sep).join('/');
const HTML = ALL.filter(f => f.endsWith('.html')), TEXT = ALL.filter(f => /\.(html|txt|xml|json|js|css|webmanifest)$/.test(f));
const read = f => fs.readFileSync(f, 'utf8');
const urlOf = f => BASE + R(f).replace(/(^|\/)index\.html$/, '$1');

// pliki wymagane
for (const f of ['index.html', '404.html', 'o-nas/index.html', 'szukaj/index.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'search-index.json', 'assets/search.js'])
  if (!fs.existsSync(path.join(S, f))) E('missing-file', f);

// szkice z content/ (źródło prawdy o tym, co jest draftem)
const drafts = fs.readdirSync(path.join(__dirname, 'content/articles')).filter(f => f.endsWith('.md')).map(f => {
  const fm = (read(path.join(__dirname, 'content/articles', f)).match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1];
  return /^draft:\s*true\s*$/m.test(fm) ? (fm.match(/^slug:\s*"?([^"\n]+)"?\s*$/m) || [])[1] : null;
}).filter(Boolean);

// resolve ścieżki wewnętrznej -> plik
const resolve = p => { let rel = p.slice(BP.length); rel = decodeURIComponent(rel); if (rel === '' || rel.endsWith('/')) rel += 'index.html'; return path.join(S, rel); };
const ids = {}; const idsOf = f => ids[f] || (ids[f] = new Set([...read(f).matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));

const indexable = [], noOg = [];
for (const f of HTML) {
  const h = read(f), r = R(f), is404 = r === '404.html';
  const noindex = /<meta name="robots" content="noindex/.test(h), isDraft = /<meta name="x-draft" content="true">/.test(h);
  const meta = (attr, name) => (h.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)) || [])[1];
  // meta podstawowe
  if (!/<html lang="pl">/.test(h)) E('lang', r);
  if (!/<meta name="viewport"/.test(h)) E('viewport', r);
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1]; if (!title || !title.trim()) E('title', r);
  else { const tl = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); if ([...tl].length > 60) E('title-over-60', r, [...tl].length, tl); }
  const desc = meta('name', 'description'); if (!desc || desc.length < 20) E('meta-description', r);
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) E('h1-count', r);
  for (const p of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description']) if (!meta('property', p)) E('og-missing', r, p);
  for (const p of ['twitter:card', 'twitter:title', 'twitter:description']) if (!meta('name', p)) E('twitter-missing', r, p);
  if (!meta('property', 'og:image')) noOg.push(r);
  // canonical + og:url (404 bez canonical)
  const can = (h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
  if (is404) { if (!noindex) E('404-not-noindex', r); }
  else {
    if (!can) E('canonical-missing', r); else if (can !== urlOf(f)) E('canonical-mismatch', r, can, '≠', urlOf(f));
    if (meta('property', 'og:url') !== can) E('og-url', r);
  }
  // szkice
  if (isDraft && !ALLOW_DRAFTS) E('draft-in-output', r);
  if (isDraft && !noindex) E('draft-without-noindex', r);
  if (/SZABLON TESTOWY/.test(h) && !ALLOW_DRAFTS) E('placeholder-text-in-output', r);
  if (!noindex && !is404) indexable.push(urlOf(f));
  // JSON-LD
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length && !is404) E('jsonld-missing', r);
  const nodes = [];
  for (const m of blocks) { try { const j = JSON.parse(m[1]); if (j['@context'] !== 'https://schema.org') E('jsonld-context', r); nodes.push(...(j['@graph'] || [j])); } catch (e) { E('jsonld-invalid', r, e.message); } }
  const T = t => nodes.filter(n => [].concat(n['@type']).includes(t));
  if (blocks.length) {
    const ws = T('WebSite')[0]; if (!ws || !ws.potentialAction || ws.potentialAction['@type'] !== 'SearchAction' || !/\{search_term_string\}/.test(JSON.stringify(ws.potentialAction))) E('jsonld-website-searchaction', r);
    const PUB = C.publisher, isRef = o => o && o['@id'] === PUB.id && o.name === PUB.name && o.url === PUB.url;
    if (!ws || !isRef(ws.publisher)) E('jsonld-website-publisher', r);
    const org = { '@id': PUB.id };
    if (r !== 'index.html' && !is404) { const bc = T('BreadcrumbList')[0]; if (!bc || !bc.itemListElement.length || bc.itemListElement.some((x, i) => x.position !== i + 1 || !x.item.startsWith(BASE))) E('jsonld-breadcrumb', r); }
    if (meta('property', 'og:type') === 'article') {
      const a = T('Article')[0];
      if (!a) E('jsonld-article-missing', r);
      else {
        for (const k of ['headline', 'description', 'datePublished', 'dateModified', 'mainEntityOfPage', 'author', 'publisher']) if (!a[k]) E('jsonld-article-field', r, k);
        if (a.author && !isRef(a.author)) E('jsonld-article-author', r);
        if (a.publisher && !isRef(a.publisher)) E('jsonld-article-publisher', r);
        if (a.citation && (!Array.isArray(a.citation) || a.citation.some(c => !/^https?:\/\//.test(c)))) E('jsonld-article-citation', r);
        if (a.mainEntityOfPage !== can) E('jsonld-article-url', r);
      }
    }
  }
  // zakazane w schema (SEO 22.10): award, aggregateRating, review, priceRange, LocalBusiness, TattooParlor + pola bytu studia
  { const J = blocks.map(b => b[1]).join('');
    const fb = J.match(/"(award|awards|aggregateRating|review|reviews|reviewCount|ratingCount|priceRange|address|telephone|taxID|vatID|legalName|sameAs|geo|openingHours\w*)"\s*:|"@type"\s*:\s*"(LocalBusiness|TattooParlor|Review|AggregateRating|PostalAddress)"/i);
    if (fb) E('jsonld-forbidden', r, fb[0]);
    const walkN = (o, f) => { if (o && typeof o === 'object') { f(o); Object.values(o).forEach(v => walkN(v, f)); } };
    for (const n of nodes) walkN(n, o => { if (o['@id'] === C.publisher.id && Object.keys(o).some(k => !['@type', '@id', 'name', 'url', 'logo'].includes(k))) E('jsonld-publisher-not-reference', r, Object.keys(o).join(',')); });
    for (const ts of T('DefinedTermSet')) for (const t of ts.hasDefinedTerm || []) { const fr = (t.url || '').split('#')[1]; if (!fr || !idsOf(f).has(fr)) E('glossary-term-anchor', r, t.url); }
  }
  if (/hreflang=/i.test(h)) E('hreflang-present', r);
  { const ft = (h.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
    if (!/Wydawca:/.test(ft) || !ft.includes(C.publisher.phone) || !ft.includes(C.publisher.street)) E('footer-publisher', r);
    for (const m of ft.matchAll(/<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) if (!/rel="[^"]*nofollow/.test(m[0])) E('footer-link-without-nofollow', r, m[0].slice(0, 80)); }
  const ids2 = [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); ids2.filter((x, i) => ids2.indexOf(x) !== i).forEach(x => E('duplicate-id', r, x));
  for (const m of h.matchAll(/url\((["']?)([^)"']+)\1\)/g)) { const v = m[2]; if (/^(data:|https?:)/.test(v)) continue; if (!v.startsWith(BP)) E('css-url-outside-base', r, v); else if (!fs.existsSync(resolve(v))) E('css-url-broken', r, v); }
  // linki wewnętrzne
  for (const m of h.matchAll(/\s(href|src|action|content)="([^"]*)"/g)) {
    let v = m[2]; const at = m[1];
    if (at === 'content' && !v.startsWith(BASE)) continue;
    if (/^(mailto:|tel:|data:|#$)/.test(v)) continue;
    if (v.startsWith('#')) { if (!idsOf(f).has(v.slice(1))) E('broken-anchor', r, v); continue; }
    if (/^https?:\/\//.test(v)) { if (!v.startsWith(BASE)) continue; v = BP + v.slice(BASE.length); }
    if (v.startsWith('//')) continue;
    if (!v.startsWith('/')) { E('relative-link', r, v); continue; }
    if (!v.startsWith(BP)) { E('outside-base-path', r, v); continue; }
    const [pth, frag] = v.split('?')[0].split('#');
    const tf = resolve(pth);
    if (!fs.existsSync(tf)) { E('broken-link', r, v); continue; }
    if (!/\.[a-z0-9]+$/i.test(pth) && !pth.endsWith('/')) E('no-trailing-slash', r, v);
    if (frag && tf.endsWith('.html') && !idsOf(tf).has(frag)) E('broken-anchor', r, v);
    if (at === 'href' && fs.existsSync(tf) && /<meta name="x-draft"/.test(read(tf)) && !ALLOW_DRAFTS) E('link-to-draft', r, v);
  }
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) E('img-alt', r);
}
if (noOg.length) W(`og:image brak na ${noOg.length} stronach (czeka na domyślny obraz OG od Art Director)`);
// drafty w wyniku (po slugu z content/)
for (const s of drafts) {
  const exists = fs.existsSync(path.join(S, s, 'index.html'));
  if (exists && !ALLOW_DRAFTS) E('draft-page-in-output', s);
}

// sitemap
const sm = fs.existsSync(path.join(S, 'sitemap.xml')) ? read(path.join(S, 'sitemap.xml')) : '';
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
locs.filter((l, i) => locs.indexOf(l) !== i).forEach(l => E('sitemap-duplicate', l));
for (const l of locs) {
  if (!l.startsWith(BASE)) { E('sitemap-outside-base', l); continue; }
  const f = resolve(BP + l.slice(BASE.length));
  if (!fs.existsSync(f)) E('sitemap-missing-file', l);
  else if (/<meta name="robots" content="noindex/.test(read(f))) E('sitemap-noindex-page', l);
  if (drafts.some(s => l === BASE + s + '/')) E('sitemap-draft', l);
}
for (const u of indexable) if (!locs.includes(u)) E('indexable-not-in-sitemap', u);
for (const m of sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1])) E('sitemap-lastmod', m[1]);

// robots, llms, indeks wyszukiwarki
const rb = fs.existsSync(path.join(S, 'robots.txt')) ? read(path.join(S, 'robots.txt')) : '';
if (!rb.includes('Sitemap: ' + BASE + 'sitemap.xml')) E('robots-sitemap');
const llms = fs.existsSync(path.join(S, 'llms.txt')) ? read(path.join(S, 'llms.txt')) : '';
if (!llms.startsWith('# ') || !llms.includes(C.publisher.url)) E('llms-format');
for (const s of drafts) if (llms.includes(BASE + s + '/')) E('llms-draft', s);
try {
  const idx = JSON.parse(read(path.join(S, 'search-index.json')));
  for (const d of idx) { if (!d.t || !d.u) E('search-index-entry', JSON.stringify(d).slice(0, 80)); else if (!fs.existsSync(resolve(d.u))) E('search-index-broken', d.u); if (!ALLOW_DRAFTS && drafts.some(s => d.u === BP + s + '/')) E('search-index-draft', d.u); }
} catch (e) { E('search-index-invalid', e.message); }

// zakazane treści we wszystkich plikach tekstowych
for (const f of TEXT) {
  const t = read(f).replace(/&nbsp;|\u00a0/g, ' '), r = R(f);
  if (/DO POTWIERDZENIA|DO UZUPE[ŁL]NIENIA/i.test(t)) E('marker', r);
  if (/św\.?\s*Barbary|18\s+Stycznia|Barbary\s*46/i.test(t)) E('old-address', r);
  if (/508[\s-]*492[\s-]*400|48508492400/.test(t)) E('nr-508', r);
  if (/795[\s-]*361[\s-]*218|48795361218/.test(t)) E('nr-795', r);
  if (new RegExp("carre" + "four", "i").test(t) && !r.endsWith("qa.js")) E("banned-store", r);
  if (new RegExp("happy[\\s\\u00a0]*kids", "i").test(t) && !r.endsWith("qa.js")) E("banned-hk", r);
  if (new RegExp("ink[\\s\\u00a0-]*lab", "i").test(t) && !r.endsWith("qa.js")) E("banned-il", r);
  // t175u: bez oferty laserowej
  if (/laser/i.test(t) && !r.endsWith("qa.js")) E("banned-laser", r);
  if (f.endsWith('.html') && /<!--/.test(t)) E('html-comment', r);
  if (/aggregateRating|priceRange/.test(t)) E('forbidden-schema-key', r);
}
// NIP i nazwa rejestrowa tylko na /o-nas/ (SEO pkt 5)
for (const f of TEXT) { const r = R(f), t = read(f); if (r !== 'o-nas/index.html' && (t.includes(C.publisher.taxID) || t.includes(C.publisher.legalName))) E('nip-outside-o-nas', r); }
// słowa i dane zakazane (checklista SEO, pkt 6)
for (const f of TEXT.filter(f => !f.endsWith('.js') && !f.endsWith('.css'))) {
  const t = read(f).replace(/&nbsp;|\u00a0/g, ' '), m = t.match(/5,0 z 206|206 opinii|opinii w Google|Złot\w* Firm\w*|shady\.tattoo\.wielun@gmail\.com|tylko raz|w 7 dni|bezzwrotn\w*|odliczan\w*|imienn\w*/i);
  if (m) E('banned-phrase', R(f), m[0]);
}
// kategorie z bramką noindexUntilPublished
for (const c of C.categories.filter(c => c.noindexUntilPublished)) {
  const live = fs.existsSync(path.join(S, c.noindexUntilPublished, 'index.html')) && !/<meta name="x-draft"/.test(read(path.join(S, c.noindexUntilPublished, 'index.html')));
  const cf = path.join(S, 'kategoria', c.slug, 'index.html');
  if (!live && fs.existsSync(cf) && !/<meta name="robots" content="noindex/.test(read(cf))) E('category-gate-not-noindex', c.slug);
  if (!live && locs.includes(BASE + 'kategoria/' + c.slug + '/')) E('category-gate-in-sitemap', c.slug);
}
// IndexNow: własny klucz poradnika
{ const k = C.indexNow && C.indexNow.key;
  if (!/^[a-f0-9]{32}$/.test(k || '')) E('indexnow-key-format');
  else if (k === '07362dd73503117eb988af2252eb6824') E('indexnow-studio-key-reused');
  else { const kf = path.join(S, k + '.txt'); if (!fs.existsSync(kf) || read(kf).trim() !== k) E('indexnow-key-file', k + '.txt'); } }
// wyjście poza bazę: żadnych plików roboczych
for (const f of ALL) if (/\.md$|backup|\.bak$|\.py$/i.test(R(f))) E('source-file-in-output', R(f));

console.log(`QA ${path.relative(__dirname, S)}${ALLOW_DRAFTS ? ' (preview, szkice dozwolone)' : ''}: ${HTML.length} html, ${locs.length} URL w sitemap, ostrzeżenia ${warn}, błędy ${bad}`);
process.exit(bad ? 1 : 0);
