---
title: Tokens de couleur CSS — `hsl(var(--x))` ne fonctionne pas
date: 2026-09-04
status: vivant
audience: développeurs
scope: src/**/*.svelte, src/**/*.css
---

# Tokens de couleur CSS

## Le problème

Le projet est en **Tailwind 4**. `src/app.css` définit des **couleurs complètes**
sous des noms `--color-*` :

```css
--color-background: light-dark(#fafafa, #262624);
--color-foreground: light-dark(#1a1a1a, #efefef);
--color-muted-foreground: light-dark(#737373, #9e9e9e);
--color-border: light-dark(#e0e0e0, #3d3d3a);
--color-ring: light-dark(#ffa000, #e0d5a6);
```

L'idiome `hsl(var(--border))` vient de Tailwind 3 / shadcn, où les tokens
contenaient des **triplets HSL bruts** (`0 0% 89%`) que `hsl()` devait envelopper.
Ici, `--border` (sans préfixe `--color-`) **n'existe nulle part**. Le `var()` ne
résout rien, `hsl()` reçoit une valeur vide, la déclaration est invalide — et le
navigateur la **jette silencieusement**.

## Pourquoi ça a échappé si longtemps

Parce que l'échec est muet, et que la propriété retombe sur sa valeur héritée :

| Propriété                  | Repli          | Visible ?                             |
| -------------------------- | -------------- | ------------------------------------- |
| `color`, `border-color`    | `currentColor` | Non — couleur juste un peu fausse     |
| `outline`                  | rien           | À peine                               |
| `background`, `box-shadow` | transparent    | **Oui** — fond manquant               |
| `stroke`, `fill` (SVG)     | `none`         | **Oui** — élément carrément invisible |

Le cas qui a levé le lièvre : la droite `y = x` du diagramme en escalier des
suites, tracée avec `stroke: hsl(var(--muted-foreground))`, ne s'affichait pas
du tout. Sans elle l'escalier est illisible — et aucun test ne pouvait l'attraper,
puisque l'élément SVG était bien présent dans le DOM.

## La conversion

Faux :

```css
color: hsl(var(--foreground));
border: 1px solid hsl(var(--border));
```

Juste :

```css
color: var(--color-foreground);
border: 1px solid var(--color-border);
```

Avec une transparence, il n'y a **pas d'équivalent direct** : `--color-*` porte
déjà une couleur complète, donc la syntaxe `/ alpha` de `hsl()` n'a plus de sens.

Faux :

```css
background: hsl(var(--primary) / 0.1);
```

Juste :

```css
background: color-mix(in srgb, var(--color-primary) 10%, transparent);
```

### Table de correspondance

Les anciens noms ont été **supprimés de `src/app.css` le 2025-10-11** (commit `c36a80754`,
« theme update ») : depuis, toute lecture de l'un d'eux est jetée en silence.

| Ancien nom (Tailwind 3 / shadcn)             | Nouveau token                                            |
| -------------------------------------------- | -------------------------------------------------------- |
| `--background` / `--foreground`              | `--color-background` / `--color-foreground`              |
| `--card` / `--card-foreground`               | `--color-card` / `--color-card-foreground`               |
| `--popover` / `--popover-foreground`         | `--color-popover` / `--color-popover-foreground`         |
| `--primary` / `--primary-foreground`         | `--color-primary` / `--color-primary-foreground`         |
| `--secondary` / `--secondary-foreground`     | `--color-secondary` / `--color-secondary-foreground`     |
| `--muted` / `--muted-foreground`             | `--color-muted` / `--color-muted-foreground`             |
| `--accent` / `--accent-foreground`           | `--color-accent` / `--color-accent-foreground`           |
| `--destructive` / `--destructive-foreground` | `--color-destructive` / `--color-destructive-foreground` |
| `--border`, `--input`, `--ring`              | `--color-border`, `--color-input`, `--color-ring`        |
| `hsl(var(--x))`                              | `var(--color-x)`                                         |
| `hsl(var(--x) / 0.4)`                        | `color-mix(in srgb, var(--color-x) 40%, transparent)`    |

Toujours présents (pas à convertir) : `--radius` et `--font-scale` (`src/app.css`). Une variable
de **bibliothèque** garde son nom, seule sa valeur change : `--caret-color` (MathLive),
`--tw-prose-*` (`@tailwindcss/typography`), `--bits-*` (bits-ui).

En pratique, une classe Tailwind (`bg-card`, `text-muted-foreground`, `border`)
est souvent préférable à une règle CSS écrite à la main.

## Clair / sombre : un seul signal, le choix de l'utilisateur

`<ModeWatcher defaultMode="system" />` (`src/routes/+layout.svelte`) pose sur `<html>`
la classe `.dark` **et** `style.colorScheme`, d'après le choix de l'utilisateur (qui
vaut le réglage de l'OS tant qu'il n'a rien choisi). Trois mécanismes en dépendent :

| Mécanisme                           | Lit            |
| ----------------------------------- | -------------- |
| tokens `--color-*` (`light-dark()`) | `color-scheme` |
| classes Tailwind `dark:`            | `.dark` ¹      |
| CSS à la main `:global(.dark) …`    | `.dark`        |

¹ Grâce à `@custom-variant dark (&:where(.dark, .dark *));` en tête de `src/app.css`
(#684). **Sans cette ligne, Tailwind 4 branche `dark:` sur `prefers-color-scheme`**,
c'est-à-dire l'OS : les tokens basculaient au choix de l'utilisateur, les 1 105
classes `dark:` non → pastilles claires sur fond sombre dès que choix ≠ OS. Invisible
tant que les deux coïncident, ce qui est le cas par défaut.

Règles :

- **Ne jamais écrire `@media (prefers-color-scheme: dark)`** dans un composant : il
  suit l'OS, pas le bouton. Écrire `:global(.dark) .x` (ou `.dark .x` dans un
  `<style>` global, p. ex. sous `<svelte:head>`, cf. `/api-docs`, #686).
- Ne pas réécrire `style.colorScheme` à la main : mode-watcher le fait déjà, au
  chargement (script anti-FOUC) comme à chaque bascule.
- Pour tester : les **deux cas mixtes** (OS clair + choix sombre, et l'inverse).
  Playwright : `newContext({ colorScheme: os })` + `localStorage['mode-watcher-mode'] = choix`.

## ⚠️ `@theme` élague les variables qu'il ne voit pas utilisées

Tailwind 4 n'émet une variable de `@theme` que si une **classe** l'utilise
(`bg-info` → `--color-info`). Une variable lue seulement par `var(--color-x)` dans
du code — surtout une chaîne **construite** en TypeScript, `` `var(--color-${id})` `` —
est retirée du CSS, sans erreur : la propriété retombe sur son initiale (noir pour
`stroke`/`fill`). Mesuré sur 4.2.2 :

```css
@theme {
	--color-curve-1: red;
} /* absent du CSS si aucune classe ne s'en sert */
@theme static {
	--color-curve-1: red;
} /* toujours émis */
```

→ Une couleur appelée depuis du code va dans un bloc **`@theme static`** (cf. le
bloc du grapheur dans `src/app.css`). Le tester sur la couleur **rendue**
(`getComputedStyle(el).stroke`) dans un test navigateur, jamais sur l'attribut.

## Couleurs des courbes du grapheur

Une courbe stocke une **identité** (`curve-1` … `curve-4`), jamais une valeur. La
teinte vit dans `src/app.css` (`--color-curve-N`, en `light-dark()`), et
`curveColorValue()` (`$lib/grapheur/colors`) la traduit au moment de peindre :

```svelte
<path style:stroke={curveColorValue(func.color)} /> <!-- pas stroke={func.color} -->
```

- **4 couleurs × 2 styles de trait** (pleins, puis pointillés) : sous contrainte
  de contraste (≥ 4,5 sur le fond du grapheur, dans les deux modes), huit couleurs
  ne restent pas distinctes pour un élève daltonien. Le test
  `grapheur/__tests__/curve-palette.test.ts` lit `app.css` et vérifie le contraste.
- **Export** (`grapheur/export.ts`) : toujours en clair, styles calculés figés
  dans le fichier — un SVG exporté ne connaît pas `app.css`.
- Décisions et mesures : `docs/archive/wip/grapheur-couleurs-theme-progress.md`.

## Couleurs nommées des figures (`couleur: rouge`)

Les auteurs écrivent des **noms** dans `figure`, `courbe`, `stat-chart` et le DSL de géométrie.
Une seule palette de 12 noms (`src/lib/theme/named-colors.ts`), tokens `--color-fig-<nom>`
dans le bloc `@theme static` de `src/app.css` :

- **écran** : `colorForScreen()` / `namedColorScreen()` → `var(--color-fig-<nom>)` ; `noir` et
  `blanc` → `--color-foreground` / `--color-background` ;
- **PDF et exports** : `colorForPrint()` / `namedColorTypst()` → variante claire
  (`NAMED_COLOR_PRINT`, vérifiée égale à `app.css` par test) ;
- **synonymes** anglais (`red`, `grey`…) acceptés pour toujours : le vocabulaire est un contrat
  avec le contenu en base ;
- un **hexadécimal** d'auteur passe tel quel, figé dans les deux modes.

Couleur d'auteur dans un **bloc** (droite graduée, cercle trigo ; avertissement de contraste
aussi pour `figure`) : `resolveAuthorColor(raw, défaut)` (`src/lib/theme/author-color.ts`) rend
`{ screen, print, warning }` — `screen` va dans `style:`, `print` dans `rgb("…")` côté Typst
(jamais un nom brut : `rgb("bleu")` ou `fill: bleu` fait échouer **toute** la fiche), `warning`
s'affiche au prof (couleur inconnue → défaut ; hex sous 3:1 sur le fond sombre → nom de palette
le plus proche, ΔE OKLab). Les fonds sombres de référence (`DARK_BACKGROUNDS`) sont vérifiés
égaux à `app.css` par test.

**Une `var(--x)` dans un composant doit exister** : `src/lib/theme/__tests__/block-css-vars.test.ts`
le vérifie (app.css, thème par défaut de Tailwind `node_modules/tailwindcss/theme.css`, ou
variable locale hors bloc `.dark`) composant par composant pour les blocs, éditeurs et saisies
élève, et **balaie tout `src/lib` + `src/routes`** : tout fichier qui lit une
variable inexistante (ou un `hsl(var(--x))`) fait échouer le test (plus de liste de dette
depuis le 2026-10-04). Exceptions vérifiées à la source : préfixe `--bits-` (bits-ui), crochets
à repli valide (`--slide-*`, `--primary-rgb`). Une variable posée **seulement** sous `.dark`
n'existe pas en clair : c'était le bug des `--number-line-*`. Ne pas redéfinir de
couleur sous `:global(.dark)` quand un token `light-dark()` existe : il bascule seul.

geometry-core conserve le **nom canonique** jusqu'au rendu (`resolveStyle().color === 'rouge'`) ;
`resolvePrintStyle()` le traduit pour les exports. Décisions : `docs/archive/wip/palette-figures-progress.md`.

## La garde CI

`scripts/check-css-tokens.sh`, appelée par le job **Lint** de
`.github/workflows/quality.yml`, et disponible en local :

```bash
pnpm check:css-tokens             # vérifier
bash scripts/check-css-tokens.sh --update   # resserrer la baseline après correction
```

Elle fonctionne en **cliquet** : `scripts/css-tokens-baseline.txt` enregistre le
nombre d'occurrences par fichier au moment où la garde a été posée, pour qu'elle
puisse atterrir sans passer la CI au rouge. Elle échoue si :

- un fichier **dépasse** sa référence ;
- un fichier **absent** de la référence en gagne une ;
- un fichier **descend** sous sa référence — c'est un progrès, mais la baseline
  doit être resserrée et committée, sinon la dette pourrait remonter en douce.

## Dette résiduelle

**2026-10-04 : dette soldée, 0 occurrence.** Les 17 derniers fichiers (écrans prof / admin /
outils, et la messagerie, vue aussi par les élèves) ont été convertis (branche
`fix/couleurs-dette`) ; la baseline `scripts/css-tokens-baseline.txt` est vide et
`block-css-vars.test.ts` n'a plus de liste d'exceptions : **tout** fichier de `src/lib` ou
`src/routes` qui lit une variable inexistante ou un `hsl(var(--x))` fait échouer le test.
Effet visible réparé dans la messagerie : l'anneau de focus clavier des messages
(`outline: 2px solid hsl(var(--primary))`) était absent (`outline-style: none`).

**Plus tôt le 2026-10-04 (restes du lot 3)** : 66 occurrences dans 17 fichiers.
Éditeurs de blocs, saisies élève, blocs Markdown, corrections, cartes SRS : convertis.

### État au 2026-09-04, après la passe « fonds »

**147 occurrences dans 38 fichiers.** Les 88 déclarations `background` /
`box-shadow` — les seules réellement visibles — ont été converties ; il ne reste
que la dérive cosmétique.

| Catégorie                                | Nombre | Gravité                   |
| ---------------------------------------- | ------ | ------------------------- |
| `background`, `box-shadow`               | 0      | ✅ traité                 |
| `color`, `border*`, `outline*`           | 126    | Dérive cosmétique         |
| dont syntaxe `/ alpha` (→ `color-mix()`) | 4      | Conversion au cas par cas |

Le reliquat (21 occurrences) vit dans des propriétés diverses (`fill` de
`::-webkit-scrollbar`, variables intermédiaires, etc.).

Les plus chargés, tous à 14 : les deux pages admin `docs`,
`whiteboard/AnnotationToolbar`, `extensions/VariationTableNodeView`,
`extensions/NumberLineNodeView`.

### Ce que la passe « fonds » a réparé

Contrairement à ce qu'on pouvait espérer, **87 des 88 n'avaient aucun filet** :
une seule était rattrapée par une classe Tailwind `bg-*`. C'étaient donc de
vrais fonds absents, par exemple :

- `.flip-button` (`FlashCard`, `CorrectionCard`, `CustomFlashCard`) : le bouton
  circulaire « retourner » était transparent, seule son ombre le dessinait ;
- `.splitter` (`PythonSplitter`) : poignée de redimensionnement invisible ;
- `.choice-button`, `.ordering-item` : fonds des réponses d'exercice absents ;
- les pouces d'ascenseur `::-webkit-scrollbar-thumb`, invisibles.
