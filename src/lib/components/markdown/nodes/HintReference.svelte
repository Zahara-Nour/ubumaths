<!--
	HintReference Component
	=======================

	Renders inline hint references ({{hint:id}}) as expandable buttons.

	Features:
	- Compact inline display (lightbulb icon + hint title)
	- Expandable/collapsible to reveal hint content
	- Support for multiple hint types: video, PDF, link, image, geogebra
	- Warning display if hint ID not found
	- Callback when hint is opened (for analytics)

	Design:
	- Inline-block to avoid breaking text flow
	- Distinct visual style to stand out from regular text
	- Accessible with proper ARIA attributes

	@see ExerciseHint in types.ts for hint structure
	@see ParagraphNode.svelte for rendering context
	@module components/markdown/nodes/HintReference
-->
<script lang="ts">
	import type { ExerciseHint } from '$lib/exercises/types';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { cn } from '$lib/utils';
	import {
		ChevronDown,
		ChevronUp,
		Lightbulb,
		AlertCircle,
		ExternalLink,
		FileText,
		Video
	} from 'lucide-svelte';

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

	// State for expand/collapse
	let isOpen = $state(false);

	// Find the hint by ID
	const hint = $derived(hints.find((h) => h.id === hintId));

	/**
	 * Handle toggle - expand/collapse and trigger callback
	 */
	function handleToggle() {
		isOpen = !isOpen;
		if (isOpen && onHintOpen && hint) {
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
	<!-- Hint reference with collapsible content -->
	<Collapsible.Root bind:open={isOpen} class={cn('inline-block', className)}>
		<!-- Trigger button (compact inline display) -->
		<Collapsible.Trigger
			onclick={handleToggle}
			class={cn(
				'inline-flex h-auto items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-xs',
				'cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/5',
				'align-baseline transition-colors',
				isOpen && 'bg-primary/10'
			)}
			aria-expanded={isOpen}
			aria-label="Afficher l'indice: {hint.title}"
		>
			<Lightbulb class="h-3.5 w-3.5 text-primary" />
			<span class="font-medium text-primary">{hint.title}</span>
			{#if isOpen}
				<ChevronUp class="h-3 w-3 text-primary" />
			{:else}
				<ChevronDown class="h-3 w-3 text-primary" />
			{/if}
		</Collapsible.Trigger>

		<!-- Expanded content -->
		<Collapsible.Content class="mt-2">
			<div
				class="rounded-md border border-primary/20 bg-primary/5 p-3 shadow-sm"
				role="region"
				aria-label="Contenu de l'indice"
			>
				<!-- Optional description -->
				{#if hint.description}
					<p class="mb-2 text-sm text-muted-foreground">{hint.description}</p>
				{/if}

				<!-- Render content based on hint type -->
				{#if hint.type === 'video'}
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
				{:else if hint.type === 'pdf'}
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
				{:else if hint.type === 'image'}
					<!-- Image display -->
					<img src={hint.url} alt={hint.title} class="max-h-64 w-full rounded-md object-contain" />
				{:else if hint.type === 'geogebra'}
					<!-- GeoGebra link (could be enhanced with embed in future) -->
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
				{:else if hint.type === 'link'}
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
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
