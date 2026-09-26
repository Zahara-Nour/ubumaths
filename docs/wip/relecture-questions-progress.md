# Relecture des questions TinyMath — progression

> Prompt de départ : `docs/wip/relecture-questions-tinymath-prompt.md`.

## Décisions de David

- 2026-09-26 — `testAnswerss` : **option a**, un mode « la règle suffit » sur les cases réponse,
  nommé `rulesSuffice`. La correction affichée à l'élève (« une réponse possible ») est dans la
  même PR.

## Phase 0 — spécification

Présentée le 2026-09-26. Points encore ouverts : lot pilote, rythme d'import, marqueur
« relu par Claude », sort des scripts dangereux.

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
  `expectedAnswer` n'est plus qu'un exemple (et un modèle de forme). Sans règle, le mode est
  ignoré (jamais « tout est juste ») et le template est refusé à la validation.
- FlashCard : chaque case est colorée par le validateur réel en mode `rulesSuffice` ; le verso
  titre « Une réponse possible ».
- Transformateur : `{{a}}`, découpage des `&&`, `equation_root`, `rulesSuffice` posé sur les cases.
