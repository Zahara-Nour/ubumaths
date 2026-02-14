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

### Prochaines etapes

- Phase 2 : Regrouper les 6 tableaux paralleles en `VariationExtra` (Opus)
- Phase 3 : Extraire DisplayOptionsEditor, ValidationOptionsEditor, SharedFieldsEditor
- Phase 4 : Quality checks finaux
