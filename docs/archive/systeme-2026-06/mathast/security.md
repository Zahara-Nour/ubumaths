---
title: Audit de securite — module mathAST
date: 2026-06-18
author: security-auditor agent
posture: Acceptable
---

# Audit de securite — `src/lib/mathAST/`

## Resume executif

`mathAST` est une bibliotheque de calcul symbolique pure : pas de DB, pas d'auth, pas de reseau. Sa surface d'attaque se limite a la **robustesse face aux entrees mathematiques malformees ou malicieuses**. La posture est **Acceptable** : aucun `eval`/`new Function` JS, parsers ecrits main (scan char-par-char), infrastructure de caps dediee. Un gap de severite moyenne subsiste : la garde de profondeur AST est verifiee post-parse, pas in-parse, ce qui laisse une fenetre pour un `RangeError` JS avant que la limite ne soit evaluee.

---

## 1. Surface d'attaque

### Points d'entree externes

| Point d'entree                                  | Chemin                                 | Notes                                              |
| ----------------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| `parseLatex(input)`                             | Latex saisie par l'eleve dans MathLive | Premiere ligne de defense — caps via `security.ts` |
| `parseCustom(input)` / `parseCustomSafe(input)` | Expressions custom (CLI, templates)    | Meme infrastructure de caps                        |
| `evaluate(node, bindings)`                      | Evaluation numerique d'un AST          | Garde `MAX_EVAL_DEPTH` interne                     |
| `normalize(node, opts)` / `simplify(node)`      | Calcul CAS sur AST                     | Abort opt-in via `timeoutMs`                       |
| CLI `pnpm math`                                 | Entree REPL interactif                 | `parseCustomSafe` + caps propres                   |

Les **eleves** passent uniquement par `parseLatex` (via MathLive). Le CAS (`normalize`, `simplify`, `solve`) est appele sur des ASTs deja parses — la surface brute utilisateur est donc le parser.

---

## 2. Infrastructure de securite — ce qui est en place

### 2.1 `parser/security.ts` — caps par defaut

Fichier dedie `parser/security.ts` exporte `SecurityError` (code : `INPUT_TOO_LONG` | `AST_TOO_DEEP` | `AST_TOO_MANY_NODES`) et les options par defaut :

```typescript
// parser/security.ts:84-86
maxInputLength: 10000,  // caracteres
maxASTDepth:    100,    // profondeur d'imbrication
maxNodeCount:   10000   // nombre total de noeuds
```

Ces caps sont appliques par `getEffectiveSecurityOptions()` dans les 4 parsers (latex Pratt, custom Pratt, et leurs variantes `Safe`). Un appelant peut les reduire — pas les supprimer.

### 2.2 `common/abort.ts` — timeout cooperatif

`makeAbortChecker(signal?, timeoutMs?)` construit un checker synchrone interrogeable a chaque etape du calcul. Contrairement a `AbortSignal.timeout()`, il est base sur `performance.now()` et fonctionne en code synchrone (cf. commentaire `abort.ts:9-12`). `rewriting-engine.ts` appelle `checkAbort` a chaque iteration.

### 2.3 Aucun `eval` / `new Function` JS

Le module `eval/` de mathAST est une **evaluation d'expression symbolique**, pas une execution JS. `evaluate.ts` parcourt l'AST avec des branches `if (isAddition)` / `if (isFunction)` et une whitelist de fonctions mathematiques. Aucune chaine n'est passee a `eval` ou `Function`. Verifie : `grep -rn "eval(\|new Function(" src/lib/mathAST --include="*.ts"` = 0 match hors tests.

### 2.4 `eval/evaluate.ts` — garde de recursion

`evaluate.ts:76` : `MAX_EVAL_DEPTH = 100`. Verifie pendant la recursion (`evaluate.ts:432`). Correct : la garde fire avant que la pile JS ne soit epuisee pour les expressions bien formees.

### 2.5 `rational.ts` — overflow BigInt

`rational.ts:597` : `floatToRational` plafonne le scale a `10^300`, evitant les BigInt hors bornes. La precision `PrecisionType` provient de la configuration des questions (non user-brut), donc hors perimetre immediatement. Ajouter un `.max()` Zod si ce champ devient user-controlled.

### 2.6 CLI / REPL

Caps dedies : `MAX_STATS_VALUES = 1000`. Passe systematiquement par `parseCustomSafe` / `parseLatexSafe` (versions qui retournent un `Result` au lieu de thrower). Pas de surface directe pour un attaquant non authentifie.

### 2.7 Pas de ReDoS

Les tokenizers LaTeX et custom sont des scanners char-par-char, pas des moteurs de regex sur l'entree complete. Les quelques regex utilisees sont simples et ancrees. Pas de risque de ReDoS identifie.

### 2.8 `measureAST` — BFS iteratif

La fonction qui verifie la profondeur et le nombre de noeuds pour `checkASTSecurity` utilise un BFS iteratif (pas recursif) : elle ne peut pas elle-meme provoquer un stack overflow, quelle que soit la taille de l'AST.

---

## 3. Gap identifie — [MED]

### 3.1 Garde de profondeur post-parse

**Fichiers** : `parser/security.ts`, `parser/latex/parser-pratt.ts:2259,2320`

`checkASTSecurity` est appelee **apres** que `parser.parse()` a termine, pas pendant le parsing :

```typescript
// parser/latex/parser-pratt.ts:2318-2320
const result = parser.parse(); // parse recursif d'abord
checkASTSecurity(result, security); // check APRES
```

Le cap `maxASTDepth: 100` ne fire donc que sur l'AST deja construit. Une entree pathologique de moins de 10 000 caracteres mais avec ~5 000 niveaux d'imbrication (ex. `(((((...))))` bien ferme, qui passe le cap `maxInputLength`) peut provoquer un `RangeError: Maximum call stack size exceeded` **avant** que `checkASTSecurity` soit atteint.

**Impact reel** : crash synchrone du parse, pas d'execution de code arbitraire (pas de RCE). L'appelant recoit une exception non tipee plutot qu'une `SecurityError` avec code explicite. Une page qui ne gere pas ce cas peut afficher une erreur generique a l'eleve.

**Fix correct** : compter la profondeur courante pendant la descente recursive du parser et lever une `SecurityError('AST_TOO_DEEP')` avant de descendre plus loin.

**Workaround immediat** : wrapper l'appel parser dans un `try/catch` qui convertit les `RangeError` en `SecurityError` cote appelant.

---

## 4. Points de vigilance [LOW / INFO]

### 4.1 CAS sans timeout par defaut

`normalize()`, `simplify()`, `equivalence()` acceptent un `timeoutMs` opt-in via `NormalizeAbortOptions`, mais **ne l'appliquent pas par defaut**. Sur des entrees non fiables (ex. expression syntaxiquement valide mais semantiquement pathologique pour le fixpoint de normalisation), le calcul peut tourner plusieurs secondes synchrones.

`rewriting-engine.ts` borne les iterations par `maxIterations` et verifie `checkAbort` a chaque iteration — la boucle n'est pas infinie. Mais sans `timeoutMs`, un `maxIterations` eleve sur une expression lourde bloque le thread.

**Recommandation** : passer `{ timeoutMs: 2000 }` (ou moins) sur tout appel CAS declenche par une entree utilisateur directe (question-gen, correction).

### 4.2 `analysis/singularity-warn.ts:315` — swallow silencieux

Le commentaire de ce fichier documente explicitement que toute exception de l'analyse de continuite est avalee silencieusement (`"swallowed silently"`). C'est un choix delibere (la fonction est consultative). A surveiller si la logique de `classifyDiscontinuities` est etendue avec des cas pathologiques non anticipes.

---

## 5. Synthese des findings

| #   | Severite  | Fichier                        | Lignes     | Description                                                                                                      |
| --- | --------- | ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **[MED]** | `parser/latex/parser-pratt.ts` | 2259, 2320 | Garde de profondeur post-parse : `RangeError` possible avant `SecurityError` sur imbrication profonde            |
| 2   | [LOW]     | `normal/normalize.ts`          | 124, 4117  | `timeoutMs` opt-in uniquement — CAS sans timeout par defaut sur entrees non fiables                              |
| 3   | [LOW]     | `eval/evaluate.ts`             | 76, 432    | `MAX_EVAL_DEPTH = 100` correct mais hardcode — non configurable par l'appelant                                   |
| 4   | [INFO]    | `analysis/singularity-warn.ts` | 315        | Swallow silencieux de toutes les exceptions d'analyse de continuite                                              |
| 5   | [INFO]    | `normal/rational.ts`           | 597        | `floatToRational` plafond `10^300` — suffisant, mais `PrecisionType` non range-valide si user-controlled un jour |

---

## 6. Controles positifs confirmes

- **Zero `eval`/`new Function`** dans tout le pipeline de parsing et d'evaluation.
- **Caps par defaut** (`maxInputLength: 10000`, `maxASTDepth: 100`, `maxNodeCount: 10000`) appliques automatiquement par `getEffectiveSecurityOptions`.
- **`measureAST` BFS iteratif** — le verifieur de securite lui-meme ne peut pas stack-overflow.
- **Abort cooperatif** via `common/abort.ts` — compatible `AbortSignal` externe (Web Worker, fetch).
- **Bornes `rewriting-engine`** : `maxIterations` + `checkAbort` par iteration — boucle de réécriture non infinie.
- **CLI caps propres** : `MAX_STATS_VALUES = 1000`, parsers `Safe` partout.
- **Pas de ReDoS** : scanners char-par-char, pas de regex complexes sur entree libre.

---

## 7. Roadmap de remediation

| Priorite                                            | Action                                                                                                                                              | Effort |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1 (moyen terme)                                     | Compteur de profondeur in-parse dans les deux `parser-pratt.ts` (latex + custom) pour lever `SecurityError('AST_TOO_DEEP')` avant le stack overflow | 2–4h   |
| 2 (recommandation usage)                            | Documenter et appliquer `{ timeoutMs: 2000 }` sur tous les appels CAS declenches par entrees eleve                                                  | < 1h   |
| 3 (low, si `PrecisionType` devient user-controlled) | Ajouter `.min(1).max(15)` sur le champ `digits` de la config                                                                                        | 15 min |
