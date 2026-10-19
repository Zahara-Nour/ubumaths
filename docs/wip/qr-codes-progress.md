# QR codes — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, lot 3 (QR stylés) codé, PR à ouvrir._

- **État** : lots 1 (#1515) et 2 (#1522) livrés, pas en prod. Lot 3 (QR stylés, variante B) codé sur `feat/qr-codes-style` : correction H, `qrDrawing`/`qrSvg` stylés partout (bouton, PNG, bloc écran, PDF en `#image(bytes(…))`), taille mini 2,5 cm ; tests verts, décodage réel par `jsqr`.
- **Prochaine action** : revue `code-reviewer`, PR, CI, merge.
- **En attente de David** : rien. Phase 0 tranchée : [qr-codes-style-phase0.md](qr-codes-style-phase0.md).
- **Tranché** : liens courts plus tard (chantier non ouvert) ; chargement à la demande de `uqr` dans les PDF écarté (4,4 Ko gzip, 16 pages sur 330).
- **Pièges** : le moteur SVG d'ImageMagick oublie la spirale (rendre par QuickLook ou un navigateur) ; `jsqr` ne lit pas une image qui contient deux QR (recadrer).
- **Worktree / branche** : `../ubumaths-wt-qr-codes`, `feat/qr-codes-style`.

Phase 0 : [qr-codes-phase0.md](qr-codes-phase0.md), tranchée par David le 2026-10-19.

## Lot 1 — bouton « QR code » à côté des partages existants (branche `feat/qr-codes-partage`)

- Bibliothèque : `uqr` 0.1.3 (MIT, ESM, aucune dépendance, ~80 ko décompressée, publiée le 2026-04-03 : au-delà du `minimumReleaseAge` de 3 jours). Écartée : `qrcode` 1.5.4 (CommonJS, trois dépendances dont `yargs` et `pngjs`, ~135 ko).
- Réglages : correction M, marge de 4 modules, version 15 au plus (77 modules, 412 octets) ; au-delà, « Ce lien est trop long pour un QR code lisible ». Un lien de série porte sa composition en JSON doublement encodé : une série de plusieurs catégories dépasse vite ce plafond.
- Adresse : toujours `https://www.chiph.re` (`canonicalUrl` dans `src/lib/seo/site.ts`, qui réutilise `SITE_URL`). Les liens copiés existants ne changent pas.
- PNG fabriqué par un canvas (10 px par module), SVG par `qrSvg` ; aucune requête réseau.
- Posé sur : exercice (lien public et chaque lien à jeton), série, cours, cahier de texte, article du Shtam, glossaire. Pas l'Atelier (QR seulement vers un atelier sauvegardé et public, qui n'existe pas encore), pas les fiches (lot suivant).

## Lot 2 — bloc ubumark ```qr placé par l'auteur (branche `feat/ubumark-bloc-qr`)

- Choix (b) de David (2026-10-19) : bloc ` ```qr ` + entrée « Insérer un QR code » dans l'éditeur riche.
- Bloc spécial du même mécanisme que les blocs `line` et `trig` (`SPECIALS` et `SPECIAL_BLOCK_KINDS` de `markdown-parser.ts`, masques des blocs de code, `block-ranges.ts`, `indented-fences.ts`) : repérage, bloc non fermé (arrêt à la première ligne vide, erreur située), items de liste, formules non extraites.
- `http://` extérieur refusé (un téléphone avertit avant un site non sécurisé) ; `http://chiph.re` devient `https://www.chiph.re`.
- PDF : rangées de modules sombres fusionnées en un seul `rect` (pas de joint), légende en chaîne Typst littérale. Compilation RÉELLE par typst.ts (WASM, hors ligne, < 2 s) dans `qr-typst-compilation.test.ts`, avec un témoin cassé qui doit échouer.
- `uqr` est importé statiquement par `typst-generator.ts` (≈ 8 Ko gzip dans le chunk des pages Markdown) ; l'écran le charge à la demande.
- Éditeur riche : pas de nœud TipTap dédié, un bloc de code `qr` (comme ```courbe) ; un bloc en erreur survit à l'aller-retour.
- Chat élève : la liste blanche du rendu restreint exclut déjà ```qr (test de non-régression `qr-restreint.test.ts`, vert d'emblée).

## Lot 3 — QR stylés (branche `feat/qr-codes-style`, 2026-10-19)

- Demande : styliser « à la façon de QRCode Monkey ». Style imposé : gidouille, cases et yeux arrondis, couleurs du thème ; 4 variantes prototypées et décodées, **B** choisie (cases `#1a1a1a`, yeux `#b25f00`, gidouille `#fc8f1b`).
- Correction M → H (la gidouille masque ~7 % des cases) ; plafond version 15 = 220 octets au lieu de 412.
- PDF : le SVG posé en `#image(bytes(…), format: "svg")`, vérifié avant de coder avec `scripts/fiches/compile-prod.mjs` ; un PDF à deux blocs (2,5 et 4 cm) rendu puis décodé : les deux adresses relues.
- Tests : `qr-rendu.svelte.test.ts` (versions 4 à 15, canvas + `jsqr`), PNG du bouton décodé et pixel d'œil ambre, bloc à l'écran décodé ; `jsqr` 1.4.0 en devDependency.
