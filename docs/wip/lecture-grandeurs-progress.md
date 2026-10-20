# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-20, 3e session._

- **État** : phase 0, rien de codé. Pages à cocher (font foi, le corpus .md garde la v1) : grandeurs https://claude.ai/artifact/HWJeifzvw6rL9ar72KuRHf (81 fiches : arbre lu / arbre proposé / refus du parseur / message de l'atelier / calcul mesuré / calcul attendu ; 16 répondues, B7 « je ne tranche pas » avec mon avis sur la fiche) ; virgule https://claude.ai/artifact/PEBUAFgGR8BFL5Aw4vvwib (v3, 31 fiches, 0 répondue). Base `reponses/<id>`.
- **Décidé par David** : (1) unité × tout le terme de nombres, signe unaire compris ; le parseur LIT, la forme est jugée ailleurs ; `12 500` = 12500 ; `x 2`, `.5[m]` refusés. (2) Parseur maison = langue INTERNE au point (option a). (3) Il REFUSE la virgule décimale (`2,5[m]` refusé, A3 validée). (4) **Découpage des refus** : le parseur rend un code + un message ANGLAIS ; l'atelier traduit en français à l'affichage (`mathAST/cli/web/french-errors.ts`) — chantier de l'atelier. (5) **Codes d'erreur PRÉCIS** (nouveaux codes au lieu de `UNEXPECTED_TOKEN`), l'atelier traduit par code. (6) **Q9 = option (a)** : deux durées côte à côte (`2[h] 30[min]`, `2 h 30 min` en MathLive) sont LUES comme une SOMME marquée « juxtaposée », par les 4 implémentations (LaTeX et maison, Pratt et RD) via une fonction partagée ; `;hms` et `compositeDuration` la produisent ; fin du 1 h². **Exigence : la marque ne doit pas se perdre** dans les transformations. Angles ° ′ ″ comme les durées ; `2[m] 30[cm]` (autres grandeurs) refusé, `JUXTAPOSED_QUANTITIES`. Gestion du risque validée : mesurer les chemins réels → un test de RENDU par chemin → garde → corriger la perte sur ces chemins. (7) `×`, `·` (U+00B7) et `⋅` (U+22C5) lus comme `*` dans le parseur maison (B5/E3, Q7) ; `·` et `⋅` acceptés aussi entre crochets comme `.` (`3[m·s^-1]`). ⚠️ `2.5` = 2,5 mais `2·5` = 10. (8) **B7 validée** : après `^`, un signe + UN nombre ou UNE lettre = l'exposant ; `10^-3+4` = `10^{-3}+4`, `10^-3[m]` = (10^(−3)) m.
- **Prochaine action** : faire valider le catalogue des codes (historique, 3e session ; `UNKNOWN_OPERATOR` retiré) ; B7 : confirmer les refus `e^-x^2`, `2^-sin(x)`, `2^-(x+1)` ; B9 sans réponse.
- **Ensuite** : PR « retrait de la virgule » (+ 7 formules `~…~` d'exercices en prod au point).
- **Pièges** : distinguer LECTURE (arbre) / CALCUL (`computeQuantity`) / MESSAGE (atelier) ; défauts : `{2[h]}{30[min]}` = produit, `π[m]` = π lettre, `pi[m]` = p × (i[m]), `x;y` et `f(x;y)` lus avec « ; » comme lettre, `[1,5]` lu `(1.5)`, `2^3^2` = (2^3)^2.
- **Worktree / branche** : aucun. Sondes tsx : code dans `docs/wip/lecture-grandeurs-sondes.md` (arbre parenthésé, calcul, codes d'erreur).

## Historique

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
