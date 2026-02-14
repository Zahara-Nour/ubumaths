# Refactoring QuestionTemplateForm - Progression

## Phase 1 : Extraction des Help Dialogs - COMPLETE

### Etat actuel

- 7 help dialogs statiques extraits dans `QuestionTemplateHelpDialogs.svelte` (711 lignes)
- `QuestionTemplateForm.svelte` reduit de 2730 a 2069 lignes (-661 lignes, -24%)
- Svelte autofixer : 0 issues
- Code review : 0 issues

### Decisions prises

- `variableHelpOpen` et `sharedVariableHelpOpen` restent dans le parent (passes via `bind:helpDialogOpen` a `VariableEditor`)
- Seuls les 7 dialogs statiques (titre/description, consigne, categorisation, variations, enonce, reponse, correction) sont extraits
- Publish Confirmation Dialog reste dans le parent (utilise des variables dynamiques)

### Fichiers modifies/crees

- **Cree** : `src/lib/components/QuestionTemplateHelpDialogs.svelte`
- **Modifie** : `src/lib/components/QuestionTemplateForm.svelte` (import + remplacement bloc)

---

## Phase 2 : Consolidation des tableaux paralleles - COMPLETE

### Etat actuel

- 6 tableaux paralleles remplaces par `variationExtras: VariationExtra[]`
- `QuestionTemplateForm.svelte` passe de 2069 a 2059 lignes (-10 lignes net, mais code bien plus lisible)
- addVariation: 6 pushes -> 1 push
- removeVariation: 6 filters -> 1 filter
- duplicateVariation: 5 maps -> 1 map
- Svelte autofixer : 0 issues
- Code review : 0 issues

### Decisions prises

- Interface `VariationExtra` definie dans le script du composant (pas exportee, usage local)
- `DEFAULT_VARIATION_EXTRA` const pour creer de nouvelles entries
- Spread copy suffisant pour duplication (tous les champs sont primitifs)
- Fallback defensif `|| DEFAULT_VARIATION_EXTRA` dans buildTemplate()

### Fichiers modifies

- **Modifie** : `src/lib/components/QuestionTemplateForm.svelte`

---

## Phase 3 : Extraction des sous-composants - COMPLETE

### Etat actuel

- 3 sous-composants extraits :
  - `DisplayOptionsEditor.svelte` (90 lignes, 9 $bindable() props)
  - `ValidationOptionsEditor.svelte` (212 lignes, 11 props dont 10 bindable)
  - `SharedFieldsEditor.svelte` (377 lignes, 19 props dont 17 bindable)
- `QuestionTemplateForm.svelte` passe de 2059 a 1626 lignes (-433 lignes, -21%)
- Total depuis debut : 2730 -> 1626 lignes (-40%)
- Svelte autofixer : 0 issues (3 sous-composants valides, parent trop grand pour l'outil)
- Code review : 0 issues bloquantes (1 suggestion mineure : extraire REQUIRED_FORM_OPTIONS dans un module partage)

### Decisions prises

- `CONSTRAINT_IDS` reste dans le parent (utilise dans buildTemplate()) + duplique dans ValidationOptionsEditor
- `CONSTRAINT_LABELS` et `CONSTRAINT_MODE_OPTIONS` retires du parent (seulement dans ValidationOptionsEditor)
- `REQUIRED_FORM_OPTIONS` duplique dans parent (per-variation overrides) et SharedFieldsEditor (shared defaults)
- `validationRulesJsonError` et `answerFormatsJsonError` (derived states) deplaces dans SharedFieldsEditor
- 10 collapsible states inutiles retires du parent (delegues aux sous-composants)
- `MyCheckbox` import retire du parent (plus utilise directement)

### Fichiers crees/modifies

- **Cree** : `src/lib/components/DisplayOptionsEditor.svelte`
- **Cree** : `src/lib/components/ValidationOptionsEditor.svelte`
- **Cree** : `src/lib/components/SharedFieldsEditor.svelte`
- **Modifie** : `src/lib/components/QuestionTemplateForm.svelte`

### Prochaines etapes

- Phase 4 : Quality checks finaux (ESLint, verification manuelle des 16 comportements)
