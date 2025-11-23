<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Alert from '$lib/components/ui/alert';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { AlertCircle, Info } from 'lucide-svelte';
	import type { CorrectionReleaseMode } from '$lib/types/worksheets';

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		releaseMode: CorrectionReleaseMode;
		scheduledDate: string;
		showSolutionsBeforeDue: boolean;
	}

	let {
		releaseMode = $bindable('manual'),
		scheduledDate = $bindable(''),
		showSolutionsBeforeDue = $bindable(false)
	}: Props = $props();

	// Release mode options with French labels
	const releaseModeItems = [
		{ value: 'manual', label: 'Manuel' },
		{ value: 'immediate', label: 'Immediat' },
		{ value: 'scheduled', label: 'Programme' },
		{ value: 'after_due', label: 'Apres date limite' }
	];

	// Mode descriptions
	function getModeDescription(mode: CorrectionReleaseMode): string {
		switch (mode) {
			case 'immediate':
				return "Les corrections seront disponibles des l'activation du devoir";
			case 'scheduled':
				return 'Les corrections seront publiees a la date et heure specifiees';
			case 'after_due':
				return 'Les corrections seront automatiquement disponibles apres la date limite de rendu';
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
			Configurez quand les eleves pourront acceder aux corrections
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
				En mode immediat, les eleves pourront consulter les corrections des qu'ils accedent au
				devoir. Assurez-vous que c'est le comportement souhaite.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Additional Options -->
	<div class="space-y-4 rounded-lg border p-4">
		<h4 class="text-sm font-medium">Options avancees</h4>

		<div class="flex items-start space-x-3">
			<MyCheckbox id="show-solutions-before-due" bind:checked={showSolutionsBeforeDue} />
			<div class="space-y-1">
				<Label for="show-solutions-before-due" class="cursor-pointer font-normal">
					Autoriser l'acces aux corrections avant la date limite
				</Label>
				<p class="text-xs text-muted-foreground">
					Par defaut, les corrections ne sont jamais accessibles avant la date limite, meme si le
					mode de publication le permettrait
				</p>
			</div>
		</div>
	</div>

	<!-- Info about personalized corrections -->
	<Alert.Root variant="default">
		<Info class="h-4 w-4" />
		<Alert.Title>Corrections personnalisees</Alert.Title>
		<Alert.Description>
			Chaque eleve recevra une correction correspondant exactement a sa version personnalisee du
			devoir. Les valeurs numeriques et parametres seront identiques a ceux de sa feuille.
		</Alert.Description>
	</Alert.Root>
</div>
