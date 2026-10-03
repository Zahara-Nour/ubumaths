<!--
	ChapterRevisionButton
	=====================

	Entrée vers la séance du paquet CALCULÉ d'un chapitre (questions de cours,
	étape 3). Paquet vide ou illisible → rien (L4) ; rien de dû ni de nouveau
	→ « Rien à revoir aujourd'hui » (L3), jamais une séance vide.
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Brain } from '@lucide/svelte';

	interface Props {
		chapterId: string;
		/** `null` : paquet illisible (panne tracée côté serveur) */
		deck: { deckSize: number; toReview: number } | null;
	}

	let { chapterId, deck }: Props = $props();
</script>

{#if deck && deck.deckSize > 0}
	{#if deck.toReview > 0}
		<Button href={`/dashboard/revisions/chapitres/${chapterId}`}>
			<Brain class="mr-2 h-4 w-4" aria-hidden="true" />
			Réviser ce chapitre ({deck.toReview} à revoir)
		</Button>
	{:else}
		<p class="text-sm text-muted-foreground">Rien à revoir aujourd'hui</p>
	{/if}
{/if}
