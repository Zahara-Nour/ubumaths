---
couvre:
  - src/lib/qr/qr-code.ts
  - src/lib/qr/qr-target.ts
  - src/lib/components/qr/QrCodeButton.svelte
---

# QR codes vers les pages et les ressources

> Vérifié contre le code le 2026-10-19 (lots 1 et 2). Décisions : [qr-codes-phase0.md](../wip/qr-codes-phase0.md).

## Ce que fait le bouton

`QrCodeButton` est posé à côté des liens partagés : exercice (lien public et chaque lien à jeton),
série (`SeriesLinkShare`), cours (`CourseShareLinkCard`), cahier de texte, article du Shtam, glossaire.
Il ouvre une fenêtre avec :

- le QR en grand, noir sur blanc quel que soit le thème (un QR inversé se lit mal) ;
- l'adresse en clair, avec Copier (repli : l'adresse est sélectionnée si le presse-papiers est refusé) ;
- Télécharger (PNG), dessiné sur un canvas à 10 px par module, et Télécharger (SVG) ;
- quand le lien porte un jeton (`containsToken`) : « une fois imprimé, il ne se reprend pas ».

Sans adresse (`url: null`, lien expiré ou révoqué, temps limite de série hors bornes), le bouton est
`aria-disabled` et dit pourquoi dans son infobulle ; la fenêtre ne s'ouvre pas.

## L'adresse : toujours `https://www.chiph.re`

Le QR encode `canonicalUrl(url)` (`src/lib/seo/site.ts`) : l'origine reçue (serveur local, aperçu
Vercel, `chiph.re`) est remplacée par `SITE_URL`, chemin, requête et fragment gardés. Un QR imprimé
depuis un aperçu mène donc au site. `www` : `chiph.re` répond 308 vers `www.chiph.re` (mesuré le
2026-10-19). Les liens COPIÉS, eux, gardent l'origine de la page.

## Le code (`src/lib/qr/qr-code.ts`)

- `uqr` 0.1.3 : MIT, ESM, aucune dépendance ; tout se fait dans le navigateur, aucune adresse ne
  quitte le site.
- `encodeQr(text)` : correction M (`QR_ECC`), marge de 4 modules (`QR_BORDER`), version 15 au plus
  (`QR_MAX_VERSION` : 77 modules, 412 octets). Au-delà, `null` et la fenêtre dit « Ce lien est trop
  long pour un QR code lisible » au lieu de montrer un QR illisible.
- `qrPath(matrix)` : le tracé des modules sombres ; `qrSvg(matrix, title)` : SVG autonome, un
  module par unité, `<title>` échappé. Le bloc ```qr à l'écran dessine le même tracé.
- `qrFileName(resource, extension)` : `qr-aire-du-disque.png`.

## Le QR placé par l'auteur (lot 2, bloc ubumark ```qr)

Choix (b) de David : un QR que l'auteur place où il veut dans un énoncé, une correction, un cours
ou une fiche, vers l'adresse de son choix. Syntaxe et pipeline : [ubumark](ubumark.md#blocs-spéciaux).

- `normalizeQrTarget(raw)` (`src/lib/qr/qr-target.ts`, module léger, sans `uqr`) : `/chemin`,
  `chiph.re/…`, `http(s)://chiph.re/…` → `canonicalUrl` (avec `www`) ; `https://` extérieur gardé
  tel quel ; refus de `http://` extérieur (un téléphone avertit avant un site non sécurisé), de
  `//autre.site`, de tout autre schéma et d'une adresse avec une espace.
- Écran (`QrBlock.svelte`) : le QR à la taille demandée en cm, la légende, l'adresse en lien
  (`target="_blank" rel="noopener noreferrer"` pour un site extérieur). Erreur ou adresse trop
  longue : message au prof, « QR code indisponible » à l'élève.
- PDF (`qr-typst.ts`) : boîte blanche + un `rect` noir par suite de modules sombres d'une rangée,
  légende en chaîne Typst littérale (aucun balisage interprété).
- ⚠️ `uqr` (~8 Ko gzip) est importé statiquement par `typst-generator.ts`, donc présent dans le
  chunk des pages Markdown ; l'écran, lui, le charge à la demande.
- Chat élève : le rendu restreint ne laisse passer aucun bloc spécial, ```qr compris
  (`qr-restreint.test.ts`).

## Écarts connus

- Un lien de série porte sa composition en JSON doublement encodé : une série de plusieurs
  catégories dépasse vite le plafond et n'a pas de QR.
- Pas de QR pour l'Atelier : décision de David, seulement vers un atelier sauvegardé et public, qui
  n'existe pas encore. Pas encore de bouton QR sur les fiches (le QR automatique dans l'en-tête des
  PDF, choix (a), n'est pas retenu à ce jour).
