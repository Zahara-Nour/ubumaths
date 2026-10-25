<!--
	Vitrine : révisions espacées simulées (`/demo/questions`)
	=========================================================

	La séance de révision d'un élève connecté passe par la base ; ici, les cartes
	sont les 4 questions de la page et rien n'est enregistré. Chaque bouton montre
	la vraie prochaine date d'une carte neuve, calculée par FSRS (PR 6g).
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import FSRSButtons from '$lib/components/srs/FSRSButtons.svelte';
	import { RotateCcw } from '@lucide/svelte';
	import { demoInstances, firstReviewIntervals } from './questions';

	// Constantes
	const GRADE_LABELS = ['Encore', 'Difficile', 'Bien', 'Facile'] as const;
	const instances = demoInstances();
	const intervals = firstReviewIntervals();

	// Variables
	let position = $state(0);
	let flipped = $state(false);
	// Note donnée à la carte courante (1 à 4), en attente de « Carte suivante »
	let grade = $state<1 | 2 | 3 | 4 | null>(null);

	let finished = $derived(position >= instances.length);
	let progressPercent = $derived((position / instances.length) * 100);

	// Functions
	function daysLabel(days: number): string {
		return days > 1 ? `dans ${days} jours` : 'demain';
	}

	function handleGrade(value: 1 | 2 | 3 | 4) {
		grade = value;
	}

	function next() {
		position += 1;
		flipped = false;
		grade = null;
	}

	function restart() {
		position = 0;
		flipped = false;
		grade = null;
	}
</script>

{#if finished}
	<Card.Root>
		<Card.Content class="space-y-4 p-6 text-center">
			<p class="font-semibold">Séance terminée.</p>
			<p class="text-muted-foreground">
				Chaque carte reviendra à sa date, mêlée aux autres cartes dues ce jour-là.
			</p>
			<Button variant="outline" onclick={restart}>
				<RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" />
				Recommencer
			</Button>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="mx-auto w-full max-w-4xl space-y-6">
		<div class="space-y-3">
			<div class="text-sm text-muted-foreground">Carte {position + 1} sur {instances.length}</div>
			<Progress value={progressPercent} class="h-2" />
		</div>

		{#key position}
			<FlashCard
				interactive={false}
				instance={instances[position]}
				size="lg"
				onFlip={(isFlipped) => (flipped = flipped || isFlipped)}
			/>
		{/key}

		{#if grade !== null}
			<div class="space-y-4 text-center" role="status">
				<p>
					« {GRADE_LABELS[grade - 1]} » : cette carte reviendra
					<strong>{daysLabel(intervals[grade - 1])}</strong>.
				</p>
				<Button onclick={next}>Carte suivante</Button>
			</div>
		{:else if flipped}
			<FSRSButtons onGrade={handleGrade} showIntervals {intervals} />
		{:else}
			<p class="text-center text-sm text-muted-foreground">
				Retournez la carte pour voir la correction, puis dites comment ça s'est passé.
			</p>
		{/if}
	</div>
{/if}
