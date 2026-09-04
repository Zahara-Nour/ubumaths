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

En pratique, une classe Tailwind (`bg-card`, `text-muted-foreground`, `border`)
est souvent préférable à une règle CSS écrite à la main.

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

## Dette résiduelle (2026-09-04)

**235 occurrences dans 40 fichiers**, hors module grapheur déjà assaini.

| Catégorie                                | Nombre | Gravité                          |
| ---------------------------------------- | ------ | -------------------------------- |
| `background`, `box-shadow`               | 88     | Fond potentiellement transparent |
| `color`, `border*`, `outline*`           | 138    | Dérive cosmétique                |
| dont syntaxe `/ alpha` (→ `color-mix()`) | 40     | Conversion au cas par cas        |

Les plus chargés : `whiteboard/AnnotationToolbar` (27),
`extensions/VariationTableNodeView` (26), `extensions/NumberLineNodeView` (26),
`extensions/ImageNodeView` (17), les pages admin `docs` (16 chacune).

⚠️ Les 88 sont un **majorant** : si une classe Tailwind `bg-*` accompagne la
règle, elle prend le relais et rien ne se voit. Il faut ouvrir les fichiers,
pas présumer — d'où un tri à la main plutôt qu'un remplacement en masse.
