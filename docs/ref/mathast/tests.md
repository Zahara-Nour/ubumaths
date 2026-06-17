---
title: 'mathAST — Audit couverture & robustesse des tests'
date: 2026-06-18
audience: 'core contributors, agent test-automator'
---

# Audit couverture & robustesse des tests — mathAST

## 1. Inventaire global

### Chiffres

| Indicateur                  | Valeur     |
| --------------------------- | ---------- |
| Fichiers de test            | **282**    |
| Cas (`it(` / `test(`)       | **12 614** |
| Fichiers source (hors test) | 430        |
| Ratio fichiers src/test     | ≈ 1 : 0,66 |

Les fichiers de test sont co-localises avec leurs sources : `src/lib/mathAST/<module>/__tests__/<nom>.test.ts`,
ou `<module>.test.ts` au meme niveau pour les fichiers racine. Pattern uniforme respecte
dans toutes les familles.

### Lancer les tests

```bash
# Tous les tests mathAST (cibler le dossier)
pnpm test:server src/lib/mathAST

# Un sous-module specifique
pnpm test:server src/lib/mathAST/normal/

# Un fichier precis
pnpm test:server src/lib/mathAST/parser/latex/__tests__/parser-pratt.test.ts

# CLI interactif (utile pour explorer les sorties CAS)
pnpm math
```

---

## 2. Couverture par famille

### 2.1 Representation & cœur — ELEVEE

`types.ts`, `factory.ts`, `flatten.ts`, `guards.ts`, `visitor.ts`, `equivalence.ts`,
`transforms.ts`, `common/` (13 fichiers), `numtype/` (13), `matrix/` (5),
`dimensional/` (4), `units/` (8), `cache/` (2).

Les invariants cles sont exerces a travers les tests d'integration des modules aval
(normal, parser, eval). `guards.ts` possede des tests directs bien fournis (incl.
`isMinusOne` → reconnaît uniquement `opposite(number('1'))`, pas `number('-1')`). Le
sign-guard de `factory.ts:255-269` (`number()` refuse les litteraux signes) est
couvert par tests unitaires.

### 2.2 Parsing — ELEVEE (18 src, 18 tests)

`parser/latex/` et `parser/custom/` : chacun son `parser-pratt.ts`, son tokenizer, son
`security.ts`. Ratio 1:1. Cas testes : LaTeX de base, `\frac`, `\sqrt`, matrices,
piecewise, virgule decimale francaise `{,}`, `\Re`/`\Im`, securite (maxInputLength,
maxASTDepth, maxNodeCount). Meme posture pour le parser Pratt custom.

### 2.3 Calcul CAS — BIEN COUVERT, inegal

| Sous-module        | Src | Tests | Ratio  |
| ------------------ | --- | ----- | ------ |
| `normal/`          | 19  | 19    | 1:1    |
| `eval/`            | 11  | 16    | 1:1.5  |
| `solve/`           | 18  | 15    | 1:0.8  |
| `domain/`          | 25  | 15    | 1:0.6  |
| `differentiation/` | 4   | 2     | 1:0.5  |
| `integration/`     | 17  | ~12   | 1:0.7  |
| `limits/`          | 14  | ~10   | 1:0.7  |
| `analysis/`        | 18  | ~10   | 1:0.6  |
| `sign/`            | 14  | **3** | 1:0.2  |
| `variations/`      | 8   | **2** | 1:0.25 |
| `taylor/`          | 3   | **1** | 1:0.3  |

`sign/`, `variations/`, `taylor/` sont les angles morts les plus nets du calcul CAS.

### 2.4 Pattern matching — BIEN COUVERT (18 src, 12 tests)

`pattern/` : `P`, `tryMatch`, `parsePattern`, wildcards, rule sets predenis.
Voir `docs/ref/mathast/pattern-matching.md` pour la reference complete. Les tests couvrent
les wildcards de base, les bindings, les conditions. Scenarios combinatoires profonds
(C(n,k)×k! au-dela de n=5) peu testes directement.

### 2.5 Couches pedagogiques — PARTIELLEMENT COUVERTES

C'est la zone a risque le plus eleve : les bugs ici affectent directement les corrections
d'exercices vus par les eleves.

| Sous-module                    | Src | Tests  | Severite du manque  |
| ------------------------------ | --- | ------ | ------------------- |
| `pedagogical-arithmetic/`      | 19  | ~8     | Medium              |
| `pedagogical-differentiation/` | 14  | ~4     | Medium              |
| `pedagogical-domain/`          | 14  | ~6     | Medium              |
| `pedagogical-evaluate/`        | 1   | 0      | Low (module simple) |
| `pedagogical-integration/`     | 15  | ~8     | Medium              |
| `pedagogical-limits/`          | 17  | ~10    | Medium              |
| `pedagogical-simplify/`        | 18  | **6**  | **High**            |
| `pedagogical-solve/`           | 28  | **13** | **High**            |
| `step-generator/`              | 3   | ~2     | Medium              |

`pedagogical-simplify/` (18 fichiers, 6 tests) et `pedagogical-solve/` (28 fichiers,
13 tests) sont les plus sous-testes au regard de leur impact : ce sont eux qui
produisent les etapes pas-a-pas affichees a l'eleve lors des corrections.

### 2.6 CLI — COUVERT (45 src, 26 tests)

`cli/` : outil `pnpm math`, completion, stats. Tests unitaires et d'integration.

---

## 3. Angles morts identifies

### 3.1 Sous-modules a faible couverture directe

| Fichier / Sous-module                     | Risque   | Raison                                               |
| ----------------------------------------- | -------- | ---------------------------------------------------- |
| `sign/` (14 src, 3 tests)                 | **High** | Pilote les tableaux de signe → correction eleve      |
| `variations/` (8 src, 2 tests)            | **High** | Pilote les tableaux de variations → correction eleve |
| `taylor/` (3 src, 1 test)                 | Medium   | Usages avances, moins frequent                       |
| `pedagogical-solve/` (28 src, 13 tests)   | **High** | Etapes de resolution pas-a-pas                       |
| `pedagogical-simplify/` (18 src, 6 tests) | **High** | Etapes de simplification pas-a-pas                   |
| `differentiation/` (4 src, 2 tests)       | Medium   | Tests symboliques de base, manquent les cas composes |

### 3.2 Known issues du parser a couvrir par tests de non-regression

1. **Moins unaire** : `parseLatex('-3y')` produit `multiplication(opposite(3), y)` au lieu
   de `opposite(multiplication(3, y))`. Numeriquement identique, mais la structure AST
   differe. Les analyses structurelles (`extractAffineCombination`, etc.) doivent gerer
   `opposite` enfoui. Pas de fix parser prevu (risque d'effets de bord). Ajouter un test
   de non-regression explicite dans `parser/latex/__tests__/`.

2. **Slash apres exposant** : `x^2/4` provoque une erreur dans `parseCustomPratt`
   (workaround : `{x^2}/4` ou `(x^2)/4`). A couvrir dans `parser/custom/__tests__/`.

### 3.3 Cas limites manquants dans le calcul CAS

**`sign/`**

- Analyse de signe d'une expression avec plusieurs racines carrees
- Signe d'un produit avec un facteur `opposite` enfoui (cf. known issue parser)
- `analyzeSign` sur une expression constante nulle

**`variations/`**

- Fonction constante sur un intervalle borne
- Variations avec un point d'inflexion non critique
- Interaction `variations` × domaine restreint

**`taylor/`**

- Developpement d'une fonction non derivable en 0 (ex. `|x|`) — verifier le comportement
- Ordre eleve (n ≥ 5) sur une fraction rationnelle

**`pedagogical-solve/`**

- Etape avec denominateur nul (equation impossible)
- Systeme 2×2 avec solutions non entieres
- Cas palier 2b (inequation quadratique) — points limites du discriminant

**`analysis/singularity-warn.ts:315`** : swallow de tous les throws — ajouter au moins
un test qui verifie que le module ne laisse pas passer silencieusement une valeur
incorrecte.

---

## 4. Qualite des assertions

### Points forts

- Les tests `normal/` et `parser/` vont jusqu'au snapshot LaTeX ou a `toEqual` sur la
  structure AST complete — assertions substantielles.
- `eval/` et `solve/` verifient des valeurs numeriques attendues avec `toBeCloseTo` (precision 1e-9).
- `domain/` verifie les intervals exacts (open/closed, bornes symboliques).

### Tests superficiels identifies

- Certains tests `pedagogical-*` assertent uniquement `not.toThrow()` ou la presence
  d'au moins une etape (`steps.length > 0`) sans verifier le contenu des etapes.
- Les tests CLI (`cli/`) sont majoritairement des tests d'integration de bout en bout
  (parse → evalue → affiche) sans verification de chaque nœud intermediaire.

### Tests couples a l'implementation

- Les snapshots LaTeX dans `normal/` et `latex-generator/` casseront si la serialisation
  change d'ordre canonique — normal par design, mais a signaler lors de PRs modifiant
  `normal/monomial.ts` ou `latex-generator.ts`.

---

## 5. Tests d'integration vs unitaires

| Categorie                                            | Estimation | % du total |
| ---------------------------------------------------- | ---------- | ---------- |
| Unitaires purs (1 fonction)                          | ~3 000     | ~24 %      |
| Integration module (parse → eval / parse → simplify) | ~7 500     | ~59 %      |
| Integration pedagogique (parse → palier → etapes)    | ~1 500     | ~12 %      |
| CLI / bout-en-bout                                   | ~614       | ~5 %       |

La base est solide dans les couches basses (normal, parser). Le desequilibre s'inverse
dans les couches pedagogiques : trop peu d'unitaires bas-niveau, couverture principalement
par integration.

---

## 6. Performance des tests

Aucun test identifie comme clairement > 1s en isolation. Les risques de flakiness
concernent :

- Tests `sign/` sur des expressions complexes avec beaucoup de ramifications.
- Tests `pedagogical-solve/` avec de nombreux paliers — duree cumulee a surveiller.
- `cli/__tests__/` si la boucle de test charge les parsers en serie.

---

## 7. Top priorites pour renforcer la couverture

### 1. `sign/` — PRIORITE CRITIQUE

Creer `sign/__tests__/sign-analysis.test.ts`. Cas minimaux :

- Signe de `opposite(x^2 + 1)` sur R → toujours negatif
- Signe de `(x-1)(x+2)` → tableau avec zeros en x=-2 et x=1
- Signe d'un produit avec `opposite` enfoui (regression known issue parser)

### 2. `variations/` — PRIORITE CRITIQUE

Ajouter a `variations/__tests__/` des tests qui verifient le tableau complet :

- `x^2` sur [-2, 2] → decroissant puis croissant, min en 0
- Fonction constante → une seule ligne "constante"
- Cas avec asymptote verticale dans le domaine

### 3. `pedagogical-solve/` — PRIORITE ELEVEE

Ajouter des tests qui verifient la structure des etapes produites (pas juste `not.toThrow`) :

- Chaque etape a un `type`, un `latex`, et un `explanation` non vides
- Le cas "discriminant = 0" produit une solution double bien formatee
- Le palier 2b (inequation quadratique) produit les bornes correctes

### 4. `pedagogical-simplify/` — PRIORITE ELEVEE

Meme approche : assertions sur la structure des etapes, pas seulement leur existence.

- Simplification d'une fraction avec facteur commun au numerateur et denominateur
- Reduction d'une somme de radicaux (`\sqrt{2} + \sqrt{2}`)

### 5. Known issues parser — tests de non-regression

Deux tests a ajouter dans `parser/latex/__tests__/` et `parser/custom/__tests__/` :

```typescript
// Regression: known issue — unary minus structure
it('parseLatex: -3y has opposite(3) as left factor, not opposite(3y)', () => {
	const node = parseLatex('-3y');
	// multiplication(opposite(number('3')), variable('y'))
	expect(node.type).toBe('multiplication');
	expect((node as MultiplicationNode).left.type).toBe('opposite');
});

// Regression: known issue — slash after exponent in custom parser
it('parseCustom: {x^2}/4 parses correctly (workaround for x^2/4)', () => {
	expect(() => parseCustom('{x^2}/4')).not.toThrow();
});
```

---

## 8. Recommandations strategiques

1. **Priorite pedagogique** : les couches `sign/`, `variations/`, `pedagogical-solve/`,
   `pedagogical-simplify/` pilotent directement ce que voit l'eleve dans les corrections.
   Un bug ici = un eleve qui recoit une correction erronee. Ce sont les tests les plus
   urgents, avant meme les tests de performance.

2. **Convention non-regression** : adopter le commentaire standardise sur les tests issus
   de bugs connus :

   ```typescript
   // Regression: known issue — <description courte> (doc: code-quality.md §X)
   ```

3. **Property-based sur le CAS** : des proprietes mathematiques verifiables sont disponibles
   sans reference externe :
   - `differentiate(integrate(f, x), x)` ≈ `f` (theoreme fondamental, sur fonctions simples)
   - `sign(x^2 + 1)` = toujours positif (sur R)
   - `evaluate(normalizeExtended(expr)) ≈ evaluate(expr)` (invariant de la NormalForm)
