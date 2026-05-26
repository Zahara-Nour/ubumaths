<!--
	KanbanCard
	==========

	A draggable, clickable card. Clicking the card opens the edit dialog (handled
	by the parent — we just call `onEdit(card)`). The `📝` icon hints at a
	non-empty description.

	Drag & drop integration: this component is rendered *inside* a column's
	`dndzone`. The library injects shadow / placeholder DOM children with a
	special `isDndShadowItem` flag while a drag is in progress; we render them
	with reduced opacity so they don't look identical to real items.
-->

<script lang="ts">
	import { FileText } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
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
	<div class="flex items-start gap-2">
		<p class="line-clamp-2 flex-1 text-sm font-medium break-words">{card.title}</p>
		{#if hasDescription}
			<FileText
				class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
				aria-label="Carte avec description"
			/>
		{/if}
	</div>
</Card.Root>
