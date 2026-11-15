---
status: clos
---

# Chantier `type-erreur` — deviner la nature d'une erreur

Ouvert le 2026-11-15, choisi par David après la clôture de `durees-ajustees`. Suite décidée le 2026-11-14
dans [`erreurs-frequentes`](./erreurs-frequentes-progress.md) § Suites : « deviner la nature
d'une erreur (signe, oubli du carré…) par le moteur mathAST ».

## Reprendre ici

_Mis à jour le 2026-11-15 : chantier clos._

- **État** : clos (v1 : #2682 moteur, #2686 prof, #2695 élève) ; durable dans `docs/systeme/questions.md` (résultat attendu, type d'erreur) et `evaluations.md` (types d'erreur) · **Prochaine action** : aucune ; « plus tard, si utile » (expressions par mathAST, réponses pièges de l'auteur) noté en futur chantier · **Pièges** : cases `rulesSuffice` et `orderIndependent` jamais typées ; traces de séries sans remarques ; réponse > 64 caractères non lue ; la copie vue par le prof montre la phrase tutoyée (choix assumé) ; relecture des 7 phrases et vérification #2695 dans `docs/wip/verifications-manuelles.md` · **Worktree / branche** : aucun

## Ce qui existe (vérifié le 2026-11-15)

- **Aucun moteur de diagnostic.** Une réponse fausse est seulement fausse, sauf dans deux cas codés à la main :
  - `FORGOTTEN_PERCENT_SIGN` (« N'oublie pas le symbole %. ») : réponse égale à la valeur attendue sans le
    symbole (`src/lib/utils/answer-validator.ts`) ;
  - unités : « Cette unité ne mesure pas la bonne grandeur. » (`src/lib/questions/units/validator.ts`).
    Ces deux messages passent par le champ `feedback` du résultat de validation, montré à la correction.
    La note ne change pas.
- **Réponses gardées** : contrôles → `test_answers` (énoncé tiré entier + réponse case par case) ; séries
  Saisie / Contrôle blanc / Course → `skill_attempts.answer_parts` + `part_verdicts` + `seed` (ADR 0038),
  énoncé rejoué par `generateInstance`. Flash-cards : rien de tapé.
- **Panneaux d'erreurs côté prof (P4)** : `QuestionErrorsPanel.svelte`, alimenté par
  `computeQuestionErrors` (bilan d'un contrôle, widget « Top à remédier »). Ces panneaux regroupent
  seulement les réponses identiques **à énoncé identique**. Deux élèves qui ratent avec des nombres
  différents ne se regroupent pas : c'est le problème que le type d'erreur résout.

## Phase 0 — comportements proposés (à valider)

**Idée** : comparer la réponse fausse à la réponse attendue du **même tirage**, et reconnaître une relation
connue entre les deux. Le type d'erreur ne dépend pas des nombres tirés, donc il se compte d'un élève à
l'autre.

- **Nominal, prof** (panneaux P4) : chaque réponse fausse porte son type quand il est reconnu (« signe »),
  et la question montre un compte par type : « Erreur de signe : 4 · Puissance de 10 : 2 · Non reconnue : 6 ».
- **Nominal, élève** (à la correction, comme « N'oublie pas le symbole % ») : une phrase sous la réponse
  fausse, prudente : « Ta réponse est l'opposé du résultat : vérifie le signe. » La note ne change pas.
- **Types de la v1** (réponse numérique, comparaison exacte, pour tout modèle sans rien écrire) :
  1. **signe** : réponse = −attendu ;
  2. **puissance de 10** : réponse = attendu × 10ᵏ (k ≠ 0, |k| ≤ 3) — virgule mal placée, conversion ;
  3. **inverse** : réponse = 1 / attendu ;
  4. **double / moitié** : réponse = 2 × attendu ou attendu / 2 ;
  5. **carré oublié / en trop** : réponse² = attendu ou réponse = attendu².
- **Limites** :
  - attendu = 0, 1 ou −1, ou deux relations vraies en même temps (attendu 4, réponse 2 : moitié et carré oublié) → **rien**
    (« non reconnue ») ; on ne devine jamais entre deux ;
  - réponse non numérique (expression, intervalle, QCM, ranger, figure) → rien en v1 ;
  - erreur déjà nommée par un message existant (%, unité, arrondi, forme) → ce message, pas de type en plus ;
  - question à plusieurs cases → type par case.
- **Erreur** : diagnostic en échec (parse, évaluation) → la réponse reste « fausse », sans type ; rien ne casse.
- **Accès** : personne ne lit rien de plus. Le prof voit déjà ces réponses (P4), l'élève voit déjà sa
  correction. Le type est **calculé à la lecture**, pas stocké : **aucune migration**.

**Découpage proposé**

- **PR 1** — moteur pur `guessErrorKind(attendu, réponse)` + tests (cas nominaux, ambiguïtés, 0/±1).
- **PR 2** — prof : type sur chaque réponse fausse + compte par type dans `QuestionErrorsPanel`.
- **PR 3** — élève : la phrase à la correction (Saisie, Contrôle blanc, copie de contrôle corrigée).
- **Plus tard, si utile** : expressions (`(a+b)² → a²+b²`, développement ou dérivée fausse, par mathAST) ;
  « réponses pièges » écrites par l'auteur du modèle (`{a}+{b}` → « tu as additionné au lieu de multiplier »).

## Questions à David (phase 0, posées le 2026-11-15)

- **Q1 — Pour qui** : prof (PR 2) **et** élève (PR 3), prof d'abord (reco) ? Prof seulement ? Élève seulement ?
- **Q2 — Périmètre v1** : les 5 relations numériques ci-dessus, valables pour tout modèle (reco) ? Ou viser
  tout de suite les expressions, ou les réponses pièges écrites par l'auteur ?
- **Q3 — Ton côté élève** : phrase qui dit la relation et invite à vérifier (« Ta réponse est l'opposé du
  résultat : vérifie le signe. ») (reco), ou seulement une piste (« Vérifie le signe. ») ?
- **Q4 — Ambiguïté** : deux relations vraies → rien du tout (reco), ou les deux nommées ?
- **Q5 — Calculé ou stocké** : calculé à la lecture, sans migration (reco) ? Le stocker n'apporterait rien
  tant que le moteur change.

## Décisions de David (2026-11-15)

- **Q1** : prof puis élève (PR 2, puis PR 3). **Q2** : les 5 relations numériques. **Q3** : relation +
  invitation (« Ta réponse est l'opposé du résultat : vérifie le signe. »). **Q4** : deux relations vraies,
  ou attendu 0 / ±1 → rien. **Q5** : calculé à la lecture, sans migration (« je te suis », sur ma reco).
- **Exemple corrigé** : la question Q4 citait « attendu 0,5, réponse 2 : inverse et double », faux (le double
  de 0,5 vaut 1). Exemple juste : attendu 4, réponse 2 (moitié et carré oublié). La règle tranchée ne change pas.

## Historique

- 2026-11-15 : chantier clos, journal archivé.
- 2026-11-15 : #2695 mergée (PR 3, élève ; revue Opus : cases `rulesSuffice` écartées, côté prof aussi ; CI verte).
- 2026-11-15 : PR 3 codée (élève) : phrase en remarque de case dans `buildExpectedResult`, une remarque du validateur prime ; `4` pour `-2` (carré en trop) et `-5` pour `25` (carré oublié) figés.
- 2026-11-15 : #2686 mergée (PR 2, prof ; revue Sonnet + audit sécurité sans bloquant ; borne 64 caractères ajoutée ; CI verte).
- 2026-11-15 : PR 2 codée (prof) : cases fausses typées, compte par type ; cases à appariement libre (`orderIndependent`) non typées en v1.
- 2026-11-15 : #2682 mergée (PR 1, moteur ; revue Opus sans bloquant ; CI verte).
- 2026-11-15 : Q5 tranchée (calculé à la lecture) ; PR 1 commencée.
- 2026-11-15 : Q1-Q4 tranchées (recos).
- 2026-11-15 : chantier ouvert, worktree créé, phase 0 écrite.
