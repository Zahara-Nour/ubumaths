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

	/** Pourquoi le dernier réglage n'a pas été retenu — reste affiché (a11y). */
	let refusal = $state<string | null>(null);

	const refusalId = $derived(`refus-suite-${object.name}`);

	/** Pourquoi l'escalier est impossible ici, ou `null`. */
	const cobwebReason = $derived(cobwebRefusal(object));

	const MODES = [
		{ value: 'explicit', label: 'explicite : u(n) = …' },
		{ value: 'recurrence', label: 'récurrence : u(n+1) = …' }
	];

	function report(result: { ok: true } | { ok: false; message: string }) {
		refusal = result.ok ? null : result.message;
	}

	function handleMode(value: string) {
		if (value === 'explicit' || value === 'recurrence') {
			report(atelier.setSequence(object.name, { mode: value }));
		}
	}

	function handleFirstIndex(event: Event & { currentTarget: HTMLInputElement }) {
		const parsed = Number(event.currentTarget.value);
		if (event.currentTarget.value.trim() === '' || !Number.isFinite(parsed)) return;
		report(atelier.setSequence(object.name, { firstIndex: parsed }));
	}

	function handleFirstTerm(event: Event & { currentTarget: HTMLInputElement }) {
		const typed = event.currentTarget.value.trim();
		if (typed === '') return;
		report(atelier.setSequence(object.name, { firstTerm: typed }));
	}

	/** En quittant un champ, il reprend la valeur RETENUE. */
	function restore(field: 'firstIndex' | 'firstTerm') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			event.currentTarget.value = String(object[field]);
		};
	}

	function updateDisplay(patch: Partial<SequenceDisplay>) {
		report(atelier.setSequenceDisplay(object.name, patch));
	}

	function handleSteps(event: Event & { currentTarget: HTMLInputElement }) {
		const parsed = Number(event.currentTarget.value);
		if (event.currentTarget.value.trim() === '' || !Number.isFinite(parsed)) return;
		updateDisplay({ cobwebSteps: parsed });
	}
</script>

<div class="suite">
	<div class="ligne">
		<MySelect
			type="single"
			value={object.mode}
			onValueChange={handleMode}
			items={MODES}
			triggerAriaLabel={`Mode de ${object.name} : ${object.mode === 'recurrence' ? 'récurrence' : 'explicite'}`}
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
			onchange={restore('firstIndex')}
			class="h-8 w-16 text-sm"
			aria-label={`Rang du premier terme de ${object.name}`}
			aria-describedby={refusal ? refusalId : undefined}
		/>
		{#if object.mode === 'recurrence'}
			<span class="mot" aria-hidden="true">{object.name}({object.firstIndex}) =</span>
			<Input
				type="text"
				value={object.firstTerm}
				oninput={handleFirstTerm}
				onchange={restore('firstTerm')}
				class="h-8 w-20 text-sm"
				placeholder="0 ou a"
				aria-label={`Premier terme de ${object.name}`}
				aria-describedby={refusal ? refusalId : undefined}
			/>
		{/if}
	</div>

	{#if object.plotted && object.display}
		{@const display = object.display}
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
				aria-label={`Tracer ${object.name} en nuage`}
				onclick={() => updateDisplay({ representation: 'ranks' })}>nuage</button
			>
			<!-- `aria-disabled`, pas `disabled` : la raison reste lisible au clavier -->
			<button
				type="button"
				class="choix"
				aria-pressed={display.representation === 'cobweb'}
				aria-disabled={cobwebReason !== null}
				aria-label={`Tracer ${object.name} en escalier`}
				aria-describedby={cobwebReason ? `escalier-${object.name}` : undefined}
				onclick={() => {
					if (cobwebReason === null) updateDisplay({ representation: 'cobweb' });
				}}>escalier</button
			>
			{#if display.representation === 'cobweb'}
				<span class="mot" aria-hidden="true">marches</span>
				<Input
					type="number"
					step="1"
					min="1"
					value={display.cobwebSteps}
					oninput={handleSteps}
					class="h-8 w-16 text-sm"
					aria-label={`Nombre de marches de ${object.name}`}
				/>
			{/if}
		</div>
		{#if cobwebReason}
			<p class="raison" id={`escalier-${object.name}`}>{cobwebReason}</p>
		{/if}
	{/if}

	<p class="refus-suite" id={refusalId} role="alert">{refusal ?? ''}</p>
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
	.choix[aria-pressed='true'] {
		background: var(--color-muted);
		font-weight: 600;
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
