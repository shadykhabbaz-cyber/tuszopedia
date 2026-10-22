// === JEDYNY PLIK KONFIGURACJI SERWISU ===
// Decyzje SEO: seo/poradnik-plan-2210.md, sekcja „Odpowiedzi dla Web Mastera” (22.10.2026 15:20).
// BASE_URL można nadpisać zmienną środowiskową: BASE_URL=https://tuszopedia.pl/ node build.js
// Zawsze z końcowym ukośnikiem. Ścieżka po domenie (np. /tuszopedia/) staje się prefiksem wszystkich linków.
const BASE_URL = process.env.BASE_URL || 'https://shadykhabbaz-cyber.github.io/tuszopedia/';

module.exports = {
  BASE_URL: BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/',
  siteName: 'Tuszopedia',
  tagline: 'Poradnik o tatuażu · wydawca: SHADY TATTOO', // podpis w nagłówku (makieta .masthead)
  siteDescription: 'Tuszopedia – poradnik o tatuażu: pierwszy tatuaż, zdrowie, nauka, historia i przepisy. Wydawca: SHADY TATTOO z Wielunia.',
  lang: 'pl',
  locale: 'pl_PL',
  homeLatest: 12, // ile najnowszych artykułów na stronie głównej

  // Strona główna (SEO, pkt 4)
  home: {
    title: 'Tuszopedia – poradnik o tatuażu i pierwszym tatuażu',
    description: 'Rzetelnie o tatuażu: jak podjąć decyzję o pierwszym tatuażu, co mówią badania i przepisy, jak działa tusz w skórze i skąd wziął się tatuaż. Wydawca: SHADY TATTOO.',
    h1: 'Tuszopedia – poradnik o tatuażu',
  },

  // Kategorie (SEO, pkt 2). Pusta kategoria ma automatycznie noindex.
  // bg/fg = kolory chipów z design/poradnik/tokens.json; build sprawdza kontrast fg/bg ≥ 4.5:1 (WCAG AA).
  // noindexUntilPublished: slug artykułu – kategoria ma noindex (i jest poza sitemap), dopóki ten artykuł nie jest opublikowany.
  categories: [
    { slug: 'pierwszy-tatuaz', bg: '#2A3BD1', fg: '#FFFFFF', /* cobalt */ name: 'Pierwszy tatuaż i decyzja', description: 'Jak podjąć dobrą decyzję o tatuażu: gotowość, wiek dorosły, praca, zmiany ciała i test przed tatuażem.' },
    { slug: 'zdrowie-i-bezpieczenstwo', bg: '#0E7356', fg: '#FFFFFF', /* mint */ name: 'Zdrowie i bezpieczeństwo', description: 'Tusze, zakażenia, ciąża i choroby przewlekłe – stan wiedzy według GIS, ECHA, NIZP PZH-PIB i dermatologów.' },
    { slug: 'jak-to-dziala', bg: '#6B3FD4', fg: '#FFFFFF', /* violet */ name: 'Jak to działa', description: 'Nauka i technika tatuażu: skóra i pigment, maszynki, blowout, usuwanie laserem i słownik pojęć.' },
    { slug: 'ciekawostki', bg: '#D7F25A', fg: '#15151A', /* lime / ink */ name: 'Ciekawostki, historia i kultura', description: 'Historia tatuażu na świecie i w Polsce, tatuaż w innych kulturach, symbole i mity.' },
    { slug: 'prawo-i-przepisy', bg: '#B8321C', fg: '#FFFFFF', /* tomato-text */ name: 'Prawo i przepisy', description: 'Przepisy sanitarne, tusze w UE, prawo autorskie, zgoda i dane osobowe, zawód tatuatora – informacje ogólne, nie porada prawna.',
      noindexUntilPublished: 'wymagania-sanitarne-studio-tatuazu' }, // artykuł nr 25 planu SEO
  ],

  // Domyślny obraz OG (ścieżka względem src/static/, np. 'img/og-default.jpg'). Brak = karta „summary” bez obrazu. Dostarczy Art Director.
  defaultOgImage: 'img/og-default.jpg', // 1200×630 od Shady Art Director (22.10)

  // IndexNow – OSOBNY klucz poradnika (nie klucz studia). Build zapisuje plik <key>.txt w katalogu serwisu.
  // keyLocation w podkatalogu uprawnia tylko URL-e z tego podkatalogu. Zgłoszenia robi Shady SEO & AI.
  indexNow: { key: 'ab9c9906adc771a8193c9b7e6eb8520d' },

  // Wydawca – WYŁĄCZNIE fakty z /workspace/shady-tattoo/source-of-truth.md
  // W schema trafiają tylko id, name i url (referencja do bytu studia). Reszta wyłącznie do HTML:
  // adres i telefon – stopka i /o-nas/; legalName i NIP – tylko /o-nas/.
  publisher: {
    id: 'https://shadykhabbaz-cyber.github.io/#studio', // to samo @id co TattooParlor na stronie studia
    name: 'SHADY TATTOO',
    url: 'https://shadykhabbaz-cyber.github.io/',
    legalName: 'SHADY TATTOO Shady Khabbaz',
    taxID: '8272228187',
    street: 'ul. Głęboka 15/3',
    postalCode: '98-300',
    city: 'Wieluń',
    cityGenitive: 'Wielunia',
    phone: '691 351 557',
    phoneIntl: '+48691351557',
  },
};
