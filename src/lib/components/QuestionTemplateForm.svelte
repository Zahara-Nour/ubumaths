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
		ConstraintMode
	} from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { DisplayOptions } from '$lib/ubumark/parameterization/display-options';
	import { questionTemplateSchema } from '$lib/questions/template-schema';
	import { CONSTRAINT_IDS } from '$lib/questions/constraint-constants';
	import { REQUIRED_FORM_OPTIONS } from '$lib/questions/form-options';
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
	import PrecisionEditor from './PrecisionEditor.svelte';
	import { templateMarkdown } from '$lib/ubumark';
	import CategorySelector from './CategorySelector.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { tick, onMount } from 'svelte';

	// Lazy-loaded heavy components to reduce initial bundle size
	let RichTextEditor = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let QuestionPreview = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let JsonViewer = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let JsonEditorComponent = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let loadedComponents = $state({
		richText: false,
		preview: false,
		json: false,
		jsonEditor: false
	});
	import {
		X,
		Plus,
		Trash2,
		Copy,
		FileText,
		CheckCircle2,
		ChevronDown,
		CircleQuestionMark,
		Braces
	} from 'lucide-svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';
	import QuestionTemplateHelpDialogs from './QuestionTemplateHelpDialogs.svelte';
	import DisplayOptionsEditor from './DisplayOptionsEditor.svelte';
	import ValidationOptionsEditor from './ValidationOptionsEditor.svelte';
	import SharedFieldsEditor from './SharedFieldsEditor.svelte';

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
		template
			? getQuestionType({ choices: template.variations?.[0]?.choices, shared: template.shared })
			: 'fill_in_blanks'
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

	async function loadJsonEditor() {
		if (!loadedComponents.jsonEditor) {
			const module = await import('$lib/constructions/components/JsonEditor.svelte');
			JsonEditorComponent = module.default;
			loadedComponents.jsonEditor = true;
		}
	}

	// JSON raw editing mode
	let jsonMode = $state(false);
	let jsonString = $state('');
	let jsonValid = $state(true);
	let _jsonErrors = $state<string[]>([]);

	// Load category cache, preview component, and category options on mount
	onMount(async () => {
		questionCategoriesCache.fetchCategories();
		loadQuestionPreview();

		// Fetch existing categories for autocomplete options
		try {
			const response = await fetch('/api/questions/categories');
			if (response.ok) {
				const data = await response.json();
				themeOptions = data.themes || [];
				domainOptions = data.domains || [];
				subdomainOptions = data.subdomains || [];
				// Ensure template's current values are in options (e.g. migration categories)
				if (theme && !themeOptions.includes(theme)) {
					themeOptions = [...themeOptions, theme];
				}
				if (domain && !domainOptions.includes(domain)) {
					domainOptions = [...domainOptions, domain];
				}
				if (subdomain && !subdomainOptions.includes(subdomain)) {
					subdomainOptions = [...subdomainOptions, subdomain];
				}
			}
		} catch (error) {
			console.error('Error fetching categories:', error);
		}
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
	let sharedBlankPrecision = $state(
		template?.shared?.blankDefaults?.precision ?? { type: 'none' as const }
	);
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

	// Valid required form values (used in buildTemplate)
	const VALID_REQUIRED_FORMS = ['product', 'sum', 'fraction', 'power'] as const;

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
	let sharedFieldsOpen = $state(false);
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
			blankDefaults: { precision: { type: 'none' as const }, ...v.blankDefaults }
		})) || [
			{
				statement: templateMarkdown(''),
				variables: [],
				correctChoiceIndex: '',
				blanks: [],
				choices: [],
				blankDefaults: { precision: { type: 'none' as const } }
			}
		]
	);

	// Per-variation extra state (correction, overrides, etc.)
	interface VariationExtra {
		correctionString: string;
		validationRulesJson: string;
		answerFormatsJson: string;
		requiredFormSelect: string;
		requiredFormPattern: string;
		overridesOpen: boolean;
	}

	const DEFAULT_VARIATION_EXTRA: VariationExtra = {
		correctionString: '',
		validationRulesJson: '[]',
		answerFormatsJson: '{}',
		requiredFormSelect: '',
		requiredFormPattern: '',
		overridesOpen: false
	};

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
		})) || [{ ...DEFAULT_VARIATION_EXTRA }]
	);

	// Current variation index for editing
	let currentVariationIndex = $state(0);

	// Available grade levels - use GRADE_CODES from unified system
	// GRADE_CODES is already imported from '$lib/types/grades'

	// Question type options
	const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
		{ value: 'fill_in_blanks', label: 'Texte à trous' },
		{ value: 'multiple_choice', label: 'QCM' }
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
				blankDefaults: { precision: { type: 'none' as const } }
			}
		];
		variationExtras = [...variationExtras, { ...DEFAULT_VARIATION_EXTRA }];
		currentVariationIndex = variations.length - 1;
	}

	function removeVariation(index: number) {
		if (variations.length <= 1) return; // Must have at least 1 variation
		variations = variations.filter((_, i) => i !== index);
		variationExtras = variationExtras.filter((_, i) => i !== index);
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
			// correction is set from variationExtras when building template
			correction: undefined,
			blanks: sourceVariation.blanks ? structuredClone(sourceVariation.blanks) : [],
			choices: sourceVariation.choices ? structuredClone(sourceVariation.choices) : [],
			blankDefaults: {
				precision: { type: 'none' as const },
				...(sourceVariation.blankDefaults ? structuredClone(sourceVariation.blankDefaults) : {})
			}
		};

		// Replace the current variation with the duplicated content
		variations = variations.map((v, i) => (i === currentVariationIndex ? duplicatedVariation : v));
		// Also copy the variation extras (correction, overrides)
		variationExtras = variationExtras.map((extra, i) =>
			i === currentVariationIndex ? { ...variationExtras[duplicateSourceIndex] } : extra
		);
		showDuplicateDialog = false;
	}

	// Derive correctChoiceIndex from isCorrect flags on choices
	function deriveCorrectChoiceIndex(
		choices: { content: unknown; isCorrect?: boolean }[]
	): string | string[] | undefined {
		const indexes = choices
			.map((c, i) => (c.isCorrect ? String(i) : null))
			.filter((i): i is string => i !== null);
		if (indexes.length === 1) return indexes[0];
		if (indexes.length > 1) return indexes;
		return undefined;
	}

	// Build template object
	function buildTemplate(): Omit<
		QuestionTemplate,
		'id' | 'created_at' | 'updated_at' | 'created_by'
	> {
		// Build variations with corrections and per-variation overrides
		const cleanedVariations = variations.map((variation, index) => {
			const extra = variationExtras[index] || DEFAULT_VARIATION_EXTRA;

			// Filter out empty variables
			const filteredVars = variation.variables?.filter((v) => v.name && v.expression);

			// Clean blankDefaults: exclude default precision, omit if empty
			let cleanedBlankDefaults: QuestionVariation['blankDefaults'] | undefined;
			if (variation.blankDefaults) {
				const { precision, ...rest } = variation.blankDefaults;
				const withPrecision =
					precision && precision.type !== 'none' ? { precision, ...rest } : rest;
				cleanedBlankDefaults = Object.keys(withPrecision).length > 0 ? withPrecision : undefined;
			}

			// Build cleaned variation without mutating reactive state
			const cleaned: QuestionVariation = {
				statement: variation.statement,
				...(filteredVars && filteredVars.length > 0 ? { variables: filteredVars } : {}),
				...(questionType === 'multiple_choice' && variation.choices
					? {
							correctChoiceIndex: deriveCorrectChoiceIndex(variation.choices),
							choices: variation.choices
						}
					: {}),
				...(questionType === 'fill_in_blanks' && variation.blanks && variation.blanks.length > 0
					? { blanks: variation.blanks }
					: {}),
				...(cleanedBlankDefaults ? { blankDefaults: cleanedBlankDefaults } : {}),
				correction: stringToCorrection(extra.correctionString)
			};

			// Per-variation required form
			if (extra.requiredFormSelect) {
				if (extra.requiredFormSelect === 'custom' && extra.requiredFormPattern.trim()) {
					cleaned.requiredForm = { pattern: extra.requiredFormPattern.trim() };
				} else if (
					VALID_REQUIRED_FORMS.includes(
						extra.requiredFormSelect as (typeof VALID_REQUIRED_FORMS)[number]
					)
				) {
					cleaned.requiredForm = extra.requiredFormSelect as RequiredForm;
				}
			}

			// Per-variation validation rules
			try {
				const rules = JSON.parse(extra.validationRulesJson);
				if (Array.isArray(rules) && rules.length > 0) cleaned.validationRules = rules;
			} catch {
				/* ignore */
			}

			// Per-variation answer formats
			try {
				const fmts = JSON.parse(extra.answerFormatsJson);
				if (Object.keys(fmts).length > 0) cleaned.answerFormats = fmts;
			} catch {
				/* ignore */
			}

			return cleaned;
		});

		// Build shared defaults
		const shared: SharedVariationDefaults = {};
		if (sharedStatement.trim()) shared.statement = sharedStatement;
		if (sharedVariables.length > 0) {
			const filtered = sharedVariables.filter((v) => v.name && v.expression);
			if (filtered.length > 0) shared.variables = filtered;
		}
		if (questionType === 'multiple_choice' && sharedChoices.length > 0) {
			const sharedDerived = deriveCorrectChoiceIndex(sharedChoices);
			if (sharedDerived) shared.correctChoiceIndex = sharedDerived;
		}
		const sharedCorrectionObj = stringToCorrection(sharedCorrectionString);
		if (sharedCorrectionObj) shared.correction = sharedCorrectionObj;
		if (questionType === 'multiple_choice' && sharedChoices.length > 0)
			shared.choices = sharedChoices;
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

	// Load all form state from a template object (inverse of buildTemplate)
	function loadFromTemplate(
		t: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
	) {
		// Metadata
		title = t.title || '';
		description = t.description || '';
		theme = t.theme || '';
		domain = t.domain || '';
		subdomain = t.subdomain;
		level = t.level || 1;
		status = t.status || 'draft';
		grades = t.grades || [];
		delay = t.delay;
		exerciseInstruction = t.exerciseInstruction;
		multipleAnswers = t.multipleAnswers;

		// Type
		questionType = getQuestionType({ choices: t.variations?.[0]?.choices, shared: t.shared });

		// Display options
		displayShuffleTerms = t.defaultDisplayOptions?.shuffleTerms ?? false;
		displayShuffleFactors = t.defaultDisplayOptions?.shuffleFactors ?? false;
		displayShuffleTermsAndFactors = t.defaultDisplayOptions?.shuffleTermsAndFactors ?? false;
		displayShallowShuffleTerms = t.defaultDisplayOptions?.shallowShuffleTerms ?? false;
		displayShallowShuffleFactors = t.defaultDisplayOptions?.shallowShuffleFactors ?? false;
		displayRemoveNullTerms = t.defaultDisplayOptions?.removeNullTerms ?? false;
		displayRemoveUnnecessaryBrackets = t.defaultDisplayOptions?.removeUnnecessaryBrackets ?? false;
		displayRemoveSpaces = t.defaultDisplayOptions?.removeSpaces ?? false;

		// Validation options
		optAllowEquivalent = t.options?.allowEquivalent ?? false;
		optAllowDifferentForms = t.options?.allowDifferentForms ?? false;
		optCanonicalForm = t.options?.canonicalForm || '';
		optOrderIndependent = t.options?.orderIndependent ?? false;
		optValidator = t.options?.validator || '';
		optValidatorParamsJson = JSON.stringify(t.options?.validatorParams || {}, null, 2);
		optShuffleChoices = t.options?.shuffleChoices ?? true;
		optAllowBracketsInFirstNegativeTerm =
			t.options?.constraints?.allowBracketsInFirstNegativeTerm ?? false;
		constraintModes = Object.fromEntries(
			CONSTRAINT_IDS.map((id) => [id, t.options?.constraints?.[id] || ''])
		);

		// Shared fields
		sharedVariables = t.shared?.variables || [];
		sharedStatement = templateMarkdown(t.shared?.statement || '');
		sharedCorrectChoiceIndex = t.shared?.correctChoiceIndex || '';
		sharedCorrectionString = correctionToString(t.shared?.correction);
		sharedChoices = t.shared?.choices ?? [];
		sharedRequiredFormSelect = t.shared?.requiredForm
			? typeof t.shared.requiredForm === 'string'
				? t.shared.requiredForm
				: 'custom'
			: '';
		sharedRequiredFormPattern =
			t.shared?.requiredForm && typeof t.shared.requiredForm === 'object'
				? t.shared.requiredForm.pattern
				: '';
		sharedBlankPrecision = t.shared?.blankDefaults?.precision ?? { type: 'none' as const };
		sharedBlankRequiredFormSelect = t.shared?.blankDefaults?.requiredForm
			? typeof t.shared.blankDefaults.requiredForm === 'string'
				? t.shared.blankDefaults.requiredForm
				: 'custom'
			: '';
		sharedBlankRequiredFormPattern =
			t.shared?.blankDefaults?.requiredForm &&
			typeof t.shared.blankDefaults.requiredForm === 'object'
				? t.shared.blankDefaults.requiredForm.pattern
				: '';
		sharedBlankUnitExpected = t.shared?.blankDefaults?.unit?.expected ?? false;
		sharedBlankUnitRequired = t.shared?.blankDefaults?.unit?.required || '';
		sharedValidationRulesJson = JSON.stringify(t.shared?.validationRules || [], null, 2);
		sharedAnswerFormatsJson = JSON.stringify(t.shared?.answerFormats || {}, null, 2);

		// Variations
		variations = t.variations?.map((v) => ({
			...v,
			variables: v.variables || [],
			blanks: v.blanks || [],
			choices: v.choices || [],
			correction: v.correction,
			blankDefaults: { precision: { type: 'none' as const }, ...v.blankDefaults }
		})) || [
			{
				statement: templateMarkdown(''),
				variables: [],
				correctChoiceIndex: '',
				blanks: [],
				choices: [],
				blankDefaults: { precision: { type: 'none' as const } }
			}
		];

		variationExtras = t.variations?.map((v) => ({
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
		})) || [{ ...DEFAULT_VARIATION_EXTRA }];

		currentVariationIndex = 0;
	}

	// Toggle between form and JSON mode
	async function toggleJsonMode() {
		if (jsonMode) {
			// JSON → Form: parse and load
			try {
				const parsed = JSON.parse(jsonString);
				loadFromTemplate(parsed);
				jsonMode = false;
			} catch {
				// Should not happen if jsonValid is true, but just in case
				_jsonErrors = ['JSON invalide'];
				jsonValid = false;
			}
		} else {
			// Form → JSON: serialize current state
			jsonString = JSON.stringify(buildTemplate(), null, 2);
			await loadJsonEditor();
			jsonMode = true;
			jsonValid = true;
			_jsonErrors = [];
		}
	}

	function handleJsonValidate(isValid: boolean, errors: string[]) {
		jsonValid = isValid;
		_jsonErrors = errors;
	}

	// Handle save

	// Save as draft (no category validation)
	function handleSaveDraft() {
		if (jsonMode) {
			try {
				const parsed = JSON.parse(jsonString);
				onSave(parsed);
			} catch {
				_jsonErrors = ['JSON invalide'];
				jsonValid = false;
			}
			return;
		}
		const templateData = buildTemplate();
		onSave(templateData);
	}

	// Cancel with dirty state confirmation
	function handleCancel() {
		if (
			isDirty &&
			!confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment annuler ?')
		) {
			return;
		}
		onCancel();
	}

	// Publish question (with category validation)
	function handlePublish() {
		if (jsonMode) {
			try {
				const parsed = JSON.parse(jsonString);
				parsed.status = 'published';
				onSave(parsed);
			} catch {
				_jsonErrors = ['JSON invalide'];
				jsonValid = false;
			}
			return;
		}
		hasAttemptedPublish = true;
		if (!isValid) return;
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

	// Memoize buildTemplate() for preview (avoid recalculating on every render)
	let previewTemplate = $derived(buildTemplate());

	// Dirty state: protect against accidental data loss
	function computeSnapshot(): string {
		return JSON.stringify({
			title,
			description,
			theme,
			domain,
			subdomain,
			level,
			status,
			grades,
			delay,
			questionType,
			exerciseInstruction,
			multipleAnswers,
			variations: variations.map((v) => ({
				statement: v.statement,
				variables: v.variables?.length,
				blanks: v.blanks?.length,
				choices: v.choices?.length,
				correctChoiceIndex: v.correctChoiceIndex
			})),
			sharedVariables: sharedVariables.length,
			variationExtras
		});
	}

	// Capture initial snapshot once (all $state vars are already initialized above)
	const initialSnapshot = computeSnapshot();

	let isDirty = $derived(computeSnapshot() !== initialSnapshot);

	// Warn before leaving with unsaved changes
	$effect(() => {
		function handleBeforeUnload(e: BeforeUnloadEvent) {
			if (isDirty) {
				e.preventDefault();
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	// Validation: show errors only after first publish attempt
	let hasAttemptedPublish = $state(false);

	// Individual field errors (visible only after first publish attempt)
	let titleError = $derived(hasAttemptedPublish && !title.trim() ? 'Le titre est obligatoire' : '');
	let gradesError = $derived(
		hasAttemptedPublish && grades.length === 0 ? 'Sélectionnez au moins un niveau scolaire' : ''
	);
	let themeError = $derived(hasAttemptedPublish && !theme.trim() ? 'Le thème est obligatoire' : '');
	let domainError = $derived(
		hasAttemptedPublish && !domain.trim() ? 'Le domaine est obligatoire' : ''
	);
	let levelError = $derived(
		hasAttemptedPublish && level <= 0 ? 'Le niveau doit être supérieur à 0' : ''
	);

	function getVariationErrors(v: QuestionVariation, index: number): string[] {
		if (!hasAttemptedPublish) return [];
		const errors: string[] = [];
		if (!v.statement.trim()) errors.push(`Variation ${index + 1} : énoncé manquant`);
		const hasAnswer =
			(v.blanks && v.blanks.length > 0 && v.blanks.some((b) => b.expectedAnswer?.trim())) ||
			(v.choices && v.choices.length > 0) ||
			(typeof v.correctChoiceIndex === 'string' && v.correctChoiceIndex.trim().length > 0) ||
			(Array.isArray(v.correctChoiceIndex) && v.correctChoiceIndex.length > 0);
		if (!hasAnswer) errors.push(`Variation ${index + 1} : réponse manquante`);
		return errors;
	}
	let variationErrors = $derived(variations.flatMap((v, i) => getVariationErrors(v, i)));

	// Global validity (used to disable the Publish button)
	let isValid = $derived(
		title.trim().length > 0 &&
			variations.length > 0 &&
			variations.every(
				(v) =>
					v.statement.trim().length > 0 &&
					((v.blanks && v.blanks.length > 0 && v.blanks.some((b) => b.expectedAnswer?.trim())) ||
						(v.choices && v.choices.length > 0) ||
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

	{#if jsonMode}
		<!-- JSON Raw Editor -->
		{#if JsonEditorComponent}
			<div class="relative overflow-hidden rounded-lg border border-border">
				<Button
					variant="secondary"
					size="sm"
					class="absolute top-2 right-2 z-10 gap-1"
					onclick={async () => {
						await navigator.clipboard.writeText(jsonString);
						toaster.success('JSON copié');
					}}
				>
					<Copy class="h-3.5 w-3.5" />
					Copier
				</Button>
				<JsonEditorComponent
					bind:value={jsonString}
					height="600px"
					schema={questionTemplateSchema}
					onValidate={handleJsonValidate}
				/>
			</div>
		{:else}
			<div class="flex items-center justify-center p-8">
				<p class="text-muted-foreground">Chargement de l'éditeur JSON...</p>
			</div>
		{/if}
	{:else}
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
					{#if titleError}
						<p class="text-xs text-destructive">{titleError}</p>
					{/if}
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
				<MySelect
					id="question-type"
					type="single"
					bind:value={questionType}
					items={QUESTION_TYPES}
				/>
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
								<div>
									<CategorySelector
										label="Thème"
										bind:value={theme}
										options={themeOptions}
										required={true}
										onValueChange={(val) => (theme = val)}
										onAddNew={handleAddTheme}
									/>
									{#if themeError}
										<p class="mt-1 text-xs text-destructive">{themeError}</p>
									{/if}
								</div>

								<!-- Domain (Required) -->
								<div>
									<CategorySelector
										label="Domaine"
										bind:value={domain}
										options={domainOptions}
										required={true}
										onValueChange={(val) => (domain = val)}
										onAddNew={handleAddDomain}
									/>
									{#if domainError}
										<p class="mt-1 text-xs text-destructive">{domainError}</p>
									{/if}
								</div>
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
									{#if levelError}
										<p class="text-xs text-destructive">{levelError}</p>
									{/if}
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
			{#if gradesError}
				<p class="text-xs text-destructive">{gradesError}</p>
			{/if}
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
		<DisplayOptionsEditor
			bind:open={displayOptionsOpen}
			bind:shuffleTerms={displayShuffleTerms}
			bind:shuffleFactors={displayShuffleFactors}
			bind:shuffleTermsAndFactors={displayShuffleTermsAndFactors}
			bind:shallowShuffleTerms={displayShallowShuffleTerms}
			bind:shallowShuffleFactors={displayShallowShuffleFactors}
			bind:removeNullTerms={displayRemoveNullTerms}
			bind:removeUnnecessaryBrackets={displayRemoveUnnecessaryBrackets}
			bind:removeSpaces={displayRemoveSpaces}
		/>

		<!-- Options de validation -->
		<ValidationOptionsEditor
			bind:open={optionsSectionOpen}
			bind:allowEquivalent={optAllowEquivalent}
			bind:allowDifferentForms={optAllowDifferentForms}
			bind:canonicalForm={optCanonicalForm}
			bind:orderIndependent={optOrderIndependent}
			bind:validator={optValidator}
			bind:validatorParamsJson={optValidatorParamsJson}
			bind:shuffleChoices={optShuffleChoices}
			bind:allowBracketsInFirstNegativeTerm={optAllowBracketsInFirstNegativeTerm}
			bind:constraintModes
			{questionType}
		/>

		<!-- Champs partagés (shared defaults for all variations) -->
		<SharedFieldsEditor
			bind:open={sharedFieldsOpen}
			{questionType}
			{multipleAnswers}
			bind:sharedStatement
			bind:sharedVariables
			bind:sharedCorrectChoiceIndex
			bind:sharedChoices
			bind:sharedCorrectionString
			bind:sharedRequiredFormSelect
			bind:sharedRequiredFormPattern
			bind:sharedBlankPrecision
			bind:sharedBlankRequiredFormSelect
			bind:sharedBlankRequiredFormPattern
			bind:sharedBlankUnitExpected
			bind:sharedBlankUnitRequired
			bind:sharedValidationRulesJson
			bind:sharedAnswerFormatsJson
			bind:sharedVariableHelpOpen
		/>

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
													bind:value={variationExtras[index].correctionString}
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
									<Collapsible.Root bind:open={variationExtras[index].overridesOpen}>
										<Collapsible.Trigger
											class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
										>
											<Card.Title>Surcharges (cette variation)</Card.Title>
											<ChevronDown
												class="h-4 w-4 transition-transform duration-200 {variationExtras[index]
													.overridesOpen
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
														bind:value={variationExtras[index].requiredFormSelect}
														items={REQUIRED_FORM_OPTIONS}
													/>
													{#if variationExtras[index].requiredFormSelect === 'custom'}
														<Input
															type="text"
															bind:value={variationExtras[index].requiredFormPattern}
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
														bind:value={variationExtras[index].validationRulesJson}
														rows={3}
														placeholder="[]"
													></textarea>
													<p class="text-xs text-muted-foreground">
														Format JSON (tableau de regles)
													</p>
												</div>

												<!-- Formats de reponse -->
												<div class="space-y-2">
													<Label class="text-sm font-medium">Formats de réponse</Label>
													<textarea
														class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
														bind:value={variationExtras[index].answerFormatsJson}
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
					<QuestionPreview template={previewTemplate} />
				{:else}
					<div class="flex items-center justify-center p-8">
						<p class="text-muted-foreground">Chargement de l'aperçu...</p>
					</div>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="json">
				{#if JsonViewer}
					<JsonViewer data={previewTemplate} />
				{:else}
					<div class="flex items-center justify-center p-8">
						<p class="text-muted-foreground">Chargement du JSON...</p>
					</div>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	{/if}

	<!-- Validation Errors Summary -->
	{#if hasAttemptedPublish && variationErrors.length > 0}
		<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
			<p class="mb-1 text-sm font-medium text-destructive">Erreurs à corriger :</p>
			<ul class="space-y-1 text-xs text-destructive">
				{#each variationErrors as err, i (i)}
					<li>• {err}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex items-center gap-3">
		<Button
			variant="outline"
			onclick={toggleJsonMode}
			disabled={isSubmitting || (jsonMode && !jsonValid)}
		>
			{#if jsonMode}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path
						d="M14 9h7"
					/><path d="M14 15h7" /></svg
				>
				Formulaire
			{:else}
				<Braces class="mr-2 h-4 w-4" />
				JSON
			{/if}
		</Button>
		<div class="flex flex-1 items-center justify-end gap-3">
			{#if isDirty}
				<span class="text-xs text-amber-600 dark:text-amber-400"
					>Modifications non sauvegardées</span
				>
			{/if}
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
			<Button
				variant="secondary"
				onclick={handleSaveDraft}
				disabled={isSubmitting || (jsonMode && !jsonValid)}
				class="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100"
			>
				<FileText class="mr-2 h-4 w-4" />
				{isSubmitting ? 'Enregistrement...' : 'Enregistrer brouillon'}
			</Button>
			<Button
				onclick={handlePublish}
				disabled={isSubmitting || (jsonMode && !jsonValid)}
				class="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
			>
				<CheckCircle2 class="mr-2 h-4 w-4" />
				{isSubmitting ? 'Publication...' : 'Publier'}
			</Button>
		</div>
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
<QuestionTemplateHelpDialogs
	bind:titleDescriptionHelpOpen
	bind:exerciseInstructionHelpOpen
	bind:categorizationHelpOpen
	bind:variationsHelpOpen
	bind:statementHelpOpen
	bind:answerHelpOpen
	bind:correctionHelpOpen
/>

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
