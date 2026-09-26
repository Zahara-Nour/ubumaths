# Relecture des questions TinyMath — progression

> Prompt de départ : `docs/wip/relecture-questions-tinymath-prompt.md`.

## Décisions de David

- 2026-09-26 — `testAnswerss` : **option a**, un mode « la règle suffit » sur les cases réponse,
  nommé `rulesSuffice`. La correction affichée à l'élève (« une réponse possible ») est dans la
  même PR.

- 2026-09-26 — Phase 0 validée :
  1. **Lot pilote : Relatifs** (36 questions, 5e-4e).
  2. **Import en brouillon après le feu vert de David sur chaque lot** (pas au fil de l'eau).
  3. **Marqueur « relu par Claude »** : `reviewed_by` = David, `conversion_notes` commence par
     « Relu par Claude le … ».
  4. **Scripts dangereux** (`migration:import`, `validate-phase1-questions`) : passés en
     **simulation par défaut**, écriture seulement avec `--publier`.

## Phase 0 — spécification

Présentée et validée le 2026-09-26 (cf. décisions ci-dessus).

## Chantier en cours : `fix/regle-suffit`

Constats mesurés (validateur réel, 2026-09-26) sur les 8 questions à `testAnswerss`
(209, 210, 216, 481, 482, 535, 611, 621) :

1. Les `validationRules` d'une case ne sont qu'une pré-condition : la réponse doit AUSSI égaler
   `expectedAnswer` → « trouve UN diviseur » n'accepte que le diviseur tiré.
2. Le transformateur écrit `dividend: "d"` au lieu de `"{{d}}"` → même la bonne réponse est
   refusée (« free variables: d »).
3. Sa regex `mod(...)` non ancrée perd les exclusions `&answer!=1 && &answer!=n`.
4. 210, 481, 535, 611 ne génèrent pas d'instance (autres défauts, à traiter en relecture).

Comportement livré :

- `rulesSuffice: true` (case réponse ou `blankDefaults`) → juste ⇔ toutes les règles passent ;
  `expectedAnswer` n'est plus qu'un exemple ; la réponse doit être un nombre simple. Sans règle, le mode est
  ignoré (jamais « tout est juste ») et le template est refusé à la validation.
- FlashCard : chaque case est colorée par le validateur réel en mode `rulesSuffice` ; le verso
  titre « Une réponse possible ».
- Transformateur : `{{a}}`, découpage des `&&`, `equation_root`, `rulesSuffice` posé sur les cases.

Écart à la spec validée : la forme n'est PAS comparée à `expectedAnswer` (le contrôle « exact »
exige l'identité : 3 contre 2 serait de mauvaise forme). En `rulesSuffice`, la réponse doit être un
nombre simple (comme une case à précision). Limite : une fraction (`1/2`) serait refusée — à
élargir si une question à plusieurs réponses fractionnaires apparaît.

Après relecture (`code-reviewer`) :

- `12/2` n'est évalué pour les règles qu'en mode `rulesSuffice` : les questions existantes gardent
  exactement leur verdict et leur message.
- Mode ignoré sur une case texte ou avec unité (règles numériques).
- En `rulesSuffice`, pas de message technique de règle à l'élève (retour ordinaire).
- Éditeur de templates : `shared.blankDefaults.rulesSuffice` conservé à la sauvegarde.

## À traiter plus tard (noté, pas corrigé)

- Plusieurs cases `rulesSuffice` aux mêmes règles acceptent deux fois la même valeur (« 3 et 3 »).
  Pas toujours une erreur (« un diviseur de 12 et un de 15 ») → décision pédagogique. Aucune des
  8 questions n'a plus d'une case par variante (mesuré).
- Appariement glouton en ordre indifférent : peut refuser une affectation valide si une case
  `rulesSuffice` côtoie une case exacte.
- Messages des règles en anglais (« 5 does not divide 12 ») encore montrés à l'élève dans le mode
  historique (règles = pré-condition). Défaut antérieur.
- `MigrationQuestionEditForm` n'affiche pas `rulesSuffice` au relecteur.
- #216 variante 3 : `$l{1;4;7}+2-mod(&1+&2;3)` mal convertie (≈ 1 tirage sur 2 échoue) — `it.fails`
  dans `transformer-test-answers.test.ts`. #210, #481, #535, #611 ne génèrent pas (tirages).
- #621 : pas de `solutionss`, égalités `testAnswers` ignorées → réponse attendue à reprendre.
