<!--
	Validation Options Editor
	=========================

	Card with collapsible sections for answer validation configuration:
	- General validation (equivalence, forms, canonical, order)
	- Custom validator
	- QCM options (conditional on question type)
	- Constraints

	All value props are $bindable().
-->

<script lang="ts">
	import type { QuestionType } from '$lib/questions/types';
	import {
		CONSTRAINT_IDS,
		CONSTRAINT_LABELS,
		CONSTRAINT_MODE_OPTIONS
	} from '$lib/questions/constraint-constants';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Label } from '$lib/components/ui/label';
	import MySelect from './MySelect.svelte';
	import MyCheckbox from './MyCheckbox.svelte';
	import { ChevronDown } from 'lucide-svelte';

	interface Props {
		open: boolean;
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

	let {
		open = $bindable(),
		allowEquivalent = $bindable(),
		allowDifferentForms = $bindable(),
		canonicalForm = $bindable(),
		orderIndependent = $bindable(),
		validator = $bindable(),
		validatorParamsJson = $bindable(),
		shuffleChoices = $bindable(),
		allowBracketsInFirstNegativeTerm = $bindable(),
		constraintModes = $bindable(),
		questionType
	}: Props = $props();

	// Local collapsible states
	let validatorOpen = $state(false);
	let constraintsOpen = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Collapsible.Root bind:open>
			<Collapsible.Trigger
				class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
			>
				<Card.Title>Options de validation</Card.Title>
				<ChevronDown class="h-4 w-4 transition-transform duration-200 {open ? 'rotate-180' : ''}" />
			</Collapsible.Trigger>
			<Card.Description>Options de validation des réponses</Card.Description>
			<Collapsible.Content>
				<Card.Content class="space-y-4">
					<!-- General validation -->
					<div class="space-y-3">
						<h4 class="text-sm font-medium">Validation générale</h4>
						<MyCheckbox
							bind:checked={allowEquivalent}
							label="Accepter les formes équivalentes (1/2 = 0.5)"
						/>
						<MyCheckbox
							bind:checked={allowDifferentForms}
							label="Accepter différentes formes algébriques (1/2 = 2/4)"
						/>
						<div class="space-y-1">
							<Label>Forme canonique</Label>
							<MySelect
								type="single"
								bind:value={canonicalForm}
								items={[
									{ value: '', label: 'Aucune' },
									{ value: 'fraction', label: 'Fraction' },
									{ value: 'decimal', label: 'Decimal' },
									{ value: 'scientific', label: 'Scientifique' }
								]}
							/>
						</div>
						<MyCheckbox
							bind:checked={orderIndependent}
							label="Matching des trous indépendant de l'ordre"
						/>
					</div>

					<!-- Custom validator -->
					<Collapsible.Root bind:open={validatorOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Validateur custom</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {validatorOpen
									? 'rotate-180'
									: ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content class="space-y-2 pt-2">
							<MySelect
								type="single"
								bind:value={validator}
								items={[
									{ value: '', label: 'Aucun' },
									{ value: 'checkEquivalence', label: 'Equivalence' },
									{ value: 'checkAlgebraic', label: 'Algebrique' },
									{ value: 'checkNumeric', label: 'Numerique' }
								]}
							/>
							{#if validator}
								<textarea
									class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
									bind:value={validatorParamsJson}
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
							<MyCheckbox bind:checked={shuffleChoices} label="Mélanger les choix" />
						</div>
					{/if}

					<!-- Constraints -->
					<Collapsible.Root bind:open={constraintsOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-md border-b p-2 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm font-medium">Contraintes de forme</span>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {constraintsOpen
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
								bind:checked={allowBracketsInFirstNegativeTerm}
								label="Autoriser parenthèses sur premier terme négatif"
							/>
						</Collapsible.Content>
					</Collapsible.Root>
				</Card.Content>
			</Collapsible.Content>
		</Collapsible.Root>
	</Card.Header>
</Card.Root>
