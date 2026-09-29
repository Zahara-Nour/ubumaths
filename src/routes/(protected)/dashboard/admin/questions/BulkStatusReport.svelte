<script lang="ts">
	/**
	 * Compte rendu d'une publication (ou d'un retour en brouillon) par lot :
	 * combien de modèles ont changé, et pour chaque refus, ses raisons.
	 */
	import type { BulkStatusSummary } from '$lib/questions/bulk-status';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { X } from '@lucide/svelte';

	let {
		summary,
		error = null,
		ondismiss
	}: {
		summary: BulkStatusSummary;
		/** Message si un paquet a échoué en route (le reste du résumé reste vrai) */
		error?: string | null;
		ondismiss: () => void;
	} = $props();

	let changedLabel = $derived(
		summary.status === 'published'
			? `${summary.changed.length} modèle${summary.changed.length > 1 ? 's' : ''} publié${summary.changed.length > 1 ? 's' : ''}`
			: `${summary.changed.length} modèle${summary.changed.length > 1 ? 's' : ''} repassé${summary.changed.length > 1 ? 's' : ''} en brouillon`
	);
</script>

<Card.Root role="status" aria-live="polite">
	<Card.Header class="flex flex-row items-start justify-between gap-4">
		<div class="space-y-1">
			<Card.Title class="text-base">{changedLabel}</Card.Title>
			{#if summary.refused.length > 0}
				<p class="text-sm text-muted-foreground">
					{summary.refused.length} refusé{summary.refused.length > 1 ? 's' : ''} (restés en l'état)
				</p>
			{/if}
			{#if error}
				<p class="text-sm text-destructive">Interrompu : {error}</p>
			{/if}
		</div>
		<Button variant="ghost" size="icon" onclick={ondismiss} title="Fermer le compte rendu">
			<X class="h-4 w-4" />
		</Button>
	</Card.Header>
	{#if summary.refused.length > 0}
		<Card.Content>
			<ul class="max-h-80 space-y-2 overflow-y-auto text-sm">
				{#each summary.refused as refusal (refusal.id)}
					<li class="rounded-md border p-2">
						<p class="font-medium">{refusal.title || refusal.id}</p>
						<ul class="list-disc pl-5 text-muted-foreground">
							{#each refusal.reasons as reason, index (index)}
								<li>{reason}</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</Card.Content>
	{/if}
</Card.Root>
