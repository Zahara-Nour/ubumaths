<!--
	BuddySpeechBubble
	==================
	Speech bubble that appears above the buddy avatar.
	Auto-hides after a configurable duration.
-->

<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		message: string;
		visible: boolean;
		/** Lien sous la réplique (ex. « Aller à la Chatterie »). */
		link?: { href: string; label: string } | null;
	}

	let { message, visible, link = null }: Props = $props();
</script>

{#if visible && message}
	<div
		class="absolute right-0 bottom-full mb-2 w-max max-w-[min(70vw,280px)] rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg ring-1 ring-border"
		transition:fade={{ duration: 200 }}
	>
		<p class="leading-snug">{message}</p>
		{#if link}
			<a href={link.href} class="mt-1 inline-block font-medium text-primary underline">
				{link.label}
			</a>
		{/if}
		<!-- Triangle pointer -->
		<div
			class="absolute right-4 -bottom-1.5 h-3 w-3 rotate-45 bg-popover ring-1 ring-border"
			style="clip-path: polygon(0% 0%, 100% 100%, 0% 100%);"
		></div>
	</div>
{/if}
