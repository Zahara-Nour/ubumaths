<!--
	KanbanCard
	==========

	A draggable, clickable card. Clicking the card opens the edit dialog (handled
	by the parent — we just call `onEdit(card)`). When a description is present,
	a preview is rendered below the title via MarkdownRenderer.

	Two interaction modes for the description:
	- Collapsed (default): preview is height-capped to ~6rem with a fade-out so
	  the user knows there's more.
	- Expanded: full content is rendered inline. Toggled via a small chevron
	  button at the bottom of the card. The chevron stops mousedown/click
	  propagation so it doesn't trigger drag-start or open the edit modal.

	Drag & drop integration: this component is rendered *inside* a column's
	`dndzone`. The library injects shadow / placeholder DOM children with a
	special `isDndShadowItem` flag while a drag is in progress; we render them
	with reduced opacity so they don't look identical to real items.
-->

<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { KanbanCard as KanbanCardType } from '$lib/types/database-helpers';

	type Props = {
		card: KanbanCardType;
		/** When true, the card has been picked up by the dnd library and we render
		 * a ghost placeholder. Detected by the caller via the shadow marker prop. */
		isShadow?: boolean;
		/** Open the edit dialog for this card. */
		onEdit: (card: KanbanCardType) => void;
	};

	let { card, isShadow = false, onEdit }: Props = $props();

	const hasDescription = $derived(!!card.description && card.description.trim().length > 0);

	// Local UI-only state: whether the description is expanded inline. Not
	// persisted — collapses again on remount / page reload, like Trello.
	let expanded = $state(false);

	// Click vs drag disambiguation: svelte-dnd-action uses pointer events to
	// start the drag, so a quick click without movement still fires `onclick`.
	// We let the library handle the drag; on a real click we open the editor.
	function handleClick() {
		onEdit(card);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onEdit(card);
		}
	}

	// The chevron must intercept the drag and the edit-modal trigger. We stop
	// mousedown propagation (svelte-dnd-action listens on mousedown), and stop
	// click propagation so the parent card's onclick (open editor) doesn't fire.
	function toggleExpanded(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
	}

	function stopMouseDown(event: MouseEvent) {
		event.stopPropagation();
	}

	function handleChevronKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			expanded = !expanded;
		}
	}
</script>

<Card.Root
	class={[
		'group cursor-grab border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
		isShadow && 'opacity-40'
	]}
	role="button"
	tabindex="0"
	aria-label={`Carte ${card.title}`}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<p class="line-clamp-2 text-sm font-medium break-words">{card.title}</p>

	{#if hasDescription}
		<!--
			Description preview wrapper. `pointer-events-none` lets clicks pass
			through to the card itself (opens the editor). When collapsed, the
			height is capped and a gradient fade-out hints at the hidden content.
		-->
		<div
			class={[
				'kanban-card-preview pointer-events-none relative mt-2 overflow-hidden',
				!expanded && 'max-h-24'
			]}
		>
			<MarkdownRenderer content={card.description ?? ''} class="text-xs text-muted-foreground" />
			{#if !expanded}
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent"
				></div>
			{/if}
		</div>

		<!--
			Expand / collapse toggle. Sits outside the pointer-events-none preview
			so it's clickable. stops mousedown so it doesn't start a drag, and
			stops click so it doesn't bubble up to the card (open editor).
		-->
		<button
			type="button"
			class="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onmousedown={stopMouseDown}
			onclick={toggleExpanded}
			onkeydown={handleChevronKeydown}
			aria-expanded={expanded}
			aria-label={expanded ? 'Réduire la description' : 'Voir toute la description'}
		>
			<ChevronDown
				class={['h-3.5 w-3.5 transition-transform', expanded && 'rotate-180']}
				aria-hidden="true"
			/>
			{expanded ? 'Réduire' : 'Voir plus'}
		</button>
	{/if}
</Card.Root>

<style>
	/* Compact spacing for the preview so we get more content per card height. */
	.kanban-card-preview :global(p),
	.kanban-card-preview :global(ul),
	.kanban-card-preview :global(ol),
	.kanban-card-preview :global(blockquote),
	.kanban-card-preview :global(pre) {
		margin: 0;
	}
	.kanban-card-preview :global(p + p),
	.kanban-card-preview :global(p + ul),
	.kanban-card-preview :global(p + ol) {
		margin-top: 0.25rem;
	}
	.kanban-card-preview :global(h1),
	.kanban-card-preview :global(h2),
	.kanban-card-preview :global(h3),
	.kanban-card-preview :global(h4) {
		margin: 0 0 0.125rem;
		font-size: 0.8125rem;
		font-weight: 600;
	}
</style>
