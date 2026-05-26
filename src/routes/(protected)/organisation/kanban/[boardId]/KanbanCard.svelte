<!--
	KanbanCard
	==========

	A draggable, clickable card. Clicking the card opens the edit dialog (handled
	by the parent — we just call `onEdit(card)`). When a description is present,
	a truncated preview is rendered below the title via MarkdownRenderer; the
	preview is `pointer-events: none` so clicks always reach the card itself.

	Drag & drop integration: this component is rendered *inside* a column's
	`dndzone`. The library injects shadow / placeholder DOM children with a
	special `isDndShadowItem` flag while a drag is in progress; we render them
	with reduced opacity so they don't look identical to real items.
-->

<script lang="ts">
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
			Description preview: rendered ubumark with a hard height cap and a
			subtle fade-out at the bottom to hint that there's more on click.
			`pointer-events-none` ensures the whole card stays clickable and
			draggable through the preview.
		-->
		<div class="kanban-card-preview pointer-events-none relative mt-2 max-h-24 overflow-hidden">
			<MarkdownRenderer content={card.description ?? ''} class="text-xs text-muted-foreground" />
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent"
			></div>
		</div>
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
