# Prompt : intégration des steppers pédagogiques aux corrections de questions

> **Source** : continuation de `docs/wip/pedagogical-steppers-mvp-prompt.md` (MVP infrastructure) + `docs/wip/pedagogical-arithmetic-prompt.md` (pipeline arithmétique).
> **Périmètre** : faire voir aux élèves les corrections étape-par-étape générées automatiquement (~6-10h).

## Contexte

Tout le travail backend est livré et utilisable :

- **Infrastructure générique** (commits `828668976`, `7a6b8a232`, `252434494`, `1b8cb8a28`) : `mathAST/common/rewriting-engine.ts`, `step-renderer-base.ts`, `technical-renderer.ts`, types `RenderedStep`, `PedagogicalRenderOptions`, `SchoolLevel`
- **Pipeline pédagogique pour équations linéaires** (`pedagogical-solve/`) : `generateLinearEquationSteps(equation, options)` + `LinearEquationRenderer`, 21 cas snapshot, démo CLI
- **Pipeline pédagogique pour arithmétique complet** (`pedagogical-arithmetic/`) : `generatePedagogicalArithmeticSteps(node, options)` + `PedagogicalArithmeticRenderer`, 24 cas snapshot, démo CLI, support `PedagogicalTarget` + `answerFormat` extraction
- **Renderer pédagogique pour solve algorithmique** (`solve/pedagogical-renderer.ts`) : `SolvePedagogicalRenderer` adapté SchoolLevel
- **`extractPedagogicalTarget(instance, blank?, expressionName?)`** : extraction effective des paramètres question vers un `PedagogicalTarget`

**MAIS** : aucune question ne consomme tout ça. Les corrections affichées aux élèves sont toujours des templates texte manuels écrits par les auteurs (mode A). Il manque la **glue** entre le pipeline et l'expérience élève.

## Vision

Permettre aux auteurs de questions de déclarer, en plus du mode manuel existant, un mode "correction générée automatiquement" :

```typescript
// Mode A — manuel (existant, conservé tel quel)
correction: {
  steps: ['Étape 1: {{a}} + {{b}} = {{eval:a+b}}', ...]
}

// Mode B — généré (NOUVEAU)
correction: {
  generatedSteps: {
    kind: 'arithmetic' | 'solve' | 'arithmetic-from-expression',
    expression: '{{a}}+{{b}}*{{c}}',
    options?: { schoolLevel?: 'auto' | SchoolLevel, verbosity?: 'detailed' | 'summarized' }
  }
}
```

L'élève voit une correction étape par étape adaptée à son niveau, sans que l'auteur ait écrit chaque étape à la main.

## Périmètre MVP

Le prompt livre :

1. **Schéma de type** : `QuestionCorrection.generatedSteps` discriminé par domaine
2. **Glue côté serveur** : génération à la demande (pas dans `validateAnswer`, mais à l'affichage de la correction)
3. **Composant Svelte** : `<GeneratedStepsCorrection>` qui consomme un objet `generatedSteps` et appelle le bon pipeline
4. **Cohérence avec `requiredForm` / `precision` / etc.** : l'extraction `PedagogicalTarget` est utilisée pour orienter les étapes
5. **Migration de 2-3 questions tests** pour démo end-to-end visible côté élève
6. **Coexistence pure** : Mode A (steps manuels) reste prioritaire si présent, Mode B utilisé sinon

**Estimation : 8-10h** (un peu plus que les 6-8h initialement estimés pour couvrir la migration des questions tests et le composant Svelte).

## Phases d'exécution

### Phase 0 — Spécification TDD (obligatoire avant tout code)

Conformément à `CLAUDE.md`, **proposer les comportements en français à l'utilisateur** et attendre validation.

#### Comportements à proposer

````markdown
## Fonctionnalité : intégration steppers pédagogiques aux corrections

### A. Schéma `QuestionCorrection.generatedSteps`

Type union discriminé par domaine :

interface QuestionCorrection {
feedback?: { correct?, incorrect?, partial? };
steps?: TemplateMarkdown[]; // Mode A — manuel (existant)
generatedSteps?: GeneratedSteps; // Mode B — généré (NOUVEAU)
}

type GeneratedSteps =
| { kind: 'arithmetic'; expression: string; options?: GeneratedStepsOptions }
| { kind: 'arithmetic-from-blank'; blankIndex?: number; options?: GeneratedStepsOptions }
| { kind: 'solve'; equation: string; options?: GeneratedStepsOptions }
| { kind: 'linear-equation'; equation: string; options?: GeneratedStepsOptions };

interface GeneratedStepsOptions {
schoolLevel?: 'auto' | SchoolLevel; // 'auto' = déduit de gradeLevel
verbosity?: 'detailed' | 'summarized'; // défaut 'detailed'
format?: 'latex' | 'custom'; // défaut 'latex' pour MathLive
}

### B. Génération côté serveur

`generateInstance()` (existant) ne change PAS son comportement par défaut.
Une nouvelle fonction `generateCorrection(instance)` peut être appelée
explicitement avant le rendu côté client. Elle :

1. Lit `instance.correction.generatedSteps`
2. Si présent, appelle le bon pipeline avec l'expression résolue (variables substituées)
3. Pré-rend les RenderedStep[] et les attache au `instance.correction._renderedSteps?: RenderedStep[]`
4. Le composant Svelte les affiche directement

Avantages : pas de calcul lourd au client, snapshot stable à l'instanciation.
Alternative envisageable : génération côté client à l'affichage (plus lazy mais
calcul à chaque vue). On choisit serveur en V1 pour cohérence et performance.

### C. Composant Svelte `<GeneratedStepsCorrection>`

Localisation : `src/lib/components/questions/GeneratedStepsCorrection.svelte`

Props :

- `steps: RenderedStep[]` — pré-rendu serveur
- `verbosity?: 'detailed' | 'summarized'` — control utilisateur (peut overrider le pré-rendu)
- `interactive?: boolean` — si true, boutons "étape suivante" / "tout afficher"

Rendu :

- Liste des étapes avec titre + équation LaTeX (via MathLive ou markdown)
- En mode `interactive`, étapes affichées une par une avec bouton "Suivant"
- Coloration des transformations (bleu pour le sub-tree opéré, déjà supporté
  par les renderers pédagogiques via `\textcolor{blue}{...}`)

### D. Cohérence avec `CorrectionCard.svelte`

Le composant existant `CorrectionCard.svelte` (qui affiche `correction.steps` manuels)
est étendu :

- Si `instance.correction._renderedSteps` est présent (Mode B) → afficher `<GeneratedStepsCorrection>`
- Sinon si `instance.correction.steps` est présent (Mode A) → afficher comme aujourd'hui (markdown)
- Sinon → pas d'étapes (juste feedback)

Si LES DEUX sont présents (cas exotique) : afficher Mode A (manuel a priorité,
explicite > implicite). Documenter ce choix.

### E. Migration de 2-3 questions tests pour démo

Choisir 2-3 questions existantes de différents types (calcul arithmétique,
équation linéaire) et :

- Remplacer leur `correction.steps` manuel par `correction.generatedSteps`
- Vérifier visuellement le rendu côté élève
- Documenter le before/after dans la doc de progression

### F. Hors scope MVP

- Composant interactif avancé (animations, déroulement séquentiel automatique)
- Configuration côté éditeur (UI pour créer un `generatedSteps` dans `QuestionTemplateForm.svelte`) — c'est de l'écriture pure JSON pour V1
- Génération côté client (lazy à l'affichage) — V1 = serveur uniquement
- Différentiation, intégration symbolique (autres domaines) — pipelines pas encore créés
- Hybridation Mode A + Mode B (afficher les deux) — choix : Mode A prioritaire, point.

### Questions à trancher en Phase 0

1. **Localisation de `generateCorrection()`** : `src/lib/questions/generator/correction-generator.ts` (nouveau) OU extension de `instance-generator.ts` ?

   - Reco : nouveau fichier dédié, séparation des responsabilités.

2. **`schoolLevel: 'auto'`** : déduit comment de `instance.gradeLevel` ?

   - Reco : mapping `GradeCode → SchoolLevel` (CP-CM2 → primaire, 6-3 → college, 2-T → lycee, post-bac → superieur). Centraliser dans `gradeLevel-to-schoolLevel.ts`.
   - Si `gradeLevel` absent, fallback `'lycee'`.

3. **Format de rendu LaTeX** : MathLive (composant `<math-field readonly>`) OU `katex` OU MarkdownRenderer existant ?

   - Reco : MarkdownRenderer existant (cohérent avec `correction.steps` manuels qui sont déjà en markdown LaTeX). Réutilisation maximale.

4. **`kind: 'arithmetic-from-blank'`** : inférer l'expression depuis le `blank.expectedAnswer` ou depuis `instance.expressions[]` ?

   - Reco : depuis `expressions[]` si présent, fallback `expectedAnswer`. Le mapping blank↔expression existe via `<<expr:NAME>>` dans `assign-blank-indices.ts`.

5. **Stockage de `_rendered Steps` côté serveur** : ajouté à l'`InstanceCorrection` (modification de type) OU calculé à la volée à chaque rendu ?

   - Reco : ajouter `_renderedSteps?: readonly RenderedStep[]` à `QuestionCorrection`. Préfixé `_` pour signifier "computed, not authored". Calculé une fois à `generateCorrection()`.

6. **Composant interactif** : V1 = liste passive (toutes les étapes visibles d'un coup) OU déjà `interactive` avec bouton "Suivant" ?

   - Reco : V1 passive. Interactivité = post-prompt si demandé.

7. **Erreurs de génération** : si le pipeline plante (ex : expression non parsable), que voit l'élève ?

   - Reco : fallback silencieux sur le mode A (`steps` manuels) si présent, sinon vide (juste feedback). Erreur loggée côté serveur pour debug auteur.

8. **Migration des questions tests** : quels candidats spécifiques ?
   - Reco : 1 question d'addition simple (primaire), 1 question avec multiplication+addition (collège), 1 question d'équation linéaire (4e/3e). Choisis dans le banc existant.

**ATTENDRE LA VALIDATION DE L'UTILISATEUR avant de passer à la Phase 1.**

---

### Phase 1 — Schéma de type + Mapping gradeLevel→SchoolLevel (1.5-2h)

#### 1.1 Étendre `questions/types.ts`

```typescript
import type { RenderedStep, SchoolLevel } from '$lib/mathAST/common/step-renderer-base';

export interface QuestionCorrection {
	feedback?: {
		correct?: TemplateMarkdown;
		incorrect?: TemplateMarkdown;
		partial?: TemplateMarkdown;
	};
	steps?: TemplateMarkdown[]; // Mode A — manuel (existant)
	generatedSteps?: GeneratedSteps; // Mode B — déclaration (NOUVEAU)
	/**
	 * Étapes pré-rendues calculées par generateCorrection().
	 * Préfixé `_` pour signifier "computed, not authored by template".
	 * Présent uniquement si generatedSteps est défini ET la génération a réussi.
	 */
	_renderedSteps?: readonly RenderedStep[];
}

export type GeneratedSteps =
	| {
			readonly kind: 'arithmetic';
			readonly expression: string;
			readonly options?: GeneratedStepsOptions;
	  }
	| {
			readonly kind: 'arithmetic-from-blank';
			readonly blankIndex?: number;
			readonly options?: GeneratedStepsOptions;
	  }
	| { readonly kind: 'solve'; readonly equation: string; readonly options?: GeneratedStepsOptions }
	| {
			readonly kind: 'linear-equation';
			readonly equation: string;
			readonly options?: GeneratedStepsOptions;
	  };

export interface GeneratedStepsOptions {
	readonly schoolLevel?: 'auto' | SchoolLevel;
	readonly verbosity?: 'detailed' | 'summarized';
	readonly format?: 'latex' | 'custom';
}
```
````

#### 1.2 Étendre le schéma Zod `template-schema.ts`

Ajouter le schéma pour `generatedSteps` (discriminated union via `z.discriminatedUnion('kind', [...])`).

#### 1.3 Helper `gradeLevelToSchoolLevel(grade: GradeCode): SchoolLevel`

Localisation : `src/lib/questions/grade-level-to-school-level.ts`

Mapping :

- CP, CE1, CE2, CM1, CM2 → `'primaire'`
- 6, 5, 4, 3 → `'college'`
- 2, 1, T (toutes spécialités) → `'lycee'`
- Toutes autres → `'lycee'` (fallback)

Tests unitaires : 5-10 cas couvrant tous les niveaux.

---

### Phase 2 — Glue côté serveur : `generateCorrection()` (2-2.5h)

#### 2.1 Nouveau fichier `src/lib/questions/generator/correction-generator.ts`

```typescript
import type { QuestionInstance, QuestionCorrection, GeneratedSteps } from '../types';
import { generatePedagogicalArithmeticSteps, PedagogicalArithmeticRenderer, extractPedagogicalTarget } from '$lib/mathAST/pedagogical-arithmetic';
import { generateLinearEquationSteps, LinearEquationRenderer } from '$lib/mathAST/pedagogical-solve';
import { gradeLevelToSchoolLevel } from '../grade-level-to-school-level';
import { parseLatex } from '$lib/mathAST/parser';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';

/**
 * Generate the rendered correction steps from `instance.correction.generatedSteps`.
 * Returns a new instance with `correction._renderedSteps` populated.
 * Falls back to the original instance if generatedSteps is absent or generation fails.
 */
export function generateCorrection(instance: QuestionInstance): QuestionInstance {
  const gen = instance.correction?.generatedSteps;
  if (!gen) return instance;

  try {
    const schoolLevel = resolveSchoolLevel(gen.options?.schoolLevel, instance);
    const verbosity = gen.options?.verbosity ?? 'detailed';

    let renderedSteps: readonly RenderedStep[];

    switch (gen.kind) {
      case 'arithmetic':
      case 'arithmetic-from-blank': {
        const expression = resolveExpression(gen, instance);
        const node = parseLatex(expression);
        const target = extractPedagogicalTarget(instance, blank?, expressionName?);
        const result = generatePedagogicalArithmeticSteps(node, { schoolLevel, target });
        const renderer = new PedagogicalArithmeticRenderer();
        renderedSteps = renderer.renderAll(result.steps, { schoolLevel, verbosity });
        break;
      }
      case 'linear-equation':
      case 'solve': {
        // Similar with generateLinearEquationSteps + LinearEquationRenderer
        // ...
      }
    }

    return {
      ...instance,
      correction: { ...instance.correction!, _renderedSteps: renderedSteps }
    };
  } catch (e) {
    // Log for author debugging, fall back silently
    console.warn(`[generateCorrection] failed for ${instance.templateId}:`, e);
    return instance;
  }
}
```

#### 2.2 Tests unitaires

`src/lib/questions/generator/__tests__/correction-generator.test.ts` :

- 1 test par `kind` de `GeneratedSteps`
- Test de fallback silencieux sur erreur de parsing
- Test de cohérence `extractPedagogicalTarget` → orientation des étapes
- Test de `schoolLevel: 'auto'` avec différents `gradeLevel`

#### 2.3 Intégration au pipeline d'instanciation

Décision Phase 0 : appel explicite à `generateCorrection()` après `generateInstance()` ?
OU intégration automatique dans `generateInstance()` ?

**Reco** : appel explicite, opt-in. `generateInstance()` reste léger ; les callers
qui veulent les `_renderedSteps` appellent `generateCorrection(instance)` après.

---

### Phase 3 — Composant Svelte `<GeneratedStepsCorrection>` (3-3.5h)

#### 3.1 Nouveau composant

Localisation : `src/lib/components/questions/GeneratedStepsCorrection.svelte`

```svelte
<script lang="ts">
	import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	interface Props {
		steps: readonly RenderedStep[];
		verbosity?: 'detailed' | 'summarized';
	}

	let { steps, verbosity = 'detailed' }: Props = $props();

	// Step rendering : title (toujours) + explanation (si detailed) + expressionLatex
</script>

<div class="generated-steps">
	{#each steps as step, i (step.id)}
		<div class="step">
			<div class="step-header">
				<span class="step-number">Étape {i + 1}</span>
				<span class="step-title">{step.title}</span>
			</div>
			{#if step.expressionLatex}
				<div class="step-expression">
					<MarkdownRenderer content={`$$${step.expressionLatex}$$`} />
				</div>
			{/if}
			{#if verbosity === 'detailed' && step.explanation}
				<div class="step-explanation">{step.explanation}</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* Styles cohérents avec le design system existant */
</style>
```

#### 3.2 Étendre `CorrectionCard.svelte`

`CorrectionCard.svelte:76-87` actuel construit le markdown depuis `correction.steps`.
À étendre pour gérer le cas Mode B :

```typescript
const useGeneratedSteps = $derived.by(() => {
	return answerResult.instance.correction?._renderedSteps !== undefined;
});
```

Si `useGeneratedSteps`, rendre `<GeneratedStepsCorrection steps={...} />` au lieu du markdown.

#### 3.3 Tests visuels

- Snapshot test ou screenshot Playwright sur 2-3 cas
- Vérification que Mode A inchangé (pas de régression sur les questions actuelles)
- Vérification que Mode B s'affiche correctement avec étapes colorées

---

### Phase 4 — Migration de 2-3 questions tests (1h)

#### 4.1 Sélection des candidates

Fouiller dans le banc de questions existant pour 3 candidates :

- Question simple d'addition (primaire) — pour démontrer le rendu primaire
- Question avec multiplication+addition (collège) — pour démontrer le grouping
- Question d'équation linéaire (4e/3e) — pour démontrer `kind: 'linear-equation'`

Si aucune candidate idéale n'existe : créer des questions dédiées dans
`src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`.

#### 4.2 Migration

Pour chaque candidate :

- Avant : `correction: { steps: ['...'] }`
- Après : `correction: { generatedSteps: { kind: '...', expression: '...' } }`

Vérifier visuellement (test ou prévisualisation locale) :

- Étapes générées correspondent à la pédagogie attendue
- SchoolLevel auto-déduit correctement depuis `gradeLevel`
- Cohérence avec `requiredForm` si présent

#### 4.3 Documentation

Capturer 2-3 captures d'écran (avant / après) à inclure dans
`docs/wip/correction-integration-progress.md`.

---

### Phase 5 — Quality checks + commit (1h)

#### Tests régression

- `pnpm test:server src/lib/questions src/lib/mathAST/pedagogical-arithmetic src/lib/mathAST/pedagogical-solve` : 0 régression
- Tests existants `correction-resolver.ts`, `instance-generator.ts` : inchangés

#### Quality checks à la FIN

- `npx eslint <fichiers modifiés>`
- `pnpm check:incremental`
- `mcp__svelte__svelte-autofixer` sur `GeneratedStepsCorrection.svelte` et `CorrectionCard.svelte`

#### Doc de progression

`docs/wip/correction-integration-progress.md` (modèle des autres progress docs).

#### Commit via `commit-manager` agent

Suggéré : `feat(questions): integrate pedagogical steppers into question corrections`

---

## Hors scope (à NE PAS faire dans ce prompt)

- **Différentiation, intégration symbolique** : pipelines non encore créés (autre prompt)
- **Renderers pédagogiques pour autres domaines** (limits, matrix, domain) : pipelines pas encore créés
- **UI éditeur de questions** pour créer un `generatedSteps` via formulaire — V1 = écriture JSON manuelle ou via migration
- **Composant interactif** (animations, déroulement séquentiel) — V1 = liste passive
- **Génération côté client lazy** — V1 = serveur uniquement (snapshot stable)
- **Hybridation Mode A + Mode B** : si les deux sont définis, Mode A gagne (point)
- **Internationalisation** : les RenderedStep sont en français (renderers actuels en FR uniquement)
- **`SymbolicComputation` enum, `NormalizeTarget`** : extensions Poincaré orthogonales
- **TODOs post-prompt arithmétique** (`expressionName` dans InstanceBlank, fractions sous-niveau, radicaux niveau 3 avancé, etc.) — autre prompt

## Décisions architecturales validées (issues des sessions précédentes)

### A. Pas de breaking change

Les questions existantes avec `correction.steps` (mode A) continuent de fonctionner exactement comme avant. Le mode B est purement additif.

### B. Mode A prioritaire si les deux définis

Si une question définit BOTH `steps` et `generatedSteps`, Mode A gagne (l'auteur a explicitement écrit des steps, on les affiche). Documenté dans le composant.

### C. Génération côté serveur, pas côté client

`generateCorrection()` est appelé côté serveur (lors de l'instanciation, ou explicitement). Les `_renderedSteps` sont des données pré-calculées. Avantages : performance constante côté client, snapshot stable, pas de divergence selon le runtime.

### D. Réutilisation maximale du pipeline existant

Aucun nouveau code de génération d'étapes. Cette intégration est purement de la **glue** entre :

- `extractPedagogicalTarget()` (existant)
- `generatePedagogicalArithmeticSteps()` (existant) ou `generateLinearEquationSteps()` (existant)
- `PedagogicalArithmeticRenderer` ou `LinearEquationRenderer` (existants)
- Composant Svelte (nouveau, ~50-80 LOC)

### E. Type discriminé par `kind`

`GeneratedSteps` est une union discriminée par `kind`. Ajouter un nouveau domaine = ajouter un cas, pas refactorer le type. Extensibilité naturelle pour `differentiate`, `integrate`, etc. plus tard.

### F. Fallback silencieux sur erreur

Si la génération plante (expression non parsable, pipeline qui throw), fallback silencieux : on retourne l'instance sans `_renderedSteps`. Le composant détecte l'absence et n'affiche rien (ou Mode A si présent). Erreur loggée côté serveur.

## Critères d'acceptation

1. **Aucune régression** sur les questions existantes utilisant `correction.steps` (mode A)
2. **Schéma type** étendu et validé Zod (`generatedSteps`, `_renderedSteps`)
3. **`generateCorrection()` testé** sur 4 `kind` distincts (arithmetic, arithmetic-from-blank, solve, linear-equation)
4. **Mapping `gradeLevelToSchoolLevel`** testé (≥5 cas)
5. **Composant `<GeneratedStepsCorrection>`** affiche correctement les étapes, gère verbosity
6. **`CorrectionCard.svelte`** étendu pour basculer Mode A vs Mode B
7. **2-3 questions migrées** avec captures d'écran avant/après dans la doc
8. **0 erreur ESLint, 0 nouvelle erreur TypeScript**
9. **Svelte autofixer** appliqué sur les fichiers `.svelte` modifiés
10. **Documentation de progression** écrite dans `docs/wip/correction-integration-progress.md`
11. **Commit** via `commit-manager`, conventional commit, **PAS de Co-Authored-By: Claude**

## Pré-requis pour démarrer

Lire dans l'ordre :

### Documentation projet

1. `CLAUDE.md` (racine) — règles essentielles, TDD obligatoire
2. `docs/ref/tests/tdd.md` — workflow TDD collaboratif
3. `docs/wip/pedagogical-steppers-mvp-progress.md` — état infrastructure générique
4. `docs/wip/pedagogical-arithmetic-progress.md` — état pipeline arithmétique
5. `docs/wip/correction-integration-prompt.md` — ce prompt

### Backend pédagogique (à utiliser, pas modifier)

6. `src/lib/mathAST/pedagogical-arithmetic/pipeline.ts` — `generatePedagogicalArithmeticSteps()`
7. `src/lib/mathAST/pedagogical-arithmetic/renderer.ts` — `PedagogicalArithmeticRenderer`
8. `src/lib/mathAST/pedagogical-arithmetic/target-extractor.ts` — `extractPedagogicalTarget()`
9. `src/lib/mathAST/pedagogical-solve/linear.ts` — `generateLinearEquationSteps()`
10. `src/lib/mathAST/pedagogical-solve/linear-renderer.ts` — `LinearEquationRenderer`
11. `src/lib/mathAST/common/step-renderer-base.ts` — types `RenderedStep`, `SchoolLevel`, `RenderOptions`

### Système de questions (à étendre)

12. `src/lib/questions/types.ts` — `QuestionTemplate`, `QuestionInstance`, `QuestionCorrection`, `InstanceBlank`
13. `src/lib/questions/template-schema.ts` — schéma Zod (à étendre)
14. `src/lib/questions/generator/instance-generator.ts` — `generateInstance()` (à NE PAS modifier en V1)
15. `src/lib/questions/generator/correction-resolver.ts` — résolveur Mode A actuel (référence pour comprendre le rendu)

### UI existante

16. `src/lib/components/questions/CorrectionCard.svelte` — composant à étendre
17. `src/lib/components/MarkdownRenderer.svelte` — pour rendre LaTeX dans les étapes

### Cohérence

18. `docs/wip/pedagogical-arithmetic-progress.md` (TODOs résiduels) — savoir ce qui n'est PAS à fixer ici (notamment `expressionName` dans `InstanceBlank` qui reste un TODO séparé)

## Notes importantes

### Stratégie de découpage commit

Pour 8-10h de travail, **3-4 commits intermédiaires** :

1. Commit 1 : Phase 1 (schéma type + mapping gradeLevel→SchoolLevel) — petit, rapide
2. Commit 2 : Phase 2 (glue serveur `generateCorrection()`) — testé en isolation
3. Commit 3 : Phase 3 (composant Svelte + extension `CorrectionCard`) — visible côté élève
4. Commit 4 : Phase 4-5 (migration questions tests + doc + quality checks)

### Sub-agents recommandés

- `code-reviewer` (Opus) après Phase 2 et après Phase 3
- `frontend-developer` (Opus) si problème UX/Svelte sur le composant
- `typescript-expert` (Opus) si problème de types complexes (union discriminée)
- `commit-manager` pour chaque commit

### Cas pathologiques à NE PAS oublier

- Expression `generatedSteps.expression` non parsable → fallback silencieux + log
- `schoolLevel: 'auto'` avec `gradeLevel` absent → fallback `'lycee'`
- `correction.steps` ET `correction.generatedSteps` tous deux présents → Mode A gagne
- `_renderedSteps` vide (pipeline génère 0 étapes) → afficher quand même le feedback, pas d'étapes
- Composant rendu sans `_renderedSteps` → ne rien afficher (pas d'erreur)

### Cohérence avec PedagogicalTarget

`extractPedagogicalTarget(instance, blank?, expressionName?)` est appelé en Phase 2.
Pour les `kind: 'arithmetic'` et `'arithmetic-from-blank'`, on doit déterminer
quel `blank` et quel `expressionName` passer.

- `kind: 'arithmetic'` (expression libre) : pas de blank, pas d'expressionName → utilise les valeurs au niveau instance
- `kind: 'arithmetic-from-blank'` : utilise `blanks[blankIndex ?? 0]` + l'`expressionName` correspondant si disponible (cf TODO `expressionName` dans `InstanceBlank` post-prompt — utiliser le 3e arg explicite ou heuristique)

### Vérification d'intégration finale

Avant de commit final, lancer le projet localement et vérifier visuellement :

```bash
pnpm dev -- --port 5175
```

Naviguer vers une des questions migrées, déclencher la correction, vérifier
que les étapes s'affichent correctement avec adaptation au niveau scolaire.

---

## Estimation détaillée

| Phase | Description                                 | Effort |
| ----- | ------------------------------------------- | ------ |
| 0     | Spec TDD + validation utilisateur           | 1h     |
| 1     | Schéma type + Zod + gradeLevelToSchoolLevel | 1.5-2h |
| 2     | Glue serveur `generateCorrection()` + tests | 2-2.5h |
| 3     | Composant Svelte + extension CorrectionCard | 3-3.5h |
| 4     | Migration 2-3 questions tests + captures    | 1h     |
| 5     | Quality checks + svelte-autofixer + commit  | 1h     |

**Total : 9.5-11h** (un peu au-dessus de l'estimation initiale 6-8h pour couvrir proprement le composant Svelte et la migration des questions).

## Annexe : exemple end-to-end attendu

### Avant (Mode A — manuel)

Question dans le banc :

```typescript
{
  id: 'add-simple-1',
  shared: {
    correction: {
      feedback: { correct: '...' },
      steps: [
        'Étape 1 : on additionne {{a}} et {{b}}',
        'Étape 2 : {{a}} + {{b}} = {{eval:a+b}}'
      ]
    }
  },
  variations: [{
    statement: 'Calcule {{a}} + {{b}}',
    variables: [
      { name: 'a', expression: '7' },
      { name: 'b', expression: '8' }
    ],
    blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
  }],
  grades: ['CM2'],
  // ...
}
```

Élève voit après instanciation :

```
Étape 1 : on additionne 7 et 8
Étape 2 : 7 + 8 = 15
```

### Après (Mode B — généré)

```typescript
{
  id: 'add-simple-1',
  shared: {
    correction: {
      feedback: { correct: '...' },
      generatedSteps: {
        kind: 'arithmetic',
        expression: '{{a}}+{{b}}',
        options: { schoolLevel: 'auto', verbosity: 'detailed' }
      }
    }
  },
  // ... reste inchangé
}
```

Élève voit après instanciation (pour CM2 → primaire) :

```
Étape 1 : On additionne 7 et 8
         7 + 8 = 15
```

### Avantage Mode B

Pour une question de niveau collège plus complexe :

```typescript
{
  shared: {
    correction: {
      generatedSteps: { kind: 'arithmetic', expression: '{{a}}+{{b}}*{{c}}+{{d}}*{{e}}' }
    }
  },
  grades: ['5'],  // → college via auto
  variations: [{
    variables: [
      { name: 'a', expression: '2' }, { name: 'b', expression: '3' },
      { name: 'c', expression: '4' }, { name: 'd', expression: '5' },
      { name: 'e', expression: '6' }
    ],
    blanks: [{ expectedAnswer: '{{eval:a+b*c+d*e}}' }]
  }]
}
```

L'élève collégien voit :

```
Étape 1 : On effectue d'abord les multiplications
         2 + 3×4 + 5×6 = 2 + 12 + 30
Étape 2 : On additionne
         2 + 12 + 30 = 44
```

Aucune ligne d'étape écrite à la main. Adaptable à toutes les variations
de variables sans réécrire les steps. Adapté automatiquement au niveau
scolaire de la question.

### Ce que ça débloque

- **Auteurs** : moins de templates à écrire pour les questions de calcul/équation
- **Élèves** : étapes adaptées à leur niveau, pas du copier-coller textuel
- **Maintenance** : un fix dans le pipeline pédagogique bénéficie à toutes les questions
- **Cohérence** : pas de divergence entre la pédagogie attendue et celle écrite manuellement
