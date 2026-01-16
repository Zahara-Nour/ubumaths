<!--
	HintReference Component
	=======================

	Renders inline hint references ({{hint:id}}) as popover buttons.

	Features:
	- Compact inline display (lightbulb icon + hint title)
	- Popover to reveal hint content (positioned near the trigger)
	- Support for multiple hint types: video, PDF, link, image, geogebra, ubumark
	- Warning display if hint ID not found
	- Callback when hint is opened (for analytics)

	Design:
	- Inline-block to avoid breaking text flow
	- Popover keeps context visible while showing hint
	- Accessible with proper ARIA attributes

	@see ExerciseHint in types.ts for hint structure
	@see ParagraphNode.svelte for rendering context
	@module components/markdown/nodes/HintReference
-->
<script lang="ts">
	import type { ExerciseHint } from '$lib/exercises/types';
	import * as Popover from '$lib/components/ui/popover';
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import { cn } from '$lib/utils';
	import { Lightbulb, AlertCircle, ExternalLink, FileText, Video } from 'lucide-svelte';

	interface Props {
		/** Hint ID to look up in hints array */
		hintId: string;
		/** Available hints for this exercise */
		hints?: ExerciseHint[];
		/** Callback when hint is opened (for analytics/tracking) */
		onHintOpen?: (hintId: string) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let { hintId, hints = [], onHintOpen, class: className = '' }: Props = $props();

	// State for popover open/close
	let isOpen = $state(false);

	// Find the hint by ID
	const hint = $derived(hints.find((h) => h.id === hintId));

	/**
	 * Handle open state change - trigger callback when opened
	 */
	function handleOpenChange(open: boolean) {
		isOpen = open;
		if (open && onHintOpen && hint) {
			onHintOpen(hintId);
		}
	}
</script>

{#if !hint}
	<!-- Warning if hint not found -->
	<span
		class={cn(
			'inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive',
			className
		)}
		role="alert"
		aria-label="Indice introuvable"
	>
		<AlertCircle class="h-3 w-3" />
		<span>Indice "{hintId}" introuvable</span>
	</span>
{:else}
	<!-- Hint reference with popover content -->
	<Popover.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					class={cn(
						'inline-flex h-auto items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-xs',
						'cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/5',
						'align-baseline transition-colors',
						isOpen && 'border-primary bg-primary/10',
						className
					)}
					aria-label="Afficher l'indice: {hint.title}"
				>
					<Lightbulb class="h-3.5 w-3.5 text-primary" />
					<span class="font-medium text-primary">{hint.title}</span>
				</button>
			{/snippet}
		</Popover.Trigger>

		<Popover.Content class="w-80 max-w-[90vw]" align="start">
			<div class="space-y-2">
				<!-- Header with title -->
				<div class="flex items-center gap-2">
					<Lightbulb class="h-4 w-4 text-primary" />
					<h4 class="font-medium text-foreground">{hint.title}</h4>
				</div>

				<!-- Optional description -->
				{#if hint.description}
					<p class="text-sm text-muted-foreground">{hint.description}</p>
				{/if}

				<!-- Render content based on hint type -->
				<div class="pt-1">
					{#if hint.type === 'video' && hint.url}
						<!-- Video embed or link -->
						{#if hint.url.includes('youtube.com') || hint.url.includes('youtu.be')}
							{@const videoId = hint.url.includes('youtube.com')
								? new URL(hint.url).searchParams.get('v')
								: hint.url.split('/').pop()}
							{#if videoId}
								<div class="aspect-video overflow-hidden rounded-md">
									<iframe
										src="https://www.youtube.com/embed/{videoId}"
										title={hint.title}
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
										class="h-full w-full"
									></iframe>
								</div>
							{:else}
								<a
									href={hint.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 text-sm text-primary hover:underline"
								>
									<Video class="h-4 w-4" />
									Voir la vidéo
									<ExternalLink class="h-3 w-3" />
								</a>
							{/if}
						{:else}
							<a
								href={hint.url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-2 text-sm text-primary hover:underline"
							>
								<Video class="h-4 w-4" />
								Voir la vidéo
								<ExternalLink class="h-3 w-3" />
							</a>
						{/if}
					{:else if hint.type === 'pdf' && hint.url}
						<!-- PDF link -->
						<a
							href={hint.url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-sm text-primary hover:underline"
						>
							<FileText class="h-4 w-4" />
							Ouvrir le PDF
							<ExternalLink class="h-3 w-3" />
						</a>
					{:else if hint.type === 'image' && hint.url}
						<!-- Image display -->
						<img
							src={hint.url}
							alt={hint.title}
							class="max-h-48 w-full rounded-md object-contain"
						/>
					{:else if hint.type === 'geogebra' && hint.url}
						<!-- GeoGebra link -->
						<a
							href={hint.url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-sm text-primary hover:underline"
						>
							<ExternalLink class="h-4 w-4" />
							Ouvrir dans GeoGebra
							<ExternalLink class="h-3 w-3" />
						</a>
					{:else if hint.type === 'link' && hint.url}
						<!-- Generic link -->
						<a
							href={hint.url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-sm text-primary hover:underline"
						>
							<ExternalLink class="h-4 w-4" />
							Voir la ressource
							<ExternalLink class="h-3 w-3" />
						</a>
					{:else if hint.type === 'ubumark' && hint.content}
						<!-- Ubumark inline content (markdown with math formulas) -->
						<div class="prose prose-sm max-w-none dark:prose-invert">
							<MarkdownRenderer content={hint.content} />
						</div>
					{/if}
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
{/if}
