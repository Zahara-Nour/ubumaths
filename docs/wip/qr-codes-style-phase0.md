# QR codes stylés — phase 0

Demande de David du 2026-10-19 : styliser les QR codes « à la façon de QRCode Monkey ». Style **imposé** (pas de choix laissé à l'auteur) : gidouille au centre, cases et yeux arrondis, couleurs du thème. Variante **B** choisie sur la page de comparaison :

| Élément   | Couleur                                 | Contraste sur blanc |
| --------- | --------------------------------------- | ------------------- |
| Cases     | `#1a1a1a` (texte du site)               | 17,4:1              |
| Yeux      | `#b25f00` (ambre, `--color-ring` clair) | 4,6:1               |
| Gidouille | `#fc8f1b` (orange primaire)             | décoratif           |

Prototype : 4 variantes rendues comme dans un navigateur puis décodées par `jsqr` → toutes lues (adresse de 56 caractères).

## Ce qui change pour l'utilisateur

### Cas nominal

- Le QR a des **cases arrondies** : une case isolée est un rond ; des cases voisines se soudent en une forme continue aux bouts arrondis.
- Les **trois yeux** (carrés de repérage) ont les coins arrondis et sont en ambre.
- La **gidouille** orange est au centre, sur un carré blanc aux coins arrondis ; les cases qu'elle recouvre ne sont pas dessinées.
- Le fond reste **blanc quel que soit le thème** (un QR inversé se lit mal).
- Scanné, il ouvre exactement l'adresse affichée, comme aujourd'hui.

### Ce qui change en coulisse

- **Correction d'erreurs M → H** (le code survit à 30 % de cases masquées au lieu de 15 %) : obligatoire pour que la gidouille ne gêne pas la lecture. Le QR devient plus dense : pour `https://www.chiph.re/exercice/derivee-produit-de-fonctions`, 33 → 41 cases de côté.
- **La gidouille est redessinée en spirale vectorielle** : le PNG du site (77 px) est trop petit pour un SVG ou un PDF imprimé.

### Limites

- **Adresse trop longue** : la limite reste la version 15, mais en correction H elle tient environ moitié moins de caractères (412 → 220 octets). Au-delà, même message qu'aujourd'hui (« Ce lien est trop long pour un QR code lisible. »). **Tranché par David : on générera des liens courts** (chantier à part) pour les séries longues.
- **Bloc ` ```qr ` imprimé petit** (2 cm, le minimum) : avec plus de cases, chaque case est plus petite (≈ 0,4 mm pour l'adresse ci-dessus). C'est encore lisible de près ; une adresse longue à 2 cm le sera moins → **Q3**.

### Erreurs

- Rien de neuf : adresse invalide ou trop longue → mêmes messages et même cadre « QR code indisponible » dans les PDF.

## Où le style s'applique

| Lieu                                       | Aujourd'hui                                   |
| ------------------------------------------ | --------------------------------------------- |
| Bouton « QR code » : aperçu à l'écran      | SVG noir et blanc (`qrSvg`)                   |
| Bouton « QR code » : Télécharger SVG / PNG | même SVG ; PNG dessiné case par case (canvas) |
| Bloc ` ```qr ` à l'écran                   | SVG (`QrBlock.svelte`)                        |
| Bloc ` ```qr ` dans les PDF (Typst)        | rectangles noirs dessinés en Typst            |

## Tranché par David (2026-10-19)

1. **Partout** : bouton, téléchargements SVG et PNG, bloc à l'écran, PDF.
2. **PDF : le même SVG posé en image** (`#image(bytes(…), format: "svg")`). Vérifié avant de coder avec le compilateur de la production (`scripts/fiches/compile-prod.mjs`, typst.ts 0.6.1-rc5) : le PDF compile, et son rendu se décode à l'adresse exacte.
3. **Taille minimale 2,5 cm.** Le bloc n'est pas en prod (#1522 non déployé) : aucun document réel en 2 cm, donc pas de conversion — une taille sous 2,5 cm devient une erreur d'auteur, comme les autres tailles hors bornes.

Tests du rendu : dans le navigateur (projet `client`), SVG dessiné dans un canvas puis décodé par `jsqr` (devDependency), pour des adresses courtes à longues (jusqu'à la version 15).

## Questions pour David (posées)

1. **Où s'applique le style ?**
   - (a) **Partout** : bouton, téléchargements, bloc à l'écran, PDF. ← **ma recommandation** : B s'imprime bien en noir et blanc (cases presque noires, yeux ambre → gris foncé).
   - (b) Partout sauf les PDF, qui gardent le noir et blanc carré.
2. **Comment dessiner le QR stylé dans les PDF ?**
   - (a) **Poser le même SVG en image dans le PDF** (`#image(bytes(…), format: "svg")`, sans fichier ni réseau) : un seul dessin pour l'écran, les téléchargements et le PDF. ← **ma recommandation** ; à vérifier sur notre compilateur Typst avant de coder.
   - (b) Retraduire les formes arrondies en tracés Typst : deux dessins à tenir d'accord.
3. **Taille minimale du bloc ` ```qr ` imprimé** : garder 2 cm, ou monter à 2,5 cm ? ← **ma recommandation : 2,5 cm**. Les blocs déjà écrits en 2 cm seraient agrandis sans erreur, pas refusés.

## Lot unique (si Q1 = a)

1. `src/lib/qr/qr-code.ts` : correction H, `qrSvg` stylé (cases, yeux, gidouille), tests (forme du SVG + décodage du QR rendu).
2. Bouton : PNG tiré du même SVG (plus de dessin case par case).
3. PDF : selon Q2.
4. Doc système du QR mise à jour.

Revue : `code-reviewer` (Sonnet), pas de données d'élèves ni d'accès touchés.
