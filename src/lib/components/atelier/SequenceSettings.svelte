<script lang="ts">
	/**
	 * Les réglages d'une suite, dans sa carte — phase 0 `/grapheur` §5 U1 et U2.
	 *
	 * Mode, rang du premier terme, premier terme (un nombre ou le nom d'une
	 * valeur, décision S1) ; et, tracée, « Sur le graphique » : nuage ou
	 * escalier, nombre de marches, couleur et trait. Tout s'écrit dans
	 * l'atelier (`setSequence`, `setSequenceDisplay`), refusé avec sa raison.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { cobwebRefusal } from '$lib/atelier/atelier.svelte';
	import type { SequenceDisplay, SequenceObject } from '$lib/atelier/types';
	import type { LineStyle } from '$lib/grapheur/types';
	import { isCurveColor } from '$lib/grapheur/colors';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import ColorPicker from '$lib/components/grapheur/ColorPicker.svelte';
	import LineWidthPicker from '$lib/components/grapheur/LineWidthPicker.svelte';
	import LineStylePicker from '$lib/components/grapheur/LineStylePicker.svelte';

	interface Props {
		object: SequenceObject;
	}

	let { object }: Props = $props();

	const atelier = useAtelier();

	/** Le contrôle dont le réglage a été refusé. */
	type Field = 'mode' | 'firstIndex' | 'firstTerm' | 'steps' | 'display';

	/**
	 * Pourquoi le dernier réglage n'a pas été retenu, et sur QUEL champ — reste
	 * affiché, relié à ce seul champ (comme `ValueSlider`, revue a11y du lot 5b).
	 */
	let refusal = $state<{ field: Field; message: string } | null>(null);

	/**
	 * Un refus né pendant la FRAPPE n'est montré qu'en quittant le champ : taper
	 * `-0,5` refusait le `-` et l'alerte parlait à chaque touche (revue).
	 */
	let pending = $state<{ field: Field; message: string } | null>(null);

	const refusalId = $derived(`refus-suite-${object.name}`);

	/** Pourquoi l'escalier est impossible ici, ou `null`. */
	const cobwebReason = $derived(cobwebRefusal(object, atelier.functionNames));

	const MODES = [
		{ value: 'explicit', label: 'explicite : u(n) = …' },
		{ value: 'recurrence', label: 'récurrence : u(n+1) = …' }
	];

	/** Un geste ponctuel (mode, nuage, escalier) : le refus se dit tout de suite. */
	function report(field: Field, result: { ok: true } | { ok: false; message: string }) {
		refusal = result.ok ? null : { field, message: result.message };
	}

	/** Pendant la frappe : retenu si valable, refus gardé pour la sortie du champ. */
	function typing(field: Field, result: { ok: true } | { ok: false; message: string }) {
		pending = result.ok ? null : { field, message: result.message };
		if (result.ok && refusal?.field === field) refusal = null;
	}

	function handleMode(value: string) {
		if (value === 'explicit' || value === 'recurrence') {
			report('mode', atelier.setSequence(object.name, { mode: value }));
		}
	}

	function handleFirstIndex(event: Event & { currentTarget: HTMLInputElement }) {
		const parsed = Number(event.currentTarget.value);
		if (event.currentTarget.value.trim() === '' || !Number.isFinite(parsed)) return;
		typing('firstIndex', atelier.setSequence(object.name, { firstIndex: parsed }));
	}

	function handleFirstTerm(event: Event & { currentTarget: HTMLInputElement }) {
		const typed = event.currentTarget.value.trim();
		if (typed === '') return;
		typing('firstTerm', atelier.setSequence(object.name, { firstTerm: typed }));
	}

	function handleSteps(event: Event & { currentTarget: HTMLInputElement }) {
		const parsed = Number(event.currentTarget.value);
		if (event.currentTarget.value.trim() === '' || !Number.isFinite(parsed)) return;
		typing('steps', atelier.setSequenceDisplay(object.name, { cobwebSteps: parsed }));
	}

	/** En quittant un champ : le refus en attente se dit, et le champ reprend la valeur RETENUE. */
	function leave(field: 'firstIndex' | 'firstTerm' | 'steps') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			if (pending?.field === field) refusal = pending;
			pending = null;
			event.currentTarget.value =
				field === 'steps' ? String(object.display?.cobwebSteps ?? '') : String(object[field]);
		};
	}

	function updateDisplay(patch: Partial<SequenceDisplay>) {
		report('display', atelier.setSequenceDisplay(object.name, patch));
	}

	/** Relier un champ au refus, seulement s'il est le fautif. */
	function describedBy(field: Field, extra?: string): string | undefined {
		const ids = [extra, refusal?.field === field ? refusalId : undefined].filter(Boolean);
		return ids.length > 0 ? ids.join(' ') : undefined;
	}

	const modeLabel = $derived(MODES.find((m) => m.value === object.mode)?.label ?? object.mode);
</script>

<div class="suite">
	<div class="ligne">
		<MySelect
			type="single"
			value={object.mode}
			onValueChange={handleMode}
			items={MODES}
			triggerAriaLabel={`${modeLabel}, mode de ${object.name}`}
			fitContent
		/>
	</div>
	<div class="ligne" role="group" aria-label={`Premier terme de ${object.name}`}>
		<span class="mot" aria-hidden="true">rang</span>
		<Input
			type="number"
			step="1"
			min="0"
			value={object.firstIndex}
			oninput={handleFirstIndex}
			onchange={leave('firstIndex')}
			class="h-8 w-16 text-sm"
			aria-label={`Rang du premier terme de ${object.name}`}
			aria-invalid={refusal?.field === 'firstIndex'}
			aria-describedby={describedBy('firstIndex')}
		/>
		{#if object.mode === 'recurrence'}
			<span class="mot" aria-hidden="true">{object.name}({object.firstIndex}) =</span>
			<Input
				type="text"
				value={object.firstTerm}
				oninput={handleFirstTerm}
				onchange={leave('firstTerm')}
				class="h-8 w-20 text-sm"
				placeholder="0 ou a"
				aria-label={`${object.name}(${object.firstIndex}) =, premier terme de ${object.name}`}
				aria-invalid={refusal?.field === 'firstTerm'}
				aria-describedby={describedBy('firstTerm')}
			/>
		{/if}
	</div>

	{#if object.plotted && object.display}
		{@const display = object.display}
		<div class="graphique" role="group" aria-label={`Sur le graphique : ${object.name}`}>
			<p class="titre">Sur le graphique</p>
			<div class="ligne">
				<ColorPicker
					value={display.color}
					onchange={(color) => {
						if (isCurveColor(color)) updateDisplay({ color });
					}}
				/>
				<LineWidthPicker
					value={display.lineWidth}
					onchange={(lineWidth) => updateDisplay({ lineWidth })}
				/>
				<LineStylePicker
					value={display.lineStyle}
					onchange={(lineStyle: LineStyle) => updateDisplay({ lineStyle })}
				/>
			</div>
			<div class="ligne" role="group" aria-label={`Tracé de ${object.name}`}>
				<button
					type="button"
					class="choix"
					aria-pressed={display.representation === 'ranks'}
					onclick={() => updateDisplay({ representation: 'ranks' })}
					><span class="coche" aria-hidden="true">✓</span>nuage</button
				>
				<!-- `aria-disabled`, pas `disabled` : la raison reste lisible au clavier -->
				<button
					type="button"
					class="choix"
					aria-pressed={display.representation === 'cobweb'}
					aria-disabled={cobwebReason !== null}
					aria-describedby={describedBy(
						'display',
						cobwebReason ? `escalier-${object.name}` : undefined
					)}
					onclick={() => {
						if (cobwebReason === null) updateDisplay({ representation: 'cobweb' });
					}}><span class="coche" aria-hidden="true">✓</span>escalier</button
				>
				{#if display.representation === 'cobweb'}
					<span class="mot" aria-hidden="true">marches</span>
					<Input
						type="number"
						step="1"
						min="1"
						value={display.cobwebSteps}
						oninput={handleSteps}
						onchange={leave('steps')}
						class="h-8 w-16 text-sm"
						aria-label={`marches de ${object.name}`}
						aria-invalid={refusal?.field === 'steps'}
						aria-describedby={describedBy('steps')}
					/>
				{/if}
			</div>
			{#if cobwebReason}
				<p class="raison" id={`escalier-${object.name}`}>{cobwebReason}</p>
			{/if}
		</div>
	{/if}

	<p class="refus-suite" id={refusalId} role="alert">{refusal?.message ?? ''}</p>
</div>

<style>
	.suite {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem;
		font-size: 0.8125rem;
	}
	.mot {
		font-family: var(--font-serif, serif);
	}
	.titre {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.choix {
		min-height: 1.75rem;
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.graphique {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	/* L'état choisi ne repose pas que sur un fond pâle (projection) : bordure
	   pleine contrastée et coche ✓ (revue a11y du lot 5b) */
	.coche {
		display: none;
		margin-right: 0.25rem;
	}
	.choix[aria-pressed='true'] {
		background: var(--color-muted);
		border-color: var(--color-foreground);
		font-weight: 600;
	}
	.choix[aria-pressed='true'] .coche {
		display: inline;
	}
	.choix:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	@media (pointer: coarse) {
		.choix {
			min-height: 44px;
		}
	}
	.choix[aria-disabled='true'] {
		opacity: 0.55;
		cursor: not-allowed;
		border-style: dashed;
	}
	.raison {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	.refus-suite {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.refus-suite:empty {
		visibility: hidden;
		height: 0;
	}
</style>
