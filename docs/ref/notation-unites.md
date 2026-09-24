# Notation des unités (grandeurs)

> Référence de la notation d'une **grandeur** (un nombre et son unité) dans les énoncés, les corrigés, les questions et l'atelier. Chaque comportement ci-dessous a été mesuré sur le code le 2026-09-24 ; les tests qui le verrouillent sont listés en fin de page.

## En une ligne

```
~3[m.s^-1]~      notation custom : l'unité entre crochets, collée au nombre
$3~\unit{m.s^-1}$  LaTeX : la commande \unit, précédée de ~
```

S'affiche « 3 m·s⁻¹ » : à l'écran, dans l'export `.tex` et dans le PDF. `kg/(m.s)` s'affiche « kg/(m·s) », parenthèses comprises.

---

## 1. Où écrire l'unité

| Contexte              | Écriture                 | Remarque                                                                                          |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Notation custom `~…~` | `~2[cm]~`, `~(2+3)[cm]~` | Crochets **juste après** le nombre ou la parenthèse. Une espace avant `[` est tolérée (`2 [cm]`). |
| LaTeX `$…$`           | `$2~\unit{cm}$`          | `~`, `\,`, une espace ou rien : `3\,\unit{cm}` et `3\unit{cm}` se lisent pareil.                  |

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

⛔ **Un produit après un `/` doit être entre parenthèses.** `kg/m.s` est **refusé** comme ambigu (« Ambiguous unit "kg/m.s": write kg/(m.s) … ») : l'usage le lit kg/(m·s), l'ancienne règle le lisait kg·m⁻¹·s. Écrire :

| Pour     | Écrire                          |
| -------- | ------------------------------- |
| kg/(m·s) | `kg/(m.s)` ou `kg.m^-1.s^-1`    |
| J/(kg·K) | `J/(kg.K)`                      |
| kg·s/m   | `kg.s/m` (produit AVANT le `/`) |

Les parenthèses ne servent qu'au dénominateur, sans imbrication ; après `)`, seul un autre `/` peut suivre. `kg/m/s` reste admis (chaque `/` porte sur un symbole : kg·m⁻¹·s⁻¹). Le formateur d'unités écrit les parenthèses lui-même (`g/(m.s)`) : ce qu'il produit se relit.

### Exposants

Les deux formes sont acceptées et équivalentes :

| Écriture          | Accolades                                        |
| ----------------- | ------------------------------------------------ |
| `m^2`, `s^-1`     | sans                                             |
| `m^{2}`, `s^{-1}` | avec, comme ailleurs dans la notation (`x^{-2}`) |

Refusés : `m2` (exposant sans `^`), `s^(-1)` (parenthèses), `m^{-}` et `m^{}` (exposant vide), `m^{2` (accolade non refermée).

⛔ **Pas d'exposant après le crochet.** `3[m]^2` est refusé : on y lisait (3 m)², soit 9 m², quand l'auteur voulait presque toujours 3 m². Écrire `3[m^2]` pour 3 m², `(3[m])^2` pour (3 m)². En LaTeX : `3~\unit{m^2}`, ou `\left(3~\unit{m}\right)^2`. Une grandeur élevée à une puissance par le code (tidy, calcul) est toujours écrite avec ses parenthèses.

### Espaces

⛔ **Pas d'espace à l'intérieur de l'unité.** `3[m s^-1]` est une erreur (« Space inside a unit »). Avant le 2026-09-24, l'espace disparaissait et `m s` devenait `ms`, **la milliseconde** : 1000 s⁻¹ au lieu de m·s⁻¹, sans aucun message. Écrire `m.s^-1`.

Admis : une espace **autour** de l'unité (`3[ km/h ]`) et, en LaTeX, celle qui termine une commande (`\unit{m\cdot s^-1}`). `\unit{m\,s}` est refusé comme `m s`.

### Espacements LaTeX

Le parseur LaTeX **ignore** les commandes d'espacement, qui n'ont aucun sens mathématique : `~`, `\,`, `\:`, `\;`, `\>`, `\ `, `\!`, `\quad`, `\qquad` (et `\enspace`, `\thinspace`, `\medspace`, `\thickspace`, `\negthinspace`). `2\,x` se lit `2x`, `3~x` aussi.

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

## 3 bis. Ce que l'élève tape (réponses)

L'élève ne tape jamais `\unit` : dans un blanc **à unité** (`blank.unit.expected`), la correction lit ce que MathLive produit vraiment (mesuré au vrai clavier, 2026-09-24) et le ramène à `valeur\unit{écriture}` — `normalizeStudentQuantity` (`src/lib/questions/units/student-input.ts`) :

| L'élève tape        | MathLive rend                            | Lu                                            |
| ------------------- | ---------------------------------------- | --------------------------------------------- |
| `5 km`              | `5\operatorname{\mathrm{km}}`            | 5 km                                          |
| `90 km/h`           | `\frac{90\operatorname{\mathrm{km}}}{h}` | 90 km/h                                       |
| `20 °C`             | `20\degree C`                            | 20 °C                                         |
| `5 min`             | `5\min`                                  | 5 min                                         |
| `2,5 km`            | `2{,}5\operatorname{\mathrm{km}}`        | 2,5 km                                        |
| `12 500 m` (espace) | `12\,500\,m`                             | 12 500 m                                      |
| `5 m s` ou `5 ms`   | `5ms`                                    | 5 **ms** (milliseconde — jamais réinterprété) |

- Dans un blanc **sans** unité, rien ne change : `5km` reste le produit 5·k·m.
- Une grandeur incompatible est refusée avec un message (« Cette unité ne mesure pas la bonne grandeur… ») : c'est le garde-fou de `m s` / `ms`. Messages : `src/lib/questions/units/feedback.ts`.
- **Clavier virtuel** : onglet « Unités » (touches de la grandeur attendue, `src/lib/questions/units/keyboard-units.ts`) ; une touche insère la forme affichée (`\mathrm{km}`), relue par la même normalisation — pas de macro `\unit`.
- La correction lit les unités avec la même règle que ce document (`parseUnitExpression` délègue à mathAST) ; exposants Unicode (`m²`) admis en réponse.

## 4. Défauts connus, non corrigés

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
- `src/lib/ubumark/generators/__tests__/unit-rendering.test.ts` : de l'énoncé ubumark aux trois sorties ;
- `src/lib/mathAST/parser/custom/__tests__/unit-pieges.test.ts` : portée du `/`, exposant après une unité, espacements LaTeX.
