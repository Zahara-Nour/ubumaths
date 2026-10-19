---
couvre:
  - src/lib/mathAST/cli/quantities.ts
  - src/lib/atelier/natural-quantities.ts
  - 'src/lib/questions/units/{validator,quantity-comparison,feedback,parser,operations,composite-duration,types}.ts'
---

# Les grandeurs : lire, calculer, écrire

> Une **grandeur** est un nombre muni d'une unité (`CONTEXT.md`). Cette page est le **contrat
> unique** des grandeurs : avant d'écrire du code qui lit, calcule ou écrit une grandeur, on
> passe par les pièces ci-dessous, jamais par une nouvelle à côté. Écrire une grandeur dans un
> énoncé (la notation pour l'auteur) : [notation-unites.md](../pratiques/notation-unites.md).
> Décision : [ADR 0026](../adr/0026-grandeurs-un-contrat-et-l-espace.md). Vérifié contre le code
> le 2026-10-13.

## Pourquoi un contrat

Jusqu'en octobre 2026, il y avait trois lecteurs, trois calculateurs et quatre écritures des
grandeurs, et chaque correction n'en réparait qu'un (117 commits « unités / grandeurs » de mai à
octobre). Le symptôme le plus visible : Calcul et `/cas` répondaient `10[km]/1[h]` → « 10 m/s »,
`90[km/h]*2[h]` → « 180 m » — la valeur était juste, l'étiquette fausse (le coefficient de km/h
était perdu à l'écriture). Analyse et décisions de David : `docs/archive/wip/grandeurs-analyse.md`
(2026-10-11) ; correctifs : lots A (#1099), B (#1101), C (#1106), D (ménage, 2026-10-13).

## Le circuit

**Une grandeur se lit en arbre (nœud `unit`), se calcule par `tidy`, s'écrit depuis l'arbre.**

```
écriture ──lire──▶ arbre avec nœud `unit` ──tidy (unité écrite d'abord)──▶ arbre ──toLatex──▶ 5~\unit{km} ──displayUnitsInLatex──▶ 5~\mathrm{km}
```

### Lire — la seule étape qui dépend du contexte

| Contexte                                      | Règle                                                                                                                    | Où                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Énoncés, `{{eval}}`, données                  | stricte : `5[km]` (`~…~`), `5~\unit{km}` (LaTeX) — l'auteur doit être sans ambiguïté                                     | parseur maison (`parser/custom`, `unit-writing.ts`), parseur LaTeX |
| Atelier : calculs et valeurs                  | **« un nombre, une espace, une unité »** (`5 km`, `10^3 m`) ; collé (`5m`) ou `*` = produit ; crochets toujours acceptés | `readNaturalQuantities` (`atelier/natural-quantities.ts`)          |
| Atelier : champ MathLive d'une carte (valeur) | la même règle, sur le LaTeX du champ (`2\,h\,30\,\min`, `\frac{1}{2}\,m`)                                                | `definitionFromField` (`atelier/mathfield.ts`)                     |
| Atelier : définitions de fonctions, commandes | jamais d'unité naturelle (`.résoudre 2 a = 4` ne lit pas des ares)                                                       | —                                                                  |
| Atelier : le degré, partout                   | `60°`, `a°`, `(30+30)°` = `[°]` ; `60^\circ`, `60\degree` (MathLive) = `\unit{°}` ; `°` seul refusé                      | `withDegreeUnits`, `strayDegreeRefusal` (`atelier/degrees.ts`)     |
| Case à unité d'une question                   | tout ce qui suit le nombre est l'unité (`5km`, `5 km`, MathLive)                                                         | `normalizeStudentQuantity` (`questions/units/student-input.ts`)    |
| Case à unité : durée composée                 | « 2 h 15 min », « 1 h 5 min 30 s »                                                                                       | `questions/units/composite-duration.ts`                            |

Règles de la lecture naturelle (décisions de David du 2026-10-11) :

- 18 unités tiennent en une lettre (m, g, t, q, L, l, s, h, j, a, K, N, J, W, V, A, C, F) : c'est
  **l'espace** qui fait l'unité, comme la règle typographique officielle (SI) ;
- un nom du panneau suivi d'une espace reste lu comme unité (`5 m` avec une valeur `m` = 5 mètres),
  avec une note : « m est aussi un nom du panneau : pour 5 × m, écris 5m. » ;
- l'unité porte sur la fraction de nombres qui la précède : `1/2 m` = (1/2) m ;
- au-delà d'un nombre, l'unité porte sur **tout le terme de nombres** qui la précède (décision de
  David du 2026-10-18) : `10^3 m` = 1000 m, `2,5*10^3 m`, `3*10^8 m/s`, `(1+2) m`, `sqrt(2) m`,
  `2π m`, `10/2^3 m` = (10/2³) m, `2^10 o` = 1024 o. Le terme s'arrête à un `+`, un `-` (pas celui
  d'un exposant : `10^-3 m`), un `=`, un `;`, une parenthèse ouvrante, ou une espace sans opérateur
  à côté. **Des nombres seulement** — « l'utilisation des unités est censée se faire uniquement avec
  des grandeurs numériques » (David) : une lettre, même une valeur du panneau, reste de l'algèbre
  (`x m`, `2πr m`, et surtout `m g` avec `m = 70`, qui ne doit pas répondre 70 grammes) ;
  `2πr[m]` impose l'unité. Lecteur : `quantitiesAfterTerms` ; le champ de la carte ne l'applique
  pas (`afterTerms: false`), il a ses propres lectures. Une ligne avec `π` lue en LaTeX refuse les
  crochets : Calcul la relit, en repli, avec `\unit{m}` (`latexUnitsWithPi`, `atelier/parse.ts`) ;
- deux grandeurs juxtaposées s'ajoutent : `2 h 30 min` = 2 h + 30 min ;
- `5km` collé reste un produit, avec une note « Pour une grandeur, écris 5 km (avec une espace). »
  (sauf si toutes ses lettres sont des valeurs du panneau : produit voulu) ;
- un refus de dimension où une lettre seule a été lue comme unité (`3 t + 2`) explique la lecture
  (`singleLetterHint`) ;
- une unité suivie d'une lettre (`3 a b`) ou d'une parenthèse (`2 h(3)`) reste de l'algèbre ;
- une grandeur combinée à une lettre libre est refusée : « Une grandeur ne se combine pas avec une
  lettre. » (`atelier/calcul.ts`).
- une **valeur** mal dimensionnée est en erreur dès sa définition, avec le refus de Calcul
  (`b = 3[min] + 2[km]`, ou `d = r + 2[m]` avec `r = 3[s]`) ; ce qui la cite aussi, et elle se
  répare quand la valeur citée change (`#quantityChecks`, `atelier.svelte.ts`, 2026-10-18 — avant,
  elle était « ok » et le refus attendait qu'on la cite). Le jugement porte sur l'arbre substitué,
  pas sur son texte : `toCustom` écrit `3[m]*π/2` en `\pi:/2`, que rien ne relit (2026-10-19) ;
- au **rejeu** d'un historique exporté avant cette lecture, une ligne réussie dans le fichier et
  refusée parce qu'une lettre y est lue comme unité (`5 s + 1`) est refaite avec son ancien sens,
  comme le dit l'aide : `5s + 1` (`withSingleLettersGlued`, `CalcDesk.replay`). Une ligne valide
  dans les deux lectures (`2 h + 5 s`) se rejoue avec la nouvelle.

Dans la carte, MathLive écrit l'espace tapée `\,` et « min » toujours en opérateur `\min` :
`definitionFromField` les ramène au texte de Calcul avant `readNaturalQuantities`, et ne garde la
lecture que si la saisie n'est QU'une grandeur (`\min\left(2,3\right)` reste la fonction). Une durée
composée rangée revient dans le champ écrite `2 h 30 min`, sans le `+` du rangement
(`fieldLatexOf`) : elle se relit après retouche (restes du lot C, 2026-10-13), seule ou prise dans
un calcul (`(1 h + 30 min) × 2`, dont le × reste un × après retouche). Le champ écrit la virgule de l'élève (`2{,}5 km`, pas `2.5`) ; une unité qu'il montre (`\operatorname{\mathrm{m}}`) se relit en unité, même après une puissance (`10^3 m`).

### Calculer — `tidy`, unité écrite d'abord

Un seul calculateur : **`tidy(ast, { unitChoice: 'written' })`**, en rationnels exacts
(`mathAST/units/exact.ts`). L'unité du résultat est celle que l'auteur ou l'élève a écrite :
`10[km]/1[h]` → 10 km/h, `7[mm]*5[mm]` → 35 mm², `90[km/h]*2[h]` → 180 km, `3[h]/1[min]` → 180.

| Qui                    | Entrée                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `{{eval}}` des énoncés | `evaluateWithModifiers` (interne : `evaluateQuantity`), `valueIn` (`mathAST/eval/evaluate-with-modifiers.ts`) |
| Calcul de l'atelier    | `computeQuantity`, `convertQuantity` (`.convertir`), `quantityProblem` (`mathAST/cli/quantities.ts`)          |

Ce que fait `computeQuantity` en plus de `tidy` :

- refus en français, avant de calculer : dimensions incompatibles (« On ne peut pas ajouter une
  longueur et une durée. »), produit de températures ; les octets et les bits sont « une quantité
  de données », un débit (`Mbit/s`) « un débit » (`DIMENSION_NAMES`, `cli/quantities.ts`) ;
- une unité tapée par l'élève l'emporte quand la valeur y tombe juste (`3[kW]*2[h]`) ;
- durée composée gardée (`2 h 30 min + 45 min` → 3 h 15 min) ; `.convertir` la répète telle
  quelle à gauche (`2 h 30 min = 150 min`, pas `2,5 h`) : l'issue la garde dans `written` ;
  unité dérivée nommée en égalité (`19.62 m.kg/s^2 = 19.62 N`) ;
- ce que `tidy` ne réduit pas (racine, valeur absolue, fonction d'un angle) passe par un repli
  exact en unités de base ;
- mode décimal : la règle du bouton ≈ (4 décimales, « = » quand c'est exact), comme les nombres.

⛔ `evaluateWithUnits` et `.unitmode`/`.mode-unités` sont **retirés** (lot A) : ne pas les
recréer.

### Écrire — depuis l'arbre

- `toLatex` écrit `5~\unit{km}` : la forme que le parseur LaTeX **relit**.
- `displayUnitsInLatex` (`mathAST/units/display.ts`) la traduit juste avant l'affichage
  (`5~\mathrm{km}`) : énoncés, corrections, Calcul (`atelier/render.ts`).
- `unitWritingToLatex`, `unitWritingToTypst` : clavier « Unités », PDF.

⚠️ L'écran de Calcul dessine **l'arbre** du résultat, jamais son texte (lot B) : deviner une
grandeur à l'antislash du texte perdait l'unité (`5[km]` → « 5 ») et écrivait `π/3` « 1/3π ».

⚠️ `format(unit, 'dot' | 'fraction')` (`mathAST/units/formatter.ts`) écrit la signature en
unités de base **sans le coefficient** (km/h → « m/s ») : ce n'est pas une écriture de grandeur.
C'est la cause du bug « 10 m/s ».

## La correction des cases à unité — un troisième calculateur, connu

`questions/units/validator.ts` (`validateQuantityAnswer`) et `quantity-comparison.ts`
(`compareQuantities`) corrigent les réponses des élèves dans les cases à unité : conversions,
tolérance, précision demandée, messages (`feedback.ts`). Il n'y a **pas** de ComputeEngine : la valeur
est lue en arbre (`parser.ts` : `parseLatex` → `tidy` → `rationalOf`), exacte, et `null` si elle
n'est pas rationnelle — `2\sqrt{2}`, `\pi` : un tel attendu donne « Erreur de configuration », jamais
la valeur de son premier nombre. Une saisie sans unité qui s'écrit comme un nombre, même illisible
en valeur (`\sqrt{2}`), reçoit « N'oublie pas l'unité. » (`readsAsNumber`). Sans tolérance,
l'égalité est **exacte** (`exactBaseValue`, `parser.ts`) : chaque grandeur est ramenée en unités de
base par les conversions exactes de mathAST (`exactConversion`, coefficient et décalage rationnels,
températures comprises), aucun bruit de flottants toléré — `0,333333333333333` m n'est pas
`\frac{1}{3}` m. Une unité lisible sans conversion exacte est refusée, jamais jugée en flottants
(test d'invariant : il n'y en a aucune). Tolérance et arrondi demandés (`precision`) se jugent
encore en flottants (`convertAffine`). L'unité est lue à part (`\unit{…}` + parseur d'unités) :
c'est un calculateur hors du circuit ci-dessus, chantier `correction-cases-unite`. Le catalogue des unités et les opérations de base viennent de `mathAST/units`
(`resolveUnit`, conversions) : `questions/units` n'en garde plus de copie depuis le lot D.

Garde-fou : l'oracle `oracle-cases-unite.test.ts` fige le verdict de ~1 700 réponses typiques
sur les 25 modèles publiés à case à unité (copiés de la production dans
`tests/fixtures/correction-cases-unite/`). La production ne garde aucune réponse d'élève de
l'entraînement : l'oracle repose sur les vraies questions, pas sur de vraies réponses.

Le refus de grandeur (« Cette unité ne mesure pas la bonne grandeur. ») n'ajoute « Pour un produit
d'unités, écris m·s. » que si les lettres collées de l'élève, lues comme un produit, mesurent la
grandeur attendue (`5ms` pour des m·s) — décision de David du 2026-10-19.

## Tests qui verrouillent le contrat

- `src/lib/mathAST/cli/web/__tests__/grandeurs.test.ts` — les étiquettes justes dans la console
  (les cas du bug « 10 m/s »).
- `src/lib/atelier/__tests__/grandeurs-calcul.test.ts`, `grandeurs-ecriture.test.ts` — Calcul,
  écriture naturelle et durées composées.
- `src/lib/mathAST/tidy/__tests__/tidy-written-unit.test.ts` — `tidy`, unité écrite d'abord.
- `src/lib/questions/generator/__tests__/eval-grandeurs.test.ts` — `{{eval}}`.
- `src/lib/questions/units/__tests__/` — la correction des cases à unité (README du dossier).
