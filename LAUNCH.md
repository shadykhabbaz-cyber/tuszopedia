# Tuszopedia – kroki startu (PRZYGOTOWANE, NIE WYKONANE)

Przygotował: Shady Web Master, 22.10.2026 ok. 16:00 (Europe/Warsaw).
Status: build startowy gotowy lokalnie (`dist/`, QA 0). **Nic z poniższego nie zostało uruchomione.**
Warunek: **zgoda właściciela na utworzenie publicznego repo `shadykhabbaz-cyber/tuszopedia`** i publikację.
Konto GitHub: `shadykhabbaz-cyber` (zalogowane w `gh` na boxie). Repo studia: `/tmp/ghp` (`shadykhabbaz-cyber.github.io`).

Zakres pierwszej fali (SEO 15:54, `seo/tuszopedia-kontrola-start.md`): 6 artykułów (`draft: false`) + /o-nas/.
Sitemap: 12 URL (/, 4 kategorie z artykułami, 6 artykułów, /o-nas/). `prawo-i-przepisy` = noindex, poza sitemap.

---

## 0. Kontrola przed startem (lokalnie)

```bash
cd /workspace/shady-tattoo/poradnik
grep -H '^draft' content/articles/*.md          # 6 × draft: false, nic więcej
node build.js && node qa.js                      # „błędy 0”
grep -c '<loc>' dist/sitemap.xml                 # 12
grep -c noindex dist/kategoria/prawo-i-przepisy/index.html   # 1
gh auth status                                   # konto shadykhabbaz-cyber
gh repo view shadykhabbaz-cyber/tuszopedia       # ma zwrócić „Could not resolve” (repo jeszcze nie istnieje)
```

## 1. Utworzenie repo i push (Tuszopedia)

Repozytorium robocze w osobnym katalogu (żeby nie wypchnąć `_szkice/`, `dist/`, `node_modules/`, `.lighthouse/`, raportów):

```bash
rm -rf /tmp/tuszopedia-repo && mkdir /tmp/tuszopedia-repo && cd /tmp/tuszopedia-repo
rsync -a --exclude '_szkice/' --exclude 'dist/' --exclude 'dist-preview/' --exclude 'node_modules/' \
  --exclude '.lighthouse/' --exclude 'raport-*.md' --exclude '*.backup-*' \
  /workspace/shady-tattoo/poradnik/ ./
rm -f src/css/theme.backup-2210.css
git init -b main
git add -A
git status --short                               # przejrzyj listę: bez _szkice/, dist/, node_modules/, backupów
npm ci && node build.js && node qa.js            # QA 0 na czystej kopii
git commit -m "Tuszopedia: start – 6 artykułów fali 1 + O nas"
gh repo create shadykhabbaz-cyber/tuszopedia --public \
  --description "Tuszopedia – poradnik o tatuażu. Wydawca: SHADY TATTOO (Wieluń)" \
  --homepage "https://shadykhabbaz-cyber.github.io/tuszopedia/" \
  --source . --remote origin --push
git rev-parse --short HEAD                        # ZAPISZ hash startu (log niżej)
```

## 2. Włączenie GitHub Pages (Actions)

```bash
gh api -X POST repos/shadykhabbaz-cyber/tuszopedia/pages -f build_type=workflow
gh api repos/shadykhabbaz-cyber/tuszopedia/pages --jq '.build_type,.html_url'   # workflow, https://shadykhabbaz-cyber.github.io/tuszopedia/
gh workflow run "Deploy Pages" -R shadykhabbaz-cyber/tuszopedia                  # jeśli push nie uruchomił go sam
gh run watch -R shadykhabbaz-cyber/tuszopedia                                    # build → QA → deploy, ma być zielone
```

Jeśli workflow padnie na QA – nic nie jest opublikowane; poprawić, commit, push (bez force).

## 3. Weryfikacja live poradnika (po 1–2 min)

```bash
B=https://shadykhabbaz-cyber.github.io/tuszopedia
for p in / o-nas/ szukaj/ kategoria/pierwszy-tatuaz/ kategoria/zdrowie-i-bezpieczenstwo/ kategoria/jak-to-dziala/ \
  kategoria/ciekawostki/ kategoria/prawo-i-przepisy/ czy-jestem-gotowy-na-tatuaz/ czy-tatuaze-sa-szkodliwe/ \
  tusz-do-tatuazu-sklad-przepisy/ jak-tusz-zostaje-w-skorze/ historia-tatuazu/ slownik-tatuazu/ \
  sitemap.xml robots.txt llms.txt search-index.json ab9c9906adc771a8193c9b7e6eb8520d.txt \
  img/og-default.jpg favicon.svg ilustracje/os-czasu-v2.svg fonts/BricolageGrotesque-latin-ext-var.woff2; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$B/$p")" "$p"; done        # wszystko 200
curl -s -o /dev/null -w '%{http_code}\n' "$B/nie-ma-takiej-strony/"                     # 404 (strona 404 Tuszopedii)
curl -s "$B/ab9c9906adc771a8193c9b7e6eb8520d.txt"                                       # = klucz
curl -s "$B/sitemap.xml" | grep -c '<loc>'                                              # 12
curl -s "$B/kategoria/prawo-i-przepisy/" | grep -c 'noindex'                            # 1
curl -s "$B/" | grep -o '<link rel="canonical"[^>]*>'                                   # canonical z /tuszopedia/
```

Ręcznie: wyszukiwarka (`/szukaj/?q=tusz`), kotwica słownika (`/slownik-tatuazu/#blowout`), nagłówek z logotypem i chipami na telefonie.
Szybki Lighthouse mobile na `/` i jednym artykule (lokalnie było 99–100 we wszystkich kategoriach).

**Rollback poradnika:** `cd /tmp/tuszopedia-repo && git revert --no-edit HEAD && git push` (workflow wdroży poprzedni stan).
Przy pierwszym commicie (brak poprzedniego stanu): Settings → Pages → wyłącz (`gh api -X DELETE repos/shadykhabbaz-cyber/tuszopedia/pages`) – strona przestaje być serwowana. Repo zostaje.

## 4. robots.txt studia – linia Sitemap (TYLKO po zielonym kroku 3, w tym samym oknie startu)

Wg `build/DEPLOY.md` (punkt powrotu, QA 0, weryfikacja live). Zmiana dotyczy wyłącznie `robots.txt`; URL-i poradnika **nie** dodajemy do sitemap studia.

1. **Punkt powrotu:**
   ```bash
   cd /tmp/ghp && git pull && git rev-parse --short HEAD     # ZAPISZ (dziś live: f7cb2da)
   tar czf /tmp/site-pre-deploy-tuszopedia.tgz -C /tmp/ghp --exclude .git .
   ```
2. **Trwała zmiana w generatorze studia** (żeby kolejny deploy studia jej nie usunął) – w buildzie, z którego idzie live
   (`build/build.js` l.336; ta sama linia w `build-v2/build.js` l.252):
   ```js
   write('robots.txt',`User-agent: *\nAllow: /\n\nSitemap: ${C.BASE_URL}/sitemap.xml\nSitemap: https://shadykhabbaz-cyber.github.io/tuszopedia/sitemap.xml\n`);
   ```
3. **Build + QA studia** wg ostatniego wpisu w `build/DEPLOY.md` (ten sam CONTENT_DIR co live) → `QA … failures 0`.
   Sprawdź, że wynik różni się od live tylko robots.txt:
   ```bash
   diff -rq <SITE_OUT> /tmp/ghp --exclude .git      # oczekiwane: tylko robots.txt
   ```
   Jeśli różnic jest więcej – NIE wdrażać całego wyniku, tylko sam plik:
4. **Wdrożenie samego pliku:**
   ```bash
   cd /tmp/ghp
   printf 'User-agent: *\nAllow: /\n\nSitemap: https://shadykhabbaz-cyber.github.io/sitemap.xml\nSitemap: https://shadykhabbaz-cyber.github.io/tuszopedia/sitemap.xml\n' > robots.txt
   git diff                                             # tylko +1 linia Sitemap
   git commit -am "robots.txt: Sitemap Tuszopedii (start poradnika)" && git push
   ```
5. **Weryfikacja live studia (po ~1 min):**
   ```bash
   curl -s https://shadykhabbaz-cyber.github.io/robots.txt          # 2 linie Sitemap, Allow: / bez zmian
   for p in / sitemap.xml llms.txt google8d66c6a03a644b96.html o-nas/ kontakt/; do
     printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://shadykhabbaz-cyber.github.io/$p")" "$p"; done   # 200
   ```
6. **Rollback studia:** `cd /tmp/ghp && git revert --no-edit HEAD && git push` (bez force-push), potem jak w pkt 5.
7. Dopisz wpis do logu w `build/DEPLOY.md` (hash, rollback, „tylko robots.txt”).

## 5. Po starcie

- Przekaż Shady SEO & AI: hash startu Tuszopedii, hash robots studia, rollbacki i 12 URL z sitemap + `llms.txt` + `sitemap.xml`
  (IndexNow kluczem poradnika: `key=ab9c9906adc771a8193c9b7e6eb8520d`,
  `keyLocation=https://shadykhabbaz-cyber.github.io/tuszopedia/ab9c9906adc771a8193c9b7e6eb8520d.txt`).
- GSC: nowa usługa „prefiks URL” `https://shadykhabbaz-cyber.github.io/tuszopedia/` + sitemap (SEO). Bing: sitemap poradnika.
- Link studio → poradnik (plan SEO 5.5): jeden link markowy na /o-nas/ studia lub w /blog/ – osobny deploy studia, po decyzji.
- Kolejne artykuły: 2–3 tygodniowo (kolejność w planie SEO), każdy po kontroli SEO; link do artykułu tylko, gdy cel jest opublikowany.

## Log startu
- (uzupełnić przy starcie) Tuszopedia: hash `…`, Pages build_type=workflow, run `…`. Studio robots.txt: hash `…`, rollback `f7cb2da` (lub aktualny HEAD z kroku 4.1).
