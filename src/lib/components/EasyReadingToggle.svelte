<script lang="ts">
	// Imports
	import { BookOpenText } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { easyReading } from '#lib/stores/easyReading.svelte.ts';
	import { cn } from '#lib/utils.ts';

	// Types
	interface Props {
		/** `icon` : bouton seul (en-têtes) · `menu` : icône + libellé (menus mobiles) · `labelled` : bouton à libellé (page profil) */
		variant?: 'icon' | 'menu' | 'labelled';
	}

	// Constantes
	const LABEL = 'Lecture facilitée';

	// Variables
	let { variant = 'icon' }: Props = $props();

	let title = $derived(
		easyReading.enabled
			? 'Lecture facilitée activée (police Luciole) : cliquer pour revenir à la police habituelle'
			: 'Lecture facilitée : texte et formules en police Luciole, plus espacés'
	);
</script>

{#if variant === 'icon'}
	<Button
		onclick={() => easyReading.toggle()}
		variant={easyReading.enabled ? 'secondary' : 'ghost'}
		size="icon-sm"
		aria-pressed={easyReading.enabled}
		aria-label={LABEL}
		{title}
	>
		<BookOpenText class="h-5 w-5" />
	</Button>
{:else if variant === 'menu'}
	<button
		type="button"
		onclick={() => easyReading.toggle()}
		aria-pressed={easyReading.enabled}
		{title}
		class={cn(
			'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
			easyReading.enabled && 'bg-muted font-medium'
		)}
	>
		<BookOpenText class="h-5 w-5" />
		<span>{LABEL}</span>
	</button>
{:else}
	<Button
		variant={easyReading.enabled ? 'secondary' : 'outline'}
		onclick={() => easyReading.toggle()}
		aria-pressed={easyReading.enabled}
		{title}
	>
		<BookOpenText class="mr-2 h-4 w-4" aria-hidden="true" />
		{LABEL}
	</Button>
{/if}
