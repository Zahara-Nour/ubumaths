# Refactoring structurel de QuestionTemplateForm.svelte

## Contexte

`src/lib/components/QuestionTemplateForm.svelte` (2730 lignes) est un "god component" qui gère tout : état, validation, form building, lazy loading, et ~670 lignes de dialogues d'aide. Ce refactoring décompose le composant en sous-composants cohérents **sans changer le comportement**.

**Fichier principal** : `src/lib/components/QuestionTemplateForm.svelte`

**Règles projet** : Svelte 5 runes, MySelect/MyCheckbox obligatoires, svelte autofixer MCP obligatoire sur chaque fichier .svelte. Lire CLAUDE.md avant de commencer.

---

## Phase 0 : Spécification TDD

C'est un refactoring pur (pas de nouvelle fonctionnalité). Les **comportements à préserver** sont :

### Fonctionnalité : Refactoring QuestionTemplateForm

#### Comportements à préserver :

1. Le formulaire de création affiche toutes les sections (informations générales, type, catégorisation, niveaux scolaires, consigne, options d'affichage, options de validation, champs partagés, variations, aperçu/JSON)
2. Le formulaire d'édition pré-remplit tous les champs à partir du template existant
3. L'ajout d'une variation crée une nouvelle variation vide et la sélectionne
4. La suppression d'une variation retire la variation et ses données associées (correction, overrides)
5. La duplication d'une variation copie le contenu complet (statement, variables, correction, overrides)
6. Les help dialogs s'ouvrent/ferment correctement via les boutons `?`
7. Le bouton "Publier" est désactivé quand le formulaire est invalide
8. Les erreurs de validation apparaissent après une tentative de publication
9. Le dirty state détecte les modifications et affiche l'avertissement `beforeunload`
10. Le bouton "Annuler" demande confirmation si le formulaire a été modifié
11. L'aperçu (preview) et le JSON se mettent à jour quand les champs changent
12. La détection de doublons de catégorie fonctionne en temps réel

#### Tests :

Pas de tests unitaires existants pour ce composant UI. Les tests sont **manuels** :

- Ouvrir le formulaire de création → vérifier toutes les sections
- Ouvrir le formulaire d'édition d'un template existant → vérifier le pré-remplissage
- Tester ajout/suppression/duplication de variations
- Tester les 7 help dialogs
- Tester publication + draft
- Tester dirty state + annulation

**Attendre validation utilisateur avant de passer à la phase suivante.**

---

## Phase 1 : Extraire les Help Dialogs

**Agent** : travail direct (extraction mécanique, 0 logique)
**Modèle** : Sonnet (suffisant pour du copier-coller)

### Fichier à créer : `src/lib/components/QuestionTemplateHelpDialogs.svelte`

Les lignes ~2011-2682 contiennent 7 `Dialog.Root` pour l'aide contextuelle. Contenu 100% statique (texte HTML), aucune logique métier.

**Props (tous `$bindable()`) :**

```typescript
interface Props {
	titleDescriptionHelpOpen: boolean;
	exerciseInstructionHelpOpen: boolean;
	categorizationHelpOpen: boolean;
	variationsHelpOpen: boolean;
	statementHelpOpen: boolean;
	answerHelpOpen: boolean;
	correctionHelpOpen: boolean;
}
```

**Dans QuestionTemplateForm.svelte :**

- Supprimer les lignes ~2011-2682 (bloc `<!-- Help Dialogs -->` jusqu'à `<!-- Publish Confirmation Dialog -->`)
- Importer et utiliser le nouveau composant :

```svelte
<QuestionTemplateHelpDialogs
	bind:titleDescriptionHelpOpen
	bind:exerciseInstructionHelpOpen
	bind:categorizationHelpOpen
	bind:variationsHelpOpen
	bind:statementHelpOpen
	bind:answerHelpOpen
	bind:correctionHelpOpen
/>
```

**Imports du nouveau composant :**

- `Button` from `$lib/components/ui/button`
- `* as Dialog` from `$lib/components/ui/dialog`

### Checklist Phase 1

- [ ] Code fonctionnel (formulaire s'affiche correctement)
- [ ] Les 7 help dialogs s'ouvrent/ferment
- [ ] Svelte autofixer exécuté sur `QuestionTemplateHelpDialogs.svelte` et `QuestionTemplateForm.svelte`
- [ ] Code review (`code-reviewer` agent, modèle Sonnet)
- [ ] Documentation de progression écrite (`docs/wip/question-template-form-refactoring-progress.md`)
- [ ] Commit : `refactor(questions): extract help dialogs from QuestionTemplateForm`

---

## Phase 2 : Regrouper les tableaux parallèles

**Agent** : travail direct (refactoring interne, même fichier)
**Modèle** : Opus (logique de synchronisation délicate)

### Problème

6 tableaux doivent rester synchronisés avec `variations[]` :

```
correctionStrings[]           // l.438
perVarValidationRulesJson[]   // l.443
perVarAnswerFormatsJson[]     // l.446
perVarRequiredFormSelect[]    // l.449
perVarRequiredFormPattern[]   // l.454
perVarOverridesOpen[]         // l.459
```

Chaque `addVariation()`, `removeVariation()`, `duplicateVariation()` met à jour les 6 tableaux manuellement.

### Solution : type `VariationExtra`

**a) Définir le type et l'état :**

```typescript
interface VariationExtra {
	correctionString: string;
	validationRulesJson: string;
	answerFormatsJson: string;
	requiredFormSelect: string;
	requiredFormPattern: string;
	overridesOpen: boolean;
}

let variationExtras = $state<VariationExtra[]>(
	template?.variations.map((v) => ({
		correctionString: correctionToString(v.correction),
		validationRulesJson: JSON.stringify(v.validationRules || [], null, 2),
		answerFormatsJson: JSON.stringify(v.answerFormats || {}, null, 2),
		requiredFormSelect: v.requiredForm
			? typeof v.requiredForm === 'string'
				? v.requiredForm
				: 'custom'
			: '',
		requiredFormPattern:
			v.requiredForm && typeof v.requiredForm === 'object' ? v.requiredForm.pattern : '',
		overridesOpen: false
	})) || [
		{
			correctionString: '',
			validationRulesJson: '[]',
			answerFormatsJson: '{}',
			requiredFormSelect: '',
			requiredFormPattern: '',
			overridesOpen: false
		}
	]
);
```

**b) Supprimer** les 6 anciennes déclarations (l.438-459).

**c) Simplifier `addVariation()`** : un seul push au lieu de 6.

**d) Simplifier `removeVariation()`** : un seul filter au lieu de 6.

**e) Simplifier `duplicateVariation()`** : un seul `.map()` avec `structuredClone()` au lieu de 6.

**f) Mettre à jour `buildTemplate()`** : remplacer `correctionStrings[index]` par `variationExtras[index].correctionString`, etc.

**g) Mettre à jour le template HTML** : toutes les occurrences de `bind:value={correctionStrings[index]}`, `bind:open={perVarOverridesOpen[index]}`, etc.

**h) Mettre à jour `computeSnapshot()`** si elle référence les anciens tableaux.

### Checklist Phase 2

- [ ] Code fonctionnel
- [ ] Ajout/suppression/duplication de variations fonctionne
- [ ] Les overrides par variation s'affichent et se sauvegardent
- [ ] Svelte autofixer exécuté sur `QuestionTemplateForm.svelte`
- [ ] Code review (`code-reviewer` agent, modèle Opus)
- [ ] Documentation de progression mise à jour
- [ ] Commit : `refactor(questions): consolidate parallel arrays into VariationExtra`

---

## Phase 3 : Extraire les sous-sections en composants

**Agent** : `frontend-developer` (composants Svelte UI)
**Modèle** : Opus

### 3a. `DisplayOptionsEditor.svelte` (~80 lignes, ~l.1154-1207)

Card.Root + Collapsible + 8 MyCheckbox.

**Props (tous `$bindable()`) :**

```typescript
interface Props {
	shuffleTerms: boolean;
	shuffleFactors: boolean;
	shuffleTermsAndFactors: boolean;
	shallowShuffleTerms: boolean;
	shallowShuffleFactors: boolean;
	removeNullTerms: boolean;
	removeUnnecessaryBrackets: boolean;
	removeSpaces: boolean;
}
```

### 3b. `ValidationOptionsEditor.svelte` (~400 lignes, ~l.1208-1584)

Validation générale, validateur custom, options QCM, contraintes de forme.

**Props (tous `$bindable()`) :**

```typescript
interface Props {
	allowEquivalent: boolean;
	allowDifferentForms: boolean;
	canonicalForm: string;
	orderIndependent: boolean;
	validator: string;
	validatorParamsJson: string;
	shuffleChoices: boolean;
	allowBracketsInFirstNegativeTerm: boolean;
	constraintModes: Record<string, string>;
	questionType: QuestionType;
}
```

Les constantes `CONSTRAINT_IDS`, `CONSTRAINT_LABELS`, `CONSTRAINT_MODE_OPTIONS` déménagent dans ce composant.

### 3c. `SharedFieldsEditor.svelte` (~330 lignes, ~l.1330-1584)

Section "Champs partagés" avec 8 sous-collapsibles.

**Props (tous `$bindable()`) :**

```typescript
interface Props {
	questionType: QuestionType;
	multipleAnswers: boolean | undefined;
	sharedStatement: string;
	sharedVariables: QuestionVariable[];
	sharedCorrectChoiceIndex: string | string[];
	sharedChoices: any[]; // type exact à vérifier dans QuestionVariation
	sharedCorrectionString: string;
	sharedRequiredFormSelect: string;
	sharedRequiredFormPattern: string;
	sharedBlankPrecision: any; // type Precision à vérifier
	sharedBlankRequiredFormSelect: string;
	sharedBlankRequiredFormPattern: string;
	sharedBlankUnitExpected: boolean;
	sharedBlankUnitRequired: string;
	sharedValidationRulesJson: string;
	sharedAnswerFormatsJson: string;
	sharedVariableHelpOpen: boolean;
	validationRulesJsonError: string;
	answerFormatsJsonError: string;
}
```

**Note** : remplacer les `any` par les types exacts trouvés dans `$lib/questions/types`.

### Checklist Phase 3

- [ ] Code fonctionnel (toutes les sections apparaissent)
- [ ] Formulaire d'édition pré-remplit tous les champs
- [ ] Options d'affichage, validation, et champs partagés fonctionnent
- [ ] Svelte autofixer exécuté sur les 3 nouveaux fichiers + QuestionTemplateForm.svelte
- [ ] Code review (`code-reviewer` agent, modèle Opus)
- [ ] Documentation de progression mise à jour
- [ ] Commit : `refactor(questions): extract DisplayOptions, ValidationOptions, SharedFields editors`

---

## Phase 4 : Quality Checks (fin du plan uniquement)

- [ ] ESLint : `npx eslint src/lib/components/QuestionTemplateForm.svelte src/lib/components/QuestionTemplateHelpDialogs.svelte src/lib/components/DisplayOptionsEditor.svelte src/lib/components/ValidationOptionsEditor.svelte src/lib/components/SharedFieldsEditor.svelte`
- [ ] Svelte autofixer MCP sur chaque fichier .svelte créé/modifié
- [ ] Vérification manuelle complète (voir les 12 comportements de la Phase 0)
- [ ] `commit-manager` agent pour le commit final si nécessaire

---

## Documentation de progression

Après chaque phase, mettre à jour `docs/wip/question-template-form-refactoring-progress.md` avec :

- État actuel
- Décisions prises
- Prochaines étapes
- Fichiers modifiés/créés

À la fin du plan, lister tous les documents produits.

## Résultat attendu

| Fichier                              | Lignes estimées         |
| ------------------------------------ | ----------------------- |
| `QuestionTemplateForm.svelte`        | ~1200 (au lieu de 2730) |
| `QuestionTemplateHelpDialogs.svelte` | ~670                    |
| `DisplayOptionsEditor.svelte`        | ~100                    |
| `ValidationOptionsEditor.svelte`     | ~420                    |
| `SharedFieldsEditor.svelte`          | ~350                    |
