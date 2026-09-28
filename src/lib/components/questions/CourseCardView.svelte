<!--
	CourseCardView
	==============

	Carte de cours (#617) : recto = énoncé, verso = correction.

	- `revealed` : verso visible d'emblée (aperçus) ;
	- `interactive` : recto → « Voir la réponse » → verso ; avec `onSelfAssess`,
	  l'élève s'auto-évalue ensuite (« Je savais » / « Je ne savais pas »), une fois ;
	- ni l'un ni l'autre (vue d'ensemble, mode display) : recto seul, sans interaction.
	- `size` : même échelle que la QuestionCard qui l'héberge.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { courseCardFront } from '$lib/questions/course-card';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Eye, X } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import CourseCardBack from './CourseCardBack.svelte';

	interface Props {
		instance: QuestionInstance;
		interactive?: boolean;
		revealed?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onSelfAssess?: (knew: boolean) => void;
	}

	let {
		instance,
		interactive = false,
		revealed = false,
		size = 'md',
		onSelfAssess
	}: Props = $props();

	const SIZE_CLASSES = {
		sm: { root: 'space-y-2 text-sm', face: 'p-2', button: 'sm' },
		md: { root: 'space-y-4', face: 'p-4', button: 'default' },
		lg: { root: 'space-y-4 text-lg', face: 'p-5', button: 'lg' }
	} as const;

	let isFlipped = $state(false);
	let assessment = $state<boolean | null>(null);

	const front = $derived(courseCardFront(instance));
	const showBack = $derived(revealed || isFlipped);
	const sizeClasses = $derived(SIZE_CLASSES[size]);

	function handleReveal() {
		isFlipped = true;
	}

	function handleSelfAssess(knew: boolean) {
		if (assessment !== null) return;
		assessment = knew;
		onSelfAssess?.(knew);
	}
</script>

<div class={sizeClasses.root} data-testid="course-card">
	<div class="flex items-center justify-between">
		<Badge variant="secondary">Carte de cours</Badge>
	</div>

	{#if instance.exerciseInstruction}
		<p class="font-medium text-muted-foreground">{instance.exerciseInstruction}</p>
	{/if}

	<section
		aria-label="Recto"
		class={cn('rounded-lg border bg-card', sizeClasses.face)}
		data-testid="course-card-front"
	>
		<MarkdownRenderer content={front} />
	</section>

	{#if showBack}
		<section
			aria-label="Verso"
			class={cn('rounded-lg border border-primary/30 bg-primary/5', sizeClasses.face)}
		>
			<CourseCardBack correction={instance.correction} />
		</section>

		{#if interactive && onSelfAssess}
			{#if assessment === null}
				<div class="flex flex-wrap justify-center gap-3">
					<Button
						variant="outline"
						size={sizeClasses.button}
						onclick={() => handleSelfAssess(false)}
					>
						<X class="mr-2 h-4 w-4" />
						Je ne savais pas
					</Button>
					<Button size={sizeClasses.button} onclick={() => handleSelfAssess(true)}>
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
	{:else if interactive}
		<div class="flex justify-center">
			<Button onclick={handleReveal} size={sizeClasses.button}>
				<Eye class="mr-2 h-4 w-4" />
				Voir la réponse
			</Button>
		</div>
	{/if}
</div>
