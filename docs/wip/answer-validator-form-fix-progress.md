# Fix régression checkForm — answer-validator (2026-06-12)

> Issu du chantier « tests stale » (`docs/wip/stale-tests-sweep.md`). Cluster answer-validator :
> 18 régressions confirmées + 1 test à réaligner. Plan **validé par David** test par test.

## Racine

`checkForm` (`cosmetic-transforms.ts:598`) compare la **réponse normalisée à l'attendu normalisé**
(ligne 672) et renvoie `bad_form` si différents. Il **n'évalue pas** l'arithmétique, et **plante**
sur `\unit{}` (→ bad_form). Les commits `f2f9287a2` (always run constraints), `9ff3c2e0a` +
`dece435e4` (form mismatch inconditionnel) l'ont généralisé à TOUS les blancs, y compris ceux où
la réponse est **délibérément** une autre expression que l'attendu (précision/unité/texte/requiredForm).

`applyConstraints` (`answer-validator.ts:78`) produit 2 choses : (a) violations cosmétiques via le
pipeline AST de checkForm (brackets/spaces/fractions… — à GARDER), (b) le form-mismatch ligne 118
(à corriger). `validateSingleBlank` étape 4 (`answer-validator.ts:644`) l'appelle sur tout blanc.

## Principe directeur (validé)

Chaque blanc a une **forme exigée** : explicite (`requiredForm`) ou implicite par défaut selon le mode.
Le check vérifie « la réponse est-elle dans la forme exigée ? », PAS « == attendu littéral ».
Par-dessus, on garde **toujours** les violations cosmétiques (brackets/spaces/fractions).

## Verdicts des 19 (validés un par un)

| #     | Tests                               | Verdict            | Check de forme cible                                                                                                  |
| ----- | ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1     | A1 exact                            | **réaligner test** | `checkForm` vs attendu (inchangé) ; `2+3` pour `5` = bad_form                                                         |
| 2–3   | A2 précision                        | régression         | « réponse = **nombre simple signé** »                                                                                 |
| 4–7   | A3/A4/A5 unité                      | régression         | « **partie num.** = nombre simple » ; unité (conv.+required) = valeur (étape 2) ; **pas** de `\unit{}` dans checkForm |
| 8–10  | B6/B7/B8 texte                      | régression         | **aucun** check de forme                                                                                              |
| 11–18 | C13/E20 + Required Form Integration | régression         | `checkRequiredForm` (étape 3) ; **pas** de compare-à-l'attendu ; **garder** violations cosmétiques                    |
| 19    | brackets                            | régression         | plomber `allowBracketsInFirstNegativeTerm` dans `stripUnnecessaryBrackets`                                            |

## Décisions fines

- **Précision** = un **nombre simple** (éventuellement négatif). Sci-notation / fraction → `bad_form`
  (doivent passer par `requiredForm`). Voir TODO.
- **Unité** : la partie numérique = nombre simple ; conversion + unité requise gérées étape 2
  (`validateQuantityAnswer`). checkForm ne sait pas parser `\unit{}` → ne pas l'y faire passer.
- **`(2)×3` sur requiredForm** : doit rester détecté (violation brackets) → on garde les violations
  cosmétiques même quand le form-mismatch est désactivé.

## Plan code

- **A.** Exposer depuis `cosmetic-transforms` un moyen d'obtenir **les violations cosmétiques seules**
  (pipeline AST) **sans** la comparaison finale réponse-vs-attendu.
- **B.** `validateSingleBlank` étape 4 — aiguillage par mode :
  - `text` → pas de check de forme
  - `requiredForm` → violations cosmétiques seules (forme = étape 3)
  - `precision` → « nombre simple » + violations cosmétiques
  - `unit` → « partie num. = nombre simple » + violations cosmétiques (pas de `\unit{}` dans checkForm)
  - exact → `checkForm` vs attendu (inchangé)
- **C.** Helper **« est-ce un nombre simple ? »** (racine AST = `number` ou `opposite(number)`),
  réutilisé précision + unité.
- **D.** Plomber `allowBracketsInFirstNegativeTerm` dans `stripUnnecessaryBrackets`.
- **E.** Réaligner le **test #1** (A1) en `bad_form`/incorrect.

## Acceptance / vérif

- `pnpm test:server src/lib/utils/answer-validator.test.ts --run` → 56/56
- `pnpm test:server src/lib/utils/answer-validator-blanks.test.ts --run` → 49/49
- **0 régression** dans `cosmetic-transforms.test.ts` (mathAST, ~suite large) et les autres suites
  answer-validator. Lancer ces suites après les changements mathAST.
- 18 tests verts **par le code** (sans toucher aux entrées) ; #1 réaligné.
- `check:incremental` baseline (9 err / 46 warn) ; eslint clean sur fichiers modifiés.

## TODO hors périmètre

- `requiredForm: 'scientific'` / `'engineering'` (feature future). La valeur sci-notation est déjà
  parsée (`units/parser.ts:56` + tokenizers mathAST) mais aucune forme ne l'**exige**.

## État

- [x] A — cosmetic-violations-only (`cosmeticViolations` exporté + `buildASTPipeline(options)`)
- [x] B — aiguillage validateSingleBlank (text / requiredForm / unit / precision / exact)
- [x] C — helper nombre simple (`isSimpleNumberLatex`)
- [x] D — allowBracketsInFirstNegativeTerm (plombé via `CheckFormOptions.allowFirstNegative`)
- [x] E — réaligner test #1 (A1 → bad_form)
- [x] Vérif suites : answer-validator 56/56, blanks 49/49, cosmetic-transforms 99/99,
      transforms 114/114 ; eslint clean
