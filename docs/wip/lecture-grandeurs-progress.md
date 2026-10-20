# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-20, après #1555._

- **État** : phase 0 **validée** (`docs/wip/lecture-grandeurs-phase0.md`, sauf ⏸), PR 1 (`×`, `·`, `⋅` lus `*`) mergée (#1555), pas en prod. Pages à cocher (font foi) : grandeurs https://claude.ai/artifact/HWJeifzvw6rL9ar72KuRHf (81 fiches, 20 répondues dont B7, B9, F1-F3 tranchées en conversation) ; virgule https://claude.ai/artifact/PEBUAFgGR8BFL5Aw4vvwib (31 fiches, 0 répondue). Base `reponses/<id>`.
- **Décidé par David** (détail : historique) : (1) unité × tout le terme, signe unaire compris ; le parseur LIT, la forme est jugée ailleurs (A9) ; `12 500` = 12500 ; `x 2`, `.5[m]` refusés. (2) Parseur maison = langue interne au point. (3) Il refuse la virgule décimale. (4) Refus = code + message anglais, l'atelier traduit (`mathAST/cli/web/french-errors.ts`). (5) **Catalogue de 14 codes validé** (historique, 3e session). (6) **Q9 (a)** : durées et angles juxtaposés LUS comme une somme marquée « juxtaposée » (4 implémentations, fonction partagée ; `;hms`, `compositeDuration`) ; autres grandeurs refusées `JUXTAPOSED_QUANTITIES` ; risque de perte de la marque géré : chemins réels mesurés → test de RENDU par chemin → garde. (7) `×`, `·`, `⋅` lus `*` (aussi `·`/`⋅` entre crochets) ; ⚠️ `2.5` ≠ `2·5`. (8) B7 : `^` + signe + UN nombre/lettre ; `10^-3+4` = `10^{-3}+4` ; refus `e^-x^2` (`STACKED_EXPONENTS`), `2^-sin(x)`, `2^-(x+1)` (`NEGATIVE_EXPONENT_BEFORE_GROUP`). (9) B9 : empilé = 2^(3^2) ; REFUS dans les deux parseurs (`STACKED_EXPONENTS`). (10) Durée composée = un bloc avec `+`/`−` ; collée à `*` ou `/` (des deux côtés, espaces ou non) → refus, atelier compris. (11) Phase 0 validée : LaTeX ne lit pas `×`/`·` Unicode ; `MISSING_OPERATOR` = `x2`, `x 2`, `)2` ; `10^+3` lu, `2^-x y` refusé ; `{2[m]}{3[m]}` reste un produit.
- **En attente de David** : fiches restantes de la page grandeurs (v8 : codes alignés sur le catalogue, 18 fiches « tranché en conversation ») et les 31 fiches virgule.
- **Prochaine action** : PR 2 (exposants : `^-` + UN nombre/lettre, `10^+3`, `2^-x y` refusé ; empilés refusés dans les deux parseurs) dans un worktree neuf `ubumaths-wt-lecture-grandeurs` ; PR 6 après la page virgule.
- **Pièges** : distinguer LECTURE / CALCUL (`computeQuantity`) / MESSAGE (atelier) ; chaque parseur = Pratt (défaut) + RD ; `{2[h]}{30[min]}` = 1 h² aujourd'hui ; MathLive : `^` sur un exposant à un chiffre le REMPLACE.
- **Worktree / branche** : aucun (PR 1 nettoyée). Sondes : `docs/wip/lecture-grandeurs-sondes.md`.

## Historique

### 2026-10-20 — PR 1 codée : `×`, `·`, `⋅` lus `*`

- Tokenizer maison : `×`, `·`, `⋅` → jeton STAR qui garde le symbole tapé ; entre crochets d'unité, `·`/`⋅` → `.`,
  `×` → `*` (`3[m×s]` gardé par David). `2×` (lu « 2 fois la lettre × ») est désormais refusé comme `2*`.
- Revue Opus : le portier de l'atelier (`cli/core/input-detector.ts`) ne reconnaissait que `·` dans une unité →
  `⋅` et `×` ajoutés. Hors périmètre, noté : dans `pipeline.parse`, `2×3` (Unicode, sans crochet) part au LaTeX
  et y est refusé ; MathLive n'écrit jamais l'Unicode.
- Page grandeurs v8 : codes alignés sur le catalogue (F4, E12 → `JUXTAPOSED_QUANTITIES` ; G2 →
  `UNIT_EXPONENT_OUTSIDE` ; B7 → `NEGATIVE_EXPONENT_BEFORE_GROUP` / `STACKED_EXPONENTS` ; G11 → `UNKNOWN_UNIT` ;
  K2 : code à choisir si Q15 = refus) ; 18 fiches marquées « tranché en conversation » (champ `tranche`, hors
  « Ce qui reste », aucune réponse écrite à la place de David).

### 2026-10-20 — phase 0 validée (5e session)

- David valide les questions ouvertes 1 à 5 et toutes les lignes 🟡 ; ajoute `)2` à `MISSING_OPERATOR`.
- Mesures (parseur maison) qui corrigent la phase 0 : `2×` est accepté aujourd'hui (lettre ×) ; `10^+3` refusé
  (« Expected exponent ») ; `2^x y` refusé (« Multiple letters in exponent ») → `2^-x y` refusé aussi (et non
  `2^{-x}·y`) ; `(1+x)2`, `sqrt(2)3` refusés `UNEXPECTED_TOKEN` ; `(2)(3)` = produit ; `1/2/3[m]` = `(1/2)/(3[m])`.

### 2026-10-20 — phase 0 rédigée, sonde clavier des durées

- `docs/wip/lecture-grandeurs-phase0.md` : comportements par PR (6 PR), questions ouvertes. Recos données en
  conversation (LaTeX lit `×`/`·` Unicode ; `MISSING_OPERATOR` = nombre après un facteur ; `30[min] 2[h]` lu ;
  `{2[m]}{3[m]}` reste un produit ; lignes 🟡 telles quelles ; ordre 1→5 puis 6) : **pas encore validées**.
- Sonde au vrai clavier (Calcul et carte, tableau dans le fichier des sondes) : `2 h 30 min ± 2 h 30 min`,
  `3 h - 1 h 30 min`, `-2 h 30 min` marchent déjà ; `2*1 h 30 min` refusé par accident, `2 * 1 h 30 min` = 3 h.
- **David : `2*1 h 30 min` est ambigu ; validé : refus d'une durée composée collée à `*` ou `/`, des deux côtés,
  avec ou sans espaces, dans les parseurs ET l'atelier** (le test du lot C change d'attendu).

### 2026-10-20 — ouverture

- Né de la PR 2 bis de `correction-cases-unite` : `1/2[m]` est lu 1/(2[m]) = 0,5 m⁻¹ par les deux parseurs,
  alors que `\frac{1}{2}\unit{m}` vaut 0,5 m et que l'atelier lit `1/2 m` = (1/2) m.
- Brochure SI téléchargée et relue (§3, §5.2, §5.4.1-5.4.7).
- Règle proposée : l'unité multiplie tout le terme de nombres qui la précède (règle de l'atelier,
  décisions des 2026-10-11 et 2026-10-18).

### 2026-10-20 — langue interne du parseur maison : inventaire et décisions

Inventaire de qui écrit en syntaxe maison (prod lue en lecture seule, dépôt par grep) :

| Qui                                         | Combien                                                                | Écriture                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Modèles en prod, `{{eval:…}}`               | 884 / 1 005 modèles (538 publiés), 15 182 calculs                      | 266 décimaux à point, 911 virgules d'arguments, 3 172 `;` de modificateur                                  |
| Expressions de variables en prod            | 8 317 (4 590 calculs)                                                  | 81 décimaux à point (listes `1.5\|2`), 168 virgules d'arguments, 1 119 `;`                                 |
| Blocs ` ```courbe ` / ` ```figure ` en prod | 178 / 36                                                               | en-têtes déjà séparés par `;`                                                                              |
| `scripts/questions/`                        | 9 674 `{{eval:` dans 401 fichiers                                      | idem prod                                                                                                  |
| `tests/fixtures/`                           | 398 dans 29 fichiers                                                   | idem                                                                                                       |
| Valeurs réinjectées                         | chaque tirage                                                          | `braceWrap` → `evalResultToCustom` (toCustom → parseCustom)                                                |
| `toCustom` hors tests                       | ~330 appels, ~70 fichiers                                              | relu par parseCustom : `evalResultToCustom`, `clean-coefficients`, importeur LaTeX → maison, DSL géométrie |
| Atelier                                     | 32 appels `decimal-comma`                                              | déjà en (a) : `decimalCommaInput` à l'entrée, virgule à l'affichage                                        |
| Tests                                       | 487 lignes `parseCustom(` (90 fichiers), 342 `toCustom(` (51 fichiers) | —                                                                                                          |

- Option (b) (parseur maison en français) écartée : ~23 000 expressions de prod à migrer, 68 virgules
  séparatrices entre chiffres (`max(-9,1-a*b)`, `binom(24,5-k)`) qui changeraient de sens en silence,
  et `;` déjà pris par les modificateurs des modèles et les en-têtes de blocs.
- **David tranche (a)** : le parseur maison garde le point décimal.
- Virgule décimale tolérée par parseCustom : présente depuis le premier commit (`c698f9ce6`, 2025-12-02),
  sans décision écrite ; a coûté le bug `mod(16,4)` = mod(16.4) (`22930800f`, 2026-10-02, 153 tirages
  faux sur 1 050) et la pile de parenthèses du tokenizer. Usagers mesurés en prod : aucun calcul,
  condition, variable, bloc ni DSL ; **7 formules `~…~` d'exercices** (`0,02`, `0,57`, `f''(0,2)`,
  `cos(x)=0,8`, `sin(x)=0,5`, `0,89!=1`, `cos^2(x)+sin^2(x)=0,8^{2}+…`). `parse-student-domain` et
  l'atelier traduisent eux-mêmes avant le parseur.
- **David tranche : retirer la virgule décimale du parseur maison.** Les 7 formules seront réécrites au
  point (l'affichage remet la virgule via `toLocaleDecimal`). À mesurer dans la PR : chemins de l'atelier
  ou tests qui ne passeraient que grâce à la tolérance ; lecture de `(1,2)` et `[1,5]` sans elle.

### 2026-10-20 — pages à cocher mises à jour

- Réponses relues : page grandeurs, 13 « Validé », aucun « Non validé » ni « je ne tranche pas » ;
  page virgule, aucune réponse.
- Conflit avec la décision (3) : A3 (`2,5[m]` = 2,5 m, validé le 2026-10-20 à 06:05) devient un refus.
  David confirme. A3 réécrite et sa réponse effacée (remise à relire) ; B4, B5 réécrits au point.
- Correction d'une sonde : `π[m]` est analysé, mais π y est une variable et le calcul refuse ; H3 disait
  vrai. Ajouté sur H3/H4 : `\pi[m]` et `2\pi[m]` sont déjà calculés.
- Page virgule réécrite (version 2, 31 fiches) : point décimal, virgule toujours séparatrice (fonctions,
  matrices), `;` refusé ; Q-A et Q-M disparaissent. Sondes : `f(1,5)` = f(1.5) aujourd'hui (devient deux
  arguments), `max((2,5),3)` = max(2.5 ; 3) (devient refus), `[1,2]` = `(1.2)` (devient refus),
  `[[1,5, 2]]` = trois éléments (inchangé).

### 2026-10-20 — page grandeurs refaite : LECTURE d'abord, calcul à part

- Reproche de David : la page proposait des VALEURS (« 2500 m ») et présentait des refus du CALCUL comme
  des lectures (`2+3[m]`, `π[m]`, `10^(3[m])` sont lus ; c'est `computeQuantity` qui refuse).
- Page refaite (version 4) : « Lu aujourd'hui » = arbre parenthésé mesuré par sonde (`arbre.ts`, sur les 80
  écritures) ; « Lecture proposée » = arbre voulu ; puis, à la demande de David, « Calcul aujourd'hui »
  (mesuré : `computeQuantity`, mode exact) et « Calcul attendu » (écrit à la main, 37 fiches où il change).
- Lectures révélées : `π[m]` = π LETTRE (variable) ; `pi[m]` = p × (i[m]) avec i imaginaire ; `[m]` = la
  lettre m ; `2*1/2` se lit déjà 2 × (1/2) sans unité ; J4 `2*20[°C]` relève de la règle du terme
  ((2 × 20)[°C]), le refus reste au calcul ; K1 devient une question (lecture inchangée, ma reco, ou refus
  à la lecture).
- À faire : la page virgule (v2) écrit encore quelques valeurs (« max(2 ; 5) = 5 ») : à passer en arbres.

### 2026-10-20 — réponses A3, B5, B6, B7

- A3 (refus de `2,5[m]`), B5 (× lu comme *), B6 : validés.
- B7 « je ne tranche pas » : David craint `10^-3+4` (10^(−3)+4 ou 10^(−3+4) ?) et propose d'accepter `^-`
  seulement quand rien ne suit. Sondes : `10^3+4` = (10^3) + 4 ; `10^{-3}+4` = (10^(−3)) + 4 ;
  `10^-3` et `2^-x` refusés. L'atelier réécrit déjà `^-` + un nombre ou UNE lettre (pas suivi d'un autre
  `^`) en `^{-…}` (`NEGATIVE_EXPONENT`, `atelier/parse.ts`, 2026-10-13). Ma reco : la même règle dans le
  parseur maison (l'exposant sans accolades est UN élément, le signe y entre) ; refus de `e^-x^2` et de
  `2^-sin(x)` / `2^-(…)`. La condition « rien derrière » refuserait `10^-3[m]` et `10^-3*5`. Fiche B7
  précisée ; la page disait à tort que l'atelier « produit » `10^-3` : il l'ACCEPTE et le traduit.
- Vu en passant (hors périmètre, à signaler) : `2^3^2` est lu (2^3)^2, contre la convention 2^(3^2).

### 2026-10-20 — B9 exposants empilés, `10^-3*4`

- Fiche B9 ajoutée (page + corpus, Q17) : `2^3^2` = (2^3)^2 = 64, `e^x^2` = (e^x)², `2^3^2[m]` = ((2^3)^2)[m].
  0 exposant empilé sans accolades en prod (modèles + exercices) ; `toCustom` écrit `2^{3^2}` / `(2^3)^2`.
  Reco : refus. Le corpus .md porte désormais un avertissement : la page à cocher fait foi.
- `10^-3*4` aujourd'hui (parseur maison) : refus « Negative exponent requires braces » ; `10^{-3}*4` =
  (10^(−3)) × 4. Avec la reco B7 : (10^(−3)) × 4.

### 2026-10-20 — refus : parseur ou atelier ?

- Question de David : le message « Deux exposants à la suite… » est-il dans le parseur ou l'atelier ? Les
  deux : le parseur décide du refus (code `ParseErrorCode` + message anglais), l'atelier traduit
  (`french-errors.ts`, 2026-10-12, 54 traductions ; parmi les messages du corpus, seul « Invalid unit »
  est traduit). **David garde ce découpage.**
- Code d'erreur = un nom parmi 17 (`UNEXPECTED_TOKEN`, `INVALID_UNIT`, `INVALID_SUPERSCRIPT`…), plus le
  message, la position et le contexte. Mesuré : 30 des 36 refus du corpus sont `UNEXPECTED_TOKEN`, et
  `10[m]^3`, `kg/m.s`, `m s` sont classés `INVALID_UNIT`. Proposé sur les fiches : des codes précis
  (nouveaux) pour que l'atelier traduise par code, pas par le texte anglais.
- Fiches de refus réécrites (lignes « Refus du parseur » / « Message de l'atelier (plus tard) ») ; page
  virgule passée en arbres. Découvert : `f(x;y)` et `max(x;y)` sont LUS, « ; » comme une lettre (P3).

### 2026-10-20 — codes d'erreur précis

- **David : « je veux des codes précis ».** Le parseur rend un code par cause de refus ; l'atelier traduit
  par code, plus par le texte anglais.
- Mesuré en plus : `2×3` est refusé (`UNEXPECTED_TOKEN`), le parseur maison ne connaît que `*` ; `(1+2` rend
  `UNEXPECTED_TOKEN` alors que `MISSING_DELIMITER` existe. Catalogue proposé à David (en attente).

### 2026-10-20 — Q9 : durées juxtaposées lues comme une somme

- Mesuré : l'atelier refuse `2~\unit{h}~30~\unit{min}` (« Nombre « 30 » écrit après un facteur… ») ; il
  n'affiche « 2 h 30 min » qu'en SORTIE (`compositeDuration`). Les champs réponse acceptent déjà
  « 2 h 15 min » via `readCompositeDuration` (`questions/units/composite-duration.ts`, lot 3), hors parseur,
  quand l'attendu est une durée. Pas de nœud durée dans mathAST ; `HMSValue` (`questions/units/types.ts`)
  n'est utilisé nulle part.
- Bug 1 h² : `{2[h]}{30[min]}` (écrit par `;hms`) est un produit implicite ; `computeQuantity` rend 1 h², l'atelier
  aussi avec `\left(2~\unit{h}\right)\left(30~\unit{min}\right)`. Les modèles sont protégés par la garde
  « Produit de durées » (`evaluate-with-modifiers.ts:494`).
- David : l'atelier et MathLive doivent accepter l'écriture naturelle « 2h 30 min ». Options (a) parseur lit
  une somme juxtaposée, (b) l'atelier réutilise `readCompositeDuration`, (c) nœud durée. **David tranche (a)**,
  « il faudra gérer le vrai risque » : la marque perdue par une transformation (échec bénin : « 2 h + 30 min »,
  valeur juste). Fiches F1-F3 notées sur la page.
- Coût : chaque parseur a deux implémentations (Pratt par défaut, RD) ; modèle à suivre :
  `parser/number-after-factor.ts`. Touchés aussi : `juxtaposesQuantities` (latex-generator ×2,
  `build-structure.ts`), le générateur maison, `;hms`, `compositeDuration`.
- Q9 complétée par David : angles comme les durées ; autres grandeurs juxtaposées refusées
  (`JUXTAPOSED_QUANTITIES`) ; gestion du risque validée (mesure des chemins, tests de rendu, garde).
- Erreur de ma part : `2×3` refusé n'était pas une découverte, c'est la fiche B5 (Q7, « × lu comme * »),
  validée par David. Mesuré : le parseur maison lit `*` (style `cross`) et le produit implicite (`2x`,
  `2(x+1)`), refuse `×`, `·`, `⋅`, `\times`, `\cdot` ; le parseur LaTeX lit `\times`, `\cdot`, `*`, l'implicite,
  et refuse `×`/`·` Unicode (« Nombre « 3 » écrit après un facteur »).
- David : `·` et `⋅` lus comme `*` ; acceptés aussi dans les unités entre crochets. Mesuré : `3[m·s^-1]`
  refusé par le tokenizer maison (« Expected ']' after unit ») alors que `units/parser.ts:81` accepte `·`.
- B7 validée par David (fiche, règle de l'atelier depuis le 2026-10-13) : `10^-3+4` = 10^{-3}+4. Réponse
  notée sur la page (choix « ok »).
- B9 : David — empilé = 2^(3^2) ; refus dans le parseur maison ; mesurer MathLive. Mesure au vrai clavier
  (MathLive 0.111, sonde `mathlive-clavier` dans le fichier des sondes) : `2^3^2` → `2^2` (!), `2^3→^2` →
  `2^2`, `e^x^2` → `e^{x^2}`, `e^-x^2` → `e^{-x^2}`, `10^-3+4` → `10^{-3+4}`, `10^-3→+4` → `10^{-3}+4`,
  `2^^3` → `2^{^3}`. MathLive met TOUJOURS les accolades : le parseur LaTeX ne reçoit jamais `2^3^2` d'un élève.
  Vu en passant : taper `^` sur un exposant à un chiffre REMPLACE l'exposant (le 3 disparaît) ; `10^-3+4`
  reste dans l'exposant tant que l'élève ne sort pas avec →.

### 2026-10-20 — catalogue des codes validé

- David valide les trois refus de B7 et le catalogue. **14 codes** : `DECIMAL_COMMA`, `LEADING_DECIMAL_POINT`,
  `STACKED_EXPONENTS`, `JUXTAPOSED_QUANTITIES`, `MISSING_OPERATOR`, `SEMICOLON`, `UNEXPECTED_COMMA`,
  `UNIT_EXPONENT_OUTSIDE`, `AMBIGUOUS_UNIT`, `SPACE_IN_UNIT`, `UNKNOWN_UNIT`, `EMPTY_UNIT`, `MISSING_DELIMITER`
  (existant, enfin utilisé), `NEGATIVE_EXPONENT_BEFORE_GROUP`. `INVALID_UNIT` disparaît ; `UNEXPECTED_TOKEN`
  reste en dernier recours. `SEMICOLON` et `UNEXPECTED_COMMA` suivront les réponses de la page virgule (P3 :
  `f(x;y)`).
- B9 côté LaTeX : David suit la reco, `2^3^2` refusé aussi par le parseur LaTeX (MathLive ne le produit jamais).
