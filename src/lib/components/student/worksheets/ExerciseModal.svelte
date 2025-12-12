<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronLeft, ChevronRight, Info } from 'lucide-svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { StudentExerciseView } from '$lib/types/worksheets';

	interface Props {
		exercises: StudentExerciseView[];
		currentIndex: number;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onNavigate: (index: number) => void;
	}

	let { exercises, currentIndex, open, onOpenChange, onNavigate }: Props = $props();

	let exercise = $derived(exercises[currentIndex] ?? null);
	let hasCorrection = $derived(exercise?.correction_visible && exercise?.correction !== null);
	let pointsLabel = $derived(
		exercise?.points !== null ? `${exercise.points} point${exercise.points !== 1 ? 's' : ''}` : null
	);
	let canGoPrev = $derived(currentIndex > 0);
	let canGoNext = $derived(currentIndex < exercises.length - 1);

	function goPrev() {
		if (canGoPrev) onNavigate(currentIndex - 1);
	}

	function goNext() {
		if (canGoNext) onNavigate(currentIndex + 1);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft' && canGoPrev) {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowRight' && canGoNext) {
			e.preventDefault();
			goNext();
		}
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content
		class="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden"
		onkeydown={handleKeydown}
	>
		<Dialog.Header>
			<div class="flex items-center justify-between gap-4">
				<Dialog.Title class="flex items-center gap-3">
					Exercice {currentIndex + 1}
					{#if pointsLabel}
						<Badge variant="outline" class="font-normal">
							{pointsLabel}
						</Badge>
					{/if}
				</Dialog.Title>
				<div class="flex items-center gap-1 text-sm text-muted-foreground">
					{currentIndex + 1} / {exercises.length}
				</div>
			</div>
		</Dialog.Header>

		{#if exercise}
			<div class="flex-1 overflow-y-auto">
				{#if exercise.custom_instructions}
					<div
						class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50"
					>
						<div class="flex items-start gap-2">
							<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
							<p class="text-sm text-amber-700 dark:text-amber-300">
								{exercise.custom_instructions}
							</p>
						</div>
					</div>
				{/if}

				{#if hasCorrection}
					<Tabs.Root value="statement" class="w-full">
						<Tabs.List class="grid w-full grid-cols-2">
							<Tabs.Trigger value="statement">Énoncé</Tabs.Trigger>
							<Tabs.Trigger value="correction">Correction</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="statement" class="mt-4">
							<div class="prose prose-sm max-w-none dark:prose-invert">
								<MarkdownRenderer content={exercise.statement} />
							</div>
						</Tabs.Content>
						<Tabs.Content value="correction" class="mt-4">
							<div
								class="prose prose-sm max-w-none text-green-800 dark:text-green-200 dark:prose-invert"
							>
								<MarkdownRenderer content={exercise.correction ?? ''} />
							</div>
						</Tabs.Content>
					</Tabs.Root>
				{:else}
					<div class="prose prose-sm max-w-none dark:prose-invert">
						<MarkdownRenderer content={exercise.statement} />
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-1 items-center justify-center p-8">
				<p class="text-muted-foreground">Exercice non disponible</p>
			</div>
		{/if}

		<Dialog.Footer class="flex-shrink-0 border-t pt-4">
			<div class="flex w-full items-center justify-between">
				<Button
					variant="outline"
					onclick={goPrev}
					disabled={!canGoPrev}
					aria-label="Exercice précédent (flèche gauche)"
				>
					<ChevronLeft class="mr-1 h-4 w-4" />
					Précédent
				</Button>
				<Button
					variant="outline"
					onclick={goNext}
					disabled={!canGoNext}
					aria-label="Exercice suivant (flèche droite)"
				>
					Suivant
					<ChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
