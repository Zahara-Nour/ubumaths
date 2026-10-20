# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-20, 2e session (langue interne tranchée)._

- **État** : phase 0, rien de codé. Corpus `docs/wip/lecture-grandeurs-corpus.md` (familles A-K + N). Pages à cocher : grandeurs https://claude.ai/artifact/HWJeifzvw6rL9ar72KuRHf (80 fiches, 13 répondues : A1-A9, B1-B4) ; espaces/virgule/`;` https://claude.ai/artifact/PEBUAFgGR8BFL5Aw4vvwib (37 fiches). Base `reponses/<id>` : relire avec `ArtifactData`.
- **Décidé par David** : (1) unité × tout le terme de nombres, signe unaire compris ; `1/2[m]`, `2*3[m]`, `10^3[m]` = (…) m ; le parseur LIT, la forme est jugée par le validateur ; `12 500` = 12500 ; `x 2` et `.5[m]` refusés. (2) **Le parseur maison reste la langue INTERNE au point** (option a) : le français (virgule décimale, `;`) est traduit à l'entrée par l'atelier et la lecture LaTeX. (3) **Le parseur maison REFUSE la virgule décimale** (sous-chantier « retrait de la virgule », ci-dessous).
- **Prochaine action** : relire les réponses de David sur les deux pages et donner un avis sur ses « je ne tranche pas ». Les fiches de la 2e page qui supposaient `;` dans le parseur maison (Q-A) relèvent désormais de l'atelier / LaTeX.
- **Ensuite** : sous-chantier « retrait de la virgule » (PR de code, phase 0 à écrire : que deviennent `(1,2)`, `[1,5]`, `3,14`) + réécriture au point des 7 formules `~…~` d'exercices en prod.
- **Pièges** : parseur maison / parseur LaTeX / atelier ; défauts constatés : `{2[h]}{30[min]}` = 1 h², `pi` lu p×i, `x;y` lu x×«;»×y, `1/2[m]` = 0,5 m⁻¹, `[1,5]` lu `(1.5)` (crochet perdu), `f(1,5)` = f(1.5) mais `max(1,5)` = 2 arguments, messages d'erreur en anglais, atelier `12 500` → « écris le nombre devant ». `π[m]` et `\pi[m]` sont désormais LUS par parseCustom (sonde du 2026-10-20).
- **Worktree / branche** : aucun. Sonde tsx (hors dépôt) : `npx tsx --tsconfig tsconfig.json <scratchpad>/sonde.ts`, imports par chemins absolus.

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
