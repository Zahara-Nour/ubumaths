# Migration des Types pour le Nouveau Format JSON

## Date

2025-12-06

## Objectif

Aligner `src/lib/constructions/types.ts` avec les nouveaux schémas Zod définis dans `schemas.ts` pour supporter le nouveau format JSON simplifié.

## Changements Effectués

### 1. Fichier `types.ts` - Refactorisation Complète

#### Avant (777 lignes)

- Définitions manuelles de tous les types (ObjectDef, ActionDef, CreateStep, etc.)
- Format ancien avec discriminants `kind` et `type`
- Duplication de la logique de validation entre types TypeScript et Zod

#### Après (321 lignes - réduction de 59%)

- **Types dérivés de Zod** : Utilise `z.infer<typeof schema>` pour tous les types validés
- **Re-exports depuis schemas.ts** : Les types `*Input` deviennent les types principaux
- **Types runtime uniquement** : Garde seulement les types qui n'existent pas dans Zod
  - `StyleProps` (propriétés de style runtime)
  - `DrawnObjectState` (état runtime des objets dessinés)
  - `InstrumentRuntimeState` (état runtime des instruments)
  - `ConstructionState` (état complet de la construction)
  - `ParameterValues` (valeurs actuelles des paramètres)
  - `Position` (position 2D)
  - `Expr` (type expression conservé pour compatibilité)

#### Nouveau Format de Types

Les types suivent maintenant le nouveau format JSON plat :

```typescript
// Step types (format plat - première clé = type)
type PointStep = { point: string; at: [number, number]; ... }
type LineStep = { line: string; to: string | [number, number]; ... }
type MoveStep = { move: string; to: string | [number, number]; ... }
type PauseStep = { pause: number }
type ParallelStep = { parallel: Step[] }

// Union type
type Step = PointStep | LineStep | ArcStep | ... | PauseStep | ParallelStep
```

#### Exports Principaux

1. **Types de Step** (nouveau format)

   - `Step`, `NonParallelStep`
   - `PointStep`, `LineStep`, `ArcStep`, `CircleStep`, `TextStep`, `MarkStep`
   - `MoveStep`, `ShowStep`, `HideStep`, `RotateStep`, `SpreadStep`, `RaiseStep`, `LowerStep`
   - `StyleStep`, `PauseStep`, `ParallelStep`

2. **Types Auxiliaires**

   - `Coord` (alias de `CoordPair`)
   - `Target` (alias de `TargetRef`)
   - `Label` (alias de `LabelInput`)
   - `ParameterDef`, `CanvasConfig`, `InstrumentType`, etc.

3. **Types Runtime**

   - `DrawnObjectState` (renommé depuis `ObjectState`)
   - `InstrumentRuntimeState`, `ConstructionState`
   - `ParameterValues`, `Position`

4. **Type Guards** (réexportés depuis schemas.ts)
   - `isPointStep`, `isLineStep`, etc. (16 guards au total)

### 2. Fichier `index.ts` - Mise à Jour des Exports

#### Changements

- **Types exportés** : Mis à jour pour exporter les nouveaux types de Step au lieu de ObjectDef/ActionDef/CreateStep
- **Type guards** : Mis à jour pour exporter les nouveaux guards (isPointStep, etc.)
- **Schémas** : Mis à jour pour exporter les nouveaux schémas (pointStepSchema, etc.)
- **Suppression** : Anciens exports non pertinents (stylePropsSchema, objectDefSchema, actionDefSchema, etc.)

#### Nouveaux Exports Principaux

```typescript
// Types
export type {
	Step,
	NonParallelStep,
	PointStep,
	LineStep,
	ArcStep,
	CircleStep,
	TextStep,
	MarkStep,
	MoveStep,
	ShowStep,
	HideStep,
	RotateStep,
	SpreadStep,
	RaiseStep,
	LowerStep,
	StyleStep,
	PauseStep,
	ParallelStep,
	Coord,
	Target,
	Label
	// ... autres types
};

// Type Guards
export {
	isPointStep,
	isLineStep,
	isArcStep,
	isCircleStep,
	isTextStep,
	isMarkStep,
	isMoveStep,
	isShowStep,
	isHideStep,
	isRotateStep,
	isSpreadStep,
	isRaiseStep,
	isLowerStep,
	isStyleStep,
	isPauseStep,
	isParallelStep
};

// Schémas
export {
	pointStepSchema,
	lineStepSchema,
	arcStepSchema,
	circleStepSchema,
	textStepSchema,
	markStepSchema,
	moveStepSchema,
	showStepSchema,
	hideStepSchema,
	rotateStepSchema,
	spreadStepSchema,
	raiseStepSchema,
	lowerStepSchema,
	styleStepSchema,
	pauseStepSchema,
	parallelStepSchema,
	stepSchema,
	constructionScriptSchema
	// ... validation helpers
};
```

## Architecture des Types

### Flux de Validation et Types

```
JSON Input
    ↓
[Zod Schema] (schemas.ts)
    ↓ validation
[Validated Input Types] (*Input types from schemas.ts)
    ↓ re-export as main types
[Public Types] (types.ts)
    ↓ used by
[Engine Runtime] (engine.svelte.ts)
    ↓ creates
[Runtime State] (DrawnObjectState, InstrumentRuntimeState, etc.)
```

### Séparation des Responsabilités

1. **schemas.ts** : Définit et exporte

   - Schémas Zod pour validation
   - Types `*Input` inférés depuis Zod (`z.infer`)
   - Type guards (isPointStep, etc.)
   - Fonctions de validation

2. **types.ts** : Définit et exporte

   - Alias des types `*Input` comme types principaux
   - Types runtime non validés (state management)
   - Types utilitaires (Expr, Position, etc.)
   - Ré-exporte les type guards

3. **index.ts** : Point d'entrée public
   - Ré-exporte tous les types publics
   - Ré-exporte les schémas et validators
   - Ré-exporte les type guards

## Avantages de cette Architecture

1. **Single Source of Truth** : Les schémas Zod définissent la structure, les types TypeScript en sont dérivés
2. **Cohérence Garantie** : Impossible d'avoir une divergence entre validation et types
3. **Maintenance Simplifiée** : Un seul endroit pour modifier la structure (schemas.ts)
4. **Type Safety** : TypeScript connaît exactement la structure validée
5. **Lisibilité** : Séparation claire entre types validés (input) et types runtime (state)

## Impact sur le Code Existant

### Fichiers à Migrer

Les fichiers suivants utilisent encore l'ancien format et devront être migrés :

```
src/lib/constructions/converter.ts
src/lib/constructions/core/engine.svelte.ts
src/lib/constructions/actions/*.ts
src/lib/constructions/objects/base.ts
src/lib/constructions/core/timeline.svelte.ts
src/lib/constructions/core/registry.ts
```

### Migration Nécessaire

1. **engine.svelte.ts** : Doit être mis à jour pour traiter les nouveaux types de Step
2. **converter.ts** : En cours de refactoring pour générer le nouveau format
3. **actions/\*.ts** : Devront être adaptés au nouveau format (ou supprimés si obsolètes)

### Compatibilité

- Les types `Expr`, `ParameterDef`, `CanvasConfig` restent identiques
- Les types runtime (`ConstructionState`, etc.) sont préservés
- L'API publique reste stable via les ré-exports dans `index.ts`

## Prochaines Étapes

1. **Migrer l'engine** : Adapter `engine.svelte.ts` pour traiter les nouveaux Step types
2. **Terminer le converter** : Finaliser la génération du nouveau format JSON
3. **Mettre à jour les actions** : Adapter ou supprimer les fichiers dans `actions/`
4. **Tests** : Vérifier que tous les tests passent avec les nouveaux types
5. **Documentation** : Mettre à jour la documentation utilisateur

## Notes Techniques

### Type Guards Pattern

Les type guards suivent ce pattern :

```typescript
export function isPointStep(step: StepInput): step is PointStepInput {
	return 'point' in step;
}
```

La clé du discriminant est le nom de la première propriété (point, line, arc, move, show, pause, parallel, etc.)

### Runtime vs Validated Types

- **Validated Types** (Step, PointStep, etc.) : Utilisés pour l'input JSON validé
- **Runtime Types** (DrawnObjectState, etc.) : Utilisés pour l'état mutable de l'engine

Cette séparation évite la confusion entre ce qui est validé (immutable input) et ce qui est modifié (mutable state).

## Fichiers Modifiés

- `/Users/david/Coding/js/ubumaths/src/lib/constructions/types.ts` (777 → 321 lignes)
- `/Users/david/Coding/js/ubumaths/src/lib/constructions/index.ts` (exports mis à jour)

## Status

✅ **Complété** : Migration des types vers le nouveau format
⏭️ **Prochaine étape** : Migration de l'engine pour utiliser les nouveaux types
