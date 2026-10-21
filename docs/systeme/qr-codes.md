---
couvre:
  - src/lib/qr/qr-code.ts
  - src/lib/qr/qr-target.ts
  - src/lib/components/qr/QrCodeButton.svelte
  - src/lib/components/markdown/nodes/QrBlock.svelte
  - src/lib/ubumark/generators/qr-typst.ts
  - src/lib/qr/short-link.ts
  - src/lib/validation/short-link.ts
  - src/lib/server/short-links.ts
  - 'src/routes/api/short-links/**'
  - 'src/routes/(public)/l/**'
---

# QR codes vers les pages et les ressources

> Vérifié contre le code le 2026-10-19 (lots 1, 2, QR stylés et liens courts). Décisions : [qr-codes-phase0.md](../wip/qr-codes-phase0.md), [qr-codes-style-phase0.md](../wip/qr-codes-style-phase0.md), [liens-courts-phase0.md](../wip/liens-courts-phase0.md).

## Ce que fait le bouton

`QrCodeButton` est posé à côté des liens partagés : exercice (lien public et chaque lien à jeton),
série (`SeriesLinkShare`), cours (`CourseShareLinkCard`), cahier de texte, article du Shtam, glossaire.
Il ouvre une fenêtre avec :

- le QR stylé en grand (voir [Le style](#le-style-imposé)), sur fond blanc quel que soit le thème (un QR inversé se lit mal) ;
- l'adresse en clair, avec Copier (repli : l'adresse est sélectionnée si le presse-papiers est refusé) ;
- Télécharger (SVG) et Télécharger (PNG) : le PNG est le même SVG dessiné par le navigateur dans un canvas, à 10 px par module ;
- quand le lien porte un jeton (`containsToken`) : « une fois imprimé, il ne se reprend pas ».

Sans adresse (`url: null`, lien expiré ou révoqué, temps limite de série hors bornes), le bouton est
`aria-disabled` et dit pourquoi dans son infobulle ; la fenêtre ne s'ouvre pas.

## L'adresse : toujours `https://www.chiph.re`

Le QR encode `canonicalUrl(url)` (`src/lib/seo/site.ts`) : l'origine reçue (serveur local, aperçu
Vercel, `chiph.re`) est remplacée par `SITE_URL`, chemin, requête et fragment gardés. Un QR imprimé
depuis un aperçu mène donc au site. `www` : `chiph.re` répond 308 vers `www.chiph.re` (mesuré le
2026-10-19). Les liens COPIÉS, eux, gardent l'origine de la page.

## Le lien court d'une série (`/l/<code>`)

Un lien de série porte toute sa composition dans l'adresse (≈ 350 caractères dès une catégorie) :
il dépasse toujours ce qu'un QR lisible contient. Son QR porte donc un **lien court**
`https://www.chiph.re/l/<code>`, enregistré en base, qui redirige vers le lien long.

- **Qui** : seuls un prof et l'admin en créent (`SeriesLinkShare` reçoit `canMakeQr` : `isTeacher` au panier, toujours vrai sur la page « Séries » du prof). Ailleurs
  (panier public, élève, visiteur), le bouton QR de la série est indisponible (« réservé aux profs ») et
  le lien long reste copiable. Les autres QR (exercice, cours, cahier…) n'ont pas de lien court.
- **Bouton** : `QrCodeButton` reçoit `resolveUrl` (`fetchShortLinkPath`, `src/lib/qr/short-link.ts`) ;
  `url` n'est plus que la cible. L'adresse est demandée à l'ouverture de la fenêtre (« Fabrication du
  QR code… »), gardée pour la même cible ; l'adresse affichée et copiée est l'adresse courte. Échec →
  « QR indisponible pour l'instant, copie le lien. »
- **Création** : `POST /api/short-links` `{ target }` → `{ code, path }`, prof et admin
  (`requireRoles`). Zod (`createShortLinkSchema`, `src/lib/validation/short-link.ts`) : un **lien de
  série** seulement (`/automaths/panier?…` ou `/automaths/test?…`, décision de David du 2026-10-19 :
  un QR Chiphre mène à une série et à rien d'autre), ASCII imprimable, 16 384 caractères au plus —
  sinon 400, la base n'est pas appelée. Même cible → même code. Un autre usage (atelier public…)
  ajoutera son préfixe à `SERIES_TARGET`. La base, elle, n'exige qu'un chemin interne : c'est le filet.
- **Lecture** : `/l/[code]` (`+page.server.ts`) → 302 vers la cible (pas 301, qu'un navigateur garde
  pour toujours), `X-Robots-Tag: noindex`. Code inconnu ou mal formé → la même 404 « Ce lien n'existe
  pas » (page d'erreur du site, qui propose l'accueil). Une cible relue qui ne serait pas un lien de
  série (même schéma Zod) est traitée comme absente : jamais de redirection hors du site, ni vers une
  autre page.
- **Base** : table `short_links` fermée à tous (RLS sans policy) ; tout passe par
  `create_short_link` et `resolve_short_link` (`src/lib/server/short-links.ts`), migration
  `20261019170000_liens_courts`. Les liens ne meurent pas : un QR imprimé ne se reprend pas. Une
  série modifiée après l'impression : l'ancien QR mène à l'ancienne composition.

## Le code (`src/lib/qr/qr-code.ts`)

- `uqr` 0.1.3 : MIT, ESM, aucune dépendance ; tout se fait dans le navigateur, aucune adresse ne
  quitte le site.
- `encodeQr(text)` : correction H (`QR_ECC`, exigée par la gidouille), marge de 4 modules
  (`QR_BORDER`), version 15 au plus (`QR_MAX_VERSION` : 77 modules, 220 octets). Au-delà, `null`
  et la fenêtre dit « Ce lien est trop long pour un QR code lisible » au lieu de montrer un QR
  illisible.
- `qrDrawing(matrix)` : les tracés du QR stylé (cases, anneaux et centres des yeux, carré blanc,
  spirale) ; `qrSvg(matrix, title)` : le SVG autonome qui les assemble, un module par unité,
  `<title>` échappé. **Un seul dessin** : bouton, téléchargements, bloc ```qr à l'écran
  (`qrDrawing`) et PDF (`qrSvg`).
- `qrFileName(resource, extension)` : `qr-aire-du-disque.png`.

## Le style imposé

Variante B choisie par David (2026-10-19), sans choix laissé à l'auteur. Couleurs fixes
(`QR_COLORS`), quel que soit le thème :

| Élément   | Couleur   | Rôle                                                           |
| --------- | --------- | -------------------------------------------------------------- |
| Fond      | `#ffffff` |                                                                |
| Cases     | `#1a1a1a` | texte du site, 17,4:1                                          |
| Yeux      | `#b25f00` | ambre de `--color-ring`, 4,6:1 ; gris foncé imprimé en N&B     |
| Gidouille | `#fc8f1b` | orange primaire, décorative (posée sur le blanc, hors lecture) |

- **Cases** : coin arrondi (rayon ½ case) là où la case n'a de voisine sur aucun des deux côtés ;
  une case isolée est un rond, des cases voisines se soudent.
- **Yeux** (7×7) : anneau aux coins arrondis + centre 3×3 arrondi, dessinés à part des cases.
- **Gidouille** : spirale d'Archimède (2,6 tours) redessinée en vecteur (le PNG du site fait 77 px),
  sur un carré blanc de ~22 % du côté, centré ; les cases dessous (plus une case de marge) ne sont
  pas dessinées. La correction H les reconstitue.
- **Garantie** : `qr-rendu.svelte.test.ts` dessine le SVG dans un canvas du navigateur et le décode
  (`jsqr`), des versions 4 à 15 ; le PNG téléchargé et le bloc à l'écran sont décodés de même.

## Le QR placé par l'auteur (lot 2, bloc ubumark ```qr)

Choix (b) de David : un QR que l'auteur place où il veut dans un énoncé, une correction, un cours
ou une fiche, vers l'adresse de son choix. Syntaxe et pipeline : [ubumark](ubumark.md#blocs-spéciaux).

- `normalizeQrTarget(raw)` (`src/lib/qr/qr-target.ts`, module léger, sans `uqr`) : `/chemin`,
  `chiph.re/…`, `http(s)://chiph.re/…` → `canonicalUrl` (avec `www`) ; `https://` extérieur gardé
  tel quel ; refus de `http://` extérieur (un téléphone avertit avant un site non sécurisé), de
  `//autre.site`, de tout autre schéma et d'une adresse avec une espace.
- Taille : 2,5 à 6 cm (`QR_SIZE_CM`), 3 cm par défaut ; 2,5 cm au moins parce qu'un QR en correction H
  a des cases plus petites.
- Écran (`QrBlock.svelte`) : le QR stylé à la taille demandée en cm, la légende, l'adresse en lien
  (`target="_blank" rel="noopener noreferrer"` pour un site extérieur). Erreur ou adresse trop
  longue : message au prof, « QR code indisponible » à l'élève.
- PDF (`qr-typst.ts`) : le SVG de `qrSvg` posé en image vectorielle,
  `#image(bytes("<svg…>"), format: "svg", width: …cm)` — ni fichier, ni réseau ; légende en chaîne
  Typst littérale (aucun balisage interprété). Compilation réelle testée
  (`qr-typst-compilation.test.ts`).
- Poids de `uqr` (build du 2026-10-19) : 4,4 Ko gzip, chargé d'office par 16 pages sur 330 —
  celles qui génèrent des PDF (`typst-generator.ts` l'importe statiquement) et celles qui ont le
  bouton. L'écran le charge à la demande. Charger `uqr` à la demande dans les PDF aussi a été écarté
  (gain trop faible).
- Chat élève : le rendu restreint ne laisse passer aucun bloc spécial, ```qr compris
  (`qr-restreint.test.ts`).

## Écarts connus

- Pas de QR pour l'Atelier : décision de David, seulement vers un atelier sauvegardé et public, qui
  n'existe pas encore. Pas encore de bouton QR sur les fiches (le QR automatique dans l'en-tête des
  PDF, choix (a), n'est pas retenu à ce jour).
