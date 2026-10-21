# Phase 0 — comportements attendus (lecture-grandeurs)

_Rédigé le 2026-10-20 à partir des décisions de David (journal, page à cocher des grandeurs : 20 réponses
sur 81 ; page virgule : 0 sur 31). Rien n'est codé. **Validé par David le 2026-10-20 (5e session)** : questions
ouvertes 1 à 5 et toutes les lignes 🟡, avec `)2` ajouté à `MISSING_OPERATOR`. Page grandeurs terminée le même
jour (81/81) : Q11, Q12, Q15, E7 tranchées (PR 4). Il ne reste que la PR 6 (virgule) ⏸._

**Portée.** Parseur maison (`parser/custom/`, Pratt **et** RD) ; le parseur LaTeX seulement là où une
décision le nomme (B9, Q9, codes des refus qu'il partage). LECTURE seulement : le calcul
(`computeQuantity`) et les messages français de l'atelier (`french-errors.ts`) ne changent pas, sauf
mention.

**Règle commune à toutes les PR.** Un refus rend un `ParseErrorCode` précis + le message anglais. Quand un
refus existe déjà, **son texte anglais reste identique** : `french-errors.ts` traduit encore par le texte
(`/Invalid unit: (\S+)/`), le passage à la traduction par code est un chantier de l'atelier.
Chaque comportement est testé dans les **deux** implémentations (Pratt, RD) par le même cas.

Légende : ✅ décidé par David · 🟡 conséquence de mes choix, **à confirmer** · ⏸ attend une réponse,
je ne change rien à l'existant.

---

## PR 1 — `×`, `·`, `⋅` lus comme `*` (décision 7, fiches B5, E3)

Nominal ✅

- `2×3`, `2·3`, `2⋅3` = `2*3` (même arbre, même style d'opérateur que `*`).
- `2.5×10^3[m]` se lit comme `2.5*10^3[m]` (la lecture de l'unité suit la PR 4).
- `2[m]×3[m]` = `2[m]*3[m]` (6 m²).
- Dans les crochets : `3[m·s^-1]` et `3[m⋅s^-1]` = `3[m.s^-1]` (aujourd'hui « Expected ']' after unit »).

Limite

- `2.5` reste un décimal, `2·5` un produit : test qui pose les deux côte à côte ✅.
- `2 × 3` avec espaces = `2*3`.
- ✅ `×` en tête (`×3`) ou en fin (`2×`) : même refus que `*3` / `2*` aujourd'hui, avec le même code.
  Aujourd'hui `2×` est **accepté** et lu « 2 fois la lettre × » (mesuré) : bug corrigé par cette PR.

Erreur

- Aucun nouveau refus.

✅ **Parseur LaTeX inchangé** : il lit `\times`, `\cdot` et continue de refuser `×`, `·`, `⋅` Unicode
(« Nombre « 3 » écrit après un facteur… utilise \cdot »). MathLive n'écrit jamais l'Unicode (sonde clavier).

---

## PR 2 — exposants : `^-` (B7) et exposants empilés (B9)

Nominal ✅

- Après `^`, un signe (`-` ou `+`) suivi d'**un** nombre ou d'**une** lettre forme l'exposant :
  `10^-3` = `10^{-3}` ; `2^-x` = `2^{-x}` ; `10^-3[m]` = `(10^{-3})[m]` ; `10^-3*4` = `(10^{-3})*4`.
- `10^-3+4` = `10^{-3}+4`, comme `10^3+4` = `(10^3)+4`.
- `2^{3^2}` et `(2^3)^2` : inchangés (seules écritures acceptées d'un empilement).

Limite

- `10^-2.5` : le nombre entier `2.5` est l'exposant ✅ (« UN nombre »).
- ✅ `10^+3` = `10^{+3}` : même règle que le `-` (la fiche dit « un signe »). Aujourd'hui : refus
  « Expected exponent » (mesuré).
- ✅ `2^-x y` → **refus**, même message que `2^x y` aujourd'hui (« Multiple letters in exponent require
  braces », mesuré : l'espace ne coupe pas l'exposant). Seul `2^-x*y` = `2^{-x}·y` est lu.

Erreur ✅

- `2^3^2`, `e^x^2`, `2^3^2[m]`, `e^-x^2` → `STACKED_EXPONENTS`
  (« Two exponents in a row: write 2^{3^2} or (2^3)^2 »).
- `2^-sin(x)`, `2^-(x+1)` → `NEGATIVE_EXPONENT_BEFORE_GROUP`
  (« Negative exponent before a group: write 2^{-…} or 2^(-…) »).
- **Parseur LaTeX** : `2^3^2`, `e^x^2` → `STACKED_EXPONENTS` (aujourd'hui lus de gauche à droite).
  MathLive ne les produit jamais (mesuré) ; un `\unit`/`toLatex` ne les écrit pas non plus — à prouver par
  un grep des générateurs dans la PR.

À mesurer dans la PR : 0 empilement en prod (déjà mesuré, modèles + exercices) ; empilements dans
`scripts/questions/`, `tests/fixtures/` et les tests (un test qui assertait la lecture de gauche à droite
change d'attendu, il ne disparaît pas).

---

## PR 3 — codes précis des refus qui existent déjà

Lecture inchangée ; seul le code change (texte anglais identique quand il existe). Parseurs maison et
LaTeX quand le refus existe dans les deux.

| Écriture                        | Aujourd'hui        | Code ✅                                                                                            |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `5[xyz]`, `5[M]`                | `INVALID_UNIT`     | `UNKNOWN_UNIT`                                                                                     |
| `5[]`                           | `INVALID_UNIT` (?) | `EMPTY_UNIT`                                                                                       |
| `10[m]^3`                       | `INVALID_UNIT`     | `UNIT_EXPONENT_OUTSIDE`                                                                            |
| `3[kg/m.s]`                     | `INVALID_UNIT`     | `AMBIGUOUS_UNIT`                                                                                   |
| `3[m s]`                        | `INVALID_UNIT`     | `SPACE_IN_UNIT`                                                                                    |
| `(1+2`, `[1,2`                  | `UNEXPECTED_TOKEN` | `MISSING_DELIMITER`                                                                                |
| `.5[m]`, `.5`                   | `UNEXPECTED_TOKEN` | `LEADING_DECIMAL_POINT` ✅ (nouveau texte : « Missing zero before the decimal point (write 0.5) ») |
| `x2`, `x 2`                     | `UNEXPECTED_TOKEN` | `MISSING_OPERATOR` ✅                                                                              |
| `(1+x)2`, `(1+x) 2`, `sqrt(2)3` | `UNEXPECTED_TOKEN` | `MISSING_OPERATOR` ✅                                                                              |

- `INVALID_UNIT` disparaît du type ; `UNEXPECTED_TOKEN` reste en dernier recours.
- ✅ **`MISSING_OPERATOR`** (David, 2026-10-20) : un nombre écrit juste après une lettre (`x2`, `x 2`) ou
  après une parenthèse fermante (`)2`, espace ou non). `(2)(3)` reste un produit (mesuré). `2[m]3[m]` (E12) va
  à `JUXTAPOSED_QUANTITIES` (Q9, PR 5), pas ici. Le reste garde `UNEXPECTED_TOKEN`.
- Garde : un test énumère chaque écriture du tableau et vérifie le code dans les deux implémentations.
- G10 `3[m s]` : la Q10 n'est pas tranchée, donc **le refus reste** (rien ne change, seul le code).

---

## PR 4 — l'unité multiplie tout le terme (décision 1)

**Avant d'écrire du code** : inventaire des écritures dont la VALEUR change (`a/b[u]`, `-a/b[u]`,
`10^3/2[u]`) dans les modèles publiés, `{{eval}}`, variables, `scripts/questions/`, `tests/fixtures/`, tests.
Le résultat est montré à David avant la suite (tout cas trouvé = valeur qui change en prod).

Nominal ✅

- `1/2[m]` = `(1/2)[m]` (0,5 m, plus 0,5 m⁻¹) ; `6/2[s]` = `(6/2)[s]` ; `10^3/2[m]` = `(10^3/2)[m]`.
- `2*3[m]` = `(2*3)[m]` ; `2.5*10^3[m]` = `(2.5*10^3)[m]` ; `2*1/2[m]` = `(2*(1/2))[m]`.
- Signe unaire dans la valeur : `-5[m]` = `(-5)[m]` ; `+5[m]` = `(+5)[m]` ; `-10^3[m]` = `(-(10^3))[m]`
  (jamais `(-10)^3`) ; `-1/2[m]` = `(-(1/2))[m]`.
- Espaces entre chiffres ignorés partout : `12 500` = 12500 ; `12 500[m]` = `12500[m]` ; `12 5[m]` = `125[m]` ;
  `0.000 01` = 0.00001. Le parseur n'émet aucun avis sur l'espacement.
- ✅ Le terme contient aussi `sqrt(…)` : `2sqrt(2)[m]` = `(2*sqrt(2))[m]` (règle écrite du corpus).
  Aujourd'hui `2*(sqrt(2)[m])` : même valeur, l'arbre change.

Limite

- Le terme s'arrête à un `+`/`-` d'addition : `2+3[m]` = `2+(3[m])`, `2-3[m]` = `2-(3[m])` (le calcul refuse
  ensuite, inchangé).
- Une grandeur déjà formée clôt le terme : `6[m]/2[s]` = `(6[m])/(2[s])` ; `a[m]*3[m]` inchangé.
- Unité au dénominateur : seulement entre parenthèses, `1/(2[s])` inchangé.
- ✅ `1/2/3[m]` = `((1/2)/3)[m]`, sans refus (conséquence de la règle). Aujourd'hui `(1/2)/(3[m])`, en m⁻¹.
- `2*20[°C]` = `(2*20)[°C]` ; le calcul refuse toujours (« ne se multiplie pas »).
- `x 2` reste refusé (`MISSING_OPERATOR`) : les espaces ne sont ignorés qu'**entre deux chiffres**.
- Les valeurs des écritures déjà justes ne changent pas (`-5[m]` vaut −5 m avant et après) ; **le RENDU
  LaTeX et maison de chaque écriture du corpus est asserté** avant/après (l'arbre change, l'affichage ne
  doit pas).

Erreur

✅ (David, 2026-10-20, fin de la page grandeurs)

- **Terme ambigu après une grandeur** (E7) : après `grandeur *` ou `grandeur /`, le terme qui porte l'unité doit
  être UN nombre ; sinon refus `AMBIGUOUS_TERM` (nouveau, « write 6[m]/(2*3[s]) or (6[m]/2)*3[s] »).
  `6[m]/2*3[s]`, `6[m]/2/3[s]`, `6[m]*2/3[s]` refusés (aujourd'hui 9 m·s, 1 m/s, 4 m/s) ; `6[m]/2[s]`, `6[m]/2`,
  `6[m]/(2*3[s])` lus.
- **Unité seule** (K2, Q15) : `[m]` → refus `MISSING_NUMBER_BEFORE_UNIT` (nouveau, « A unit needs a number
  before it (write 1[m]) ») ; aujourd'hui lu comme la lettre m entre crochets de calcul.

✅ **Lettres (Q12)** : `3x[m]` = `(3*x)[m]`, `x*2[m]` = `(x*2)[m]` (la règle du terme vaut pour les lettres).
✅ **π (Q11, révisée par David le 2026-10-20, 7e session)** : `π` (Unicode) = la constante π **partout** dans le
parseur maison (aujourd'hui : une lettre) ; `π[m]` = π m, `2π[m]` = `(2*π)[m]`, `\pi[m]` = π m. **`pi` sans barre
reste p × i** (lettres grecques = `\…`, comme `\alpha`) : `pi[m]` = p × i[m]. Avant de coder : mesurer les
chemins de l'atelier où `π` est lu comme une lettre.

Hors PR 4 (PR à part, décidée le même jour) : retirer `BARE_PI` (tolérance `pi` → `\pi` des seuls `{{eval}}`),
après réécriture `pi` → `\pi` des 186 calculs de prod (18 modèles) et 159 du dépôt, avec une garde qui refuse
`pi` nu dans un modèle.

Hors chantier (calcul, atelier) : `computeQuantity` refuse toute lettre (`x+1`, `x[m]`) avec « Ces grandeurs ne
se combinent pas » ; message voulu « x n'a pas de valeur » (comme `.eval`). Tâche de l'atelier, pas de ce chantier.

---

## PR 5 — durées et angles juxtaposés (Q9, F1-F3)

Nominal ✅

- `2[h] 30[min]`, `2[h]30[min]`, `{2[h]}{30[min]}` = somme marquée « juxtaposée » de `2[h]` et `30[min]`.
  Calcul : 2 h 30 min (aujourd'hui : refus, refus, **1 h²**).
- Angles : `30[°] 15[′] 10[″]` (et la notation d'angle existante) = somme juxtaposée.
- Parseur LaTeX : `2~\unit{h}~30~\unit{min}` (et la forme sans `~`) = la même somme juxtaposée.
- Rendu : LaTeX `2~\unit{h}~30~\unit{min}` (sans `+`) ; maison `2[h] 30[min]` ; relecture → même arbre
  (aller-retour testé).
- `;hms` et `compositeDuration` produisent la somme juxtaposée.

Groupement ✅ (David, 2026-10-20, après la sonde clavier de l'atelier)

- Avec `+` et `−`, une durée composée est **un bloc** : `2[h] 30[min] - 2[h] 30[min]` = (2 h 30 min) − (2 h 30 min)
  = 0 ; `3[h] - 1[h] 30[min]` = 1 h 30 min ; `2[h] 30[min] + 2[h] 30[min]` = 5 h. L'atelier le fait déjà
  (`natural-quantities.ts` écrit `(2[h]+30[min])`), au clavier comme en texte.
- Collée à `*` ou `/`, **d'un côté comme de l'autre, avec ou sans espaces**, elle est **refusée** (ambiguë :
  `2*1 h 30 min` = 2 h 30 min ou 3 h ? `1 h 30 min * 2` = 2 h ou 3 h ?). Message : « Écris 2*(1 h 30 min) pour
  3 h, ou 2*1 h + 30 min pour 2 h 30 min. » Parseur maison et LaTeX : `2*1[h] 30[min]`, `1[h] 30[min]*2` →
  `JUXTAPOSED_QUANTITIES`. Entre parenthèses, lu : `2*(1[h] 30[min])` = 3 h.
- **L'atelier change aussi** (dans cette PR) : `2 * 1 h 30 min` et `1 h 30 min * 2` donnent 3 h aujourd'hui →
  refus avec le message ci-dessus ; `2*1 h 30 min` est refusé aujourd'hui par accident (« « 30 » inattendu ici »)
  → même message. Le test `grandeurs-ecriture.test.ts` (« une durée composée est UN nombre ») change d'attendu
  pour ces deux lignes ; `2*(1 h 30 min)` y entre (3 h).

- Trois termes : `1[h] 2[min] 3[s]` = somme juxtaposée de trois termes.
- Ordre non décroissant (`30[min] 2[h]`) ou unité répétée (`2[h] 3[h]`) : **lu** (le parseur lit, la forme
  est jugée ailleurs, comme A9).
- Durée et angle mélangés (`2[h] 30[°]`) → `JUXTAPOSED_QUANTITIES`.
- Signe en tête : `-2[h] 30[min]` = −(2 h 30 min), comme l'atelier aujourd'hui (mesuré) ; remplace ma première
  proposition (refus), écrite avant de savoir que le bloc passe avant `+` et `−`.
- Un nombre sans unité au bout (`2[h] 30`) → refus (comme aujourd'hui), code `JUXTAPOSED_QUANTITIES`.
- Marque perdue par une transformation : rendu « 2 h + 30 min », valeur juste (échec bénin accepté par David).
  Avant de coder : liste mesurée des chemins réels qui transforment une durée (`;hms`, simplification,
  équivalence, `toCustom`/`toLatex`) ; un test de RENDU par chemin ; une garde qui échoue si un nouveau
  chemin perd la marque.

Erreur ✅

- `2[m] 30[cm]`, `2[m]3[m]` → `JUXTAPOSED_QUANTITIES`.
- ✅ `{2[m]}{3[m]}` : **reste un produit** (6 m²) pour les autres grandeurs entre accolades (seules durées et
  angles changent). Grep des `}{` entre grandeurs dans les modèles au début de la PR, montré à David s'il
  trouve quelque chose.

---

## PR 6 — virgule décimale (décisions 2, 3) ✅

Décidé ✅ : `2,5` et `2,5[m]` → `DECIMAL_COMMA` (« Decimal comma: the decimal separator is '.' (write 2.5) ») ;
les 7 formules `~…~` d'exercices en prod passent au point (l'affichage remet la virgule).

Page virgule close 31/31 (toutes « Validé », 2026-10-20) : `f(1,5)` = deux arguments (V7) ;
`max((2,5),3)`, `[1,2]`, `(1,2)`, `{2,5}` → `DECIMAL_COMMA` ; `1, 2`, `,5`, `5,`, `x,2` →
`UNEXPECTED_COMMA` ; `;` partout → `SEMICOLON` (P1-P4, `x;y` n'est plus un produit) ; matrices et
fonctions connues inchangées. Codée le 2026-10-21 (journal).

---

## Questions ouvertes — tranchées le 2026-10-20

1. PR 1 : parseur LaTeX **inchangé** (Unicode toujours refusé).
2. PR 3 : `MISSING_OPERATOR` = `x2`, `x 2` **et `)2`**.
3. PR 5 : `-2[h] 30[min]` = −(2 h 30 min) ; `30[min] 2[h]` lu ; `{2[m]}{3[m]}` reste un produit.
4. Lignes 🟡 : toutes validées (passées en ✅ ; `2^-x y` refusé, prémisse corrigée après mesure).
5. Ordre des PR : 1 → 2 → 3 → 4 → 5, puis 6 après la page virgule.

> Écart relevé : la page à cocher des grandeurs porte encore des codes antérieurs au catalogue validé
> (`SEVERAL_UNITS` en F4, `EXPONENT_AFTER_UNIT` en G2, `INVALID_SUPERSCRIPT` en B7,
> `MISSING_NUMBER_BEFORE_UNIT` en K2). Le catalogue du journal fait foi ; la page sera corrigée.
