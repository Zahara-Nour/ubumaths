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

### Prochaines etapes

- Phase 3 : Extraire DisplayOptionsEditor, ValidationOptionsEditor, SharedFieldsEditor
- Phase 4 : Quality checks finaux
