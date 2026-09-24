# Notation des unités (grandeurs)

> Référence de la notation d'une **grandeur** (un nombre et son unité) dans les énoncés, les corrigés, les questions et l'atelier. Chaque comportement ci-dessous a été mesuré sur le code le 2026-09-24 ; les tests qui le verrouillent sont listés en fin de page.

## En une ligne

```
~3[m.s^-1]~      notation custom : l'unité entre crochets, collée au nombre
$3~\unit{m.s^-1}$  LaTeX : la commande \unit, précédée de ~
```

S'affiche « 3 m·s⁻¹ » : à l'écran, dans l'export `.tex` et dans le PDF.

---

## 1. Où écrire l'unité

| Contexte              | Écriture                 | Remarque                                                                                          |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Notation custom `~…~` | `~2[cm]~`, `~(2+3)[cm]~` | Crochets **juste après** le nombre ou la parenthèse. Une espace avant `[` est tolérée (`2 [cm]`). |
| LaTeX `$…$`           | `$2~\unit{cm}$`          | Le `~` est **obligatoire** : `3 \unit{cm}` et `3\,\unit{cm}` sont refusés par le parseur LaTeX.   |

Une unité **se déclare**, elle ne se devine pas : `~12 km~` sans crochets est le produit `12·k·m`, pas une grandeur.

⚠️ `[cm]` seul, sans nombre, est refusé en custom. En LaTeX, `\unit{cm}` seul devient « 1 cm ».

## 2. L'écriture de l'unité

### Symboles

Lettres et caractères `€ $ ° μ Ω`, en respectant la **casse** : `2[CM]` est refusé.

| Famille     | Symboles reconnus (extrait)            |
| ----------- | -------------------------------------- |
| Longueur    | `mm` `cm` `m` `km` `μm`                |
| Masse       | `mg` `g` `kg` `t`                      |
| Volume      | `mL` `cL` `dL` `L` `cm^3` `dm^3` `m^3` |
| Aire        | `m^2` `a` `ha`                         |
| Durée       | `ms` `s` `min` `h` `j` `jour` `an`     |
| Température | `°C` `°F`                              |
| Angle       | `°` `rad`                              |
| Monnaie     | `€` `$`                                |
| Physique    | `N` `J` `W` `kWh` `Pa` `Hz` `Ω` `mol`  |

Liste complète : `src/lib/mathAST/units/definitions.ts`. `%` n'est **pas** une unité.

### Opérateurs

| Écriture    | Sens     | Affichage                        |
| ----------- | -------- | -------------------------------- |
| `.` `*` `·` | produit  | `·` (point médian)               |
| `/`         | quotient | `/` (barre, jamais une fraction) |

⚠️ **Le `/` ne porte que jusqu'au point suivant** : `kg/m.s` se lit **kg·m⁻¹·s**, pas kg/(m·s). Les parenthèses ne sont pas acceptées (`kg/(m.s)` est refusé) : écrire `kg.m^-1.s^-1`.

### Exposants

Les deux formes sont acceptées et équivalentes :

| Écriture          | Accolades                                        |
| ----------------- | ------------------------------------------------ |
| `m^2`, `s^-1`     | sans                                             |
| `m^{2}`, `s^{-1}` | avec, comme ailleurs dans la notation (`x^{-2}`) |

Refusés : `m2` (exposant sans `^`), `s^(-1)` (parenthèses), `m^{-}` et `m^{}` (exposant vide), `m^{2` (accolade non refermée).

### Espaces

⛔ **Pas d'espace à l'intérieur de l'unité.** `3[m s^-1]` est une erreur (« Space inside a unit »). Avant le 2026-09-24, l'espace disparaissait et `m s` devenait `ms`, **la milliseconde** : 1000 s⁻¹ au lieu de m·s⁻¹, sans aucun message. Écrire `m.s^-1`.

Admis : une espace **autour** de l'unité (`3[ km/h ]`) et, en LaTeX, celle qui termine une commande (`\unit{m\cdot s^-1}`).

### Températures

`°C` et `°F` ne se composent pas : `°C` seul, sans exposant (`[°C/s]` est refusé).

## 3. Comment c'est affiché

Le générateur LaTeX de mathAST écrit une grandeur `3~\unit{m.s^-1}`. C'est la forme **interne** : le parseur LaTeX sait la relire. Mais `\unit` vient de l'extension siunitx, qu'aucun des trois moteurs ne connaît. L'écriture est donc traduite **juste avant l'affichage** par `src/lib/mathAST/units/display.ts` :

| Sortie                            | Fonction                                                     | `m.s^{-1}` devient                      | `km/h` devient                 |
| --------------------------------- | ------------------------------------------------------------ | --------------------------------------- | ------------------------------ |
| Écran (MathLive) et export `.tex` | `displayUnitsInLatex` (appelée par `expressionToLatex`)      | `\mathrm{m}\cdot\mathrm{s}^{-1}`        | `\mathrm{km}/\mathrm{h}`       |
| PDF (Typst)                       | `unitWritingToTypst` (appelée par `convertLatexToTypstMath`) | `upright("m") dot.op upright("s")^(-1)` | `upright("km")"/"upright("h")` |

Règles communes : symboles en romain, espace avant l'unité, exposant entier (le `1` de `s^-1` monte avec le `−`), barre jamais transformée en fraction.

- ⚠️ **Ne jamais traduire avant Typst** : le PDF reçoit le LaTeX brut (`expressionToRawLatex`). En Typst, une barre nue fait une fraction : `\mathrm{km}/\mathrm{h}` y deviendrait km sur h.
- ⚠️ **Ne jamais relire la forme traduite** : `\mathrm{m}\cdot\mathrm{s}^{-1}` se relit comme un produit de variables, plus comme une grandeur.

## 4. Défauts connus, non corrigés

- `~3[m^2]^2~` produit `3~\mathrm{m}^{2}^2` : un double exposant, refusé par LaTeX.
- LaTeX : seul `~` est admis entre le nombre et `\unit` ; `\,` et une espace simple sont refusés.
- La page `admin/debug/mathfield` déclare sa propre macro `\unit` (fond vert, police sans empattement), pour son champ de saisie uniquement. Elle ne suit pas les règles d'affichage ci-dessus.

## 5. Code et tests

| Rôle                                                    | Fichier                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Lecture de l'écriture (symboles, opérateurs, exposants) | `src/lib/mathAST/units/parser.ts`                                   |
| Crochet d'unité des parseurs custom (Pratt et RD)       | `src/lib/mathAST/parser/custom/unit-writing.ts`                     |
| `\unit{…}` des parseurs LaTeX (Pratt et RD)             | `parseUnitString()` dans `src/lib/mathAST/parser/latex/parser-*.ts` |
| Affichage (écran, `.tex`, PDF)                          | `src/lib/mathAST/units/display.ts`                                  |

Tests :

- `src/lib/mathAST/parser/custom/__tests__/unit-writing-braces-spaces.test.ts` : accolades, espaces, dans les 4 parseurs ;
- `src/lib/mathAST/units/__tests__/display.test.ts` : traduction, et rendu MathLive réel via `mathlive/ssr` ;
- `src/lib/ubumark/generators/__tests__/unit-rendering.test.ts` : de l'énoncé ubumark aux trois sorties.
