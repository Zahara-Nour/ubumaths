<!--
	Question Template Form Component
	=================================

	Main orchestrator for creating/editing question templates.

	FEATURES:
	- Type selection (fill-in-blanks, QCM)
	- Dynamic form fields based on question type
	- Variable editor with syntax helpers
	- Content field editor for statement/correction
	- Answer editor (varies by type)
	- Grade level multi-select
	- Live preview of generated instances
	- JSON viewer for debugging

	PROPS:
	- template?: QuestionTemplate (for editing)
	- onSave: (template) => void
	- onCancel: () => void
	- isSubmitting: boolean
-->

<script lang="ts">
	import type {
		QuestionTemplate,
		QuestionVariation,
		QuestionCorrection,
		QuestionType,
		QuestionVariable,
		GradeLevel,
		RequiredForm,
		BlankDefaults,
		SharedVariationDefaults,
		ConstraintMode,
		ConstraintId
	} from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { DisplayOptions } from '$lib/ubumark/parameterization/display-options';
	import { GRADE_CODES, GRADES } from '$lib/types/grades';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import VariableEditor from './VariableEditor.svelte';
	import { MarkdownEditor } from '$lib/components/markdown';
	import AnswerEditor from './AnswerEditor.svelte';
	import MySelect from './MySelect.svelte';
	import MyCheckbox from './MyCheckbox.svelte';
	import PrecisionEditor from './PrecisionEditor.svelte';
	import { templateMarkdown } from '$lib/ubumark';
	import CategorySelector from './CategorySelector.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { tick } from 'svelte';

	// Lazy-loaded heavy components to reduce initial bundle size
	let RichTextEditor = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let QuestionPreview = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let JsonViewer = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let loadedComponents = $state({
		richText: false,
		preview: false,
		json: false
	});
	import {
		X,
		Plus,
		Trash2,
		Copy,
		FileText,
		CheckCircle2,
		ChevronDown,
		CircleQuestionMark
	} from 'lucide-svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';

	interface Props {
		template?: QuestionTemplate;
		onSave: (
			template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
		) => void;
		onCancel: () => void;
		isSubmitting: boolean;
	}

	let { template, onSave, onCancel, isSubmitting }: Props = $props();

	// Shared configuration state
	// Infer type from structure when editing existing template
	let questionType = $state<QuestionType>(
		template ? getQuestionType(template.variations?.[0] ?? {}) : 'fill_in_blanks'
	);
	let grades = $state<GradeLevel[]>(template?.grades || []);
	let delay = $state<number | undefined>(template?.delay);

	// Exercise instruction (shared, optional)
	let exerciseInstruction = $state<string | undefined>(template?.exerciseInstruction);

	// Title and description (shared)
	let title = $state<string>(template?.title || '');
	let description = $state<string>(template?.description || '');

	// Categorization fields (shared)
	let theme = $state<string>(template?.theme || '');
	let domain = $state<string>(template?.domain || '');
	let subdomain = $state<string | undefined>(template?.subdomain);
	let level = $state<number>(template?.level || 1);
	let status = $state<'draft' | 'published'>(template?.status || 'draft');

	// Category duplicate detection
	let categoryDuplicate = $state<boolean>(false);
	let suggestedLevel = $state<number | null>(null);

	// Publish confirmation dialog
	let showPublishDialog = $state(false);

	// Category options (extracted from existing questions)
	let themeOptions = $state<string[]>([]);
	let domainOptions = $state<string[]>([]);
	let subdomainOptions = $state<string[]>([]);

	// Lazy loading functions for heavy components
	async function loadRichTextEditor() {
		if (!loadedComponents.richText) {
			const module = await import('./rich-text/RichTextEditor.svelte');
			RichTextEditor = module.default;
			loadedComponents.richText = true;
		}
	}

	async function loadQuestionPreview() {
		if (!loadedComponents.preview) {
			const module = await import('./QuestionPreview.svelte');
			QuestionPreview = module.default;
			loadedComponents.preview = true;
		}
	}

	async function loadJsonViewer() {
		if (!loadedComponents.json) {
			const module = await import('./JsonViewer.svelte');
			JsonViewer = module.default;
			loadedComponents.json = true;
		}
	}

	// Load category cache on mount
	$effect(() => {
		questionCategoriesCache.fetchCategories();
	});

	// Pre-load preview tab (default) on mount
	$effect(() => {
		loadQuestionPreview();
	});

	// Fetch existing categories on mount (for autocomplete options)
	$effect(() => {
		async function fetchCategories() {
			try {
				const response = await fetch('/api/questions/categories');
				if (response.ok) {
					const data = await response.json();
					themeOptions = data.themes || [];
					domainOptions = data.domains || [];
					subdomainOptions = data.subdomains || [];
				}
			} catch (error) {
				console.error('Error fetching categories:', error);
			}
		}
		fetchCategories();
	});

	// Real-time category duplicate detection
	$effect(() => {
		// Only check if all required fields are filled
		if (!theme || !domain || !level) {
			categoryDuplicate = false;
			suggestedLevel = null;
			return;
		}

		// Check if category exists in cache
		// Exclude current template ID if editing (to allow saving without changing category)
		const exists = questionCategoriesCache.categoryExists(
			{
				theme,
				domain,
				subdomain: subdomain || null,
				level
			},
			template?.id // Exclude current template from check when editing
		);

		categoryDuplicate = exists;

		// Get suggested level if duplicate
		if (exists) {
			suggestedLevel = questionCategoriesCache.getNextAvailableLevel({
				theme,
				domain,
				subdomain: subdomain || null
			});
		} else {
			suggestedLevel = null;
		}
	});

	// Type-specific fields (shared)
	let multipleAnswers = $state<boolean | undefined>(template?.multipleAnswers);

	// Default display options state
	let displayShuffleTerms = $state(template?.defaultDisplayOptions?.shuffleTerms ?? false);
	let displayShuffleFactors = $state(template?.defaultDisplayOptions?.shuffleFactors ?? false);
	let displayShuffleTermsAndFactors = $state(
		template?.defaultDisplayOptions?.shuffleTermsAndFactors ?? false
	);
	let displayShallowShuffleTerms = $state(
		template?.defaultDisplayOptions?.shallowShuffleTerms ?? false
	);
	let displayShallowShuffleFactors = $state(
		template?.defaultDisplayOptions?.shallowShuffleFactors ?? false
	);
	let displayRemoveNullTerms = $state(template?.defaultDisplayOptions?.removeNullTerms ?? false);
	let displayRemoveUnnecessaryBrackets = $state(
		template?.defaultDisplayOptions?.removeUnnecessaryBrackets ?? false
	);
	let displayRemoveSpaces = $state(template?.defaultDisplayOptions?.removeSpaces ?? false);

	// Template options state
	let optAllowEquivalent = $state(template?.options?.allowEquivalent ?? false);
	let optAllowDifferentForms = $state(template?.options?.allowDifferentForms ?? false);
	let optCanonicalForm = $state<string>(template?.options?.canonicalForm || '');
	let optOrderIndependent = $state(template?.options?.orderIndependent ?? false);
	let optValidator = $state<string>(template?.options?.validator || '');
	let optValidatorParamsJson = $state(
		JSON.stringify(template?.options?.validatorParams || {}, null, 2)
	);
	let optShuffleChoices = $state(template?.options?.shuffleChoices ?? true);
	let optAllowBracketsInFirstNegativeTerm = $state(
		template?.options?.constraints?.allowBracketsInFirstNegativeTerm ?? false
	);

	// Constraint states
	const CONSTRAINT_IDS: ConstraintId[] = [
		'spaces',
		'products',
		'brackets',
		'zeros',
		'form',
		'nullTerms',
		'factorOne',
		'factorZero',
		'signs',
		'reducedFractions',
		'unit'
	];
	const CONSTRAINT_LABELS: Record<ConstraintId, string> = {
		spaces: 'Espaces',
		products: 'Symbole de multiplication',
		brackets: 'Parenthèses',
		zeros: 'Zéros inutiles',
		form: 'Forme générale',
		nullTerms: 'Termes nuls (x + 0)',
		factorOne: 'Facteur 1 (1 * x)',
		factorZero: 'Facteur 0 (0 * x)',
		signs: 'Signes (-- = +)',
		reducedFractions: 'Fractions irréductibles',
		unit: 'Unité'
	};
	const CONSTRAINT_MODE_OPTIONS = [
		{ value: '', label: 'Défaut (warn)' },
		{ value: 'strict', label: 'Strict' },
		{ value: 'warn', label: 'Avertissement' },
		{ value: 'off', label: 'Désactivé' }
	];
	let constraintModes = $state<Record<string, string>>(
		Object.fromEntries(CONSTRAINT_IDS.map((id) => [id, template?.options?.constraints?.[id] || '']))
	);

	// Shared variables (resolved before per-variation variables)
	let sharedVariables = $state<QuestionVariable[]>(template?.shared?.variables || []);
	let sharedStatement = $state(templateMarkdown(template?.shared?.statement || ''));
	let sharedCorrectChoiceIndex = $state<string | string[]>(
		template?.shared?.correctChoiceIndex || ''
	);
	let sharedCorrectionString = $state(correctionToString(template?.shared?.correction));
	let sharedChoices = $state(template?.shared?.choices ?? []);
	let sharedRequiredFormSelect = $state<string>(
		template?.shared?.requiredForm
			? typeof template.shared.requiredForm === 'string'
				? template.shared.requiredForm
				: 'custom'
			: ''
	);
	let sharedRequiredFormPattern = $state(
		template?.shared?.requiredForm && typeof template.shared.requiredForm === 'object'
			? template.shared.requiredForm.pattern
			: ''
	);
	let sharedBlankPrecision = $state(template?.shared?.blankDefaults?.precision);
	let sharedBlankRequiredFormSelect = $state<string>(
		template?.shared?.blankDefaults?.requiredForm
			? typeof template.shared.blankDefaults.requiredForm === 'string'
				? template.shared.blankDefaults.requiredForm
				: 'custom'
			: ''
	);
	let sharedBlankRequiredFormPattern = $state(
		template?.shared?.blankDefaults?.requiredForm &&
			typeof template.shared.blankDefaults.requiredForm === 'object'
			? template.shared.blankDefaults.requiredForm.pattern
			: ''
	);
	let sharedBlankUnitExpected = $state(template?.shared?.blankDefaults?.unit?.expected ?? false);
	let sharedBlankUnitRequired = $state(template?.shared?.blankDefaults?.unit?.required || '');
	let sharedValidationRulesJson = $state(
		JSON.stringify(template?.shared?.validationRules || [], null, 2)
	);
	let sharedAnswerFormatsJson = $state(
		JSON.stringify(template?.shared?.answerFormats || {}, null, 2)
	);

	// JSON validation feedback
	const VALID_REQUIRED_FORMS = ['product', 'sum', 'fraction', 'power'] as const;

	let validationRulesJsonError = $derived.by(() => {
		const trimmed = sharedValidationRulesJson.trim();
		if (!trimmed || trimmed === '[]') return '';
		try {
			const parsed = JSON.parse(trimmed);
			if (!Array.isArray(parsed)) return 'Doit être un tableau JSON';
			return '';
		} catch (e) {
			return e instanceof Error ? e.message : 'JSON invalide';
		}
	});

	let answerFormatsJsonError = $derived.by(() => {
		const trimmed = sharedAnswerFormatsJson.trim();
		if (!trimmed || trimmed === '{}') return '';
		try {
			const parsed = JSON.parse(trimmed);
			if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null)
				return 'Doit être un objet JSON';
			return '';
		} catch (e) {
			return e instanceof Error ? e.message : 'JSON invalide';
		}
	});

	// Help dialog states
	let titleDescriptionHelpOpen = $state(false);
	let sharedVariableHelpOpen = $state(false);
	let variableHelpOpen = $state(false);
	let exerciseInstructionHelpOpen = $state(false);
	let categorizationHelpOpen = $state(false);
	let variationsHelpOpen = $state(false);
	let statementHelpOpen = $state(false);
	let answerHelpOpen = $state(false);
	let correctionHelpOpen = $state(false);

	// Collapsible states
	let descriptionOpen = $state(false);
	let categorizationOpen = $state(true); // Open by default as it's required
	let correctionOpen = $state(false);
	let statementSectionOpen = $state(true); // Open by default as it's required
	let displayOptionsOpen = $state(false);
	let optionsSectionOpen = $state(false);
	let optionsConstraintsOpen = $state(false);
	let optionsValidatorOpen = $state(false);
	let sharedFieldsOpen = $state(false); // Closed by default
	let sharedStatementOpen = $state(false);
	let sharedVariablesOpen = $state(true); // Open by default for ease of use
	let sharedSolutionOpen = $state(false);
	let sharedCorrectionSharedOpen = $state(false);
	let sharedRequiredFormOpen = $state(false);
	let sharedBlankDefaultsOpen = $state(false);
	let sharedValidationOpen = $state(false);
	let sharedFormatsOpen = $state(false);
	let variablesOpen = $state(true); // Open by default for ease of use
	let answerSectionOpen = $state(true); // Open by default as it's required

	// Helper to convert QuestionCorrection object to simple string (for editing)
	function correctionToString(correction: QuestionCorrection | undefined): string {
		if (!correction) return '';
		// Prefer steps if available, otherwise use feedback
		if (correction.steps && correction.steps.length > 0) {
			return correction.steps.join('\n\n');
		}
		if (correction.feedback?.correct) {
			return correction.feedback.correct;
		}
		return '';
	}

	// Helper to convert string to QuestionCorrection object
	// Splits on double newlines to preserve multi-step structure (inverse of correctionToString)
	function stringToCorrection(str: string): QuestionCorrection | undefined {
		const trimmed = str.trim();
		if (!trimmed) return undefined;
		const steps = trimmed
			.split(/\n\n+/)
			.map((s) => templateMarkdown(s.trim()))
			.filter((s) => s);
		return {
			steps
		};
	}

	// Variations state (NEW)
	// Note: correction is optional, only used if provided
	let variations = $state<QuestionVariation[]>(
		template?.variations.map((v) => ({
			...v,
			variables: v.variables || [],
			blanks: v.blanks || [],
			choices: v.choices || [],
			correction: v.correction,
			blankDefaults: v.blankDefaults || {}
		})) || [
			{
				statement: templateMarkdown(''),
				variables: [],
				correctChoiceIndex: '',
				blanks: [],
				choices: [],
				blankDefaults: {}
			}
		]
	);

	// Separate state for correction editing (as strings)
	let correctionStrings = $state<string[]>(
		template?.variations.map((v) => correctionToString(v.correction)) || ['']
	);

	// Per-variation override state arrays
	let perVarValidationRulesJson = $state<string[]>(
		template?.variations.map((v) => JSON.stringify(v.validationRules || [], null, 2)) || ['[]']
	);
	let perVarAnswerFormatsJson = $state<string[]>(
		template?.variations.map((v) => JSON.stringify(v.answerFormats || {}, null, 2)) || ['{}']
	);
	let perVarRequiredFormSelect = $state<string[]>(
		template?.variations.map((v) =>
			v.requiredForm ? (typeof v.requiredForm === 'string' ? v.requiredForm : 'custom') : ''
		) || ['']
	);
	let perVarRequiredFormPattern = $state<string[]>(
		template?.variations.map((v) =>
			v.requiredForm && typeof v.requiredForm === 'object' ? v.requiredForm.pattern : ''
		) || ['']
	);
	let perVarOverridesOpen = $state<boolean[]>(template?.variations.map(() => false) || [false]);

	// Current variation index for editing
	let currentVariationIndex = $state(0);

	// Available grade levels - use GRADE_CODES from unified system
	// GRADE_CODES is already imported from '$lib/types/grades'

	// Question type options
	const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
		{ value: 'fill_in_blanks', label: 'Texte à trous' },
		{ value: 'multiple_choice', label: 'QCM' }
	];

	const REQUIRED_FORM_OPTIONS = [
		{ value: '', label: 'Aucune' },
		{ value: 'product', label: 'Produit' },
		{ value: 'sum', label: 'Somme' },
		{ value: 'fraction', label: 'Fraction' },
		{ value: 'power', label: 'Puissance' },
		{ value: 'custom', label: 'Pattern personnalisé' }
	];

	// Handle grade toggle
	function toggleGrade(grade: GradeLevel) {
		if (grades.includes(grade)) {
			grades = grades.filter((g) => g !== grade);
		} else {
			grades = [...grades, grade];
		}
	}

	// Handle category changes
	function handleAddTheme(newTheme: string) {
		if (!themeOptions.includes(newTheme)) {
			themeOptions = [...themeOptions, newTheme];
		}
	}

	function handleAddDomain(newDomain: string) {
		if (!domainOptions.includes(newDomain)) {
			domainOptions = [...domainOptions, newDomain];
		}
	}

	function handleAddSubdomain(newSubdomain: string) {
		if (!subdomainOptions.includes(newSubdomain)) {
			subdomainOptions = [...subdomainOptions, newSubdomain];
		}
	}

	// Variation management
	function addVariation() {
		variations = [
			...variations,
			{
				statement: templateMarkdown(''),
				variables: [],
				correctChoiceIndex: '',
				blanks: [],
				choices: [],
				blankDefaults: {}
			}
		];
		correctionStrings = [...correctionStrings, ''];
		perVarValidationRulesJson = [...perVarValidationRulesJson, '[]'];
		perVarAnswerFormatsJson = [...perVarAnswerFormatsJson, '{}'];
		perVarRequiredFormSelect = [...perVarRequiredFormSelect, ''];
		perVarRequiredFormPattern = [...perVarRequiredFormPattern, ''];
		perVarOverridesOpen = [...perVarOverridesOpen, false];
		currentVariationIndex = variations.length - 1;
	}

	function removeVariation(index: number) {
		if (variations.length <= 1) return; // Must have at least 1 variation
		variations = variations.filter((_, i) => i !== index);
		correctionStrings = correctionStrings.filter((_, i) => i !== index);
		perVarValidationRulesJson = perVarValidationRulesJson.filter((_, i) => i !== index);
		perVarAnswerFormatsJson = perVarAnswerFormatsJson.filter((_, i) => i !== index);
		perVarRequiredFormSelect = perVarRequiredFormSelect.filter((_, i) => i !== index);
		perVarRequiredFormPattern = perVarRequiredFormPattern.filter((_, i) => i !== index);
		perVarOverridesOpen = perVarOverridesOpen.filter((_, i) => i !== index);
		if (currentVariationIndex >= variations.length) {
			currentVariationIndex = variations.length - 1;
		}
	}

	function selectVariation(index: number) {
		currentVariationIndex = index;
	}

	// Duplicate variation dialog state
	let showDuplicateDialog = $state(false);
	let duplicateSourceIndex = $state(0);

	function openDuplicateDialog() {
		duplicateSourceIndex = 0; // Default to first variation
		showDuplicateDialog = true;
	}

	function duplicateVariation() {
		if (duplicateSourceIndex < 0 || duplicateSourceIndex >= variations.length) return;
		if (currentVariationIndex < 0 || currentVariationIndex >= variations.length) return;

		// Deep copy the source variation
		const sourceVariation = variations[duplicateSourceIndex];
		const duplicatedVariation: QuestionVariation = {
			// statement is now a branded string (TemplateMarkdown), so no deep copy needed
			statement: templateMarkdown(sourceVariation.statement),
			variables: structuredClone(sourceVariation.variables || []),
			correctChoiceIndex: sourceVariation.correctChoiceIndex,
			// correction is set from correctionStrings when building template
			correction: undefined,
			blanks: sourceVariation.blanks ? structuredClone(sourceVariation.blanks) : [],
			choices: sourceVariation.choices ? structuredClone(sourceVariation.choices) : [],
			blankDefaults: sourceVariation.blankDefaults
				? structuredClone(sourceVariation.blankDefaults)
				: {}
		};

		// Replace the current variation with the duplicated content
		variations = variations.map((v, i) => (i === currentVariationIndex ? duplicatedVariation : v));
		// Also copy the correction string and override arrays
		correctionStrings = correctionStrings.map((s, i) =>
			i === currentVariationIndex ? correctionStrings[duplicateSourceIndex] : s
		);
		perVarValidationRulesJson = perVarValidationRulesJson.map((s, i) =>
			i === currentVariationIndex ? perVarValidationRulesJson[duplicateSourceIndex] : s
		);
		perVarAnswerFormatsJson = perVarAnswerFormatsJson.map((s, i) =>
			i === currentVariationIndex ? perVarAnswerFormatsJson[duplicateSourceIndex] : s
		);
		perVarRequiredFormSelect = perVarRequiredFormSelect.map((s, i) =>
			i === currentVariationIndex ? perVarRequiredFormSelect[duplicateSourceIndex] : s
		);
		perVarRequiredFormPattern = perVarRequiredFormPattern.map((s, i) =>
			i === currentVariationIndex ? perVarRequiredFormPattern[duplicateSourceIndex] : s
		);
		showDuplicateDialog = false;
	}

	// Build template object
	function buildTemplate(): Omit<
		QuestionTemplate,
		'id' | 'created_at' | 'updated_at' | 'created_by'
	> {
		// Build variations with corrections and per-variation overrides
		const cleanedVariations = variations.map((variation, index) => {
			const correctionStr = correctionStrings[index] || '';
			const cleaned: QuestionVariation = {
				...variation,
				correction: stringToCorrection(correctionStr)
			};

			// Per-variation required form
			const rfSelect = perVarRequiredFormSelect[index] || '';
			if (rfSelect) {
				if (rfSelect === 'custom' && (perVarRequiredFormPattern[index] || '').trim()) {
					cleaned.requiredForm = { pattern: perVarRequiredFormPattern[index].trim() };
				} else if (
					VALID_REQUIRED_FORMS.includes(rfSelect as (typeof VALID_REQUIRED_FORMS)[number])
				) {
					cleaned.requiredForm = rfSelect as RequiredForm;
				}
			}

			// Per-variation validation rules
			try {
				const rules = JSON.parse(perVarValidationRulesJson[index] || '[]');
				if (Array.isArray(rules) && rules.length > 0) cleaned.validationRules = rules;
			} catch {
				/* ignore */
			}

			// Per-variation answer formats
			try {
				const fmts = JSON.parse(perVarAnswerFormatsJson[index] || '{}');
				if (Object.keys(fmts).length > 0) cleaned.answerFormats = fmts;
			} catch {
				/* ignore */
			}

			return cleaned;
		});

		// Build shared defaults
		const shared: SharedVariationDefaults = {};
		if (sharedStatement.trim()) shared.statement = sharedStatement;
		if (sharedVariables.length > 0) shared.variables = sharedVariables;
		if (
			typeof sharedCorrectChoiceIndex === 'string'
				? sharedCorrectChoiceIndex.trim()
				: sharedCorrectChoiceIndex.filter((s) => s.trim()).length > 0
		)
			shared.correctChoiceIndex = sharedCorrectChoiceIndex;
		const sharedCorrectionObj = stringToCorrection(sharedCorrectionString);
		if (sharedCorrectionObj) shared.correction = sharedCorrectionObj;
		if (sharedChoices.length > 0) shared.choices = sharedChoices;
		if (sharedRequiredFormSelect) {
			if (sharedRequiredFormSelect === 'custom' && sharedRequiredFormPattern.trim()) {
				shared.requiredForm = { pattern: sharedRequiredFormPattern.trim() };
			} else if (
				VALID_REQUIRED_FORMS.includes(
					sharedRequiredFormSelect as (typeof VALID_REQUIRED_FORMS)[number]
				)
			) {
				shared.requiredForm = sharedRequiredFormSelect as RequiredForm;
			}
		}
		const blankDefaults: BlankDefaults = {};
		if (sharedBlankPrecision && sharedBlankPrecision.type !== 'none') {
			blankDefaults.precision = sharedBlankPrecision;
		}
		if (sharedBlankRequiredFormSelect) {
			if (sharedBlankRequiredFormSelect === 'custom' && sharedBlankRequiredFormPattern.trim()) {
				blankDefaults.requiredForm = {
					pattern: sharedBlankRequiredFormPattern.trim()
				};
			} else if (
				VALID_REQUIRED_FORMS.includes(
					sharedBlankRequiredFormSelect as (typeof VALID_REQUIRED_FORMS)[number]
				)
			) {
				blankDefaults.requiredForm = sharedBlankRequiredFormSelect as RequiredForm;
			}
		}
		if (sharedBlankUnitExpected) {
			blankDefaults.unit = { expected: true };
			if (sharedBlankUnitRequired.trim())
				blankDefaults.unit.required = sharedBlankUnitRequired.trim();
		}
		if (Object.keys(blankDefaults).length > 0) shared.blankDefaults = blankDefaults;
		try {
			const rules = JSON.parse(sharedValidationRulesJson);
			if (Array.isArray(rules) && rules.length > 0) shared.validationRules = rules;
		} catch {
			/* ignore invalid JSON */
		}
		try {
			const fmts = JSON.parse(sharedAnswerFormatsJson);
			if (Object.keys(fmts).length > 0) shared.answerFormats = fmts;
		} catch {
			/* ignore invalid JSON */
		}

		// Build defaultDisplayOptions
		const displayOpts: DisplayOptions = {};
		if (displayShuffleTerms) displayOpts.shuffleTerms = true;
		if (displayShuffleFactors) displayOpts.shuffleFactors = true;
		if (displayShuffleTermsAndFactors) displayOpts.shuffleTermsAndFactors = true;
		if (displayShallowShuffleTerms) displayOpts.shallowShuffleTerms = true;
		if (displayShallowShuffleFactors) displayOpts.shallowShuffleFactors = true;
		if (displayRemoveNullTerms) displayOpts.removeNullTerms = true;
		if (displayRemoveUnnecessaryBrackets) displayOpts.removeUnnecessaryBrackets = true;
		if (displayRemoveSpaces) displayOpts.removeSpaces = true;
		const defaultDisplayOptions = Object.keys(displayOpts).length > 0 ? displayOpts : undefined;

		// Build options
		const options: QuestionTemplate['options'] = {};
		if (optAllowEquivalent) options.allowEquivalent = true;
		if (optAllowDifferentForms) options.allowDifferentForms = true;
		if (optCanonicalForm)
			options.canonicalForm = optCanonicalForm as 'fraction' | 'decimal' | 'scientific';
		if (optOrderIndependent) options.orderIndependent = true;
		if (optValidator)
			options.validator = optValidator as 'checkEquivalence' | 'checkAlgebraic' | 'checkNumeric';
		try {
			const vp = JSON.parse(optValidatorParamsJson);
			if (Object.keys(vp).length > 0) options.validatorParams = vp;
		} catch {
			/* ignore */
		}
		if (!optShuffleChoices) options.shuffleChoices = false;
		// Build constraints
		const constraints: NonNullable<NonNullable<QuestionTemplate['options']>['constraints']> = {};
		for (const id of CONSTRAINT_IDS) {
			if (constraintModes[id]) {
				(constraints as Record<string, ConstraintMode>)[id] = constraintModes[id] as ConstraintMode;
			}
		}
		if (optAllowBracketsInFirstNegativeTerm) constraints.allowBracketsInFirstNegativeTerm = true;
		if (Object.keys(constraints).length > 0) options.constraints = constraints;
		const finalOptions = Object.keys(options).length > 0 ? options : undefined;

		const base = {
			title,
			description: description.trim() ? description : undefined,
			shared: Object.keys(shared).length > 0 ? shared : undefined,
			defaultDisplayOptions,
			variations: cleanedVariations,
			exerciseInstruction,
			options: finalOptions,
			grades,
			theme,
			domain,
			subdomain,
			level,
			status,
			delay
		};

		// Add type-specific shared fields
		if (questionType === 'multiple_choice') {
			return { ...base, multipleAnswers };
		}

		return base;
	}

	// Handle save

	// Save as draft (no category validation)
	function handleSaveDraft() {
		const templateData = buildTemplate();
		onSave(templateData);
	}

	// Publish question (with category validation)
	function handlePublish() {
		if (categoryDuplicate) {
			// Show confirmation dialog
			showPublishDialog = true;
		} else {
			// No duplicate, publish directly
			status = 'published';
			const templateData = buildTemplate();
			onSave(templateData);
		}
	}

	// Confirm publication with adjusted level
	async function confirmPublishWithAdjustedLevel() {
		if (suggestedLevel) {
			level = suggestedLevel;
		}
		status = 'published';
		showPublishDialog = false;

		// Wait for next tick to let level update
		await tick();
		const templateData = buildTemplate();
		onSave(templateData);
	}

	// Validate form
	let isValid = $derived(
		title.trim().length > 0 &&
			variations.length > 0 &&
			variations.every(
				(v) =>
					v.statement.trim().length > 0 &&
					// fill_in_blanks: either correctChoiceIndex or blanks must exist
					((v.blanks && v.blanks.length > 0 && v.blanks.some((b) => b.expectedAnswer?.trim())) ||
						// multiple_choice: choices must have at least one correct
						(v.choices && v.choices.length > 0) ||
						// simple answer
						(typeof v.correctChoiceIndex === 'string' && v.correctChoiceIndex.trim().length > 0) ||
						(Array.isArray(v.correctChoiceIndex) && v.correctChoiceIndex.length > 0))
			) &&
			grades.length > 0 &&
			theme.trim().length > 0 &&
			domain.trim().length > 0 &&
			level > 0
	);
</script>

<div class="space-y-6">
	<!-- Status Badge (Informational) -->
	<div class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
		<div class="flex items-center gap-3">
			{#if status === 'draft'}
				<FileText class="h-5 w-5 text-amber-600 dark:text-amber-400" />
			{:else}
				<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
			{/if}
			<div>
				<p class="text-sm font-medium">
					<Badge
						variant={status === 'draft' ? 'secondary' : 'default'}
						class={status === 'draft'
							? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
							: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'}
					>
						{status === 'draft' ? 'Brouillon' : 'Publié'}
					</Badge>
				</p>
			</div>
		</div>
	</div>

	<!-- Title and Description -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				Informations générales
				<button
					type="button"
					onclick={() => (titleDescriptionHelpOpen = true)}
					class="text-muted-foreground transition-colors hover:text-foreground"
					aria-label="Aide sur le titre et la description"
				>
					<CircleQuestionMark class="h-5 w-5" />
				</button>
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Title (Required, with LaTeX support) -->
			<div class="space-y-2">
				<Label for="title" class="flex items-center gap-1">
					Titre <span class="text-destructive">*</span>
				</Label>
				<Input id="title" type="text" bind:value={title} />
			</div>

			<!-- Description (Optional, with rich text and LaTeX support) -->
			<Collapsible.Root
				bind:open={descriptionOpen}
				onOpenChange={async (open) => {
					if (open) await loadRichTextEditor();
				}}
			>
				<div class="space-y-2">
					<Collapsible.Trigger
						class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
					>
						<Label for="description" class="cursor-pointer">Description</Label>
						<ChevronDown
							class="h-4 w-4 transition-transform duration-200 {descriptionOpen
								? 'rotate-180'
								: ''}"
						/>
					</Collapsible.Trigger>
					<Collapsible.Content class="space-y-2">
						{#if RichTextEditor}
							<RichTextEditor
								bind:value={description}
								placeholder="Description ou contexte supplémentaire pour ce template..."
							/>
						{/if}
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		</Card.Content>
	</Card.Root>

	<!-- Type Selection -->
	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="question-type">Type de question</Label>
			<MySelect id="question-type" type="single" bind:value={questionType} items={QUESTION_TYPES} />
		</div>

		<div class="space-y-2">
			<Label for="delay">Délai (secondes)</Label>
			<Input id="delay" type="number" min="0" bind:value={delay} />
		</div>
	</div>

	<!-- Categorization Fields -->
	<!--
		Category system allows organizing questions by:
		- Theme: Broad subject area (e.g., "Algèbre", "Géométrie") [required]
		- Domain: Specific topic within theme (e.g., "Équations", "Polynômes") [required]
		- Subdomain: Optional sub-topic (e.g., "Linéaires", "Quadratiques") [optional]
		- Level: Difficulty as positive integer (1=easy, higher=harder) [required]

		These fields are independent from grade levels (grades field).
		Admins can add new categories on-the-fly via CategorySelector modals.
	-->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={categorizationOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<Card.Title class="flex items-center gap-2">
						Catégorisation
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								categorizationHelpOpen = true;
							}}
							class="text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Aide sur la catégorisation"
						>
							<CircleQuestionMark class="h-5 w-5" />
						</button>
					</Card.Title>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {categorizationOpen
							? 'rotate-180'
							: ''}"
					/>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Card.Content class="space-y-4">
						<div class="grid gap-4 md:grid-cols-2">
							<!-- Theme (Required) -->
							<CategorySelector
								label="Thème"
								bind:value={theme}
								options={themeOptions}
								required={true}
								onValueChange={(val) => (theme = val)}
								onAddNew={handleAddTheme}
							/>

							<!-- Domain (Required) -->
							<CategorySelector
								label="Domaine"
								bind:value={domain}
								options={domainOptions}
								required={true}
								onValueChange={(val) => (domain = val)}
								onAddNew={handleAddDomain}
							/>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<!-- Subdomain (Optional) -->
							<CategorySelector
								label="Sous-domaine"
								value={subdomain || ''}
								options={subdomainOptions}
								required={false}
								onValueChange={(val) => (subdomain = val || undefined)}
								onAddNew={handleAddSubdomain}
							/>

							<!-- Difficulty Level (Required, positive integer, no max) -->
							<div class="space-y-2">
								<Label for="level">
									Niveau de difficulté
									<span class="text-destructive">*</span>
								</Label>
								<Input
									id="level"
									type="number"
									min="1"
									bind:value={level}
									placeholder="1, 2, 3..."
									required
								/>
								{#if categoryDuplicate && status === 'draft'}
									<p class="text-xs text-amber-600 dark:text-amber-400">
										⚠️ Cette catégorie existe déjà au niveau {level}. Niveau suggéré : {suggestedLevel}
									</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Grade Levels -->
	<div class="space-y-2">
		<Label>Niveaux scolaires<span class="text-destructive">*</span></Label>
		<div class="flex flex-wrap gap-2">
			{#each GRADE_CODES as grade (grade)}
				<Badge
					class={grades.includes(grade)
						? 'cursor-pointer bg-primary text-primary-foreground hover:bg-primary/80'
						: 'cursor-pointer bg-muted text-muted-foreground hover:bg-muted/80'}
					onclick={() => toggleGrade(grade)}
				>
					{GRADES[grade].displayName}
				</Badge>
			{/each}
		</div>
	</div>

	<!-- Exercise Instruction (Optional, Shared) -->
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<Label for="exercise-instruction">Consigne d'exercice</Label>
			<button
				type="button"
				onclick={() => (exerciseInstructionHelpOpen = true)}
				class="text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Aide sur la consigne d'exercice"
			>
				<CircleQuestionMark class="h-4 w-4" />
			</button>
		</div>
		<Input id="exercise-instruction" type="text" bind:value={exerciseInstruction} />
	</div>

	<!-- Display Options -->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={displayOptionsOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<Card.Title>Options d'affichage</Card.Title>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {displayOptionsOpen
							? 'rotate-180'
							: ''}"
					/>
				</Collapsible.Trigger>
				<Card.Description
					>Transformations appliquées aux expressions avant affichage</Card.Description
				>
				<Collapsible.Content>
					<Card.Content class="space-y-3">
						<MyCheckbox bind:checked={displayShuffleTerms} label="Mélanger les termes (sommes)" />
						<MyCheckbox
							bind:checked={displayShuffleFactors}
							label="Mélanger les facteurs (produits)"
						/>
						<MyCheckbox
							bind:checked={displayShuffleTermsAndFactors}
							label="Mélanger termes et facteurs"
						/>
						<MyCheckbox
							bind:checked={displayShallowShuffleTerms}
							label="Mélange superficiel (termes au niveau racine)"
						/>
						<MyCheckbox
							bind:checked={displayShallowShuffleFactors}
							label="Mélange superficiel (facteurs au niveau racine)"
						/>
						<MyCheckbox
							bind:checked={displayRemoveNullTerms}
							label="Supprimer les termes nuls (x + 0 → x)"
						/>
						<MyCheckbox
							bind:checked={displayRemoveUnnecessaryBrackets}
							label="Supprimer les parenthèses inutiles"
						/>
						<MyCheckbox
							bind:checked={displayRemoveSpaces}
							label="Supprimer les espaces de groupement des chiffres"
						/>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Options de validation -->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={optionsSectionOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<Card.Title>Options de validation</Card.Title>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {optionsSectionOpen
							? 'rotate-180'
							: ''}"
					/>
				</Collapsible.Trigger>
				<Card.Description>Options de validation des réponses</Card.Description>
				<Collapsible.Content>
					<Card.Content class="space-y-4">
						<!-- General validation -->
						<div class="space-y-3">
							<h4 class="text-sm font-medium">Validation générale</h4>
							<MyCheckbox
								bind:checked={optAllowEquivalent}
								label="Accepter les formes équivalentes (1/2 = 0.5)"
							/>
							<MyCheckbox
								bind:checked={optAllowDifferentForms}
								label="Accepter différentes formes algébriques (1/2 = 2/4)"
							/>
							<div class="space-y-1">
								<Label>Forme canonique</Label>
								<MySelect
									type="single"
									bind:value={optCanonicalForm}
									items={[
										{ value: '', label: 'Aucune' },
										{ value: 'fraction', label: 'Fraction' },
										{ value: 'decimal', label: 'Decimal' },
										{ value: 'scientific', label: 'Scientifique' }
									]}
								/>
							</div>
							<MyCheckbox
								bind:checked={optOrderIndependent}
								label="Matching des trous indépendant de l'ordre"
							/>
						</div>

						<!-- Custom validator -->
						<Collapsible.Root bind:open={optionsValidatorOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Validateur custom</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {optionsValidatorOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-2 pt-2">
								<MySelect
									type="single"
									bind:value={optValidator}
									items={[
										{ value: '', label: 'Aucun' },
										{ value: 'checkEquivalence', label: 'Equivalence' },
										{ value: 'checkAlgebraic', label: 'Algebrique' },
										{ value: 'checkNumeric', label: 'Numerique' }
									]}
								/>
								{#if optValidator}
									<textarea
										class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
										bind:value={optValidatorParamsJson}
										rows={3}
										placeholder={'{}'}
									></textarea>
								{/if}
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- QCM options -->
						{#if questionType === 'multiple_choice'}
							<div class="space-y-3">
								<h4 class="text-sm font-medium">Options QCM</h4>
								<MyCheckbox bind:checked={optShuffleChoices} label="Mélanger les choix" />
							</div>
						{/if}

						<!-- Constraints -->
						<Collapsible.Root bind:open={optionsConstraintsOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Contraintes de forme</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {optionsConstraintsOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-3 pt-2">
								{#each CONSTRAINT_IDS as id (id)}
									<div class="grid grid-cols-2 items-center gap-2">
										<Label class="text-xs">{CONSTRAINT_LABELS[id]}</Label>
										<MySelect
											type="single"
											bind:value={constraintModes[id]}
											items={CONSTRAINT_MODE_OPTIONS}
										/>
									</div>
								{/each}
								<MyCheckbox
									bind:checked={optAllowBracketsInFirstNegativeTerm}
									label="Autoriser parenthèses sur premier terme négatif"
								/>
							</Collapsible.Content>
						</Collapsible.Root>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Champs partagés (shared defaults for all variations) -->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={sharedFieldsOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<Card.Title>Champs partagés</Card.Title>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {sharedFieldsOpen ? 'rotate-180' : ''}"
					/>
				</Collapsible.Trigger>
				<Card.Description>Valeurs par défaut héritées par toutes les variations</Card.Description>
				<Collapsible.Content>
					<Card.Content class="space-y-4">
						<!-- 1. Énoncé partagé -->
						<Collapsible.Root bind:open={sharedStatementOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Énoncé partagé</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedStatementOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<MarkdownEditor
									bind:value={sharedStatement}
									showParameterization={true}
									variables={sharedVariables}
									placeholder="Énoncé partagé par toutes les variations..."
									rows={4}
								/>
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 2. Variables partagées -->
						<Collapsible.Root bind:open={sharedVariablesOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="flex items-center gap-2 text-sm font-medium">
									Variables partagées
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											sharedVariableHelpOpen = true;
										}}
										class="text-muted-foreground transition-colors hover:text-foreground"
										aria-label="Aide sur les variables partagées"
									>
										<CircleQuestionMark class="h-4 w-4" />
									</button>
								</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedVariablesOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<VariableEditor
									bind:variables={sharedVariables}
									bind:helpDialogOpen={sharedVariableHelpOpen}
								/>
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 3. Réponse partagée -->
						<Collapsible.Root bind:open={sharedSolutionOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Réponse partagée</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedSolutionOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<AnswerEditor
									{questionType}
									bind:answer={sharedCorrectChoiceIndex}
									bind:choices={sharedChoices}
									{multipleAnswers}
								/>
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 4. Correction partagée -->
						<Collapsible.Root bind:open={sharedCorrectionSharedOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Correction partagée</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedCorrectionSharedOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<MarkdownEditor
									bind:value={sharedCorrectionString}
									showParameterization={true}
									variables={sharedVariables}
									placeholder="Correction partagée par toutes les variations..."
									rows={4}
								/>
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 5. Forme requise -->
						<Collapsible.Root bind:open={sharedRequiredFormOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Forme requise</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedRequiredFormOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-2 pt-2">
								<MySelect
									type="single"
									bind:value={sharedRequiredFormSelect}
									items={REQUIRED_FORM_OPTIONS}
								/>
								{#if sharedRequiredFormSelect === 'custom'}
									<Input
										type="text"
										bind:value={sharedRequiredFormPattern}
										placeholder="Pattern personnalisé (ex: a:integer * b:integer)"
									/>
								{/if}
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 6. Paramètres des trous (blankDefaults) -->
						<Collapsible.Root bind:open={sharedBlankDefaultsOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Paramètres des trous</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedBlankDefaultsOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-4 pt-2">
								<div class="space-y-2">
									<Label>Précision</Label>
									<PrecisionEditor bind:precision={sharedBlankPrecision} />
								</div>
								<div class="space-y-2">
									<Label>Forme requise (trous)</Label>
									<MySelect
										type="single"
										bind:value={sharedBlankRequiredFormSelect}
										items={REQUIRED_FORM_OPTIONS}
									/>
									{#if sharedBlankRequiredFormSelect === 'custom'}
										<Input
											type="text"
											bind:value={sharedBlankRequiredFormPattern}
											placeholder="Pattern personnalisé"
										/>
									{/if}
								</div>
								<div class="space-y-2">
									<MyCheckbox bind:checked={sharedBlankUnitExpected} label="Unité requise" />
									{#if sharedBlankUnitExpected}
										<Input
											type="text"
											bind:value={sharedBlankUnitRequired}
											placeholder="Unité imposée (ex: m, kg, cm²)"
										/>
									{/if}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 7. Règles de validation -->
						<Collapsible.Root bind:open={sharedValidationOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Règles de validation</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedValidationOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<textarea
									class="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none {validationRulesJsonError
										? 'border-destructive'
										: 'border-input'}"
									bind:value={sharedValidationRulesJson}
									rows={5}
									placeholder="[]"
								></textarea>
								{#if validationRulesJsonError}
									<p class="mt-1 text-xs text-destructive">{validationRulesJsonError}</p>
								{:else}
									<p class="mt-1 text-xs text-muted-foreground">Format JSON (tableau de règles)</p>
								{/if}
							</Collapsible.Content>
						</Collapsible.Root>

						<!-- 8. Formats de réponse -->
						<Collapsible.Root bind:open={sharedFormatsOpen}>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
							>
								<span class="text-sm font-medium">Formats de réponse</span>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {sharedFormatsOpen
										? 'rotate-180'
										: ''}"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="pt-2">
								<textarea
									class="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none {answerFormatsJsonError
										? 'border-destructive'
										: 'border-input'}"
									bind:value={sharedAnswerFormatsJson}
									rows={5}
									placeholder={'{}'}
								></textarea>
								{#if answerFormatsJsonError}
									<p class="mt-1 text-xs text-destructive">{answerFormatsJsonError}</p>
								{:else}
									<p class="mt-1 text-xs text-muted-foreground">
										Format JSON (clé = nom de variable, valeur = format)
									</p>
								{/if}
							</Collapsible.Content>
						</Collapsible.Root>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Variations Management -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						Variations de la question
						<button
							type="button"
							onclick={() => (variationsHelpOpen = true)}
							class="text-muted-foreground transition-colors hover:text-foreground"
							aria-label="Aide sur les variations"
						>
							<CircleQuestionMark class="h-5 w-5" />
						</button>
					</Card.Title>
				</div>
				<Button onclick={addVariation} variant="outline" size="sm" type="button">
					<Plus class="mr-2 h-4 w-4" />
					Ajouter une variation
				</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Variation Tabs -->
			<div class="flex gap-2 overflow-x-auto border-b">
				{#each variations as _, index (index)}
					<div class="flex flex-shrink-0 items-center">
						<button
							type="button"
							class="flex items-center gap-2 border-b-2 px-4 py-2 whitespace-nowrap transition-colors {currentVariationIndex ===
							index
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'}"
							onclick={() => selectVariation(index)}
						>
							Variation {index + 1}
						</button>
						{#if variations.length > 1}
							<button
								type="button"
								onclick={() => removeVariation(index)}
								class="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
								title="Supprimer cette variation"
							>
								<Trash2 class="h-3 w-3" />
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Current Variation Content -->
			{#each variations as variation, index (index)}
				{#if currentVariationIndex === index}
					<div class="space-y-6 pt-4">
						<!-- Duplicate Button (only for variations after the first) -->
						{#if index > 0}
							<div class="flex justify-end">
								<Button type="button" variant="outline" size="sm" onclick={openDuplicateDialog}>
									<Copy class="mr-2 h-4 w-4" />
									Dupliquer depuis une autre variation
								</Button>
							</div>
						{/if}

						<!-- Statement -->
						<Card.Root>
							<Card.Header>
								<Collapsible.Root bind:open={statementSectionOpen}>
									<Collapsible.Trigger
										class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
									>
										<Card.Title class="flex items-center gap-2">
											Énoncé <span class="text-destructive">*</span>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													statementHelpOpen = true;
												}}
												class="text-muted-foreground transition-colors hover:text-foreground"
												aria-label="Aide sur l'énoncé"
											>
												<CircleQuestionMark class="h-5 w-5" />
											</button>
										</Card.Title>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 {statementSectionOpen
												? 'rotate-180'
												: ''}"
										/>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Card.Content>
											<MarkdownEditor
												bind:value={variation.statement}
												showParameterization={true}
												variables={variation.variables}
												placeholder="Ecrivez l'enonce de la question en markdown..."
												rows={6}
											/>
										</Card.Content>
									</Collapsible.Content>
								</Collapsible.Root>
							</Card.Header>
						</Card.Root>

						<!-- Variables -->
						<Card.Root>
							<Card.Header>
								<Collapsible.Root bind:open={variablesOpen}>
									<Collapsible.Trigger
										class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
									>
										<Card.Title class="flex items-center gap-2">
											Variables
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													variableHelpOpen = true;
												}}
												class="text-muted-foreground transition-colors hover:text-foreground"
												aria-label="Aide sur les variables"
											>
												<CircleQuestionMark class="h-5 w-5" />
											</button>
										</Card.Title>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 {variablesOpen
												? 'rotate-180'
												: ''}"
										/>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Card.Content>
											<VariableEditor
												bind:variables={variation.variables}
												bind:helpDialogOpen={variableHelpOpen}
											/>
										</Card.Content>
									</Collapsible.Content>
								</Collapsible.Root>
							</Card.Header>
						</Card.Root>

						<!-- Answer -->
						<Card.Root>
							<Card.Header>
								<Collapsible.Root bind:open={answerSectionOpen}>
									<Collapsible.Trigger
										class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
									>
										<Card.Title class="flex items-center gap-2">
											Réponse <span class="text-destructive">*</span>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													answerHelpOpen = true;
												}}
												class="text-muted-foreground transition-colors hover:text-foreground"
												aria-label="Aide sur la réponse"
											>
												<CircleQuestionMark class="h-5 w-5" />
											</button>
										</Card.Title>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 {answerSectionOpen
												? 'rotate-180'
												: ''}"
										/>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Card.Content>
											<AnswerEditor
												{questionType}
												bind:answer={variation.correctChoiceIndex}
												bind:blanks={variation.blanks}
												bind:choices={variation.choices}
												{multipleAnswers}
											/>
										</Card.Content>
									</Collapsible.Content>
								</Collapsible.Root>
							</Card.Header>
						</Card.Root>

						<!-- Correction (optional) -->
						<Card.Root>
							<Card.Header>
								<Collapsible.Root bind:open={correctionOpen}>
									<Collapsible.Trigger
										class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
									>
										<Card.Title class="flex items-center gap-2">
											Correction (optionnel)
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													correctionHelpOpen = true;
												}}
												class="text-muted-foreground transition-colors hover:text-foreground"
												aria-label="Aide sur la correction"
											>
												<CircleQuestionMark class="h-5 w-5" />
											</button>
										</Card.Title>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 {correctionOpen
												? 'rotate-180'
												: ''}"
										/>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Card.Content>
											<MarkdownEditor
												bind:value={correctionStrings[index]}
												showParameterization={true}
												variables={variation.variables}
												placeholder="Explication de la solution (optionnel)..."
												rows={6}
											/>
										</Card.Content>
									</Collapsible.Content>
								</Collapsible.Root>
							</Card.Header>
						</Card.Root>

						<!-- Per-variation overrides -->
						<Card.Root>
							<Card.Header>
								<Collapsible.Root bind:open={perVarOverridesOpen[index]}>
									<Collapsible.Trigger
										class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
									>
										<Card.Title>Surcharges (cette variation)</Card.Title>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 {perVarOverridesOpen[index]
												? 'rotate-180'
												: ''}"
										/>
									</Collapsible.Trigger>
									<Card.Description
										>Surcharger les champs partagés pour cette variation</Card.Description
									>
									<Collapsible.Content>
										<Card.Content class="space-y-4">
											<!-- Forme requise (per-variation) -->
											<div class="space-y-2">
												<Label class="text-sm font-medium">Forme requise</Label>
												<MySelect
													type="single"
													bind:value={perVarRequiredFormSelect[index]}
													items={REQUIRED_FORM_OPTIONS}
												/>
												{#if perVarRequiredFormSelect[index] === 'custom'}
													<Input
														type="text"
														bind:value={perVarRequiredFormPattern[index]}
														placeholder="Pattern personnalise (ex: a:integer * b:integer)"
													/>
												{/if}
											</div>

											<!-- Parametres des trous (per-variation blankDefaults) -->
											<div class="space-y-2">
												<Label class="text-sm font-medium">Paramètres des trous</Label>
												<PrecisionEditor bind:precision={variation.blankDefaults!.precision} />
											</div>

											<!-- Regles de validation -->
											<div class="space-y-2">
												<Label class="text-sm font-medium">Règles de validation</Label>
												<textarea
													class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
													bind:value={perVarValidationRulesJson[index]}
													rows={3}
													placeholder="[]"
												></textarea>
												<p class="text-xs text-muted-foreground">Format JSON (tableau de regles)</p>
											</div>

											<!-- Formats de reponse -->
											<div class="space-y-2">
												<Label class="text-sm font-medium">Formats de réponse</Label>
												<textarea
													class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
													bind:value={perVarAnswerFormatsJson[index]}
													rows={3}
													placeholder={'{}'}
												></textarea>
												<p class="text-xs text-muted-foreground">
													Format JSON (cle = nom de variable, valeur = format)
												</p>
											</div>
										</Card.Content>
									</Collapsible.Content>
								</Collapsible.Root>
							</Card.Header>
						</Card.Root>
					</div>
				{/if}
			{/each}
		</Card.Content>
	</Card.Root>

	<!-- Preview & JSON -->
	<Tabs.Root
		value="preview"
		onValueChange={async (value) => {
			if (value === 'preview') await loadQuestionPreview();
			if (value === 'json') await loadJsonViewer();
		}}
	>
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="preview" onclick={() => loadQuestionPreview()}>Aperçu</Tabs.Trigger>
			<Tabs.Trigger value="json" onclick={() => loadJsonViewer()}>JSON</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="preview">
			{#if QuestionPreview}
				<QuestionPreview template={buildTemplate()} />
			{:else}
				<div class="flex items-center justify-center p-8">
					<p class="text-muted-foreground">Chargement de l'aperçu...</p>
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="json">
			{#if JsonViewer}
				<JsonViewer data={buildTemplate()} />
			{:else}
				<div class="flex items-center justify-center p-8">
					<p class="text-muted-foreground">Chargement du JSON...</p>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>

	<!-- Action Buttons -->
	<div class="flex justify-end gap-3">
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
		<Button
			variant="secondary"
			onclick={handleSaveDraft}
			disabled={isSubmitting}
			class="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100"
		>
			<FileText class="mr-2 h-4 w-4" />
			{isSubmitting ? 'Enregistrement...' : 'Enregistrer brouillon'}
		</Button>
		<Button
			onclick={handlePublish}
			disabled={!isValid || isSubmitting}
			class="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
		>
			<CheckCircle2 class="mr-2 h-4 w-4" />
			{isSubmitting ? 'Publication...' : 'Publier'}
		</Button>
	</div>
</div>

<!-- Duplicate Variation Dialog -->
<Dialog.Root bind:open={showDuplicateDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Dupliquer une variation</Dialog.Title>
			<Dialog.Description>
				Choisissez la variation source à copier dans la variation actuelle (Variation {currentVariationIndex +
					1}).
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="source-variation">Variation source</Label>
				<MySelect
					id="source-variation"
					type="single"
					value={String(duplicateSourceIndex)}
					onValueChange={(v) => (duplicateSourceIndex = Number(v))}
					items={variations.map((_, index) => ({
						value: String(index),
						label: `Variation ${index + 1}${index === 0 ? ' (Référence)' : ''}`
					}))}
				/>
				<p class="text-xs text-muted-foreground">
					Le contenu de cette variation sera copié et écrasera le contenu actuel de la Variation {currentVariationIndex +
						1}.
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDuplicateDialog = false)}>Annuler</Button>
			<Button onclick={duplicateVariation}>
				<Copy class="mr-2 h-4 w-4" />
				Dupliquer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Help Dialogs -->

<!-- Title and Description Help -->
<Dialog.Root bind:open={titleDescriptionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Titre et Description</Dialog.Title>
			<Dialog.Description>
				Guide pour renseigner le titre et la description d'un template
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Titre (obligatoire)</h4>
				<p class="text-sm text-muted-foreground">
					Le titre est un résumé court et descriptif du template. Il sert à identifier rapidement le
					template dans la liste et aide à l'organisation.
				</p>
				<div class="mt-2 space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Exemples de bons titres :</p>
					<ul class="ml-4 space-y-1 font-mono text-xs">
						<li>• "Calcul de dérivées - Polynômes"</li>
						<li>• "Résolution d'équations du premier degré"</li>
						<li>• "Théorème de Pythagore - Application"</li>
						<li>• "Simplification de $$\frac{'{a}'}{'{b}'}$$"</li>
					</ul>
					<p class="mt-3 text-muted-foreground">
						💡 Le titre supporte LaTeX : utilisez $$formule$$ pour inclure des expressions
						mathématiques
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Description (optionnel)</h4>
				<p class="text-sm text-muted-foreground">
					La description permet d'ajouter du contexte supplémentaire sur le template. Elle peut
					servir :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Pour les enseignants</strong> : Notes internes, objectifs pédagogiques, prérequis</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Pour les élèves</strong> : Instructions supplémentaires, rappels de cours, conseils</span
						>
					</li>
				</ul>
				<div class="mt-2 space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Exemple de description :</p>
					<p class="text-xs italic">
						"Ce template permet de travailler sur la dérivation de polynômes de degré 2 et 3. Les
						élèves doivent appliquer les règles de dérivation apprises en cours. Rappel : la dérivée
						de x^n est nx^(n-1)."
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Éditeur riche</h4>
				<p class="text-sm text-muted-foreground">
					La description utilise un éditeur de texte riche avec de nombreuses fonctionnalités :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Formatage</strong> : Gras, italique, souligné, barré, exposant, indice</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Structure</strong> : Titres, listes (à puces, numérotées, tâches), alignement</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span><strong>Couleurs</strong> : Couleur de texte et surlignage</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Formules mathématiques</strong> : Utilisez la section "Formule" pour insérer des
							expressions LaTeX (fractions, racines, exposants...)</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span><strong>Autres</strong> : Liens, emojis, citations, blocs de code</span>
					</li>
				</ul>
				<p class="mt-2 text-xs text-muted-foreground">
					💡 Les sections de la barre d'outils sont repliables (Texte, Paragraphe, Insertion,
					Formule)
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Support LaTeX pour le titre</h4>
				<p class="text-sm text-muted-foreground">
					Le champ <strong>titre</strong> supporte LaTeX pour inclure des formules mathématiques :
				</p>
				<ul class="mt-2 space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Utilisez <code class="rounded bg-muted px-1">$$formule$$</code> pour délimiter les expressions
							LaTeX</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Des boutons d'aide sont disponibles pour insérer les syntaxes courantes (fractions,
							racines...)</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Affichage</h4>
				<p class="text-sm text-muted-foreground">
					Le titre apparaît dans la liste des templates pour faciliter l'identification. La
					description peut être consultée lors de la visualisation du template.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (titleDescriptionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Exercise Instruction Help -->
<Dialog.Root bind:open={exerciseInstructionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Consigne d'exercice</Dialog.Title>
			<Dialog.Description>
				Guide pour utiliser efficacement la consigne d'exercice
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">À quoi sert la consigne ?</h4>
				<p class="text-sm text-muted-foreground">
					La consigne d'exercice est une instruction partagée par toutes les variations de la
					question. Elle permet d'indiquer ce que l'élève doit faire (ex: "Calculer", "Résoudre",
					"Simplifier").
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Où apparaît-elle ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Dans les cartes/flashcards</strong> : La consigne apparaît avant l'énoncé pour
							guider l'élève</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Dans les feuilles d'exercices</strong> : Elle sert de titre d'exercice et n'est
							pas répétée devant chaque question</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemples</h4>
				<div class="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="font-medium">Bonnes consignes :</p>
					<ul class="ml-4 space-y-1 font-mono text-xs">
						<li>• "Calculer"</li>
						<li>• "Résoudre l'équation"</li>
						<li>• "Simplifier l'expression"</li>
						<li>• "Factoriser"</li>
						<li>• "Développer et réduire"</li>
					</ul>
					<p class="mt-3 text-muted-foreground">
						💡 Conseil : Restez concis, l'énoncé contient déjà les détails
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Optionnel</h4>
				<p class="text-sm text-muted-foreground">
					Ce champ est facultatif. Si vous ne le remplissez pas, seul l'énoncé sera affiché.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (exerciseInstructionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Categorization Help -->
<Dialog.Root bind:open={categorizationHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Catégorisation des questions</Dialog.Title>
			<Dialog.Description>
				Organisez vos questions par thème, domaine et difficulté
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Pourquoi catégoriser ?</h4>
				<p class="text-sm text-muted-foreground">La catégorisation permet de :</p>
				<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Organiser votre banque de questions de manière logique</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Filtrer et rechercher facilement des questions spécifiques</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Créer des exercices ciblés sur un sujet précis</span>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Les trois niveaux</h4>

				<div class="space-y-3">
					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">1. Thème (obligatoire)</p>
						<p class="text-xs text-muted-foreground">Catégorie générale de mathématiques</p>
						<p class="mt-2 font-mono text-xs">Ex: Algèbre, Géométrie, Analyse, Probabilités</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">2. Domaine (obligatoire)</p>
						<p class="text-xs text-muted-foreground">Sous-catégorie plus précise du thème</p>
						<p class="mt-2 font-mono text-xs">
							Ex: Pour "Algèbre" → Équations, Polynômes, Systèmes<br />
							Pour "Géométrie" → Triangles, Cercles, Vecteurs
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3">
						<p class="mb-1 text-sm font-medium">3. Sous-domaine (optionnel)</p>
						<p class="text-xs text-muted-foreground">Spécialisation encore plus fine</p>
						<p class="mt-2 font-mono text-xs">
							Ex: Pour "Équations" → Linéaires, Quadratiques, Polynomiales
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Niveau de difficulté</h4>
				<p class="mb-2 text-sm text-muted-foreground">
					Le niveau est un nombre entier positif (1, 2, 3...) qui indique la difficulté de la
					question.
				</p>
				<div class="rounded-lg border bg-muted/30 p-3 text-sm">
					<p class="mb-2 font-medium">Recommandations :</p>
					<ul class="space-y-1 text-xs">
						<li><strong>1-2</strong> : Questions basiques, introduction</li>
						<li><strong>3-4</strong> : Questions intermédiaires</li>
						<li><strong>5-7</strong> : Questions avancées</li>
						<li><strong>8+</strong> : Questions expertes/compétition</li>
					</ul>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Indépendant des niveaux scolaires</h4>
				<p class="text-sm text-muted-foreground">
					⚠️ La catégorisation est indépendante des "Niveaux scolaires" (6ème, 2nde, etc.). Une même
					question peut être utilisée pour plusieurs niveaux scolaires.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (categorizationHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Variations Help -->
<Dialog.Root bind:open={variationsHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Variations de questions</Dialog.Title>
			<Dialog.Description>
				Créez plusieurs versions d'une même question pour plus de diversité
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce qu'une variation ?</h4>
				<p class="text-sm text-muted-foreground">
					Une variation est une version alternative de la question avec son propre énoncé, variables
					et réponse. Lors de la génération d'une instance, une variation est choisie aléatoirement
					parmi celles disponibles.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Pourquoi utiliser des variations ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Diversité</strong> : Éviter que les élèves tombent toujours sur la même formulation</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Contextes variés</strong> : Poser le même concept mathématique dans différents
							contextes</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							><strong>Complexité graduée</strong> : Créer des variations plus ou moins difficiles de
							la même question</span
						>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple concret</h4>
				<div class="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
					<div>
						<p class="mb-1 font-semibold">Variation 1 :</p>
						<p class="text-xs">Énoncé : "Calculer $$&#123;@:a&#125; + &#123;@:b&#125;$$"</p>
					</div>
					<div>
						<p class="mb-1 font-semibold">Variation 2 :</p>
						<p class="text-xs">
							Énoncé : "Quelle est la somme de $$&#123;@:a&#125;$$ et $$&#123;@:b&#125;$$ ?"
						</p>
					</div>
					<div>
						<p class="mb-1 font-semibold">Variation 3 :</p>
						<p class="text-xs">
							Énoncé : "Marie a $$&#123;@:a&#125;$$ pommes, Jean lui en donne $$&#123;@:b&#125;$$.
							Combien en a-t-elle ?"
						</p>
					</div>
					<p class="mt-3 text-xs text-muted-foreground italic">
						Les trois variations posent le même calcul mais avec des formulations différentes
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Champs partagés vs. spécifiques</h4>
				<div class="space-y-2">
					<div class="rounded border bg-blue-50 p-3 text-sm dark:bg-blue-950">
						<p class="mb-1 font-semibold">Partagés (même pour toutes les variations) :</p>
						<ul class="ml-4 space-y-0.5 text-xs">
							<li>• Consigne d'exercice</li>
							<li>• Catégorisation (thème, domaine, niveau)</li>
							<li>• Niveaux scolaires</li>
							<li>• Type de question</li>
						</ul>
					</div>
					<div class="rounded border bg-green-50 p-3 text-sm dark:bg-green-950">
						<p class="mb-1 font-semibold">Spécifiques (différents pour chaque variation) :</p>
						<ul class="ml-4 space-y-0.5 text-xs">
							<li>• Énoncé</li>
							<li>• Variables</li>
							<li>• Réponse</li>
							<li>• Correction</li>
						</ul>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Conseils</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Une seule variation suffit si votre question est déjà très variée grâce aux variables
							aléatoires</span
						>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Utilisez 2-3 variations pour des formulations différentes du même concept</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span
							>Le bouton "Dupliquer" permet de copier une variation existante comme point de départ</span
						>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (variationsHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Statement Help -->
<Dialog.Root bind:open={statementHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Énoncé de la question</Dialog.Title>
			<Dialog.Description>
				Rédigez l'énoncé avec support LaTeX et variables dynamiques
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce que l'énoncé ?</h4>
				<p class="text-sm text-muted-foreground">
					L'énoncé est la question posée à l'élève. Il peut contenir du texte, des formules
					mathématiques (LaTeX), des images, et faire référence aux variables définies.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Syntaxes disponibles</h4>
				<div class="space-y-2">
					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">LaTeX pour les mathématiques :</p>
						<code class="text-xs">$$x^2 + 2x + 1$$</code>
						<p class="mt-1 text-xs text-muted-foreground">Entourer les formules de $$ ... $$</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Variables :</p>
						<code class="text-xs">&#123;@:nomVariable&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Insère la valeur de la variable définie précédemment
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Nombres aléatoires directs :</p>
						<code class="text-xs">&#123;#:1-10&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Génère un nombre aléatoire (utile si pas besoin de variable)
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-2 font-semibold">Évaluation d'expression :</p>
						<code class="text-xs">&#123;eval:&#123;@:a&#125;+&#123;@:b&#125;&#125;</code>
						<p class="mt-1 text-xs text-muted-foreground">
							Calcule et affiche le résultat d'une expression
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple complet</h4>
				<div class="rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="mb-2 font-semibold">Variables définies :</p>
					<div class="mb-3 ml-3 space-y-1 font-mono text-xs">
						<p>a = &#123;#:1-10&#125;</p>
						<p>b = &#123;#:1-10&#125;</p>
					</div>
					<p class="mb-2 font-semibold">Énoncé :</p>
					<p class="font-mono text-xs">Calculer $$&#123;@:a&#125; + &#123;@:b&#125;$$</p>
					<p class="mt-3 text-xs text-muted-foreground">
						→ Si a=3 et b=5, l'élève verra : "Calculer $$3 + 5$$"
					</p>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Boutons d'aide rapide</h4>
				<p class="text-sm text-muted-foreground">
					Utilisez les boutons sous le champ de texte pour insérer rapidement la syntaxe LaTeX et
					les variables.
				</p>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (statementHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Answer Help -->
<Dialog.Root bind:open={answerHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Réponse attendue</Dialog.Title>
			<Dialog.Description>
				Définissez la réponse correcte selon le type de question
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Format selon le type de question</h4>
				<div class="space-y-3">
					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-1 font-semibold">Texte à trous (fill-in-blanks)</p>
						<p class="text-xs text-muted-foreground">
							Définissez les trous et la réponse attendue pour chacun. Les réponses peuvent utiliser
							des variables et des expressions évaluées.
						</p>
					</div>

					<div class="rounded-lg border bg-muted/30 p-3 text-sm">
						<p class="mb-1 font-semibold">QCM (multiple choice)</p>
						<p class="text-xs text-muted-foreground">
							Créez les choix et cochez ceux qui sont corrects. Vous pouvez autoriser une ou
							plusieurs bonnes réponses.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Utilisation des variables</h4>
				<p class="mb-2 text-sm text-muted-foreground">
					La réponse peut utiliser les mêmes syntaxes que l'énoncé :
				</p>
				<ul class="space-y-1 text-sm">
					<li class="flex gap-2">
						<code class="text-xs">&#123;@:var&#125;</code>
						<span class="text-xs text-muted-foreground">- Référence à une variable</span>
					</li>
					<li class="flex gap-2">
						<code class="text-xs">&#123;eval:...&#125;</code>
						<span class="text-xs text-muted-foreground">- Évaluation d'expression</span>
					</li>
					<li class="flex gap-2">
						<code class="text-xs">&#123;#:1-10&#125;</code>
						<span class="text-xs text-muted-foreground">- Nombre aléatoire</span>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (answerHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Correction Help -->
<Dialog.Root bind:open={correctionHelpOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Correction détaillée</Dialog.Title>
			<Dialog.Description>Fournissez une explication de la solution (optionnel)</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<section>
				<h4 class="mb-2 font-semibold">Qu'est-ce que la correction ?</h4>
				<p class="text-sm text-muted-foreground">
					La correction est une explication détaillée de la solution qui sera montrée à l'élève
					après qu'il ait répondu à la question. Elle est <strong>optionnelle</strong>.
				</p>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Quand l'utiliser ?</h4>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour les questions complexes nécessitant des étapes intermédiaires</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour expliquer la méthode de résolution</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pour donner des astuces ou rappels théoriques</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Pas nécessaire pour les questions simples où la réponse se suffit</span>
					</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Format</h4>
				<p class="mb-2 text-sm text-muted-foreground">Comme l'énoncé, la correction supporte :</p>
				<ul class="space-y-1 text-xs text-muted-foreground">
					<li>• LaTeX pour les formules mathématiques</li>
					<li>• Variables avec <code>&#123;@:nom&#125;</code></li>
					<li>• Évaluations avec <code>&#123;eval:...&#125;</code></li>
					<li>• Texte et images</li>
				</ul>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Exemple</h4>
				<div class="rounded-lg border bg-muted/30 p-4 text-sm">
					<p class="mb-2 font-semibold">Question : Résoudre $$2x + 3 = 11$$</p>
					<div class="mt-3 space-y-2 text-xs">
						<p class="font-semibold">Correction :</p>
						<p>On isole x en plusieurs étapes :</p>
						<ol class="ml-4 space-y-1">
							<li>1. Soustraire 3 de chaque côté : $$2x = 8$$</li>
							<li>2. Diviser par 2 : $$x = 4$$</li>
						</ol>
						<p class="mt-2 text-muted-foreground">
							💡 Astuce : On effectue toujours les opérations inverses dans l'ordre inverse de
							priorité.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h4 class="mb-2 font-semibold">Conseils</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Soyez pédagogique : expliquez le raisonnement, pas seulement les calculs</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Utilisez des étapes numérotées pour les solutions en plusieurs parties</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Ajoutez des rappels théoriques si nécessaire</span>
					</li>
					<li class="flex gap-2">
						<span class="text-primary">•</span>
						<span>Restez concis : une correction trop longue ne sera pas lue</span>
					</li>
				</ul>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (correctionHelpOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Publish Confirmation Dialog -->
<Dialog.Root bind:open={showPublishDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<CheckCircle2 class="h-5 w-5 text-amber-600" />
				Publier avec ajustement de niveau
			</Dialog.Title>
			<Dialog.Description>
				Cette catégorie existe déjà au niveau {level}.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="rounded-lg bg-muted p-4">
				<p class="text-sm font-medium">Catégorie :</p>
				<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
					<li>• Thème : <strong>{theme}</strong></li>
					<li>• Domaine : <strong>{domain}</strong></li>
					{#if subdomain}
						<li>• Sous-domaine : <strong>{subdomain}</strong></li>
					{/if}
					<li>
						• Niveau : <strong class="text-destructive">{level}</strong>
						→
						<strong class="text-green-600">{suggestedLevel}</strong>
					</li>
				</ul>
			</div>

			<p class="text-sm text-muted-foreground">
				Le niveau sera automatiquement ajusté à <strong class="text-green-600"
					>{suggestedLevel}</strong
				>
				pour éviter les doublons.
			</p>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showPublishDialog = false)}>Annuler</Button>
			<Button onclick={confirmPublishWithAdjustedLevel} class="bg-green-600 hover:bg-green-700">
				<CheckCircle2 class="mr-2 h-4 w-4" />
				Publier au niveau {suggestedLevel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
