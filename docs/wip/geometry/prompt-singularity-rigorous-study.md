# Étude : détection rigoureuse des singularités pour `integrale` et `aire`

## Objet

Remplacer l'heuristique par échantillonnage de
`src/lib/geometry-core/dsl/singularity-warn.ts` (V1) par une **analyse
rigoureuse** basée sur `mathAST/analysis/continuity`.

L'heuristique V1 est limitée :

- **Faux négatifs** : `ln`/`sqrt` ratent les dips entre samples.
- **Faux positifs** : pas de notion de discontinuité « tolérable »
  (removable) vs « divergente » (infinite).
- Pas de classification du type (jump / infinite / removable /
  essential), donc message utilisateur peu actionnable.
- Repose sur `compile` + sampling — coûteux et peu informatif.

L'objectif V2 est d'utiliser `analyzeContinuity()` qui fournit déjà
toutes les informations dont on a besoin : domaine, points de
discontinuité avec type, limites gauche/droite, signe.

**C'est une étude / Phase 0** : pas de code de production. Livrable =
plan TDD validé + ≤ 5 questions ouvertes.

---

## Contexte amont

V1 (heuristique) livré dans le commit `acec320e` (Phase 2 d'`integrale`).
Le module `singularity-warn.ts` est aussi utilisé par `aire(f, a, b)`
livré dans les commits `ef6ab0ad`/`6f4caf9c` (la même heuristique
s'applique aux deux builtins puisque la sémantique de domaine
problématique est la même).

Documents amont :

- `docs/wip/geometry/integrale-study.md` §2.4 — décision V1 sur les
  singularités (warn console heuristique).
- `docs/wip/geometry/integrale-progress.md` — récap V1, mentionne la
  limitation `ln`/`sqrt` à corriger en V2.
- `docs/wip/geometry/aire-study.md` (à lire) et son progress — contexte
  d'usage du même `singularity-warn` pour `aire`.

---

## Inventaire `mathAST/analysis/continuity` (À LIRE en Phase 0)

Localisation : `src/lib/mathAST/analysis/`

### Module et exports principaux

```
src/lib/mathAST/analysis/continuity.ts
src/lib/mathAST/analysis/continuity-types.ts
src/lib/mathAST/analysis/continuity-steps.ts
src/lib/mathAST/analysis/__tests__/...   # tests existants à parcourir
```

### API publique (à confirmer par lecture du code)

```ts
// continuity.ts
export function analyzeContinuity(
  expr: MathNode,
  variable: string = 'x',
  options?: ContinuityOptions
): ContinuityResult;

export function findDiscontinuityCandidates(
  expr: MathNode,
  variable: string,
  domain: Domain,
  options: ResolvedContinuityOptions
): DiscontinuityCandidate[];

export function checkContinuityAtPoint(
  expr: MathNode,
  point: MathNode,
  variable: string
): /* ... */;
```

### Type clé `Discontinuity` (continuity-types.ts:82)

```ts
interface Discontinuity {
  readonly point: MathNode;                         // valeur exacte du point
  readonly type: 'removable' | 'jump' | 'infinite' | 'essential';
  readonly leftLimit: MathNode | null;
  readonly rightLimit: MathNode | null;
  readonly leftLimitSign?: 'positive' | 'negative' | 'unknown';
  readonly rightLimitSign?: 'positive' | 'negative' | 'unknown';
  readonly source: 'division' | 'sqrt' | 'ln' | 'tan' | /* ... */;
  // + description française humaine
}
```

C'est une mine d'or par rapport à notre heuristique V1 :

- `type` permet de différencier les cas convergents (removable, parfois
  jump) des cas divergents (infinite).
- `leftLimit` / `rightLimit` permettent d'expliquer à l'élève pourquoi
  c'est un problème.
- `source` permet une catégorisation pédagogique propre.
- Les points périodiques (tan, cot) ont une représentation dédiée
  (`PeriodicDiscontinuityInfo`).

---

## Périmètre de l'étude (Phase 0)

### Décisions à prendre

1. **Sémantique du résultat de `integrale` / `aire` en présence d'une
   discontinuité dans `[a, b]`** :

   - **Option A** : retourner `NaN` et logger un warn explicite. C'est
     mathématiquement correct quand la discontinuité est `infinite`
     (l'intégrale diverge).
   - **Option B** : retourner la valeur calculée (telle que
     `integrateDefinite` la renvoie) ET warn. L'utilisateur voit
     quelque chose et est averti.
   - **Option C** : selon `Discontinuity.type`. Removable → calculer
     comme si rien (l'intégrale converge). Jump → warn + calculer la
     limite gauche-droite. Infinite → NaN + warn divergence. Essential
     → NaN + warn essentielle.

   **Recommandation à argumenter** : Option C. C'est plus pédagogique
   et plus correct. Coût : un peu plus de logique dans le compute
   closure.

2. **Singularité aux bornes** (`f` discontinue exactement en `a` ou
   `b`) :

   - Si `removable` ou ne se produit que ponctuellement : OK.
   - Si `infinite` : c'est une intégrale impropre, on est en V1
     (bornes finies seulement). Warn explicite.

3. **Format du warn console** :

   - Doit inclure : type de discontinuité, position, limite si
     disponible, suggestion de splittage.
   - Exemple cible : `integrale ligne 7: f a une discontinuité de type 'infinite' en x = 0 ∈ [-1, 1] (limite gauche = -∞, limite droite = +∞). L'intégrale diverge.`

4. **Performance** :

   - `analyzeContinuity` est-il rapide assez pour la création
     d'`integrale` (cible : < 50 ms total) ? Bench requis.
   - Si trop lent, on peut faire `analyzeContinuity` en différé (web
     worker ou idle callback) — mais V1 = synchrone à la création.

5. **Migration de `singularity-warn.ts`** :

   - **Option α** : remplacer l'implémentation tout en gardant la même
     API publique (`warnIfSingularitySuspected(expr, var, a, b, line)`).
     Le module devient un wrapper autour d'`analyzeContinuity`. Code
     interne complètement réécrit, signatures publiques inchangées.
   - **Option β** : nouveau module `singularity-detection.ts` avec une
     API plus riche (retourne `Discontinuity[]` directement). L'ancien
     module devient un wrapper de compatibilité.
   - **Option γ** : pas de wrapper, on appelle `analyzeContinuity`
     directement depuis le builtin DSL (`case 'integrale'` et
     `case 'aire'`). Module `singularity-warn` supprimé.

   **Recommandation à argumenter** : Option α — préserve l'API,
   facilite la migration des consommateurs (uniquement le builtin DSL),
   tests V1 quasi-tous réutilisables.

6. **Intégration avec le compute** (réactivité au drag de slider) :
   - V1 : warn une seule fois à la création, pas de re-warn sur drag.
     Cohérent même en V2 ?
   - Si l'utilisateur drag les bornes pour englober progressivement
     une discontinuité, doit-on re-warn ? Ma reco : **non** (cohérent
     V1, évite le bavardage console). Mais à valider.
   - Le **calcul** lui-même doit-il devenir conscient des
     discontinuités à chaque drag (Option C de §1) ? Probable oui :
     compute closure consulte la liste pré-calculée des discontinuités
     (cachée à la création) et splitte au besoin.

### Cas limites à tester

7. Discontinuités de chaque type :

   - **Removable** : `(x²-1)/(x-1)` sur `[0, 2]` (discontinuité
     levable en `x=1`). Intégrale converge, valeur correcte attendue.
     Pas de warn ? Ou warn pédagogique ?
   - **Jump** : `floor(x)` sur `[0, 3]`. Intégrale converge mais
     `integrateDefinite` peut peiner symboliquement. Numérique OK.
   - **Infinite** : `1/x` sur `[-1, 1]`. Intégrale diverge → NaN +
     warn.
   - **Essential** : `sin(1/x)` sur `[-1, 1]`. Pathologique. NaN +
     warn.

8. Discontinuités multiples sur `[a, b]` (ex. `tan(x)` sur `[0, 2π]`
   → poles à `π/2` et `3π/2`).

9. `[a, b]` ne contient aucune discontinuité (cas le plus courant) →
   aucune mention console, comportement identique V1.

### Hors scope V2 (à confirmer)

- ❌ Bornes infinies (intégrale impropre `∫₋∞⁺∞`). Item V2 séparé.
- ❌ Splittage automatique au point de discontinuité removable pour
  contourner `integrateDefinite` qui pourrait cracher. À évaluer.
- ❌ UI utilisateur visible (panneau d'avertissement) — V1 c'est
  console uniquement, V2 reste console.

---

## Plan TDD attendu

L'étude doit produire `docs/wip/geometry/singularity-rigorous-study.md`
avec :

1. **Inventaire confirmé** de `mathAST/analysis/continuity` (signatures,
   options, structure des résultats — vérifié par lecture).
2. **Bench** : timer `analyzeContinuity` sur 5-10 cas types pour
   confirmer la perf (cible < 50 ms par appel).
3. **Recommandations argumentées** pour les questions 1-9.
4. **API V2** finale du module `singularity-warn.ts` (signatures
   préservées si Option α).
5. **Plan TDD** :
   - Phases (validation spec → tests rouges → impl → review → checks).
   - Estimation effort (probablement 5-7 h).
   - Agents à utiliser.
6. **Liste finale de questions ouvertes** pour l'utilisateur (≤ 5
   questions ciblées).

### Contraintes

- **NE PAS écrire de code de production** dans cette session.
- Lire `src/lib/geometry-core/dsl/singularity-warn.ts` intégralement
  pour comprendre l'API V1 et son contrat avec le builtin DSL.
- Lire `src/lib/mathAST/analysis/continuity.ts` (~600 lignes) et
  `continuity-types.ts` intégralement.
- Lire `src/lib/mathAST/analysis/__tests__/continuity*.test.ts` pour
  comprendre les cas testés et la stabilité des résultats.
- Vérifier expérimentalement (test temporaire jetable autorisé) le
  comportement d'`analyzeContinuity` sur les 4 types de cas (§7).
  Documenter les retours `Discontinuity` pour chaque.
- Ne pas rouvrir les décisions tranchées en V1 (warn console plutôt
  que UI, async ou non, etc.).
- Suivre le workflow TDD obligatoire de `CLAUDE.md` :
  proposer comportements en français → valider → tests rouges → impl.

---

## Références code (chemins absolus)

À consulter en priorité :

```
src/lib/mathAST/analysis/continuity.ts                 # API analyzeContinuity
src/lib/mathAST/analysis/continuity-types.ts           # Discontinuity, types
src/lib/mathAST/analysis/__tests__/continuity*.test.ts # cas testés

src/lib/geometry-core/dsl/singularity-warn.ts          # V1 à remplacer
src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts # tests V1
src/lib/geometry-core/dsl/builtins.ts:~1180            # appel V1
                                                       # (case 'integrale' et case 'aire')

src/lib/mathAST/integration/integrate.ts               # integrateDefinite
                                                       # (consommateur indirect — comportement
                                                       #  attendu en présence de discontinuité)

docs/wip/geometry/integrale-study.md       §2.4       # décision V1 contexte
docs/wip/geometry/integrale-progress.md    §Phase 6   # limitations connues
docs/wip/geometry/aire-progress.md         (à voir)   # contexte usage par aire
```

---

## Critère de succès de l'étude

L'étude est terminée quand l'utilisateur peut, en lisant
`docs/wip/geometry/singularity-rigorous-study.md` seul, prendre une
décision GO/NO-GO sur l'implémentation et savoir précisément :

- L'API publique du module `singularity-warn.ts` post-migration.
- Quelles fonctions de `mathAST/analysis/continuity` sont appelées et
  où.
- Le comportement attendu en présence de chaque type de discontinuité
  (removable / jump / infinite / essential).
- Le format exact du warn console.
- L'impact sur les tests V1 (lesquels passent tels quels, lesquels
  doivent être ajustés).
- L'effort V2 chiffré (probablement 5-7 h).
- Les cas couverts V2 vs V3 (bornes infinies, UI utilisateur, etc.).

Une fois les questions ouvertes tranchées, le plan TDD doit être
exécutable par phases comparables à V1 d'`integrale` (3-5 phases).
