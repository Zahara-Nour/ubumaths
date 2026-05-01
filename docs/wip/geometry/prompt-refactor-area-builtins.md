# Étude : factorisation des cases DSL `integrale` / `aire` / `aire_entre`

## Objet

Les trois cases DSL partagent ~80 % du code (résolution des bornes,
validation, `getAllDiscontinuities`, appel `createIntegralArea`,
`warnIfSingularitySuspected`). Le sujet : extraire un helper commun
`interpretAreaBuiltin(...)` pour réduire la dette et faciliter les
futures variantes (`aire_intersection`, bornes-points, etc.).

**C'est une étude / Phase 0** : pas de code de production cette session.
Livrable = `docs/wip/geometry/refactor-area-builtins-study.md` + plan
TDD validé + ≤ 5 questions ouvertes.

> **Pourquoi maintenant** : les 3 cases existent et sont stables (96 + 19
>
> - 21 tests verts). C'est le moment idéal pour factoriser — on a 3
>   instances pour valider que l'abstraction colle, et la couverture tests
>   est suffisante pour détecter toute régression.

---

## Contexte amont (3 builtins déjà livrés)

```
6e808d0e..1e6aa6b0  integrale V1 (Phase 1-6)
ef6ab0ad..ac487ad6  aire V2 (Phase 1-5)
a2e6a52f..d1101429  aire_entre V3 (Phase 1-5)
```

Documents amont :

- `docs/wip/geometry/integrale-study.md` + `integrale-progress.md`
- `docs/wip/geometry/aire-study.md` + `aire-progress.md` (§2.10 a déjà
  signalé que la factorisation serait reportée en V3, puis à nouveau en
  V4 par `aire-entre-study.md` §2.10)
- `docs/wip/geometry/aire-entre-study.md` + `aire-entre-progress.md`

**Code à comparer ligne à ligne** :

| Builtin             | Lignes (builtins.ts) | Notes                                               |
| ------------------- | -------------------- | --------------------------------------------------- |
| `case 'aire'`       | ~1119-1216           | Surcharge polygone (≥3 points) vs courbe (3 args)   |
| `case 'integrale'`  | ~1719-1801           | Pattern de référence (V1)                           |
| `case 'aire_entre'` | ~1803-1915           | Le plus récent, ajoute `secondFunctionId` + `h=f-g` |

Et le facteur commun en aval :

- `figure.createIntegralArea(fId, lower, upper, options)` —
  `figure.ts:2856-3148` — accepte `signed?`, `discontinuities?`,
  `secondFunctionId?`. Toute la logique de mode (V1/V2/V3) est
  **déjà** centralisée ici. Le refactor concerne uniquement
  **l'orchestration au niveau DSL**, pas la factory.

---

## Inventaire ciblé — différences entre les 3 cases

### Communs (à factoriser)

1. **Validation de la fonction** : `pos[0]` doit être une `GeoFunction`
   (sinon `requireElement` + check `el.type === 'function'`, message
   d'erreur DSL adapté).
2. **Résolution des bornes** : `resolveBoundParam(arg, name)` est
   strictement identique dans les 3 cases (nombre littéral OU ref
   `scalar`/`slider`, retourne `{ param, numericValue }`).
3. **Pré-calcul des discontinuités** : `getAllDiscontinuities(integrand, 'x')`
   où `integrand` = `f.expression` en V1/V2 et `h = f − g` en V3.
4. **Appel `figure.createIntegralArea(...)`** wrappé dans un try/catch
   qui re-throw en `DslRuntimeError` avec préfixe du builtin.
5. **Appels `warnIfSingularitySuspected`** post-création.
6. **Retour** : `{ figureId: scalarId, symbolType: 'scalar', styleTargetId: areaId }`.

### Différences (à paramétrer)

| Aspect                                 | `integrale`                     | `aire`            | `aire_entre`                                  |
| -------------------------------------- | ------------------------------- | ----------------- | --------------------------------------------- |
| Nb args                                | 3                               | 3 (overload poly) | 4                                             |
| Validation 2e fonction `g`             | ❌                              | ❌                | ✅                                            |
| Mode factory                           | `signed: true`                  | `signed: false`   | `secondFunctionId: g` (force `signed: false`) |
| Intégrand pour `getAllDiscontinuities` | `f.expression`                  | `f.expression`    | `subtract(f, g)`                              |
| Couleur par défaut                     | (V1 default — bleu via factory) | `#22c55e` (vert)  | `#fb923c` (orange)                            |
| Nb warns                               | 1 (sur `f`)                     | 1 (sur `f`)       | 2 (sur `f` et `g`)                            |
| Préfixe warn                           | `'integrale'`                   | `'aire'`          | `'aire_entre'`                                |
| Surcharge avec autre branche           | ❌                              | ✅ (polygone)     | ❌                                            |

---

## Périmètre de l'étude (Phase 0)

### Décisions à prendre

1. **Signature du helper** — proposer 2-3 alternatives, recommander
   l'une argumentée :

   - **Option A — paramètres explicites** :
     ```ts
     interpretAreaBuiltin(opts: {
       name: 'integrale' | 'aire' | 'aire_entre';
       pos: ResolvedValue[];
       requireSecondFunction: boolean;
       signed: boolean;
       defaultColor?: string;
       line: number;
       label?: string;
       figure: Figure;
     }): BuiltinResult
     ```
   - **Option B — config object par builtin** :
     ```ts
     const AREA_BUILTIN_CONFIGS = {
       integrale: { signed: true, requireG: false, color: undefined, ... },
       aire: { signed: false, requireG: false, color: '#22c55e', ... },
       aire_entre: { signed: false, requireG: true, color: '#fb923c', ... },
     };
     interpretAreaBuiltin(name, pos, line, label, figure, symbols)
     ```
   - **Option C — inheritance / spec class** : trop lourd pour 3 cases
     similaires, à écarter probablement.

2. **Gestion de la surcharge `aire(P1, P2, P3)` polygone** :

   - Le helper ne doit s'occuper QUE de la branche courbe.
   - La détection courbe vs polygone reste dans le `case 'aire'`
     extérieur (logique inchangée).
   - Le `case 'aire'` appelle le helper SI `pos.length === 3 && pos[0]`
     est une `GeoFunction`, sinon fallback polygone existant.

3. **Différenciation V1 (signed=true) vs V2 (signed=false sans g) vs V3 (avec g)** :

   - Le helper accepte un mode discriminé OU se base sur la présence/absence
     de paramètres ?
   - Recommandation à argumenter.

4. **Couleur par défaut** :

   - Passée en paramètre du helper, OU lookup dans une table par nom ?
   - Cohérence avec le passage actuel `color: '#22c55e'` (aire) /
     `color: '#fb923c'` (aire_entre) / pas de color (integrale → factory
     default).

5. **Cas de bord à préserver** :

   - Erreurs DSL avec préfixe correct (`aire():`, `integrale():`,
     `aire_entre():`).
   - Q-C autorisée : `aire_entre(f, f, ...)` valide (cf factory dedupe).
   - Tous les args nommés (`couleur`, `opacite_fond`, `etiquette`,
     `remplissage`, `trait`, `epaisseur`) doivent continuer à fonctionner.
   - Non-régression sur les 96+19+21 = **136 tests existants**.

---

## Plan TDD attendu

L'étude doit produire `docs/wip/geometry/refactor-area-builtins-study.md`
avec :

1. **Inventaire confirmé** par lecture des 3 cases dans `builtins.ts`.
   Tableau ligne-à-ligne des différences.
2. **Recommandations argumentées** pour les 5 décisions.
3. **Signature finale** du helper avec types TypeScript exacts.
4. **Plan TDD détaillé** :
   - Phase 0 : étude (cette session).
   - Phase 1 : extraire le helper sans toucher aux cases (ajout pur,
     non utilisé, tests sur le helper isolé).
   - Phase 2 : migrer `case 'integrale'` (le plus simple) — vérifier
     les 96 tests V1 toujours verts.
   - Phase 3 : migrer `case 'aire'` (avec gestion overload polygone) —
     vérifier les 19 tests V2 + tous les tests polygones toujours verts.
   - Phase 4 : migrer `case 'aire_entre'` — vérifier les 21 tests V3.
   - Phase 5 : quality checks finaux.
   - Pas de Phase démo ni doc utilisateur (refactor invisible côté DSL).
5. **Estimation effort** : probablement 2-4 h (refactor pur, infra
   factory déjà solide, tests existants servent de filet).
6. **Liste finale de questions ouvertes** (≤ 5).

### Contraintes

- **NE PAS écrire de code de production** dans cette session.
- **Lire intégralement** :
  - `src/lib/geometry-core/dsl/builtins.ts` lignes 1119-1216 (`case 'aire'`).
  - `src/lib/geometry-core/dsl/builtins.ts` lignes 1719-1801 (`case 'integrale'`).
  - `src/lib/geometry-core/dsl/builtins.ts` lignes 1803-1915 (`case 'aire_entre'`).
- **Ne pas relire** `figure.ts createIntegralArea` ni les helpers
  `mathAST` — la factory est stable et hors scope du refactor.
- Suivre le workflow TDD obligatoire de `CLAUDE.md` : proposer
  comportements en français → valider avec l'utilisateur → tests rouges
  → implémentation → review → checks → commit.

### Critère de succès du refactor (V4)

- **Mêmes 136 tests verts** (zéro régression).
- **Réduction nette du code** : les 3 cases combinés font ~280 lignes
  aujourd'hui, attendu ~80-120 lignes après refactor (helper + 3 cases
  amincis).
- **Lisibilité accrue** : un nouveau builtin de la même famille (e.g.
  `aire_intersection` futur) prend 10-20 lignes au lieu de ~95.

---

## Références code (chemins absolus)

À consulter en priorité :

```
src/lib/geometry-core/dsl/builtins.ts            # 3 cases à factoriser
src/lib/geometry-core/dsl/singularity-warn.ts    # warnIfSingularitySuspected, getAllDiscontinuities
src/lib/geometry-core/graph/figure.ts            # createIntegralArea (factory, hors scope)

src/lib/geometry-core/dsl/__tests__/interpreter-integrale.test.ts        # 96 tests V1
src/lib/geometry-core/dsl/__tests__/interpreter-aire-undercurve.test.ts  # 19 tests V2
src/lib/geometry-core/dsl/__tests__/interpreter-aire-entre.test.ts       # 21 tests V3
```

Ne PAS lire :

```
src/lib/geometry-core/rendering/svg-primitives.ts  # rendu, hors scope
src/lib/geometry-core/types/elements.ts            # types stables
src/lib/mathAST/                                   # hors scope
```

---

## Critère de fin de l'étude

L'étude est terminée quand l'utilisateur peut, en lisant
`docs/wip/geometry/refactor-area-builtins-study.md` seul, décider
GO/NO-GO sur le refactor et savoir précisément :

- La signature finale du helper.
- Quel paramétrage pour chaque builtin.
- L'effort chiffré (~2-4 h).
- Les tests de non-régression à surveiller.
- Les cas de bord à préserver.

Une fois les questions ouvertes tranchées, le plan TDD est exécutable
en 4 phases (extraction → migration intégrale → migration aire → migration
aire_entre), avec validation des tests à chaque étape.
