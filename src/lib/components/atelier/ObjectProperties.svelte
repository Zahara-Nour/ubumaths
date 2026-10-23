<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * Le panneau « Propriétés » d'un objet, déplié sous sa carte (chantier
	 * `docs/wip/atelier-proprietes-progress.md`, validé par David le 2026-10-23).
	 *
	 * Ce qui se MODIFIE : le nom (`Atelier.rename`, qui réécrit les objets qui le
	 * citent), le style (les réglages du point de couleur), l'étiquette d'un
	 * point, le curseur d'une valeur. Ce qui se LIT : mesures, valeur, ensemble,
	 * dépendances (`propertiesOf`), recalculés à chaque changement.
	 *
	 * Ouvert par « Propriétés » ou « Renommer » (le focus va alors au nom) ;
	 * Échap ou ✕ le referme et rend le focus au menu de la carte.
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { isFigureObject, isFunction, isPoint, isSequence, isValue } from '$lib/atelier/types';
	import { useAtelier } from '$lib/atelier/context';
	import { displayName } from '$lib/atelier/names';
	import { propertiesOf } from '$lib/atelier/properties';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { convertLatexToMarkup } from 'mathlive';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { X } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import FigureStyleSettings from './FigureStyleSettings.svelte';
	import CurveStyleSettings from './CurveStyleSettings.svelte';
	import SliderSettings from './SliderSettings.svelte';

	interface Props {
		object: AtelierObject;
		/** `name` : ouvert par « Renommer », le focus va au champ du nom. */
		focus: 'name' | 'panel';
		onclose: () => void;
		/** Le nouveau nom, après un renommage réussi : le panneau reste ouvert. */
		onrenamed: (name: string) => void;
	}

	let { object, focus, onclose, onrenamed }: Props = $props();

	const atelier = useAtelier();
	const uid = $props.id();

	const name = $derived(displayName(object.name));

	/** Les lignes lues, avec leur LaTeX composé (régénéré par le calcul, jamais saisi). */
	const rows = $derived(
		propertiesOf(atelier, object.name).map((row) => ({
			...row,
			markup: convertLatexToMarkup(forMathlive(row.latex), { defaultMode: 'inline-math' })
		}))
	);

	let root = $state<HTMLElement | null>(null);
	let field = $state<HTMLInputElement | null>(null);

	// Le nom en cours de frappe : il ne vaut qu'à « Renommer » (ou Entrée)
	// svelte-ignore state_referenced_locally
	let draft = $state(object.name);
	let refusal = $state<string | null>(null);

	const unchanged = $derived(draft.trim() === '' || draft.trim() === object.name);

	// À l'ouverture, le focus va au panneau (ou au nom, pour « Renommer ») : le
	// menu de la carte le lui laisse (`actionMovesFocus`)
	$effect(() => {
		if (focus === 'name') {
			field?.focus();
			field?.select();
		} else root?.focus();
	});

	function handleRename(event: SubmitEvent) {
		event.preventDefault();
		if (unchanged) return;
		const to = draft.trim();
		const done = atelier.rename(object.name, to);
		if (!done.ok) {
			refusal = done.message;
			return;
		}
		refusal = null;
		const followers = done.updated.map(displayName);
		toaster.success(
			followers.length === 0
				? `${name} s'appelle maintenant ${displayName(to)}.`
				: `${name} s'appelle maintenant ${displayName(to)} ; ${followers.join(', ')} ${followers.length === 1 ? 'suit' : 'suivent'}.`
		);
		onrenamed(to);
	}

	/** Refermer, et rendre le focus au menu de la carte (WCAG 2.4.3). */
	function close() {
		const card = root?.previousElementSibling;
		const trigger = card?.querySelector<HTMLButtonElement>(
			`button[aria-label="Options de ${name}"]`
		);
		onclose();
		trigger?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		event.preventDefault();
		close();
	}
</script>

<!-- Échap referme le panneau où que soit le focus dedans, comme la console -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	class="proprietes"
	aria-labelledby="{uid}-titre"
	tabindex="-1"
	bind:this={root}
	onkeydown={handleKeydown}
>
	<header class="tete">
		<h3 id="{uid}-titre">Propriétés de {name}</h3>
		<button
			type="button"
			class="fermer"
			aria-label={`Fermer les propriétés de ${name}`}
			title="Fermer"
			onclick={close}
		>
			<X class="h-4 w-4" aria-hidden="true" />
		</button>
	</header>

	<form class="nom" onsubmit={handleRename}>
		<label for="{uid}-nom">Nom</label>
		<Input
			id="{uid}-nom"
			bind:ref={field}
			bind:value={draft}
			autocomplete="off"
			spellcheck={false}
			aria-invalid={refusal !== null}
			aria-describedby={refusal === null ? undefined : `${uid}-refus`}
			oninput={() => (refusal = null)}
		/>
		<Button type="submit" size="sm" disabled={unchanged}>Renommer</Button>
		{#if refusal !== null}
			<p class="refus" id="{uid}-refus" role="alert">{refusal}</p>
		{/if}
	</form>

	{#if rows.length > 0}
		<dl class="lignes">
			{#each rows as row (row.label)}
				<div class="ligne">
					<dt>{row.label}</dt>
					<dd>
						<span aria-hidden="true">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX régénéré par le calcul (propertiesOf) -->
							{@html row.markup}
						</span>
						<span class="sr-only">{row.text}</span>
						{#if row.approximate !== undefined}
							<span class="approche">{row.approximate}</span>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if isFigureObject(object)}
		<div class="reglage">
			<h4>Style</h4>
			<FigureStyleSettings {object} />
			{#if isPoint(object)}
				<!-- Son nom écrit près de lui, dans la vue Géométrie (quitte le menu, 2026-10-23) -->
				<MyCheckbox
					checked={object.display?.showLabel ?? true}
					onCheckedChange={(on) =>
						atelier.setFigureDisplay(object.name, { showLabel: on === true })}
					label="Étiquette"
					aria-label={`Afficher l’étiquette de ${name}`}
				/>
			{/if}
		</div>
	{:else if isFunction(object) || isSequence(object)}
		<div class="reglage">
			<h4>Style du tracé</h4>
			<CurveStyleSettings {object} />
		</div>
	{:else if isValue(object) && object.slider}
		<div class="reglage">
			<h4>Curseur</h4>
			<SliderSettings {object} slider={object.slider} />
		</div>
	{/if}
</section>

<style>
	/* Déplié sous la carte, en retrait : il la prolonge */
	.proprietes {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin: 0 0 0.25rem 1.75rem;
		padding: 0.5rem 0.625rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-card);
		font-size: 0.8125rem;
	}
	.proprietes:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.tete {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h3 {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
	}
	h4 {
		margin: 0 0 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}
	.fermer {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		/* Cible d'au moins 28 px (WCAG 2.5.8) */
		min-width: 1.75rem;
		min-height: 1.75rem;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
	}
	.fermer:hover {
		background: var(--color-muted);
	}
	.fermer:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.nom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}
	.nom label {
		font-weight: 600;
	}
	.nom :global(input) {
		flex: 1 1 6rem;
		min-width: 0;
		height: 2rem;
	}
	.refus {
		flex-basis: 100%;
		margin: 0;
		color: var(--color-destructive);
	}
	.lignes {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 0.5rem;
	}
	dt {
		color: var(--color-muted-foreground);
	}
	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem;
		margin: 0;
		min-width: 0;
		overflow-x: auto;
	}
	.approche {
		color: var(--color-muted-foreground);
	}
</style>
