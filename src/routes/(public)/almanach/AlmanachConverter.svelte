<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		EXTRA_DAY_NAMES,
		civilToPataphysical,
		formatGregorian,
		formatLong,
		formatMedium,
		type PataphysicalDate
	} from '$lib/almanach/calendar';

	// Types
	type Conversion =
		| { ok: true; gregorian: string; date: PataphysicalDate }
		| { ok: false; message: string };

	// Constantes
	/** Premier jour de l'An 1 de l'Ère du Royaume */
	const ERA_START = '1896-08-23';
	const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

	// Props
	let { initial }: { initial: string } = $props();

	// State
	// Valeur initiale seulement : le visiteur la change ensuite
	// svelte-ignore state_referenced_locally
	let value = $state(initial);

	const conversion = $derived(convert(value));

	// Functions
	function convert(iso: string): Conversion {
		const match = ISO_DAY.exec(iso);
		if (!match) return { ok: false, message: 'Choisissez une date.' };
		if (iso < ERA_START) {
			return {
				ok: false,
				message: 'Avant le 23 août 1896, l’Ère du Royaume n’avait pas encore commencé.'
			};
		}
		const [year, month, day] = match.slice(1).map(Number);
		try {
			return {
				ok: true,
				gregorian: formatGregorian({ year, month, day }),
				date: civilToPataphysical(year, month, day)
			};
		} catch (e) {
			if (e instanceof RangeError) return { ok: false, message: 'Cette date n’existe pas.' };
			throw e;
		}
	}
</script>

<div
	class="converter grid gap-6 rounded-xl border bg-card p-5 text-card-foreground sm:grid-cols-[minmax(0,16rem)_1fr] sm:p-6"
>
	<div class="flex flex-col gap-2">
		<Label for="almanach-date">Date grégorienne</Label>
		<Input id="almanach-date" type="date" min={ERA_START} bind:value />
	</div>

	<div
		aria-live="polite"
		data-testid="almanach-conversion"
		class="flex flex-col justify-center gap-1"
	>
		{#if conversion.ok}
			<span class="text-sm text-muted-foreground">{conversion.gregorian}</span>
			<strong
				class="font-serif-almanach text-2xl font-semibold"
				data-testid="almanach-conversion-medium"
			>
				{formatMedium(conversion.date)}
			</strong>
			<span class="text-muted-foreground italic">{formatLong(conversion.date)}</span>
			{#if conversion.date.kind === 'extra-day'}
				<span class="mt-1 text-sm">
					{EXTRA_DAY_NAMES[conversion.date.extraDay]} n’appartient à aucun mois et ne porte pas de numéro.
				</span>
			{:else if conversion.date.feast}
				<span class="mt-1 text-sm">Ce jour-là : {conversion.date.feast.name}.</span>
			{/if}
		{:else}
			<span class="text-muted-foreground">{conversion.message}</span>
		{/if}
	</div>
</div>

<style>
	.font-serif-almanach {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
</style>
