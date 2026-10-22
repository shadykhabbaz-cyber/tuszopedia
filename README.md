# Tuszopedia – statyczny poradnik o tatuażu (szkielet)

Osobny serwis poradnikowy o tatuażu (pierwszy tatuaż, zdrowie, nauka, historia, przepisy), **wydawany przez SHADY TATTOO z Wielunia**.
Niezależny od strony studia (`../build`, `../site`, repo `shadykhabbaz-cyber.github.io`), którego ten projekt **nie rusza**.

Status: szkielet lokalny. Brak repo GitHub, brak publikacji – czeka na zgodę właściciela.
Decyzje SEO: `../seo/poradnik-plan-2210.md` (sekcja „Odpowiedzi dla Web Mastera”). Nazwa: **Tuszopedia**, repo **`tuszopedia`**,
adres `https://shadykhabbaz-cyber.github.io/tuszopedia/` (później własna domena, np. tuszopedia.pl).

## Szybki start

```bash
npm install            # jedyna zależność: marked
node build.js          # produkcja -> dist/  (szkice pominięte)
node qa.js             # QA produkcji – musi być „błędy 0”
node serve.js          # http://localhost:8080/tuszopedia/

node build.js --drafts                    # podgląd ze szkicami -> dist-preview/ (noindex)
node qa.js --dir=dist-preview --allow-drafts
node serve.js --dir=dist-preview
```

Inny adres bazowy (np. własna domena): `BASE_URL=https://tuszopedia.pl/ node build.js && BASE_URL=https://tuszopedia.pl/ node qa.js`.

## Struktura

```
config.js                 JEDYNY plik konfiguracji: BASE_URL, nazwa, meta strony głównej, kategorie, obraz OG, klucz IndexNow, dane wydawcy
build.js                  generator (Node + marked)
qa.js                     kontrola jakości (exit 1 przy błędzie)
serve.js                  lokalny serwer pod tą samą podścieżką co GitHub Pages
content/articles/*.md     artykuły i słownik (frontmatter + markdown)
content/pages/o-nas.md    tekst strony /o-nas/ (blok „Wydawca” generuje build z config.js)
content/img/              obrazy do artykułów -> /img/
src/css/theme.css         MOTYW – zmienne CSS i @font-face (Art Director)
src/css/base.css          style bazowe, tylko na zmiennych
src/js/search.js          wyszukiwarka (vanilla JS, ~2 KB)
src/static/               pliki kopiowane 1:1 do katalogu serwisu (favicony, fonty, img/og-default.jpg)
.github/workflows/pages.yml  deploy przez GitHub Actions (aktywny dopiero w nowym repo)
dist/ , dist-preview/     wynik builda (w .gitignore)
```

## Adresy (decyzja SEO)

| strona | URL | indeksowanie |
|---|---|---|
| główna | `/` | tak |
| artykuł | `/<slug>/` (bez dat) | tak (szkic: nie istnieje w produkcji) |
| słownik | `/slownik-tatuazu/` – jeden URL, hasła jako kotwice `#haslo` | tak |
| kategoria | `/kategoria/<slug>/` | tak, gdy ma opublikowany artykuł; pusta = noindex i poza sitemap |
| `prawo-i-przepisy` | `/kategoria/prawo-i-przepisy/` | noindex do publikacji artykułu nr 25 (`config.js → noindexUntilPublished: 'wymagania-sanitarne-studio-tatuazu'`) |
| o nas | `/o-nas/` | tak |
| wyszukiwarka | `/szukaj/?q=` | noindex, poza sitemap |
| 404 | `/404.html` | noindex, bez canonical |

Pliki: `sitemap.xml`, `robots.txt`, `llms.txt`, `search-index.json`, `<klucz-indexnow>.txt`, `.nojekyll`.
Wszystkie linki mają prefiks ścieżki z `BASE_URL` – serwis działa pod podścieżką (project page) i w korzeniu domeny. Bez hreflang (tylko PL).

## Schema (JSON-LD `@graph`)

- `WebSite` (`…/tuszopedia/#website`) + `SearchAction`, `publisher` = referencja.
- Wydawca **tylko jako referencja** do bytu studia: `{"@type":"Organization","@id":"https://shadykhabbaz-cyber.github.io/#studio","name":"SHADY TATTOO","url":"https://shadykhabbaz-cyber.github.io/"}`.
  Bez adresu, telefonu, NIP, legalName, sameAs – pełny byt (TattooParlor) opisuje strona studia.
- `Article`: headline, description, datePublished, dateModified, inLanguage, articleSection, mainEntityOfPage, isPartOf,
  author = publisher = referencja, `citation` = linki z sekcji „## Źródła” (build wyciąga je sam).
- `BreadcrumbList` (poza stroną główną), `CollectionPage` + `ItemList` (kategorie), `AboutPage` (/o-nas/),
  `DefinedTermSet` + `DefinedTerm` (słownik, `layout: glossary`).
- QA blokuje: award, aggregateRating, review, priceRange, LocalBusiness, TattooParlor, a także address/telephone/taxID/sameAs/geo w schema
  i każde pole w bycie wydawcy poza `@type`, `@id`, `name`, `url`, `logo`.

## Dane wydawcy w HTML (decyzja SEO pkt 5)

- Stopka (każda strona): „Wydawca: SHADY TATTOO, ul. Głęboka 15/3, 98-300 Wieluń, tel. 691 351 557”. Link markowy do studia z `rel="nofollow"`.
  Brak innych linków do studia w stopce (QA: każdy zewnętrzny link w stopce musi mieć nofollow).
- `/o-nas/`: nazwa rejestrowa i NIP (**tylko tam** – QA blokuje NIP i nazwę rejestrową na innych stronach i w llms.txt),
  adres, telefon i jeden zwykły link markowy do strony studia.
- Metryczka artykułu (jedyna, generuje ją szablon): „Opracowanie: SHADY TATTOO, Wieluń” z linkiem do `/o-nas/` (link wewnętrzny), nie do studia. Nie dopisuj jej w treści .md.
- `_szkice/` (robocze teksty Content) jest w .gitignore i build go nie czyta.

## Format treści (Shady Content)

Jeden plik = jeden artykuł: `content/articles/<slug>.md`.

```markdown
---
title: "Tytuł artykułu (H1 i <title>)"
description: "Opis do wyników Google i OG, ok. 120–160 znaków."
category: pierwszy-tatuaz
date: 2026-10-22
updated: 2026-10-22
slug: czy-jestem-gotowy-na-tatuaz
draft: false
---
Wstęp (akapit pod tytułem).

## Śródtytuł (H2)
Tekst, **pogrubienie**, [link wewnętrzny](/inny-slug/), [źródło](https://example.org/).

## Najczęstsze pytania
### Pytanie?
Odpowiedź.

## Źródła
- [Nazwa źródła](https://…)
```

Zasady:
- Wymagane: `title`, `description`, `category`, `date`, `slug`. `updated` opcjonalne (domyślnie = `date`), daty `RRRR-MM-DD`.
- `category`: `pierwszy-tatuaz`, `zdrowie-i-bezpieczenstwo`, `jak-to-dziala`, `ciekawostki`, `prawo-i-przepisy`.
- `slug`: tylko `a-z`, `0-9`, myślniki, bez dat. Zarezerwowane: `kategoria`, `o-nas`, `szukaj`, `assets`, `img`, `404`.
- H1 robi szablon – w treści zaczynaj od `##`. Każdy nagłówek dostaje kotwicę z tekstu (`## Jak się przygotować` → `#jak-sie-przygotowac`).
  Własna kotwica: `## Hasło {#kotwica}` – musi być unikalna w pliku (build przerwie przy duplikacie). Powtórzone kotwice automatyczne dostają sufiks `-2`, `-3`.
- Sekcja `## Źródła` – linki z niej trafiają do `Article.citation`.
- Linki wewnętrzne od korzenia (`/slug/`, `/kategoria/ciekawostki/`, `/o-nas/`) – build dopisze prefiks. Link tylko do opublikowanego celu
  (QA blokuje linki do szkiców i 404). Linki zewnętrzne dostają `rel="noopener"`.
- Tabele markdown są obsługiwane (przewijane na telefonie). Obrazy: `content/img/plik.jpg` → `![opis](/img/plik.jpg)`, alt obowiązkowy.
- `draft: true` = szkic: nie trafia do produkcji, sitemap, llms.txt ani wyszukiwarki. Widać go tylko w `--drafts` (noindex).
- Bez komentarzy HTML, znaczników DO POTWIERDZENIA / DO UZUPEŁNIENIA i słów z checklisty SEO (QA blokuje m.in. „tylko raz”, „w 7 dni”,
  „bezzwrotny”, „odliczany”, „imienne”, „Złota Firma”, opinie/ocena studia, stary adres, +48 508 492 400).
- Fakty o studiu wyłącznie z `../source-of-truth.md`.

### Komponenty (wg makiet Art Directora)

**Ciekawostka** – ramka `.fact`. Akapit zaczynający się od „Źródło:” staje się podpisem źródła:

```markdown
:::ciekawostka
Ötzi żył ponad 5300 lat temu, a na jego skórze zachowały się tatuaże.

Źródło: [South Tyrol Museum of Archaeology](https://www.iceman.it/en/the-iceman/)
:::
```

**Schemat SVG** – jedna linia `::schemat plik | alt | podpis` (plik z `src/static/ilustracje/`, bez `.svg`; pusty alt = opis zapisany w pliku SVG; podpis opcjonalny):

```markdown
::schemat schemat-warstwy-skory | | Schemat poglądowy.
```

Dostępne: `schemat-warstwy-skory`, `schemat-maszynka`, `schemat-od-pomyslu-do-gojenia`, `wykres-etapy-gojenia`, `os-czasu-v2` (oś czasu historii; stary `os-czasu-historii` usunięty – nie używać).
Wynik: `<figure class="diagram"><img … width height loading="lazy">` (bez wstawiania SVG w HTML – pliki mają 70–450 KB). Nieistniejący plik
albo niezamknięty blok `:::` przerywa build.

**Lista kontrolna** – `- [ ] punkt` renderuje się jako zwykła lista `ul.checklist` z kwadracikiem w CSS (bez `<input>`, więc bez pól
formularza bez etykiety). Stan `[x]` nie jest pokazywany.

### Słownik (jeden URL, hasła z kotwicami)

```markdown
---
title: "Słownik tatuażu A–Z"
description: "…"
category: jak-to-dziala
date: 2026-10-22
slug: slownik-tatuazu
layout: glossary
---
Wstęp.

## Blowout {#blowout}
Pierwszy akapit = definicja (trafia do DefinedTerm.description).

## Linia {#linia}
…
```

Każdy nagłówek z `{#kotwica}` to hasło: trafia do „Spisu haseł” nad treścią i do `DefinedTermSet`. Nagłówki bez `{#…}` (np. litery `## A`
albo `## Źródła`) nie są hasłami. Link do hasła z innego artykułu: `[blowout](/slownik-tatuazu/#blowout)`.

QA blokuje tekst „SZABLON TESTOWY” w produkcji (pliki testowe szablonu zostały już usunięte).

## Motyw (Shady Art Director)

- Edytuj tylko `src/css/theme.css`. `base.css` używa wyłącznie zmiennych. CSS jest wstawiany inline w każdą stronę.
- Kontrast tekstu min. 4.5:1.
- Fonty i inne `url()` w CSS: build sam przelicza ścieżkę z `BASE_URL`. Działa i `url(/fonts/plik.woff2)`, i `url(/tuszopedia/fonts/plik.woff2)` –
  build znajduje plik w `src/static/` i wstawia aktualny prefiks (przy własnej domenie nic nie trzeba ręcznie zmieniać).
  Brak pliku przerywa build. Fonty bez kursyw są automatycznie `preload`.
- Obraz OG: `src/static/img/og-default.jpg` (1200×630) – podpięty w `config.js → defaultOgImage`.
- Favicony: `src/static/favicon.ico`, `favicon.svg`, `apple-touch-icon.png` – build dodaje `<link rel="icon">`, gdy plik istnieje.
- Logotyp w nagłówku: inline SVG z `src/partials/wordmark.svg` (kopia `design/poradnik/deliver/wordmark/wordmark-tekst.svg`, `<text>` + `currentColor`),
  `aria-label` = nazwa z config.js, link do strony głównej. Wysokość: `.brand .wordmark` w base.css.
- Ikona ramki „Ciekawostka”: `src/partials/ikona-ciekawostki.svg`; kolor tła ramki: zmienna `--c-fact` w theme.css (domyślnie `#F7D6CB`).
- Schematy: `src/static/ilustracje/*.svg` (kopie z `design/poradnik/ilustracje/`).

## QA (`node qa.js`)

Błąd (exit 1) przy: zepsutych linkach, kotwicach i `url()` w CSS; linkach względnych lub poza prefiksem `BASE_URL`; braku `title`, description,
canonical (= URL strony), `og:*`, `twitter:*`, `lang`, jednego H1; powtórzonych `id`; niepoprawnym lub niepełnym JSON-LD; zakazanych typach
i polach schema (patrz wyżej); hreflang; stopce bez „Wydawca:”, adresu, telefonu lub z linkiem zewnętrznym bez nofollow; NIP/nazwie rejestrowej
poza /o-nas/; szkicach w wyniku (strona, sitemap, llms.txt, search-index, linki); „SZABLON TESTOWY”; markerach DO POTWIERDZENIA/DO UZUPEŁNIENIA;
komentarzach HTML; słowach zakazanych; starym adresie (św. Barbary, 18 Stycznia); numerze +48 508 492 400; niespójnej sitemap; kategorii
z bramką `noindexUntilPublished` indeksowanej przed czasem; braku lub złym pliku klucza IndexNow (albo użyciu klucza studia); braku `Sitemap:`
w robots.txt; plikach `.md`/`.py`/backup w wyniku.

## IndexNow (zgłasza Shady SEO & AI)

- Osobny klucz poradnika: `ab9c9906adc771a8193c9b7e6eb8520d` (`config.js → indexNow.key`). **Nie** klucz studia.
- Plik klucza w wyniku: `dist/ab9c9906adc771a8193c9b7e6eb8520d.txt` → live:
  **`https://shadykhabbaz-cyber.github.io/tuszopedia/ab9c9906adc771a8193c9b7e6eb8520d.txt`**
- W zgłoszeniu: `host=shadykhabbaz-cyber.github.io`, `key=ab9c9906adc771a8193c9b7e6eb8520d`,
  `keyLocation=https://shadykhabbaz-cyber.github.io/tuszopedia/ab9c9906adc771a8193c9b7e6eb8520d.txt`.
  Klucz w podkatalogu uprawnia tylko URL-e spod `/tuszopedia/`.
- Przy własnej domenie plik trafi do korzenia domeny (`https://tuszopedia.pl/<klucz>.txt`) – zmienia się tylko keyLocation i host.

## Deploy (dopiero po zgodzie właściciela)

1. Na koncie `shadykhabbaz-cyber` utwórz **nowe publiczne** repo **`tuszopedia`**. Nie używaj repo `shadykhabbaz-cyber.github.io`.
2. `BASE_URL` = `https://shadykhabbaz-cyber.github.io/tuszopedia/` w `config.js` i `.github/workflows/pages.yml` (już ustawione).
   Lokalnie: `node build.js && node qa.js` → 0 błędów. Szkice `szablon-test-*` usunięte, są opublikowane artykuły.
3. Wypchnij ten folder (bez `dist/`, `node_modules/`) na `main`.
4. **Wariant A – Actions (zalecany):** Settings → Pages → Source: *GitHub Actions*. Workflow robi build → QA → deploy; błąd QA zatrzymuje publikację.
   **Wariant B – gałąź:** zbuduj lokalnie, wypchnij zawartość `dist/` na gałąź `gh-pages` (jest `.nojekyll`), Settings → Pages → Deploy from branch → `gh-pages` / root.
5. **robots.txt studia – w TYM SAMYM deployu co pierwsza publikacja poradnika, nie wcześniej** (inaczej wskazuje 404):
   w repo studia (`shadykhabbaz-cyber.github.io`) dopisz do `robots.txt` linię
   `Sitemap: https://shadykhabbaz-cyber.github.io/tuszopedia/sitemap.xml`.
   Istniejące `Allow: /` i `Sitemap` studia bez zmian. Dla project page roboty czytają robots.txt z korzenia hosta, więc lokalny
   `/tuszopedia/robots.txt` nie wystarczy (zadziała dopiero na własnej domenie). Kolejność: najpierw live poradnika (sitemap.xml = 200), potem deploy
   robots.txt studia ze zwykłą procedurą studia (rollback, QA 0, weryfikacja live). URL-i poradnika **nie** dodawać do sitemap studia.
6. Sprawdź live: strona główna, artykuł, słownik z kotwicą, `/o-nas/`, wyszukiwarka, nieistniejący adres → 404, `sitemap.xml`,
   plik klucza IndexNow (200, treść = klucz). Zapisz hash commita (rollback = poprzedni commit / poprzedni run workflow)
   i przekaż hash + listę URL-i Shady SEO & AI (IndexNow, log w `seo/indexnow-log.md`).
7. Google Search Console: osobna usługa *prefiks URL* `https://shadykhabbaz-cyber.github.io/tuszopedia/`, zgłoszenie `sitemap.xml`
   (ping sitemap do Google nie istnieje od 2023). Bing Webmaster Tools: sitemap poradnika.
8. Własna domena później: `src/static/CNAME` z domeną, DNS u rejestratora, Settings → Pages → Custom domain + HTTPS,
   zmiana `BASE_URL` (config + workflow), przebudowa, `curl -I` starego adresu (przekierowanie GitHub Pages), zmiana adresu w GSC,
   IndexNow keyLocation w korzeniu domeny.
