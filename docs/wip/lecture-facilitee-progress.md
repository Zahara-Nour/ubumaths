# Chantier `lecture-facilitee` — texte en Luciole, et étude d'une police de maths Luciole

## Reprendre ici

_Mis à jour le 2026-11-19, à l'ouverture du chantier._

- **État** : chantier ouvert (proposition 4 du chantier `inspiration`). Phase 0 proposée ci-dessous, rien de codé.
- **Prochaine action** : faire valider la phase 0 par David (questions Q1 à Q5).
- **En attente de David** : réponses à Q1–Q5.
- **Pièges en cours** : ne rien renommer ni retirer de ce qui porte le nom KaTeX (jeu `katex`, `/fonts/katex-original`, page `/dev/polices`) ; Luciole texte est en CC-BY 4.0 → crédit obligatoire.
- **Worktree / branche** : `../ubumaths-wt-lecture-facilitee` · `feat/lecture-facilitee`.

## Ce qui existe déjà (vérifié le 2026-11-19)

- **Taille du texte** : `src/lib/stores/fontSize.svelte.ts` (variable CSS `--font-scale`, gardée dans le navigateur sous `fontScale`), boutons dans `Header.svelte`, `MobileNavDrawer.svelte` et la page profil.
- **Jeux de polices des maths à l'écran** : `src/lib/utils/mathlive-fonts.ts`, jeux `katex` (par défaut, partout) et `shantell` (= Chiphre Math, seulement sur `/dev/polices`). Un jeu = des fichiers `KaTeX_*.woff2` qui remplacent ceux de MathLive + une feuille CSS de surcharge.
- **Chiphre Math** : générée par `tools/chiphre-math/` (Python, fontTools) : lettres et chiffres pris dans Shantell Sans, symboles « roughen », métriques recalculées ; deux sorties : les `KaTeX_*.woff2` pour l'écran (`static/fonts/chiphre-math/`) et une police de maths OpenType `ChiphreMath.ttf` pour les PDF Typst (`static/fonts/chiphre-math-typst/`, `src/lib/typst/correction-fonts.ts`).

## Fait nouveau : Luciole a déjà sa police de maths

Le paquet CTAN `luciole` contient, en plus des 4 polices de texte (CC-BY 4.0), **`Luciole-Math.otf`**, une police de maths OpenType (licence SIL OFL 1.1), version 0.75 du 2026-09-11 (0.76 peut-être). Elle a longtemps été dite « à tester davantage ».

Conséquence pour l'étude :

- **PDF (Typst)** : Typst lit directement une police de maths OpenType → on peut essayer `Luciole-Math.otf` telle quelle, sans rien générer (comme `ChiphreMath.ttf`).
- **Écran (MathLive)** : MathLive ne lit pas une police de maths OpenType ; il veut des fichiers découpés à la KaTeX (`KaTeX_Main`, `KaTeX_Math`, `KaTeX_Size1-4`…). Il faudrait donc adapter `tools/chiphre-math` : prendre les glyphes dans Luciole et Luciole-Math au lieu de Shantell, **sans** effet manuscrit, et recalculer les métriques. C'est le gros du travail.

## Phase 0 — proposée le 2026-11-19, en attente de validation

### A. Réglage « Lecture facilitée » à l'écran

- **Nominal** : un interrupteur « Lecture facilitée » à côté des boutons de taille du texte (en-tête, menu mobile, page profil). Allumé : le texte passe en Luciole, les lettres et les lignes s'espacent un peu. Exemple : la consigne « Calcule l'aire du rectangle » s'affiche en Luciole ; la formule `3 × 4` garde la police des maths. Le choix est gardé dans le navigateur, comme la taille du texte.
- **Limite** : éteint par défaut ; se cumule avec la taille du texte (150 % + Luciole possible) ; s'applique aussi aux pages sans connexion.
- **Erreur** : si la police ne se charge pas, le texte reste dans la police habituelle, rien ne casse.

### B. Étude d'une version maths de Luciole

- **Étape 1** : page d'essai (dans `/dev/polices`, à côté de ce qui existe) : un même texte avec formules, montré en police habituelle, en Luciole + maths actuelles, en Luciole + Luciole-Math (PDF Typst, tout de suite possible).
- **Étape 2**, si l'essai plaît : construire le jeu écran « Luciole Math » pour MathLive à partir de Luciole-Math, avec l'outillage de Chiphre Math ; nouveau jeu à côté de `katex` et `shantell`, rien de retiré.

### Questions à David

- **Q1. Les maths en Luciole ?** Le chantier `inspiration` disait « les maths gardent leur police ». Si l'essai de Luciole-Math plaît, la lecture facilitée doit-elle **aussi** passer les maths en Luciole Math ? (Exemple : dans « Calcule 3 × 4 », le 3 et le 4 en Luciole comme le texte, au lieu de chiffres d'une autre forme.)
- **Q2. Qui voit l'interrupteur ?** Tout le monde (élèves, prof, visiteurs), ou seulement les élèves ?
- **Q3. Où il s'applique ?** Le contenu de la page seulement (comme la taille du texte : consignes, questions, cours), ou aussi les menus et l'en-tête ?
- **Q4. Ordre des PR** proposé : (1) page d'essai, (2) réglage écran pour le texte, (3) jeu écran Luciole Math si Q1 = oui, (4) PDF plus tard. D'accord ?
- **Q5. Crédit** : Luciole demande de citer ses auteurs. Une ligne sur la page « À propos » / mentions, ça te va ?

## Historique

### 2026-11-19 — ouverture

Chantier ouvert par David depuis `inspiration` (proposition 4), avec en plus l'étude d'une version maths de Luciole « comme Chiphre Math à partir de Shantell ».
