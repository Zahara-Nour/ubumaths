<!--
	ExerciseParameterizationEditor Component
	=========================================

	Manages parameterization settings for exercises:
	- Variable definitions (via VariableEditor)
	- Distribution mode selection
	- Validation and help text

	FEATURES:
	- Collapsible variables section
	- Distribution mode dropdown with descriptions
	- Auto-expansion when variables exist
	- Integration with shared parameterization library

	PROPS:
	- variables: Variable[] (bindable)
	- distributionMode: DistributionMode (bindable)

	@see src/lib/shared/parameterization for variable system
	@see src/lib/exercises/types for DistributionMode
-->
<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import VariableEditor from '$lib/components/VariableEditor.svelte';
	import { ChevronDown } from 'lucide-svelte';
	import type { Variable } from '$lib/ubumark';
	import type { DistributionMode } from '$lib/exercises/types';

	interface Props {
		variables?: Variable[];
		distributionMode?: DistributionMode;
	}

	let { variables = $bindable([]), distributionMode = $bindable('on_demand') }: Props = $props();

	// Collapsible state for variables section
	let variablesOpen = $state(false);

	// Auto-expand variables section if variables exist
	$effect(() => {
		if (variables && variables.length > 0) {
			variablesOpen = true;
		}
	});

	// Distribution mode descriptions
	const distributionModeDescriptions: Record<DistributionMode, string> = {
		on_demand:
			'Les élèves peuvent cliquer "Nouveau problème" pour obtenir différentes valeurs à chaque fois.',
		per_student: 'Chaque élève reçoit des valeurs uniques, cohérentes entre les sessions.',
		per_group: "Tous les élèves d'un groupe voient les mêmes valeurs."
	};
</script>

<div class="space-y-4">
	<!-- Variables Section -->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={variablesOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<div class="flex items-center gap-2">
						<Card.Title>Variables</Card.Title>
						<span class="text-sm text-muted-foreground">
							(optionnel - pour exercices paramétrés)
						</span>
					</div>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {variablesOpen ? 'rotate-180' : ''}"
					/>
				</Collapsible.Trigger>
				<Card.Description></Card.Description>
				<Collapsible.Content>
					<Card.Content class="pt-4">
						<VariableEditor bind:variables />

						{#if variables.length === 0}
							<p class="mt-4 text-sm text-muted-foreground">
								💡 Les variables permettent de créer des exercices avec des valeurs aléatoires.
								Cliquez sur "Ajouter une variable" pour commencer.
							</p>
						{/if}
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Distribution Mode (only show if variables exist) -->
	{#if variables && variables.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Mode de distribution</Card.Title>
				<Card.Description>
					Comment les valeurs des variables sont-elles attribuées aux élèves ?
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="space-y-2">
					<Label for="distribution-mode">Mode de distribution</Label>
					<select
						id="distribution-mode"
						bind:value={distributionMode}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="on_demand"> À la demande (pratique illimitée) </option>
						<option value="per_student"> Par élève (devoir personnalisé) </option>
						<option value="per_group"> Par groupe (travail de classe) </option>
					</select>
				</div>

				<!-- Description based on selected mode -->
				<div class="rounded-lg bg-muted/50 p-3">
					<p class="text-sm text-muted-foreground">
						{distributionModeDescriptions[distributionMode]}
					</p>
				</div>

				<!-- Additional info -->
				<div class="space-y-2 text-xs text-muted-foreground">
					<p><strong>À la demande :</strong> Idéal pour l'entraînement et la pratique autonome</p>
					<p>
						<strong>Par élève :</strong> Idéal pour les devoirs où chaque élève doit avoir un problème
						différent
					</p>
					<p>
						<strong>Par groupe :</strong> Idéal pour les travaux en classe où tous les élèves travaillent
						sur le même problème
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
