<script lang="ts">
	/**
	 * Un bouton de la barre de l'atelier : une icône seule, son nom en infobulle
	 * et pour les lecteurs d'écran (lot 1 de `atelier-refonte-interface-phase0.md`).
	 *
	 * ⚠️ Indisponible, il reste FOCALISABLE (`aria-disabled`, pas `disabled`) :
	 * un bouton `disabled` ne prend ni le focus ni le survol, et sa raison ne se
	 * lirait nulle part. La raison est dans l'infobulle et reliée au bouton.
	 */
	import type { LucideIcon } from '@lucide/svelte';

	interface Props {
		/** Le nom du bouton : `aria-label` et début de l'infobulle. */
		label: string;
		icon: LucideIcon;
		onclick: () => void;
		/** Pourquoi le bouton est indisponible ; `null` quand il l'est. */
		disabledReason?: string | null;
	}

	let { label, icon: Icon, onclick, disabledReason = null }: Props = $props();

	const uid = $props.id();

	const title = $derived(disabledReason === null ? label : `${label} — ${disabledReason}`);

	function handleClick() {
		if (disabledReason !== null) return;
		onclick();
	}
</script>

<button
	type="button"
	class="outil"
	aria-label={label}
	aria-disabled={disabledReason !== null ? 'true' : undefined}
	aria-describedby={disabledReason !== null ? `${uid}-raison` : undefined}
	{title}
	onclick={handleClick}
>
	<Icon size={18} aria-hidden="true" />
</button>
{#if disabledReason !== null}
	<span id="{uid}-raison" class="sr-only">{disabledReason}</span>
{/if}

<style>
	/* Lisible et visable en projection, comme les boutons qu'elle remplace (revue a11y du lot 6) */
	.outil {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		min-height: 2.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-foreground);
		cursor: pointer;
	}
	.outil:hover:not([aria-disabled='true']) {
		background: var(--color-muted);
		border-color: var(--color-border);
	}
	.outil[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.outil:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
</style>
