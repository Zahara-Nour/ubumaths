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
		/** Ce que l'infobulle ajoute au nom (les raccourcis de la console). */
		hint?: string;
		/** Un bouton qui ouvre un volet : ouvert ou fermé, et lequel (`aria-controls`). */
		expanded?: boolean;
		controls?: string;
		/** Un nombre à signaler sur le bouton (les nouveaux résultats de la console, A3). */
		badge?: number;
		/** Ce que le nombre veut dire, pour les lecteurs d'écran. */
		badgeLabel?: string;
	}

	let {
		label,
		icon: Icon,
		onclick,
		disabledReason = null,
		hint,
		expanded,
		controls,
		badge = 0,
		badgeLabel = ''
	}: Props = $props();

	const uid = $props.id();

	let button = $state<HTMLButtonElement | null>(null);

	const named = $derived(hint === undefined ? label : `${label} (${hint})`);
	const title = $derived(disabledReason === null ? named : `${named} — ${disabledReason}`);

	function handleClick() {
		if (disabledReason !== null) return;
		onclick();
	}

	/** Rendre le focus au bouton (fermeture de la console au clavier). */
	export function focus() {
		button?.focus();
	}
</script>

<span class="porte">
	<button
		bind:this={button}
		type="button"
		class="outil"
		aria-label={label}
		aria-disabled={disabledReason !== null ? 'true' : undefined}
		aria-describedby={disabledReason !== null
			? `${uid}-raison`
			: badge > 0
				? `${uid}-compte`
				: undefined}
		aria-expanded={expanded}
		aria-controls={controls}
		{title}
		onclick={handleClick}
	>
		<Icon size={18} aria-hidden="true" />
	</button>
	{#if badge > 0}
		<!-- Un NOMBRE contrasté, pas un point orange (revue a11y : 2,2:1) -->
		<span class="nouveau" aria-hidden="true">{badge}</span>
		<span id="{uid}-compte" class="sr-only">{badgeLabel}</span>
	{/if}
</span>
{#if disabledReason !== null}
	<span id="{uid}-raison" class="sr-only">{disabledReason}</span>
{/if}

<style>
	.porte {
		position: relative;
		display: inline-flex;
	}
	/* Le compteur posé sur le coin du bouton, sans en changer la taille */
	.nouveau {
		position: absolute;
		top: -0.25rem;
		right: -0.25rem;
		min-width: 1.125rem;
		padding: 0 0.3125rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.125rem;
		text-align: center;
		pointer-events: none;
		/* Inversé : le contraste du texte courant, dans les deux thèmes */
		background: var(--color-foreground);
		color: var(--color-background);
	}
	.outil[aria-expanded='true'] {
		background: var(--color-muted);
		border-color: var(--color-border);
	}
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
