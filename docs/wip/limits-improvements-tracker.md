# Tracker : Améliorations du module Limits

> **Module** : `src/lib/mathAST/limits/` > **Dernière mise à jour** : 2026-01-30
> **Statut global** : 311 tests passants, 13 tests skipped

---

## Résumé des capacités actuelles

| Fonctionnalité                | Statut | Notes                                           |
| ----------------------------- | ------ | ----------------------------------------------- |
| Limites connues (~50 entrées) | ✅     | sin(x)/x, tan(x)/x, (e^x-1)/x, ln(1+x)/x, etc.  |
| Substitution directe          | ✅     | Points finis, polynômes, fonctions élémentaires |
| Factorisation                 | ✅     | Annulation de (x-a) dans quotients              |
| Rationalisation               | ✅     | Conjugués pour expressions √                    |
| Règle de L'Hôpital            | ✅     | Formes 0/0 et ∞/∞, max 5 itérations             |
| Théorème des gendarmes        | ✅     | Fonctions bornées (sin, cos, arctan) près de 0  |
| Limites unilatérales          | ✅     | Analyse gauche/droite, types de discontinuité   |
| Suivi des signes              | ✅     | 0±, ±∞ avec propagation                         |
| Composition à ±∞              | ✅     | Fonctions élémentaires (exp, ln, puissances)    |
| Division par zéro             | ✅     | Avec suivi de signe pour ±∞                     |

---

## Améliorations identifiées

### Phase 0 : Algèbre des infinis (fondamental)

#### 0.1 Opérations binaires sur SignedLimitValue

- **Priorité** : Très haute
- **Complexité** : Moyenne
- **Tests concernés** : 2+ skipped (somme/produit à ∞)
- **Problème** : Pas d'algèbre explicite pour ∞+∞, ∞·∞, etc. Le module s'appuie uniquement sur l'évaluation numérique.
- **Solution** : Ajouter fonctions `addSigns`, `multiplySigns`, `subtractSigns`, `divideSigns` dans `sign-tracking.ts`

**Note importante** : Cette algèbre est **uniquement nécessaire dans le module limits**. Les autres modules (`analysis/`, `variations/`, `domain/`, `eval/`) utilisent les infinis seulement pour :

- Vérifier si un point est infini (`isInfinity`)
- Comparer des valeurs (`compare-numeric.ts`)
- Représenter des endpoints d'intervalles

Aucun autre module ne fait d'arithmétique avec les infinis — ils délèguent au module limits. L'implémentation dans `sign-tracking.ts` avec `SignedLimitValue` est donc le bon choix (pas besoin d'étendre `eval/evaluate.ts`).

| Tâche                                                                | Statut  | Fichier                                |
| -------------------------------------------------------------------- | ------- | -------------------------------------- |
| `addSigns(a, b)` : ∞+∞=∞, ∞+finite=∞, ∞+(-∞)=indéterminé             | ✅ DONE | `sign-tracking.ts`                     |
| `subtractSigns(a, b)` : ∞-finite=∞, ∞-∞=indéterminé                  | ✅ DONE | `sign-tracking.ts`                     |
| `multiplySigns(a, b)` : ∞·∞=∞, ∞·0=indéterminé, ∞·(>0)=∞             | ✅ DONE | `sign-tracking.ts`                     |
| `divideSigns(a, b)` : ∞/∞=indéterminé, finite/∞=0, ∞/finite=∞        | ✅ DONE | `sign-tracking.ts`                     |
| `isIndeterminate()` : helper pour détecter formes indéterminées      | ✅ DONE | `sign-tracking.ts`                     |
| `BinaryOpResult` : type pour résultats incluant formes indéterminées | ✅ DONE | `sign-tracking.ts`                     |
| Tests unitaires pour chaque opération (78 tests)                     | ✅ DONE | `sign-tracking.test.ts`                |
| Intégrer dans `composition.ts` (add, subtract, multiply, divide)     | ✅ DONE | `composition.ts`                       |
| Améliorer `classifyAtInfinity` pour détecter croissance vers ∞       | ✅ DONE | `sign-tracking.ts`                     |
| Tests d'intégration (12 tests)                                       | ✅ DONE | `infinity-algebra-integration.test.ts` |

**Règles d'algèbre des infinis :**

```
// Addition
+∞ + +∞ = +∞
-∞ + -∞ = -∞
+∞ + -∞ = indéterminé (∞ - ∞)
∞ + finite = ∞ (même signe)
0 + finite = finite

// Soustraction
+∞ - -∞ = +∞
-∞ - +∞ = -∞
+∞ - +∞ = indéterminé
∞ - finite = ∞

// Multiplication
+∞ · +∞ = +∞
-∞ · -∞ = +∞
+∞ · -∞ = -∞
∞ · 0 = indéterminé (0·∞)
∞ · finite(>0) = ∞ (même signe)
∞ · finite(<0) = ∞ (signe opposé)

// Division
∞ / ∞ = indéterminé
finite / ∞ = 0
∞ / finite(≠0) = ∞
0 / 0 = indéterminé
```

---

### Phase 1 : Corrections rapides (Low-hanging fruit)

#### 1.1 Évaluation de constantes symboliques

- **Priorité** : Haute
- **Complexité** : Faible
- **Tests concernés** : 0 skipped (1 fixed)
- **Problème** : `ln(e)` n'est pas évalué à 1
- **Solution** : Évaluation numérique des expressions constantes (sans variable)

| Tâche                                           | Statut  | Fichier                   |
| ----------------------------------------------- | ------- | ------------------------- |
| Évaluer ln(e) → 1                               | ✅ DONE | `evaluate.ts`             |
| Évaluation numérique des expressions constantes | ✅ DONE | `evaluate.ts`             |
| Tests de régression                             | ✅ DONE | `edge-cases.test.ts`      |
| Évaluer e^(ln(x)) → x (simplification)          | ⬜ TODO | `composition.ts` (future) |

---

#### 1.2 Somme et produit à l'infini

- **Priorité** : Haute
- **Complexité** : Faible
- **Tests concernés** : 1 skipped (1 fixed)
- **Problème** : `x + 1/x → +∞` et `x·(1/x) → 1` non supportés
- **Solution** : Infinité algebra (Phase 0.1) + simplification algébrique

| Tâche                                                      | Statut  | Fichier              |
| ---------------------------------------------------------- | ------- | -------------------- |
| Gérer x + 1/x quand x→∞ (terme dominant via infinity alg.) | ✅ DONE | `composition.ts`     |
| Gérer x·(1/x) quand x→∞ (simplification algébrique)        | ⬜ TODO | `algebraic.ts`       |
| Test x + 1/x                                               | ✅ DONE | `edge-cases.test.ts` |

---

### Phase 2 : Améliorations du théorème des gendarmes

#### 2.1 Squeeze theorem à l'infini

- **Priorité** : Moyenne
- **Complexité** : Moyenne
- **Tests concernés** : 4 skipped
- **Problème** : sin(x)/x → 0 quand x→+∞ non détecté
- **Solution** : Étendre `squeeze.ts` pour l'analyse à l'infini

| Tâche                                    | Statut  | Fichier                              |
| ---------------------------------------- | ------- | ------------------------------------ |
| Détecter f(x)/x avec f bornée à l'infini | ⬜ TODO | `squeeze.ts`                         |
| Ajouter patterns sin(x)/x, cos(x)/x à ±∞ | ⬜ TODO | `squeeze.ts`                         |
| Gérer arctan(x) borné à l'infini         | ⬜ TODO | `squeeze.ts`                         |
| Dé-skipper tests                         | ⬜ TODO | `edge-cases.test.ts:575,582,816,824` |

---

### Phase 3 : Améliorations de L'Hôpital

#### 3.1 L'Hôpital à l'infini (exp vs polynôme)

- **Priorité** : Moyenne
- **Complexité** : Moyenne
- **Tests concernés** : 2 skipped
- **Problème** : `x/e^x → 0` et `e^x/x² → +∞` non résolus
- **Solution** : Améliorer détection ∞/∞ pour exp vs polynôme

| Tâche                                 | Statut  | Fichier                      |
| ------------------------------------- | ------- | ---------------------------- |
| Détecter forme ∞/∞ avec e^x           | ⬜ TODO | `indeterminate.ts`           |
| Appliquer L'Hôpital itératif pour exp | ⬜ TODO | `lhopital.ts`                |
| Gérer cas où dérivées divergent       | ⬜ TODO | `lhopital.ts`                |
| Dé-skipper tests                      | ⬜ TODO | `edge-cases.test.ts:471,478` |

---

### Phase 4 : Valeur absolue

#### 4.1 Support de abs(x)

- **Priorité** : Moyenne
- **Complexité** : Moyenne
- **Tests concernés** : 3 skipped
- **Problème** : `|x|/x` → 1 ou -1 selon direction non géré
- **Solution** : Analyse par cas basée sur le signe

| Tâche                                            | Statut  | Fichier                                     |
| ------------------------------------------------ | ------- | ------------------------------------------- |
| Détecter expressions avec abs()                  | ⬜ TODO | `composition.ts` ou nouveau `abs-limits.ts` |
| Évaluer abs(f(x)) selon signe de f près du point | ⬜ TODO | `sign-tracking.ts`                          |
| Gérer abs(x)/x avec analyse unilatérale          | ⬜ TODO | `one-sided.ts`                              |
| Dé-skipper tests                                 | ⬜ TODO | `edge-cases.test.ts:311,318,325`            |

---

### Phase 5 : Améliorations algébriques

#### 5.1 Différence de racines à l'infini

- **Priorité** : Moyenne
- **Complexité** : Élevée
- **Tests concernés** : 1 skipped
- **Problème** : `√(x+1) - √x → 0` quand x→+∞ non résolu
- **Solution** : Rationalisation automatique par conjugué

| Tâche                               | Statut  | Fichier                  |
| ----------------------------------- | ------- | ------------------------ |
| Détecter pattern √a - √b à l'infini | ⬜ TODO | `algebraic.ts`           |
| Appliquer conjugué (√a + √b)        | ⬜ TODO | `algebraic.ts`           |
| Simplifier le résultat              | ⬜ TODO | `algebraic.ts`           |
| Dé-skipper test                     | ⬜ TODO | `edge-cases.test.ts:765` |

---

#### 5.2 Dénominateur polynomial complexe

- **Priorité** : Basse
- **Complexité** : Élevée
- **Tests concernés** : 2 skipped
- **Problème** : `x/(x²-1)` à x=1 non résolu (factorisation partielle)
- **Solution** : Améliorer factorisation du dénominateur

| Tâche                                    | Statut  | Fichier                      |
| ---------------------------------------- | ------- | ---------------------------- |
| Factoriser dénominateur polynomial       | ⬜ TODO | `algebraic.ts`               |
| Analyser signe du dénominateur factorisé | ⬜ TODO | `sign-tracking.ts`           |
| Dé-skipper tests                         | ⬜ TODO | `edge-cases.test.ts:294,302` |

---

### Phase 6 : Formes indéterminées avancées

#### 6.1 Formes exponentielles (0^0, 1^∞, ∞^0)

- **Priorité** : Basse
- **Complexité** : Très élevée
- **Tests concernés** : 0 skipped (non testées)
- **Problème** : Ces formes sont détectées mais non résolues
- **Solution** : Transformation logarithmique + L'Hôpital

| Tâche                              | Statut  | Fichier                             |
| ---------------------------------- | ------- | ----------------------------------- |
| Implémenter lim f^g = exp(g·ln(f)) | ⬜ TODO | Nouveau `exponential-forms.ts`      |
| Gérer 0^0 : x^x quand x→0⁺         | ⬜ TODO | `exponential-forms.ts`              |
| Gérer 1^∞ : (1+1/x)^x quand x→∞    | ⬜ TODO | `exponential-forms.ts`              |
| Gérer ∞^0 : x^(1/x) quand x→∞      | ⬜ TODO | `exponential-forms.ts`              |
| Ajouter tests                      | ⬜ TODO | Nouveau `exponential-forms.test.ts` |

---

### Phase 7 : Améliorations d'architecture

#### 7.1 Performance et robustesse

- **Priorité** : Basse
- **Complexité** : Variable

| Tâche                                     | Statut  | Notes                                    |
| ----------------------------------------- | ------- | ---------------------------------------- |
| Cache pour limites déjà calculées         | ⬜ TODO | Éviter recalculs dans compositions       |
| Meilleure gestion des timeouts            | ⬜ TODO | Stratégies prioritaires selon complexité |
| Expansion de Taylor pour formes complexes | ⬜ TODO | Alternative à L'Hôpital                  |
| Support de séries asymptotiques           | ⬜ TODO | Pour limites à l'infini                  |

---

#### 7.2 Messages pédagogiques

- **Priorité** : Basse
- **Complexité** : Faible

| Tâche                                       | Statut  | Notes                                |
| ------------------------------------------- | ------- | ------------------------------------ |
| Enrichir messages pour formes indéterminées | ⬜ TODO | Expliquer pourquoi c'est indéterminé |
| Ajouter conseils de résolution              | ⬜ TODO | "Essayez de factoriser..."           |
| Améliorer step recording pour L'Hôpital     | ⬜ TODO | Montrer chaque dérivation            |

---

## Métriques de progression

| Phase                       | Tests skipped | Progression | Effort estimé      |
| --------------------------- | ------------- | ----------- | ------------------ |
| **0.1 Algèbre des infinis** | 0             | ✅ 100%     | 6h                 |
| **1.1 Constantes symbol.**  | 0             | ✅ 100%     | 1h                 |
| 1.2 Somme/produit à ∞       | 1             | 50%         | 2h (dépend de 0.1) |
| 2.1 Squeeze à ∞             | 4             | 0%          | 4h                 |
| 3.1 L'Hôpital exp/poly      | 2             | 0%          | 4h                 |
| 4.1 Valeur absolue          | 3             | 0%          | 6h                 |
| 5.1 Différence racines      | 1             | 0%          | 4h                 |
| 5.2 Dénominateur polynomial | 2             | 0%          | 6h                 |
| 6.1 Formes exponentielles   | 0\*           | 0%          | 12h                |
| **Total**                   | **15+**       | **0%**      | **~47h**           |

\*Formes exponentielles non encore testées

---

## Ordre de priorité recommandé

1. **Phase 0** (Algèbre des infinis) - **Fondamental**, débloque Phase 1.2, 2, 3
2. **Phase 1** (Quick wins) - Impact immédiat, faible effort
3. **Phase 2** (Squeeze à ∞) - Utilisé fréquemment en calcul
4. **Phase 3** (L'Hôpital amélioré) - Cas courants exp vs poly
5. **Phase 4** (Valeur absolue) - Fonction courante
6. **Phase 5** (Algèbre avancée) - Cas moins fréquents
7. **Phase 6** (Formes exponentielles) - Complexe, à réserver pour plus tard

---

## Fichiers clés à modifier

| Fichier                        | Lignes | Phases concernées |
| ------------------------------ | ------ | ----------------- |
| `sign-tracking.ts`             | 529    | **0.1**, 4.1, 5.2 |
| `composition.ts`               | 521    | **0.1**, 1.2, 4.1 |
| `evaluate.ts`                  | 749    | 1.1, 7.1          |
| `squeeze.ts`                   | 354    | 2.1               |
| `lhopital.ts`                  | 317    | 3.1               |
| `algebraic.ts`                 | 602    | 5.1, 5.2, 1.2     |
| `indeterminate.ts`             | 397    | 3.1, 6.1          |
| `one-sided.ts`                 | 447    | 4.1               |
| `known-limits.ts`              | 513    | 1.1               |
| Nouveau `exponential-forms.ts` | ~300   | 6.1               |

---

## Historique des modifications

| Date       | Phase | Description                                                                                         | Commit   |
| ---------- | ----- | --------------------------------------------------------------------------------------------------- | -------- |
| 2026-01-30 | 1.1   | Évaluation numérique des expressions constantes (ln(e)→1) + x+1/x à ∞                               | -        |
| 2026-01-30 | 0.1   | Intégration dans composition.ts + amélioration classifyAtInfinity + 12 tests d'intégration          | 27ef7c60 |
| 2026-01-30 | 0.1   | Implémentation algèbre des infinis (addSigns, subtractSigns, multiplySigns, divideSigns) + 78 tests | 27ef7c60 |
| 2026-01-30 | -     | Création du tracker                                                                                 | -        |

---

## Notes techniques

### Pattern pour ajouter une nouvelle stratégie

```typescript
// Dans evaluate.ts, ligne ~400
// Ajouter dans evaluateLimitInternal() avant "unsupported"

// Try new strategy
const newResult = tryNewStrategy(expr, variable, approach, direction, recorder);
if (newResult) return newResult;
```

### Test pattern

```typescript
// Dé-skipper un test
it.skip('description') → it('description')

// Lancer les tests
pnpm test:server src/lib/mathAST/limits/__tests__/edge-cases.test.ts -t "pattern"
```

### Validation avant commit

```bash
# Tous les tests limits doivent passer
pnpm test:server src/lib/mathAST/limits/

# Vérifier qu'aucun test existant n'a régressé
# (les 195 tests existants doivent toujours passer)
```
