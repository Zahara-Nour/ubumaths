# Couleurs thémables, lot 3 : droite graduée, cercle trigo, tableau de variations, arbre

**Branche** `feat/couleurs-lot3` · ouvert le 2026-10-04 · suite des lots 1 (#708, palette
nommée) et 2 (figures interactives). Décisions communes : `docs/wip/palette-figures-progress.md`.

## Décisions de David

| #    | Décision                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3-a | Couleur INCONNUE (droite graduée, cercle trigo) → avertissement à l'auteur + couleur par défaut ; le bloc s'affiche                                                        |
| D2   | Pas d'éclaircissement automatique d'un hex d'auteur en sombre ; avertissement si contraste < 3:1 sur le fond SOMBRE réel, avec le nom de palette le plus proche (ΔE OKLab) |

## Inventaire (étape 0, 2026-10-04)

Variables CSS lues par les 4 composants écran (`src/lib/components/markdown/nodes/`), état
AVANT le lot. « Locale » = définie dans le `<style>` du composant.

| Composant                | Variables                                                                                                | Existent dans app.css ?                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NumberLine.svelte`      | `--background`, `--foreground` (sous `hsl()`) ; `--number-line-{bg,axis,tick,text,point,segment,hidden}` | **Aucune**. Les `--number-line-*` ne sont définies qu'en sombre, à partir de `hsl(var(--background))` invalide                                       |
| `TrigCircle.svelte`      | `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--accent`, `--primary`     | **Aucune** (replis codés en dur). `--primary-color` locale ; en sombre, écrasée par `var(--primary, #60a5fa)` : la couleur de l'auteur disparaissait |
| `VariationTable.svelte`  | `--border`, `--foreground`, `--muted`, `--muted-foreground` ; `--vt-*` locales                           | **Aucune** des 4 (replis codés en dur, redéfinis en `.dark`)                                                                                         |
| `ProbabilityTree.svelte` | `--foreground`, `--muted-foreground`, `--primary` ; `--pt-*` locales                                     | **Aucune** des 3                                                                                                                                     |

Générateurs Typst (PDF) : `number-line-typst.ts` (`getTypstColor` : `bleu` → `bleu` brut, identifiant
Typst inconnu → **la fiche entière échoue** ; points ouverts `white`), `trig-circle-typst.ts`
(anglais seulement, inconnu → `blue`). `variation-table-typst.ts` et `probability-tree-typst.ts`
n'ont aucune couleur d'auteur.

Constat sur les ± du tableau de variations : `--vt-plus-color` / `--vt-minus-color` sont **mortes**
depuis 1416cef11 (déc. 2025, « Remove colors from +/- signs (use inherit) ») : les signes
s'affichent dans la couleur du texte. Le lot les rattache à `vert` / `rouge` de la palette sans
les rallumer (décision de David de 2025 conservée) — **à trancher** si on veut les colorer.

## Avancement

- [x] Tests rouges (2026-10-04) : serveur 14 échecs + module absent ; navigateur 12/13 sur les
      composants d'origine (le 13ᵉ, `rouge` du cercle en sombre, est un garde-fou : la surcharge
      `:global(.dark) { --primary-color: … }` perdait déjà contre le style en ligne) ; figure 3/4
- [x] Module pur `src/lib/theme/author-color.ts` : `contrastRatio` (WCAG), `deltaEOk` (OKLab),
      `nearestNamedColor` (gris → `noir`, sinon teinte la plus proche), `darkContrastWarning`,
      `resolveAuthorColor` ; `DARK_BACKGROUNDS` = page et carte sombres, vérifiés contre app.css
- [x] Droite graduée : `resolveNumberLineColors` (écran + Typst) ; défauts points `rouge`,
      segments `bleu` (le PDF mettait les segments en rouge, l'écran en bleu → aligné sur l'écran) ;
      points ouverts et halos = `--color-background` ; axe = `--color-foreground`
- [x] Cercle trigo : même résolveur (écran + Typst), avertissement affiché au prof ;
      tokens du thème, bloc `:global(.dark)` supprimé
- [x] Tableau de variations, arbre : tokens du thème, blocs `:global(.dark)` supprimés ;
      surbrillance de l'arbre = `--color-fig-bleu` (était `#3b82f6` / `#60a5fa` de repli)
- [x] `figure` : avertissement de contraste sur les hex de trait (une fois par valeur ; `#000000`
      exclu, il suit le texte). `courbe` : vocabulaire fermé, pas de hex → non concerné
- [x] `NumberLineInput` (saisie élève) : points fixes via le même résolveur
- [x] Docs : guide des fiches (auteurs), `css-color-tokens.md`
- [x] autofix, `check:incremental` 0, `lint:fast`, `check:css-tokens` (baseline resserrée)

## Reste

- Éditeurs `NumberLineNodeView` / `VariationTableNodeView` : encore `var(--border)`,
  `--foreground`, `--ring`… inexistants (14 occurrences chacun dans la baseline CSS).
- `NumberLineInput` : habillage (`--number-line-*`, `hsl(var(--background))` en sombre).
- `stat-chart`, DSL des figures interactives : pas d'avertissement de contraste (hors résolveur).
- ± du tableau de variations : à colorer ou non (cf. constat ci-dessus).
- Captures réelles clair / sombre non faites (tests navigateur sur la couleur rendue seulement).
