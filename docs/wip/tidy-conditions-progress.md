# Chantier `tidy-conditions` — la variante `{ result, conditions }` de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-26, phase 0 de la suite (§ 3), après #1807._

- **État** : #1807 MERGÉE (pas encore en prod). David demande la suite : un réglage entre les deux modes, et une bulle qui dit qu'on peut simplifier plus, avec la syntaxe pour préciser le domaine (§ 3).
- **Prochaine action** : coder le § 3 d'après les réponses de David (worktree `ubumaths-wt-tidy-conditions` à recréer).
- **En attente de David** : Q5, Q6 bis, Q7, Q9 du § 3 (Q8 tranchée, Q6 répondue).
- **Pièges en cours** : aucune syntaxe de domaine n'existe pour `.simplifier` (seulement `dans` de `.résoudre`/`.variations`, `sur` d'une fonction) ; `1/(1/x) → x` reste un bug de `tidy`.
- **Worktree / branche** : à recréer (`feat/tidy-conditions-reglage`).

## Contexte

Décision **S3** de simplify-carte (David, 2026-10-22) : par défaut, `tidy` ne fait aucune simplification qui perd le domaine (`x/x` reste) ; avec des hypothèses déclarées (énoncé, domaine de f, type de la variable, ADR 0012), il la fait ; **une variante explicite rend `{ result, conditions }` pour afficher « pour x ≠ 0 »**. Les deux premières parties sont codées (lot 4a, 2026-10-23 ; extension aux sommes `ln x − ln x`, `1/x − 1/x`, `√x − √x` le 2026-10-24) ; la variante, non.

À lire (dans cet ordre, seulement ce qu'il faut) :

- `docs/systeme/mathast/tidy-spec.md` § A (contrat, « Jamais de changement de domaine ») et les lignes « S3 » de son historique.
- `docs/adr/0032-la-forme-affichee-se-choisit-par-le-but.md`.
- Journal archivé `docs/archive/wip/simplify-carte-progress.md` : § 6 (S3, l. ~158-174), § 12 (identités et convention d'équivalence), § 21 (factoriser au milieu d'un calcul, condition affichée `x ≠ −1`), § 36 (lot 4a), § 49-50 (Q20 reportée), § 64 (sommes), Q28 (`x^0`).
- `docs/systeme/mathast/convention-equivalence.md`.

Cas déjà relevés qui attendent la variante (README mathAST, points ouverts) :

- `x/x` → « 1, pour x ≠ 0 » ; `ln x − ln x` → « 0, pour x > 0 » ;
- `x(1/x − 1)` développé → `−x + x/x` au lieu de « `1 − x`, pour x ≠ 0 » (normalize-usages) ;
- `\frac{e^{2x}x}{eˣx} → \frac{x eˣ}{x}` (`.simplifier`, le `x/x` reste visible) ;
- `1/(1/x) → x` : un `x⁻¹` sous une barre échappe au suivi du domaine (bug de `tidy`, à part).

Pistes d'appelants à vérifier (rien d'affirmé) : l'Atelier (Calcul, `.simplifier`, `.développer`), les conditions déjà produites par le moteur pédagogique (Q4 / § 21 : elles viennent de lui, pas de `tidy`).

## 1. Phase 0 (2026-10-26)

### Sonde (Atelier, `runInput`, test jetable supprimé)

| ligne tapée                         | réponse affichée | étapes                                                                               |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `.simplifier x/x`                   | `1`              | « On simplifie par le facteur commun, pour x ≠ 0 »                                   |
| `.simplifier (x^2-1)/(x+1)`         | `x − 1`          | factorisation, puis « … pour x ≠ −1 »                                                |
| `.simplifier ln(x)-ln(x)`           | `0`              | **aucune** (repli sur le moteur) : la condition x > 0 n'est dite nulle part          |
| `.simplifier \frac{e^{2x}x}{e^x x}` | `\frac{x eˣ}{x}` | `aᵐ/aⁿ = aᵐ⁻ⁿ` : le `x/x` reste visible                                              |
| `.développer x(1/x-1)`              | `−x + x/x`       | « On distribue x » — `tidy` (dans `pedagogical-simplify/expand.ts`) garde `x/x` (S3) |
| `.dériver x^2/x`, `x ln(x)`         | `1`, `ln(x) + 1` | justes : `options.domain` (f est définie, donc x ≠ 0)                                |

Constats :

- Les conditions des fractions de `.simplifier` existent déjà, **dans le titre de l'étape** (moteur pédagogique, `reduce-steps.ts:330`), jamais sur la ligne de réponse.
- Les trous qui viennent de `tidy` : `.développer x(1/x−1)` (`x/x` laissé au milieu d'une somme), `x eˣ/x` laissé par `.simplifier`. `ln x − ln x` passe par le repli du moteur (`simplify`), sans étape ni condition.
- Pas d'appelant dans les corrections d'exercices (aucun modèle de la prod n'utilise `generatedSteps`, sonde D4 de simplify-carte).

### Comportements proposés

Une fonction `tidyWithConditions(node, options)` → `{ result, conditions }` : elle fait ce que S3 interdit à `tidy`, et rend chaque restriction utilisée.

- **Nominal** : `x/x` → `1`, conditions `x ≠ 0` ; `x(1/x − 1)` développé → `1 − x`, `x ≠ 0` ; `ln x − ln x` → `0`, `x > 0` ; `\frac{x eˣ}{x}` → `eˣ`, `x ≠ 0`. L'Atelier écrit la ligne « `1 − x`, pour x ≠ 0 ».
- **Limite** : rien à lever → `conditions` vide, résultat identique à `tidy` (même arbre) ; condition déjà acquise (`options.domain`, `typeCtx`) → pas redite (`.dériver x²/x` reste `1`) ; deux conditions dont l'une contient l'autre → la plus forte seule (`x > 0` absorbe `x ≠ 0`) ; condition toujours vraie (`x²+1 ≠ 0`) → rien.
- **Erreur** : facteur dont on ne sait pas écrire la condition simplement → on ne simplifie pas (comportement actuel de `tidy`) plutôt que d'afficher une condition fausse ou illisible.

### Questions à David

- **Q1 — Premier appelant.** Reco : la ligne de réponse de l'Atelier pour `.développer` et `.simplifier` (seuls endroits mesurés où le `x/x` reste visible). Les corrections d'exercices hors chantier (aucun appelant en prod).
- **Q2 — Ligne de réponse de `.simplifier` sur une fraction.** Le titre d'étape dit déjà « pour x ≠ −1 », la ligne dit `x − 1`. Reco : la ligne le dit aussi, « `x − 1`, pour x ≠ −1 » (même écriture que la nouvelle variante). C'est le moteur pédagogique, pas `tidy` : à inclure dans ce chantier ?
- **Q3 — `ln x − ln x`.** Aujourd'hui `0` sans étape. Reco : « `0`, pour x > 0 », avec une étape nommée.
- **Q4 — Écriture de la condition.** Reco : « pour x ≠ 0 », « pour x > 0 », plusieurs reliées par « et » (comme les titres d'étape existants), la plus forte seule quand l'une contient l'autre.

## 2. Décisions de David (2026-10-26)

- **Toutes les commandes gardent le domaine**, comme une expression tapée et `.développer` (vérifié par sonde : `.simplifier` et `.factoriser` ne le gardaient pas). Révise la précision Q4 de l'ADR 0007 : `.simplifier (x²−1)/(x+1)` laisse la fraction.
- **Variante par ligne, au bouton** (comme « Valeur approchée »), pas un mode global.
- Q3 (« `0`, pour x > 0 ») et Q4 (« et », la plus forte seule) : recos validées.

## 3. Suite : réglage et bulle (phase 0, 2026-10-26)

Demande de David : une option des réglages pour passer d'un mode à l'autre — écriture non simplifiée si le domaine change, ou la variante —, et une bulle qui prévient qu'on pourrait simplifier plus en précisant le domaine, avec la syntaxe pour le préciser.

Existant vérifié : la fenêtre « Réglages de l'atelier » (`AtelierSettings.svelte`, saisie / angles / déplacement des points, retenus dans le navigateur) ; une ligne porte déjà une `note` montrée sous la réponse ; **aucune syntaxe de domaine** pour `.simplifier`/`.factoriser`/`.développer` (seulement `dans ENSEMBLE` de `.résoudre`/`.variations`, lu par `parseStudentDomain`, et `f(x) = … sur I`).

Comportements proposés :

- **Réglage** « Simplifications qui changent le domaine » : « Garder l'écriture » (défaut, l'actuel) ou « Simplifier en disant la condition » (la ligne montre `1, pour x ≠ 0`). Le bouton de ligne reste dans les deux modes, en sens inverse (« Simplifier pour x ≠ 0 » / « Sans simplifier »). Le réglage ne vaut que pour les nouvelles lignes (Q8).
- **Bulle** (mode « Garder l'écriture ») : une note sous la ligne, « On peut simplifier davantage pour x ≠ 0. Pour le dire : `.simplifier x/x dans ℝ\{0}` » — l'ensemble écrit d'après la condition (`x ≠ a` → `ℝ\{a}`, `x > a` → `]a;+∞[`, `x ≥ a` → `[a;+∞[`, sinon « dans ENSEMBLE »).
- **Syntaxe** `dans ENSEMBLE` ajoutée à `.simplifier`, `.factoriser`, `.développer` (même lecture que `.résoudre`) : la simplification a lieu sans condition si l'ensemble est inclus dans celui où la condition vaut (`.simplifier x/x dans ]0;+∞[` → `1`) ; sinon la ligne garde l'écriture et le dit (« 0 est dans ℝ : x/x n'y est pas défini »). Une seule lettre (`pour VAR` si plusieurs).
- **Limite** : plusieurs lettres (`x/x + y/y`) → pas d'ensemble proposé, la note dit seulement la condition ; condition non affine (`x²−1 ≠ 0`) → « dans ENSEMBLE ».

Questions :

- **Q5 — Forme de la bulle.** Reco : la note sous la ligne (existe, visible, lue par les lecteurs d'écran). Autre : une icône ⓘ avec une bulle au survol / au toucher.
- **Q6 — Syntaxe. Réponse de David (2026-10-26)** : aussi « avec x > 0 », et des intervalles avec réunion ET intersection. Proposition qui en découle (à valider, Q6 bis) :
  - `avec CONDITION` et `dans ENSEMBLE`, sur `.simplifier`, `.factoriser`, `.développer` **et sur une expression tapée** (`x/x avec x ≠ 0` → `1`) ;
  - `avec` : `x > 0`, `x ≠ 0 et x ≠ 1`, `x < 0 ou x > 2`, `0 < x ≤ 5`, plusieurs lettres (`x > 0 et y ≠ 0`, chaque condition lit sa lettre) ;
  - `dans` : `]0;+∞[`, `ℝ\{0}`, `]-∞;0[ ∪ ]0;+∞[`, `]0;+∞[ ∩ ]-∞;5]` — une lettre (`pour VAR` sinon) ;
  - à ajouter à `parseStudentDomain` (mesuré) : l'intersection `∩` d'intervalles (le signe est lu, pas le calcul) ; le mélange `et`/`ou` dans une même condition reste refusé avec un message (« écris-le avec des intervalles et ∪ / ∩ ») ;
  - la note propose `avec` d'après la condition, toujours écrivable, plusieurs lettres comprises : « On peut simplifier davantage pour x ≠ 0 : ajoute `avec x ≠ 0` (ou `dans ℝ\{0}`). »
  - un ensemble qui ne garantit pas la condition (`.simplifier x/x dans ℝ`) : la ligne garde l'écriture et dit pourquoi (« 0 est dans ℝ, x/x n'y est pas défini »).
- **Q7 — Mode « variante ».** Reco : le bouton reste (« Sans simplifier »), pas de note (la condition est déjà sur la ligne).
- **Q8 — Lignes déjà écrites. TRANCHÉE (David, 2026-10-26)** : le réglage ne s'applique qu'aux **nouvelles lignes** ; chacune se bascule ensuite à la main (bouton de ligne). Les lignes déjà écrites ne bougent pas.
- **Q9 — Défaut.** Reco : « Garder l'écriture » (ta décision de ce matin).

## Historique
