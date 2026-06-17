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
	import { REQUIRED_FORM_OPTIONS } from '$lib/questions/form-options';

	interface Props {
		open: boolean;
		questionType: QuestionType;
		multipleAnswers: boolean | undefined;
		sharedStatement: TemplateMarkdown;
		sharedVariables: QuestionVariable[];
		sharedCorrectChoiceIndex: string | string[];
		sharedChoices: { content: TemplateMarkdown; isCorrect?: boolean }[];
		sharedCorrectionString: string;
		sharedRequiredFormSelect: string;
		sharedRequiredFormPattern: string;
		sharedBlankPrecision: PrecisionType;
		sharedBlankRequiredFormSelect: string;
		sharedBlankRequiredFormPattern: string;
		sharedBlankUnitExpected: boolean;
		sharedBlankUnitRequired: string;
		sharedValidationRulesJson: string;
		sharedAnswerFormatsJson: string;
		sharedVariableHelpOpen: boolean;
	}

	let {
		open = $bindable(),
		questionType,
		multipleAnswers,
		sharedStatement = $bindable(),
		sharedVariables = $bindable(),
		sharedCorrectChoiceIndex = $bindable(),
		sharedChoices = $bindable(),
		sharedCorrectionString = $bindable(),
		sharedRequiredFormSelect = $bindable(),
		sharedRequiredFormPattern = $bindable(),
		sharedBlankPrecision = $bindable(),
		sharedBlankRequiredFormSelect = $bindable(),
		sharedBlankRequiredFormPattern = $bindable(),
		sharedBlankUnitExpected = $bindable(),
		sharedBlankUnitRequired = $bindable(),
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
								{multipleAnswers}
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
