<!--
	CourseCardView
	==============

	Carte de cours (#617) : recto = énoncé, verso = correction.

	- `revealed` : verso visible d'emblée (aperçu, banque, admin) ;
	- sinon : recto → « Voir la réponse » → verso ;
	- `onSelfAssess` fourni : après retournement, l'élève s'auto-évalue
	  (« Je savais » / « Je ne savais pas »), une seule fois.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { courseCardBack, courseCardFront } from '$lib/questions/course-card';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Eye, X } from '@lucide/svelte';

	interface Props {
		instance: QuestionInstance;
		revealed?: boolean;
		onSelfAssess?: (knew: boolean) => void;
	}

	let { instance, revealed = false, onSelfAssess }: Props = $props();

	let isFlipped = $state(false);
	let assessment = $state<boolean | null>(null);

	const front = $derived(courseCardFront(instance));
	const back = $derived(courseCardBack(instance));
	const showBack = $derived(revealed || isFlipped);

	function handleReveal() {
		isFlipped = true;
	}

	function handleSelfAssess(knew: boolean) {
		if (assessment !== null) return;
		assessment = knew;
		onSelfAssess?.(knew);
	}
</script>

<div class="space-y-4" data-testid="course-card">
	<div class="flex items-center justify-between">
		<Badge variant="secondary">Carte de cours</Badge>
	</div>

	{#if instance.exerciseInstruction}
		<p class="text-base font-medium text-muted-foreground">{instance.exerciseInstruction}</p>
	{/if}

	<section aria-label="Recto" class="rounded-lg border bg-card p-4" data-testid="course-card-front">
		<MarkdownRenderer content={front} />
	</section>

	{#if showBack}
		<section
			aria-label="Verso"
			class="rounded-lg border border-primary/30 bg-primary/5 p-4"
			data-testid="course-card-back"
		>
			<MarkdownRenderer content={back} />
		</section>

		{#if onSelfAssess}
			{#if assessment === null}
				<div class="flex flex-wrap justify-center gap-3">
					<Button variant="outline" onclick={() => handleSelfAssess(false)}>
						<X class="mr-2 h-4 w-4" />
						Je ne savais pas
					</Button>
					<Button onclick={() => handleSelfAssess(true)}>
						<Check class="mr-2 h-4 w-4" />
						Je savais
					</Button>
				</div>
			{:else}
				<p class="text-center text-sm text-muted-foreground" role="status">
					{assessment ? 'Noté : vous saviez.' : 'Noté : à revoir.'}
				</p>
			{/if}
		{/if}
	{:else}
		<div class="flex justify-center">
			<Button onclick={handleReveal} size="lg">
				<Eye class="mr-2 h-4 w-4" />
				Voir la réponse
			</Button>
		</div>
	{/if}
</div>
