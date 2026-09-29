# Hypothèses de l'énoncé (ADR 0012) — progression

## Phase 0 — spécification (VALIDÉE par David le 2026-09-29)

### Faits mesurés

- `areEquivalent(latex, latex, {signal, timeoutMs})` (`src/lib/math/index.ts:133`) → `areEquivalentNodes`
  (`mathAST/equivalence.ts`) → `equivalenceForms` → `equivalenceForm(node, NormalizeContext)`
  (`normal/normalize.ts:2092`). `NormalizeContext` ne porte ni types ni hypothèses.
- Appelants hors mathAST : `answer-validator.ts`, `validation-rule-evaluator.ts` (règle `equivalent`),
  `generator/condition-evaluator.ts` (génération, pas concernée).
- `numtype` : `TypeContext.variables` (type : `integer`…) et `TypeContext.assumptions`
  (`VariableAssumption` : `sign`, `parity`, `bounds`, `finite`). `SignInfo` = positive | negative | zero |
  nonzero | unknown — **pas de « positif ou nul »**.
- Cache de types (`infer.ts:55`) : les hypothèses sont déjà dans la clé. Pas de cache de formes normales.

### Comportements (cas nominal / limite / erreur)

**A. Déclaration (modèle, éditeur)**

1. Nominal : un modèle déclare `x : strictement positif`, `n : entier naturel`. Enregistré, relu à
   l'identique, visible dans l'éditeur et dans l'aperçu (« Hypothèses : x > 0 ; n ∈ ℕ »).
2. Limite : aucune hypothèse → comportement actuel strictement identique (les 640 modèles).
3. Limite : thème Suites → l'éditeur **propose** « n ∈ ℕ » (case à cocher, décochée par défaut).
4. Erreur : nom de variable invalide, hypothèse inconnue, doublon, plus de 10 hypothèses → refus Zod
   (client ET serveur), message en français.
5. Erreur : hypothèses contradictoires (`x` strictement positif ET négatif) → impossible par
   construction (une seule hypothèse par variable).

**B. Propagation**

6. Nominal : l'instance générée porte les hypothèses ; `validateAnswer` les transmet à `areEquivalent`
   et à la règle `equivalent` ; les `testSpecs` en profitent sans changement.
7. Limite : les variables **tirées** du modèle (`{{a}}`) ne sont pas concernées : une hypothèse vise
   une variable **libre de la réponse** (x, n). Hypothèse sur un nom de variable tirée → refus à la
   validation du modèle.

**C. Décideur — ce qui devient vrai (seulement avec l'hypothèse)**

8. `x > 0` : `x^a·x^b ≡ x^{a+b}`, `x^{a+2} ≡ x²·x^a`, `2^x·x^x ≡ (2x)^x` (à mesurer), `(x^a)^b ≡ x^{ab}`
   (à mesurer), `√(x²) ≡ x`, `|x| ≡ x`.
9. `x ≥ 0` : `√(x²) ≡ x`, `|x| ≡ x` ; mais PAS `x^a·x^b ≡ x^{a+b}` (0^a indéfini ou 0 selon a).
10. `x ≠ 0` : `x^0 ≡ 1` et `x^n/x^n ≡ 1` déjà vrais — aucun gain attendu, sert de garde.
11. `n` entier : `(−2)^{2n} ≡ 4^n`, `(−1)^{2n} ≡ 1`, `(−1)^n·(−1)^n ≡ 1`, `((−2)^n)^2 ≡ 4^n`.
12. `n` entier naturel : idem 11 (le signe n'ajoute rien ici).

**D. Décideur — ce qui DOIT rester faux (gardes anti faux positif)**

13. Sans hypothèse : tout ce qui est faux aujourd'hui le reste (`x^a·x^b ≢ x^{a+b}`, `(−2)^{2n} ≢ 4^n`).
14. Hypothèse sur une AUTRE variable : `y > 0` ne rend pas `x^a·x^b ≡ x^{a+b}`.
15. `x > 0` ne rend pas `x^a ≡ x^b`, ni `(−x)^a·(−x)^b ≡ (−x)^{a+b}` (−x est négatif).
16. `n` entier ne rend pas `2^n ≡ 3^n`, ni `(−2)^n ≡ 2^n`.
17. Réponse hors domaine : `x > 0` déclaré, l'élève écrit `|x|` pour `x` → juste ; il écrit `−x` → faux.

**E. Sûreté**

18. Contre-vérification numérique adverse (comme #521) avec tirages **dans le domaine déclaré** :
    0 faux positif exigé.
19. Temps : pas plus de +20 % sur les cas lourds de #521, budget 500 ms inchangé.
20. Corpus relu (633) inchangé.

### Découpage proposé

- **Lot 1 — mathAST** (agent `mathast-expert`, Opus) : `SignInfo` + `nonnegative` ; contexte d'hypothèses
  dans `NormalizeContext` → `equivalenceForm` → `areEquivalent` ; règles conditionnelles (8-12) ;
  gardes (13-17) ; revue adverse (18). PR seule.
- **Lot 2 — modèle + propagation + éditeur** (agent `fullstack-developer`, Opus) : schéma (Zod strict,
  Zod serveur, type), instance, `validateAnswer`, règle `equivalent`, éditeur (champ + proposition
  Suites), aperçu. `code-reviewer` + `security-auditor` (entrée Zod serveur). PR seule.

### Décisions de David (2026-09-29)

- Q1 — Stockage : **`options.answerAssumptions`** (pas de migration).
- Q2 — Périmètre : **toute la section C** ; les cas « à mesurer » inclus seulement s'ils passent la
  revue adverse, signalés sinon.

## Chantiers

- [x] Lot 1 — mathAST (`feat/hypotheses-enonce-mathast`, worktree `../ubumaths-wt-hypotheses-mathast`) :
      contrat `areEquivalent(l1, l2, { assumptions })` + `AnswerAssumptions` (`$lib/math`), règles 8-12,
      gardes 13-17, revue adverse 0 faux positif. PR à ouvrir.
- [ ] Lot 2 — modèle + propagation + éditeur (après merge du lot 1)
