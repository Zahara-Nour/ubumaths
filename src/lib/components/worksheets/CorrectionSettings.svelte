<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Alert from '$lib/components/ui/alert';
	import MySelect from '$lib/components/MySelect.svelte';
	import { AlertCircle, Info } from 'lucide-svelte';
	import type { CorrectionReleaseMode } from '$lib/types/worksheets';

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		releaseMode: CorrectionReleaseMode;
		scheduledDate: string;
	}

	let { releaseMode = $bindable('manual'), scheduledDate = $bindable('') }: Props = $props();

	// Release mode options with French labels (sans after_due car pas de rendu)
	const releaseModeItems = [
		{ value: 'manual', label: 'Manuel' },
		{ value: 'immediate', label: 'Immediat' },
		{ value: 'scheduled', label: 'Programme' }
	];

	// Mode descriptions
	function getModeDescription(mode: CorrectionReleaseMode): string {
		switch (mode) {
			case 'immediate':
				return "Les corrections seront visibles des l'assignation";
			case 'scheduled':
				return 'Les corrections seront visibles a la date et heure specifiees';
			case 'manual':
			default:
				return 'Vous pourrez publier les corrections manuellement quand vous le souhaitez';
		}
	}
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h3 class="text-lg font-medium">Publication des corrections</h3>
		<p class="text-sm text-muted-foreground">
			Configurez quand les eleves pourront voir les corrections
		</p>
	</div>

	<!-- Release Mode Selection -->
	<div class="space-y-2">
		<Label for="correction-mode">Mode de publication</Label>
		<MySelect type="single" bind:value={releaseMode} items={releaseModeItems} />
		<p class="text-sm text-muted-foreground">
			{getModeDescription(releaseMode)}
		</p>
	</div>

	<!-- Scheduled Date (conditional) -->
	{#if releaseMode === 'scheduled'}
		<div class="space-y-2">
			<Label for="scheduled-date">Date et heure de publication</Label>
			<Input
				id="scheduled-date"
				type="datetime-local"
				bind:value={scheduledDate}
				class="w-full md:w-64"
			/>
			{#if !scheduledDate}
				<p class="text-sm text-destructive">Veuillez selectionner une date de publication</p>
			{/if}
		</div>
	{/if}

	<!-- Warning for immediate mode -->
	{#if releaseMode === 'immediate'}
		<Alert.Root>
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Attention</Alert.Title>
			<Alert.Description>
				En mode immediat, les eleves verront les corrections des qu'ils accedent a la feuille.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Info about personalized corrections -->
	<Alert.Root variant="default">
		<Info class="h-4 w-4" />
		<Alert.Title>Corrections personnalisees</Alert.Title>
		<Alert.Description>
			Chaque eleve recevra une correction correspondant exactement a sa version personnalisee de la
			feuille.
		</Alert.Description>
	</Alert.Root>
</div>
