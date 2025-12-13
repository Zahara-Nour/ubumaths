<!--
	TutorDrawer Component
	=====================

	Mobile drawer that slides up from the bottom to display the Tutor panel.
	Includes backdrop, close button, and slot for TutorChat content.

	Props:
		- open: Whether the drawer is open
		- onClose: Callback when drawer should close

	@component
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		children: Snippet;
	}

	let { open, onClose, children }: Props = $props();

	function handleBackdropClick() {
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50 transition-opacity"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		aria-label="Fermer le tuteur"
	></button>

	<!-- Drawer Panel -->
	<div
		class="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-xl bg-background shadow-2xl transition-transform"
		role="dialog"
		aria-modal="true"
		aria-label="Tuteur Pere Ubu"
	>
		<!-- Header with close button -->
		<div class="flex items-center justify-between border-b border-border px-4 py-2">
			<h2 class="text-lg font-semibold">Tuteur Pere Ubu</h2>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Fermer">
				<X class="h-5 w-5" />
			</Button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-hidden">
			{@render children()}
		</div>
	</div>
{/if}
