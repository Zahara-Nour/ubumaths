<!--
	Shared Fields Editor
	====================

	Card with 8 collapsible sub-sections for shared variation defaults:
	1. Shared statement
	2. Shared variables
	3. Shared answer
	4. Shared correction
	5. Required form
	6. Blank defaults (precision, form, unit)
	7. Validation rules (JSON)
	8. Answer formats (JSON)

	All value props are $bindable().
-->

<script lang="ts">
	import type { QuestionType, QuestionVariable, PrecisionType } from '$lib/questions/types';
	import type { TemplateMarkdown } from '$lib/ubumark';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import VariableEditor from './VariableEditor.svelte';
	import { MarkdownEditor } from '$lib/components/markdown';
	import AnswerEditor from './AnswerEditor.svelte';
	import MySelect from './MySelect.svelte';
	import MyCheckbox from './MyCheckbox.svelte';
	import PrecisionEditor from './PrecisionEditor.svelte';
	import { ChevronDown, CircleQuestionMark } from '@lucide/svelte';
	import { ACCEPTABLE_PLACEHOLDER, REQUIRED_FORM_OPTIONS } from '$lib/questions/form-options';
	import type { CalculusEditorState } from '$lib/questions/calculus/calculus-editor';

	interface Props {
		open: boolean;
		questionType: QuestionType;
		multipleAnswers: boolean | undefined;
		/** Mélange des choix : le préréglage « Vrai / Faux » le coupe (Q106) */
		shuffleChoices: boolean;
		sharedStatement: TemplateMarkdown;
		sharedVariables: QuestionVariable[];
		sharedCorrectChoiceIndex: string | string[];
		sharedChoices: { content: TemplateMarkdown; isCorrect?: boolean }[];
		sharedCorrectionString: string;
		sharedRequiredFormSelect: string;
		sharedRequiredFormPattern: string;
		sharedRequiredFormAcceptable: string;
		sharedBlankPrecision: PrecisionType;
		sharedBlankRequiredFormSelect: string;
		sharedBlankRequiredFormPattern: string;
		sharedBlankRequiredFormAcceptable: string;
		sharedBlankUnitExpected: boolean;
		sharedBlankUnitRequired: string;
		sharedBlankAcceptDecimal: boolean;
		sharedBlankIntervals: boolean;
		/** Case intervalles : une borne fermée attendue peut être ouverte */
		sharedBlankOpenableBounds: boolean;
		sharedBlankEquation: boolean;
		sharedBlankVector: boolean;
		sharedBlankVectorCollinear: boolean;
		/** Case « primitive » ou « solution-ed » et ses champs */
		sharedBlankCalculus: CalculusEditorState;
		sharedValidationRulesJson: string;
		sharedAnswerFormatsJson: string;
		sharedVariableHelpOpen: boolean;
		/** « Plusieurs réponses » coupé dans l'éditeur partagé : normaliser le modèle */
		onSingleAnswer?: () => void;
	}

	let {
		open = $bindable(),
		questionType,
		onSingleAnswer,
		multipleAnswers = $bindable(),
		shuffleChoices = $bindable(),
		sharedStatement = $bindable(),
		sharedVariables = $bindable(),
		sharedCorrectChoiceIndex = $bindable(),
		sharedChoices = $bindable(),
		sharedCorrectionString = $bindable(),
		sharedRequiredFormSelect = $bindable(),
		sharedRequiredFormPattern = $bindable(),
		sharedRequiredFormAcceptable = $bindable(),
		sharedBlankPrecision = $bindable(),
		sharedBlankRequiredFormSelect = $bindable(),
		sharedBlankRequiredFormPattern = $bindable(),
		sharedBlankRequiredFormAcceptable = $bindable(),
		sharedBlankUnitExpected = $bindable(),
		sharedBlankUnitRequired = $bindable(),
		sharedBlankAcceptDecimal = $bindable(),
		sharedBlankIntervals = $bindable(),
		sharedBlankOpenableBounds = $bindable(),
		sharedBlankEquation = $bindable(),
		sharedBlankVector = $bindable(),
		sharedBlankVectorCollinear = $bindable(),
		sharedBlankCalculus = $bindable(),
		sharedValidationRulesJson = $bindable(),
		sharedAnswerFormatsJson = $bindable(),
		sharedVariableHelpOpen = $bindable()
	}: Props = $props();

	// JSON validation feedback (derived from bound props)
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

	// Local collapsible states
	let statementOpen = $state(false);
	let variablesOpen = $state(true);
	let solutionOpen = $state(false);
	let correctionOpen = $state(false);
	let requiredFormOpen = $state(false);
	let blankDefaultsOpen = $state(false);
	let validationOpen = $state(false);
	let formatsOpen = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Collapsible.Root bind:open>
			<Collapsible.Trigger
				class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
			>
				<Card.Title>Champs partagés</Card.Title>
				<ChevronDown class="h-4 w-4 transition-transform duration-200 {open ? 'rotate-180' : ''}" />
			</Collapsible.Trigger>
			<Card.Description>Valeurs par défaut héritées par toutes les variations</Card.Description>
			<Collapsible.Content>
				<Card.Content class="space-y-4">
					<!-- 1. Énoncé partagé -->
					<Collapsible.Root bind:open={statementOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Énoncé partagé</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {statementOpen
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
					<Collapsible.Root bind:open={variablesOpen}>
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
								class="h-4 w-4 transition-transform duration-200 {variablesOpen
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
					<Collapsible.Root bind:open={solutionOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Réponse partagée</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {solutionOpen ? 'rotate-180' : ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content class="pt-2">
							<AnswerEditor
								{questionType}
								bind:answer={sharedCorrectChoiceIndex}
								bind:choices={sharedChoices}
								bind:multipleAnswers
								bind:shuffleChoices
								{onSingleAnswer}
								seedEmpty={false}
							/>
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- 4. Correction partagée -->
					<Collapsible.Root bind:open={correctionOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Correction partagée</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {correctionOpen
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
					<Collapsible.Root bind:open={requiredFormOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Forme requise</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {requiredFormOpen
									? 'rotate-180'
									: ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content class="space-y-2 pt-2">
							<MySelect
								type="single"
								bind:value={sharedRequiredFormSelect}
								items={[...REQUIRED_FORM_OPTIONS]}
							/>
							{#if sharedRequiredFormSelect === 'custom'}
								<Input
									type="text"
									bind:value={sharedRequiredFormPattern}
									placeholder="Pattern personnalisé (ex: a:integer * b:integer)"
								/>
								<Input
									type="text"
									bind:value={sharedRequiredFormAcceptable}
									placeholder={ACCEPTABLE_PLACEHOLDER}
								/>
							{/if}
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- 6. Paramètres des trous (blankDefaults) -->
					<Collapsible.Root bind:open={blankDefaultsOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Paramètres des trous</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {blankDefaultsOpen
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
									items={[...REQUIRED_FORM_OPTIONS]}
								/>
								{#if sharedBlankRequiredFormSelect === 'custom'}
									<Input
										type="text"
										bind:value={sharedBlankRequiredFormPattern}
										placeholder="Pattern personnalisé"
									/>
									<Input
										type="text"
										bind:value={sharedBlankRequiredFormAcceptable}
										placeholder={ACCEPTABLE_PLACEHOLDER}
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
							<!-- Attendu 1/2 : 0,5 est juste (décimal exact, même valeur) -->
							<MyCheckbox
								bind:checked={sharedBlankAcceptDecimal}
								label="Accepter le décimal exact"
							/>
							<!-- Ensemble de solutions : ]-∞;-2[∪]3;+∞[ (clavier « Intervalles ») -->
							<MyCheckbox
								bind:checked={sharedBlankIntervals}
								label="Réponse : ensemble en intervalles"
							/>
							{#if sharedBlankIntervals}
								<!-- Croissance, convexité : ]2;+∞[ juste pour [2;+∞[ (jamais l'inverse) -->
								<MyCheckbox
									bind:checked={sharedBlankOpenableBounds}
									label="Intervalles : une borne fermée peut être ouverte (pas pour une inéquation)"
								/>
							{/if}
							<!-- Équation de droite ou de cercle : y=2x+1 juste pour 2x-y+1=0 -->
							<MyCheckbox
								bind:checked={sharedBlankEquation}
								label="Réponse : équation (droite, cercle)"
							/>
							<!-- Vecteur dans une case : (2;-3) ou en colonne (clavier « Vecteur ») -->
							<MyCheckbox
								bind:checked={sharedBlankVector}
								label="Réponse : vecteur (coordonnées)"
							/>
							{#if sharedBlankVector}
								<!-- Vecteur normal, directeur : (-4;6) juste pour (2;-3) -->
								<MyCheckbox
									bind:checked={sharedBlankVectorCollinear}
									label="Vecteur : tout vecteur colinéaire non nul est juste"
								/>
							{/if}
							<!-- Primitive de f : x^3+C juste pour 3x^2 (dérivée de la réponse comparée à f) -->
							<MyCheckbox
								bind:checked={sharedBlankCalculus.primitive}
								label="Réponse : primitive d'une fonction"
							/>
							{#if sharedBlankCalculus.primitive}
								<div class="space-y-2 pl-6">
									<Input
										type="text"
										bind:value={sharedBlankCalculus.integrand}
										placeholder="Fonction f à intégrer (ex: {'{{a}}'}x^2)"
										aria-label="Fonction à intégrer"
									/>
									<Input
										type="text"
										bind:value={sharedBlankCalculus.interval}
										placeholder="Intervalle facultatif (ex: ]0;+\infty[)"
										aria-label="Intervalle"
									/>
									<Input
										type="text"
										bind:value={sharedBlankCalculus.variable}
										placeholder="Variable (défaut : x)"
										aria-label="Variable"
									/>
								</div>
							{/if}
							<!-- Solution d'équation différentielle : vérifiée par substitution -->
							<MyCheckbox
								bind:checked={sharedBlankCalculus.solution}
								label="Réponse : solution d'une équation différentielle"
							/>
							{#if sharedBlankCalculus.solution}
								<div class="space-y-2 pl-6">
									<Input
										type="text"
										bind:value={sharedBlankCalculus.equation}
										placeholder="Équation du 1er ordre (ex: y'=2y-6)"
										aria-label="Équation différentielle"
									/>
									<MyCheckbox
										bind:checked={sharedBlankCalculus.general}
										label="Solution générale attendue (avec une constante)"
									/>
									{#if !sharedBlankCalculus.general}
										<Input
											type="text"
											bind:value={sharedBlankCalculus.initial}
											placeholder="Condition initiale facultative (ex: y(0)=4)"
											aria-label="Condition initiale"
										/>
									{/if}
									<Input
										type="text"
										bind:value={sharedBlankCalculus.functionName}
										placeholder="Fonction inconnue (défaut : y)"
										aria-label="Fonction inconnue"
									/>
									<Input
										type="text"
										bind:value={sharedBlankCalculus.variable}
										placeholder="Variable (défaut : x)"
										aria-label="Variable"
									/>
								</div>
							{/if}
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- 7. Règles de validation -->
					<Collapsible.Root bind:open={validationOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Règles de validation</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {validationOpen
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
					<Collapsible.Root bind:open={formatsOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Formats de réponse</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {formatsOpen ? 'rotate-180' : ''}"
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
