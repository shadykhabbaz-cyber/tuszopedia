// Generator statycznego poradnika. Czysty Node + marked. Uruchom: node build.js [--drafts] [--out=DIR] [--lighthouse]
//   (bez flag)   produkcja -> dist/, szkice (draft: true) pomijane
//   --drafts     podgląd   -> dist-preview/, szkice budowane z noindex (do testu szablonów, NIE do publikacji)
//   --lighthouse tylko z --drafts: szkice bez noindex, wyłącznie do lokalnego pomiaru Lighthouse
const fs = require('fs'), path = require('path'), { marked } = require('marked');
const C = require('./config');
const ARGS = process.argv.slice(2), arg = n => (ARGS.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const DRAFTS = ARGS.includes('--drafts'), LH = DRAFTS && ARGS.includes('--lighthouse');
const OUT = path.resolve(__dirname, arg('out') || (DRAFTS ? 'dist-preview' : 'dist'));
const ROOT = __dirname, CONTENT = path.join(ROOT, 'content');
// Build czyta WYŁĄCZNIE content/articles, content/pages, content/img i src/. Katalog _szkice/ (robocze teksty Content) nigdy nie jest czytany.
const BASE = C.BASE_URL, BP = new URL(BASE).pathname; // np. /poradnik-tatuazu/
const P = C.publisher;
const u = p => BP + String(p).replace(/^\//, '');   // ścieżka wewnętrzna z prefiksem
const abs = p => BASE + String(p).replace(/^\//, ''); // pełny URL
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const fmt = d => { const [y, m, dd] = d.split('-'); return `${+dd}\u00a0${MONTHS[m - 1]} ${y}`; };
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const RESERVED = new Set(['kategoria', 'o-nas', 'szukaj', 'assets', 'img', '404', C.indexNow.key]);
const die = m => { console.error('BUILD ERROR:', m); process.exit(1); };

// ---------- frontmatter ----------
function parseFM(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) die(`${file}: brak frontmatter (--- ... ---)`);
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const k = line.match(/^([a-zA-Z_]+):\s*(.*)$/); if (!k) die(`${file}: nieczytelna linia frontmatter: ${line}`);
    let v = k[2].trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1); else if (v === 'true') v = true; else if (v === 'false') v = false;
    fm[k[1]] = v;
  }
  return { fm, body: m[2] };
}

// ---------- markdown ----------
// Komponenty (makiety Art Directora, design/poradnik/README.md pkt 7):
//   :::ciekawostka            ramka „Ciekawostka” (.fact); akapit zaczynający się od „Źródło:” = podpis źródła
//   treść…
//   Źródło: [nazwa](https://…)
//   :::
//   ::schemat plik | alt | podpis     schemat SVG z src/static/ilustracje/<plik>.svg (alt pusty = aria-label z pliku)
const PARTIAL = f => fs.readFileSync(path.join(ROOT, 'src/partials', f), 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
const ICON_FACT = PARTIAL('ikona-ciekawostki.svg').replace(/\s*role="img"/, '').replace(/\s*aria-label="[^"]*"/, '').replace(/<title>[\s\S]*?<\/title>/, '').replace(/\s*width="\d+" height="\d+"/, '').replace('<svg ', '<svg aria-hidden="true" focusable="false" ');
function components(src, file) {
  src = src.replace(/^:::ciekawostka[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*$/gm, (m, inner) => {
    const h = md(inner).replace(/<p>(Źródło:|Źródła:)/, '<p class="src">$1');
    return `\n<aside class="fact" aria-label="Ciekawostka"><p class="fact__label">${ICON_FACT}Ciekawostka</p>${h.trim()}</aside>\n`;
  });
  if (/^:::/m.test(src)) die(`${file}: niezamknięty lub nieznany blok ::: (dozwolone: :::ciekawostka … :::)`);
  src = src.replace(/^::schemat[ \t]+(.+)$/gm, (m, args) => {
    const [plik, alt = '', podpis = ''] = args.split('|').map(x => x.trim()), name = plik.replace(/\.svg$/, '');
    const f = path.join(ROOT, 'src/static/ilustracje', name + '.svg');
    if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(f)) die(`${file}: ::schemat – brak pliku src/static/ilustracje/${name}.svg`);
    const svg = fs.readFileSync(f, 'utf8').slice(0, 2000), vb = (svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) || [, 960, 540]);
    const a = alt || (svg.match(/aria-label="([^"]*)"/) || [, ''])[1];
    if (!a) die(`${file}: ::schemat ${name} – brak alt`);
    return `\n<figure class="diagram"><img src="${u('ilustracje/' + name + '.svg')}" alt="${esc(a)}" width="${Math.round(vb[1])}" height="${Math.round(vb[2])}" loading="lazy" decoding="async">${podpis ? `<figcaption>${esc(podpis)}</figcaption>` : ''}</figure>\n`;
  });
  return src;
}
const renderer = new marked.Renderer();
const fixHref = h => (h && h.startsWith('/') && !h.startsWith('//')) ? u(h) : h;
renderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens), ext = /^https?:\/\//.test(href) && !href.startsWith(BASE);
  return `<a href="${esc(fixHref(href))}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' rel="noopener"' : ''}>${text}</a>`;
};
renderer.image = function ({ href, title, text }) {
  return `<img src="${esc(fixHref(href))}" alt="${esc(text || '')}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" decoding="async">`;
};
// Nagłówki: `## Hasło {#kotwica}` = własna kotwica (data-term – hasło słownika); bez {#…} kotwica z tekstu.
renderer.heading = function ({ tokens, depth }) {
  let t = this.parser.parseInline(tokens), id, own = false;
  const m = t.match(/\s*\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}\s*$/);
  if (m) { id = m[1]; own = true; t = t.slice(0, m.index); } else id = slugify(t.replace(/<[^>]+>/g, ''));
  const d = Math.max(2, depth); // H1 jest tylko w szablonie
  return `<h${d} id="${id}"${own ? ' data-term' : ''}>${t}</h${d}>\n`;
};
const tableR = marked.Renderer.prototype.table;
renderer.table = function (tok) { return `<div class="table-wrap" role="region" aria-label="Tabela" tabindex="0">${tableR.call(this, tok)}</div>\n`; };
// Listy zadań `- [ ]` renderujemy jako zwykłą listę (bez <input> bez etykiety – WCAG).
renderer.checkbox = () => '';
const listR = marked.Renderer.prototype.list;
renderer.list = function (tok) { const h = listR.call(this, tok); return tok.items.some(i => i.task) ? h.replace(/^<(ul|ol)/, '<$1 class="checklist"') : h; };
marked.use({ renderer, gfm: true });
const md = s => marked.parse(s);
const plain = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

// ---------- treść ----------
const CATS = C.categories, CAT = Object.fromEntries(CATS.map(c => [c.slug, c]));
// kontrast chipów kategorii (WCAG AA 4.5:1 dla małego tekstu)
const lum = h => { const v = h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const c of CATS) { if (!c.bg || !c.fg) die(`kategoria ${c.slug}: brak bg/fg`); const r = ratio(c.bg, c.fg); if (r < 4.5) die(`kategoria ${c.slug}: kontrast ${r.toFixed(2)}:1 < 4.5:1`); c.contrast = +r.toFixed(2); }
const CAT_CSS = CATS.map(c => `.cat--${c.slug}{--cat-bg:${c.bg};--cat-fg:${c.fg}}`).join('');
const REQ = ['title', 'description', 'category', 'date', 'slug'];
const all = fs.readdirSync(path.join(CONTENT, 'articles')).filter(f => f.endsWith('.md')).map(f => {
  const { fm, body } = parseFM(fs.readFileSync(path.join(CONTENT, 'articles', f), 'utf8'), f);
  for (const k of REQ) if (!fm[k]) die(`${f}: brak pola ${k}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) die(`${f}: slug tylko a-z, 0-9 i myślniki`);
  if (RESERVED.has(fm.slug)) die(`${f}: slug „${fm.slug}” jest zarezerwowany`);
  if (!CAT[fm.category]) die(`${f}: nieznana kategoria „${fm.category}” (config.js → categories)`);
  for (const k of ['date', 'updated']) if (fm[k] && !/^\d{4}-\d{2}-\d{2}$/.test(fm[k])) die(`${f}: ${k} w formacie RRRR-MM-DD`);
  fm.updated = fm.updated || fm.date; if (fm.updated < fm.date) die(`${f}: updated wcześniejsze niż date`);
  if (fm.draft !== undefined && typeof fm.draft !== 'boolean') die(`${f}: draft musi być true lub false`);
  if (fm.layout && !['article', 'glossary'].includes(fm.layout)) die(`${f}: layout tylko article albo glossary`);
  let html = md(components(body, f)); const text = plain(html);
  // kotwice: własne {#…} muszą być unikalne (błąd); automatyczne duplikaty dostają sufiks -2, -3…
  const own = [...html.matchAll(/\sid="([^"]+)" data-term/g)].map(m => m[1]), dupOwn = own.filter((x, i) => own.indexOf(x) !== i);
  if (dupOwn.length) die(`${f}: powtórzone kotwice {#…}: ${[...new Set(dupOwn)].join(', ')}`);
  const seen = new Set(own); html = html.replace(/(<h[2-6] id=")([^"]+)("(?! data-term))/g, (m, a, id, b) => { let n = id, k = 2; while (seen.has(n)) n = `${id}-${k++}`; seen.add(n); return a + n + b; });
  // Źródła -> Article.citation (linki zewnętrzne z sekcji „Źródła”)
  const src = (html.match(/<h2[^>]*>\s*Źródła[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/) || [])[1] || '';
  const citation = [...new Set([...src.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
  // hasła słownika: nagłówki z własną kotwicą {#…}; opis = pierwszy akapit po nagłówku
  const terms = [...html.matchAll(/<h([23]) id="([^"]+)" data-term>([\s\S]*?)<\/h\1>\s*(?:<p>([\s\S]*?)<\/p>)?/g)].map(m => ({ id: m[2], name: plain(m[3]), description: m[4] ? plain(m[4]) : '' }));
  if (fm.layout === 'glossary' && !terms.length) die(`${f}: słownik bez haseł – użyj nagłówków \`## Hasło {#kotwica}\``);
  return { ...fm, layout: fm.layout || 'article', citation, terms, draft: fm.draft === true, file: f, html: html.replace(/ data-term>/g, '>'), text, headings: [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(m => plain(m[1])), minutes: Math.max(1, Math.round(text.split(' ').length / 200)), url: `/${fm.slug}/` };
});
const dupSlug = all.map(a => a.slug).filter((s, i, a) => a.indexOf(s) !== i); if (dupSlug.length) die('powtórzone slugi: ' + dupSlug);
const arts = all.filter(a => DRAFTS || !a.draft).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'pl'));
const published = arts.filter(a => !a.draft);
const noindexArt = a => a.draft && !LH;
const catArts = slug => arts.filter(a => a.category === slug);

// ---------- strony statyczne ----------
const tpl = s => s.replace(/\{\{siteName\}\}/g, C.siteName);
const aboutSrc = parseFM(tpl(fs.readFileSync(path.join(CONTENT, 'pages', 'o-nas.md'), 'utf8')), 'pages/o-nas.md');

// ---------- CSS (inline, bez blokujących zapytań) ----------
// Ścieżka z url() w CSS -> plik w src/static niezależnie od prefiksu zapisanego w theme.css (np. /tuszopedia/fonts/x.woff2 albo /fonts/x.woff2).
function staticUrl(p) {
  const segs = p.split('/');
  for (let k = 0; k < segs.length; k++) { const c = segs.slice(k).join('/'); if (c && fs.existsSync(path.join(ROOT, 'src/static', c))) return BP + c; }
  die(`CSS: url(/${p}) – brak pliku w src/static/`);
}
const CSS = ['theme.css', 'base.css'].map(f => fs.readFileSync(path.join(ROOT, 'src/css', f), 'utf8')).join('\n')
  .replace(/url\((["']?)\/(?!\/)([^)"']+)\1\)/g, (m, q, p) => `url(${q}${staticUrl(p)}${q})`) // url(/fonts/…) lub url(/stara-baza/fonts/…) -> url(<BASE>/fonts/…)
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}');

// ---------- schema ----------
// Wydawca = tylko referencja do bytu studia (pełny opis jest na stronie studia). Bez LocalBusiness/TattooParlor, adresu, telefonu, NIP.
const ORG = { '@type': 'Organization', '@id': P.id, name: P.name, url: P.url };
const WEBSITE = {
  '@type': 'WebSite', '@id': abs('#website'), url: BASE, name: C.siteName, description: C.siteDescription, inLanguage: 'pl-PL',
  publisher: ORG,
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('szukaj/') + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
};
const crumbsLD = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })) });
const ld = nodes => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [WEBSITE, ...nodes] }).replace(/</g, '\\u003c')}</script>`;

// ---------- szablon ----------
// Logotyp: inline SVG z <text> i currentColor (src/partials/wordmark.svg od Art Directora); nazwa z config.js
const WORDMARK = PARTIAL('wordmark.svg').trim().replace(/\s*aria-labelledby="[^"]*"/, '').replace(/<title[^>]*>[\s\S]*?<\/title>/, '')
  .replace('<svg ', `<svg aria-label="${esc(C.siteName)}" focusable="false" `).replace(/>[^<]*<\/text>/, `>${esc(C.siteName)}</text>`);
const st = f => fs.existsSync(path.join(ROOT, 'src/static', f));
// preload fontów z @font-face (bez kursyw) – mniejszy CLS przy podmianie fontu
const FONT_PRELOAD = [...new Set([...CSS.matchAll(/url\((["']?)([^)"']+\.woff2)\1\)/g)].map(m => m[2]).filter(f => !/italic/i.test(f)))]
  .map(f => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('\n');
const ICONS = [st('favicon.ico') && `<link rel="icon" href="${u('favicon.ico')}" sizes="32x32">`, st('favicon.svg') && `<link rel="icon" href="${u('favicon.svg')}" type="image/svg+xml">`,
  st('apple-touch-icon.png') && `<link rel="apple-touch-icon" href="${u('apple-touch-icon.png')}">`].filter(Boolean).join('\n') || '<link rel="icon" href="data:,">';
const ogImg = C.defaultOgImage ? abs(C.defaultOgImage) : null;
function page({ path: p, title, description, body, schema = [], noindex = false, type = 'website', crumbs = null, extraHead = '', scripts = '', article = null, nav = '' }) {
  const canonical = abs(p), fullTitle = p === '/' ? title : `${title} | ${C.siteName}`;
  const pageOgImg = (article && st(`img/og/${article.slug}.jpg`)) ? abs(`img/og/${article.slug}.jpg`) : ogImg;
  const pub = `<a href="${P.url}" rel="nofollow">${P.name}</a>`;
  const navItems = [...CATS.map(c => [`/kategoria/${c.slug}/`, c.name, c.slug]), ['/o-nas/', 'O nas']];
  const crumbHTML = crumbs ? `<nav class="crumbs" aria-label="Okruszki"><ol>${crumbs.map(([n, cp], i) => i === crumbs.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${u(cp)}">${esc(n)}</a></li>`).join('')}</ol></nav>` : '';
  return `<!doctype html>
<html lang="${C.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex,follow">\n' : ''}${noindex === 'draft' ? '<meta name="x-draft" content="true">\n' : ''}<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(C.siteName)}">
<meta property="og:locale" content="${C.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
${pageOgImg ? `<meta property="og:image" content="${pageOgImg}">\n` : ''}${article ? `<meta property="article:published_time" content="${article.date}">\n<meta property="article:modified_time" content="${article.updated}">\n<meta property="article:section" content="${esc(CAT[article.category].name)}">\n` : ''}<meta name="twitter:card" content="${pageOgImg ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${pageOgImg ? `<meta name="twitter:image" content="${pageOgImg}">\n` : ''}<meta name="theme-color" content="#ffffff">
${ICONS}
<link rel="sitemap" type="application/xml" href="${u('sitemap.xml')}">
${FONT_PRELOAD}
<style>${CSS}${CAT_CSS}</style>
${extraHead}${ld(schema)}
</head>
<body>
<a class="skip" href="#tresc">Przejdź do treści</a>
<header class="site-head"><div class="wrap">
<a class="brand" href="${u('/')}"${p === '/' ? ' aria-current="page"' : ''}>${WORDMARK}</a>
<p class="tagline">${esc(C.tagline)}</p>
<form class="search-form" role="search" action="${u('szukaj/')}" method="get"><label class="sr" for="q-head">Szukaj w poradniku</label><input id="q-head" type="search" name="q" placeholder="Szukaj w poradniku" autocomplete="off"><button type="submit">Szukaj</button></form>
</div>
<nav class="nav" aria-label="Kategorie i strony"><div class="wrap"><ul>${navItems.map(([np, n, slug]) => `<li><a href="${u(np)}"${np === p || np === nav ? ' aria-current="page"' : ''}>${slug ? `<span class="dot cat--${slug}" aria-hidden="true"></span>` : ''}${esc(n)}</a></li>`).join('')}</ul></div></nav>
</header>
<main id="tresc" class="wrap">
${crumbHTML}${body}
</main>
<footer class="site-foot"><div class="wrap">
<p>Wydawca: ${pub}, ${esc(P.street)}, ${P.postalCode} ${P.city}, tel. <a href="tel:${P.phoneIntl}">${P.phone}</a></p>
<p><strong>${esc(C.siteName)}</strong> · <a href="${u('o-nas/')}">O nas i wydawcy</a> · <a href="${u('szukaj/')}">Szukaj</a></p>
</div></footer>
${scripts}</body>
</html>
`;
}
const card = (a, h = 'h2') => `<li class="card"><p class="card__cat"><span class="chip cat--${a.category}">${esc(CAT[a.category].name)}</span></p><${h}><a href="${u(a.url)}">${esc(a.title)}</a></${h}><p>${esc(a.description)}</p><p class="meta"><time datetime="${a.date}">${fmt(a.date)}</time> · ${a.minutes} min czytania</p></li>`;

// ---------- zapis ----------
fs.rmSync(OUT, { recursive: true, force: true });
const files = [];
const write = (rel, s) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); files.push(rel); };
const sitemap = [];
const lastmod = list => list.map(a => a.updated).sort().pop();

// strona główna
const homeList = published.length || DRAFTS ? arts.slice(0, C.homeLatest) : [];
write('index.html', page({
  path: '/', title: C.home.title, description: C.home.description,
  body: `<h1>${esc(C.home.h1)}</h1><p class="lead">${esc(C.siteDescription)}</p>
<h2>Najnowsze artykuły</h2>${homeList.length ? `<ul class="cards">${homeList.map(a => card(a, 'h3')).join('')}</ul>` : '<p>Pierwsze artykuły pojawią się wkrótce.</p>'}
<h2>Kategorie</h2><ul class="cards">${CATS.map(c => `<li class="card"><h3><a href="${u(`/kategoria/${c.slug}/`)}">${esc(c.name)}</a></h3><p>${esc(c.description)}</p></li>`).join('')}</ul>`,
  schema: [{ '@type': 'WebPage', '@id': abs('#webpage'), url: BASE, name: C.home.title, description: C.home.description, isPartOf: { '@id': abs('#website') }, inLanguage: 'pl-PL' }],
}));
sitemap.push(['/', lastmod(published)]);

// kategorie (pusta kategoria = noindex i poza sitemapą)
for (const c of CATS) {
  const list = catArts(c.slug), p = `/kategoria/${c.slug}/`, gate = c.noindexUntilPublished;
  const idx = list.some(a => !a.draft) && (!gate || published.some(a => a.slug === gate));
  const crumbs = [['Strona główna', '/'], [c.name, p]];
  write(`kategoria/${c.slug}/index.html`, page({
    path: p, title: c.name, description: c.description, crumbs, nav: p, noindex: !idx,
    body: `<h1>${esc(c.name)}</h1><p class="lead">${esc(c.description)}</p>${list.length ? `<ul class="cards">${list.map(a => card(a)).join('')}</ul>` : '<p>Artykuły w tej kategorii pojawią się wkrótce.</p>'}`,
    schema: [{ '@type': 'CollectionPage', '@id': abs(p) + '#webpage', url: abs(p), name: c.name, description: c.description, isPartOf: { '@id': abs('#website') }, inLanguage: 'pl-PL',
      mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(a.url), name: a.title })) } }, crumbsLD(crumbs)],
  }));
  if (idx) sitemap.push([p, lastmod(list.filter(a => !a.draft))]);
}

// artykuły
for (const a of arts) {
  const c = CAT[a.category], crumbs = [['Strona główna', '/'], [c.name, `/kategoria/${c.slug}/`], [a.title, a.url]];
  const rel = catArts(a.category).filter(x => x.slug !== a.slug && (DRAFTS || !x.draft)).slice(0, 3);
  write(`${a.slug}/index.html`, page({
    path: a.url, title: a.title, description: a.description, type: 'article', article: a, crumbs, nav: `/kategoria/${c.slug}/`, noindex: noindexArt(a) ? 'draft' : false,
    body: `<article><header><p class="card__cat"><a class="chip cat--${c.slug}" href="${u(`/kategoria/${c.slug}/`)}">${esc(c.name)}</a></p><h1>${esc(a.title)}</h1><p class="lead">${esc(a.description)}</p>
<p class="meta">Opracowanie: <a href="${u('o-nas/')}">${P.name}, ${P.city}</a> · Opublikowano <time datetime="${a.date}">${fmt(a.date)}</time>${a.updated !== a.date ? ` · Aktualizacja: <time datetime="${a.updated}">${fmt(a.updated)}</time>` : ''} · ${a.minutes} min czytania</p></header>
${a.layout === 'glossary' ? `<nav class="toc" aria-label="Spis haseł"><h2 class="toc-h">Spis haseł</h2><ul>${a.terms.map(t => `<li><a href="#${t.id}">${esc(t.name)}</a></li>`).join('')}</ul></nav>` : ''}<div class="prose">${a.html}</div></article>${rel.length ? `<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Czytaj też</h2><ul class="cards">${rel.map(x => card(x, 'h3')).join('')}</ul></section>` : ''}`,
    schema: [{ '@type': 'Article', '@id': abs(a.url) + '#article', headline: a.title, description: a.description, datePublished: a.date, dateModified: a.updated,
      inLanguage: 'pl-PL', articleSection: c.name, wordCount: a.text.split(' ').length, url: abs(a.url), mainEntityOfPage: abs(a.url),
      author: ORG, publisher: ORG, isPartOf: { '@id': abs('#website') }, ...(a.citation.length ? { citation: a.citation } : {}), ...((st(`img/og/${a.slug}.jpg`) ? abs(`img/og/${a.slug}.jpg`) : ogImg) ? { image: st(`img/og/${a.slug}.jpg`) ? abs(`img/og/${a.slug}.jpg`) : ogImg } : {}),
      ...(a.layout === 'glossary' ? { mainEntity: { '@id': abs(a.url) + '#terms' } } : {}) },
      ...(a.layout === 'glossary' ? [{ '@type': 'DefinedTermSet', '@id': abs(a.url) + '#terms', name: a.title, url: abs(a.url), inLanguage: 'pl-PL',
        hasDefinedTerm: a.terms.map(t => ({ '@type': 'DefinedTerm', '@id': abs(a.url) + '#' + t.id, name: t.name, url: abs(a.url) + '#' + t.id, ...(t.description ? { description: t.description } : {}), inDefinedTermSet: { '@id': abs(a.url) + '#terms' } })) }] : []),
      crumbsLD(crumbs)],
  }));
  if (!a.draft) sitemap.push([a.url, a.updated]);
}

// o nas
{
  const p = '/o-nas/', crumbs = [['Strona główna', '/'], ['O nas', p]], fm = aboutSrc.fm;
  write('o-nas/index.html', page({
    path: p, title: fm.title, description: fm.description, crumbs, nav: p,
    body: `<h1>${esc(fm.title)}</h1><div class="prose">${md(aboutSrc.body)}</div>
<section class="publisher-box" aria-labelledby="wyd-h"><h2 id="wyd-h">Wydawca</h2>
<p><strong>${P.name}</strong> – studio tatuażu z ${P.cityGenitive}</p>
<p>${P.legalName}, NIP ${P.taxID}</p>
<p>${esc(P.street)}, ${P.postalCode} ${P.city}</p>
<p>Telefon: <a href="tel:${P.phoneIntl}">${P.phone}</a></p>
<p>Strona studia: <a href="${P.url}">${P.name}</a></p></section>`,
    schema: [{ '@type': 'AboutPage', '@id': abs(p) + '#webpage', url: abs(p), name: fm.title, description: fm.description, about: ORG, publisher: ORG, isPartOf: { '@id': abs('#website') }, inLanguage: 'pl-PL' }, crumbsLD(crumbs)],
  }));
  sitemap.push([p, fm.updated]);
}

// wyszukiwarka (noindex – strona wyników)
write('szukaj/index.html', page({
  path: '/szukaj/', title: 'Szukaj', description: `Wyszukiwarka artykułów serwisu ${C.siteName}.`, noindex: true, crumbs: [['Strona główna', '/'], ['Szukaj', '/szukaj/']],
  body: `<h1>Szukaj w poradniku</h1><form id="search-page-form" class="search-form" role="search" action="${u('szukaj/')}" method="get"><label class="sr" for="search-page-q">Szukana fraza</label><input id="search-page-q" type="search" name="q" autocomplete="off"><button type="submit">Szukaj</button></form>
<p id="search-status" role="status" aria-live="polite"></p><ul id="search-results" class="results"></ul>
<noscript><p>Wyszukiwarka wymaga JavaScriptu. Przejrzyj <a href="${u('/')}">najnowsze artykuły</a>.</p></noscript>`,
  schema: [crumbsLD([['Strona główna', '/'], ['Szukaj', '/szukaj/']])],
  scripts: `<script src="${u('assets/search.js')}" data-base="${BP}" defer></script>\n`,
}));
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/js/search.js'), path.join(OUT, 'assets/search.js')); files.push('assets/search.js');
write('search-index.json', JSON.stringify(arts.map(a => ({ t: a.title, d: a.description, c: CAT[a.category].name, u: u(a.url), h: a.headings.join(' '), b: a.text.slice(0, 3000) }))));

// 404 (GitHub Pages serwuje /<repo>/404.html dla brakujących ścieżek w projekcie)
write('404.html', page({
  path: '/404.html', title: 'Nie znaleziono strony', description: 'Strona nie istnieje.', noindex: true,
  body: `<h1>Nie znaleziono strony</h1><p>Ta strona nie istnieje albo została przeniesiona.</p><p><a class="btn" href="${u('/')}">Strona główna</a></p><p><a href="${u('szukaj/')}">Wyszukaj artykuł</a></p>`,
}).replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<meta property="og:url"[^>]*>\n/, ''));

// pliki statyczne (src/static -> /, np. obrazy OG, favicon od Art Directora)
const copyDir = (s, d) => { if (!fs.existsSync(s)) return; for (const e of fs.readdirSync(s, { withFileTypes: true })) { const a = path.join(s, e.name), b = path.join(d, e.name); if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copyDir(a, b); } else if (!e.name.startsWith('.')) { fs.copyFileSync(a, b); files.push(path.relative(OUT, b)); } } };
copyDir(path.join(ROOT, 'src/static'), OUT);
fs.writeFileSync(path.join(OUT, '.nojekyll'), ''); // wyłącza Jekyll przy deployu z gałęzi
copyDir(path.join(CONTENT, 'img'), path.join(OUT, 'img'));

// IndexNow: plik klucza poradnika (keyLocation = BASE_URL + <key>.txt)
write(`${C.indexNow.key}.txt`, C.indexNow.key);

// sitemap, robots, llms
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(([p, lm]) => `<url><loc>${abs(p)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
write('llms.txt', `# ${C.siteName}

> ${C.siteDescription}

Wydawca: ${P.name} (studio tatuażu, ${P.street}, ${P.postalCode} ${P.city}, tel. ${P.phone}) – ${P.url}

## Zasady redakcyjne

- Zdrowie i prawo tylko ze źródłami oficjalnymi.
- Nie dajemy porad medycznych ani prawnych.
- Tatuaż dotyczy wyłącznie osób pełnoletnich.

## Sekcje

- [Strona główna](${BASE}): najnowsze artykuły
- [O nas i wydawcy](${abs('o-nas/')}): kto wydaje serwis
${CATS.filter(c => sitemap.some(([sp]) => sp === `/kategoria/${c.slug}/`)).map(c => `- [${c.name}](${abs(`/kategoria/${c.slug}/`)}): ${c.description}`).join('\n')}

## Artykuły
${published.length ? CATS.filter(c => published.some(a => a.category === c.slug)).map(c => `\n### ${c.name}\n\n` + published.filter(a => a.category === c.slug).map(a => `- [${a.title}](${abs(a.url)}): ${a.description}`).join('\n')).join('\n') : '\nPierwsze artykuły pojawią się wkrótce.'}
`);

console.log(`BUILD ${DRAFTS ? 'PREVIEW' + (LH ? ' (lighthouse)' : '') : 'PROD'} -> ${path.relative(ROOT, OUT) || OUT}: ${arts.length} artykułów (${arts.length - published.length} szkiców), ${sitemap.length} URL w sitemap, base ${BASE}, IndexNow keyLocation ${abs(C.indexNow.key + '.txt')}`);
