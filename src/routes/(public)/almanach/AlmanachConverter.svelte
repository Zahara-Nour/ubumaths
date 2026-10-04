<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		DAYS_PER_MONTH,
		EXTRA_DAY_NAMES,
		MONTH_NAMES,
		civilToPataphysical,
		formatGregorian,
		formatGregorianWithWeekday,
		formatLong,
		formatMedium,
		fromPataphysicalDate,
		type ExtraDay,
		type PataphysicalDate,
		type PataphysicalDateInput
	} from '$lib/almanach/calendar';

	// Types
	type Direction = 'to-almanach' | 'to-gregorian';

	type Conversion =
		| { ok: true; gregorian: string; date: PataphysicalDate }
		| { ok: false; message: string };

	type ReverseConversion = { ok: true; label: string } | { ok: false; message: string };

	// Constantes
	/** Premier jour de l'An 1 de l'Ère du Royaume */
	const ERA_START = '1896-08-23';
	const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

	/** Choix « mois ou jour hors-mois » : '1'…'7' pour les mois, ou un jour hors-mois */
	const PERIOD_ITEMS = [
		...MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name })),
		{ value: 'cloche', label: EXTRA_DAY_NAMES.cloche },
		{ value: 'surnumeraire', label: EXTRA_DAY_NAMES.surnumeraire }
	];

	// Props
	let { initial, today }: { initial: string; today: PataphysicalDate } = $props();

	// State — valeurs initiales seulement : le visiteur les change ensuite
	let direction = $state<Direction>('to-almanach');
	// svelte-ignore state_referenced_locally
	let value = $state(initial);
	// svelte-ignore state_referenced_locally
	let eraYear = $state<number | null>(today.year);
	// svelte-ignore state_referenced_locally
	let period = $state(today.kind === 'month' ? String(today.monthIndex + 1) : today.extraDay);
	// svelte-ignore state_referenced_locally
	let day = $state<number | null>(today.kind === 'month' ? today.day : 1);

	const conversion = $derived(convert(value));
	const isExtraDay = $derived(period === 'cloche' || period === 'surnumeraire');
	const reverse = $derived(convertBack(eraYear, period, day));
	const periodLabel = $derived(PERIOD_ITEMS.find((i) => i.value === period)?.label ?? '');

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
		const [year, month, dayOfMonth] = match.slice(1).map(Number);
		try {
			return {
				ok: true,
				gregorian: formatGregorian({ year, month, day: dayOfMonth }),
				date: civilToPataphysical(year, month, dayOfMonth)
			};
		} catch (e) {
			if (e instanceof RangeError) return { ok: false, message: 'Cette date n’existe pas.' };
			throw e;
		}
	}

	function convertBack(
		year: number | null,
		chosen: string,
		dayOfMonth: number | null
	): ReverseConversion {
		if (year === null || Number.isNaN(year)) return { ok: false, message: 'Indiquez un An.' };
		let input: PataphysicalDateInput;
		if (chosen === 'cloche' || chosen === 'surnumeraire') {
			input = { year, extraDay: chosen as ExtraDay };
		} else {
			if (dayOfMonth === null || Number.isNaN(dayOfMonth)) {
				return { ok: false, message: 'Indiquez un jour, de 1 à 52.' };
			}
			input = { year, month: Number(chosen), day: dayOfMonth };
		}
		try {
			return { ok: true, label: formatGregorianWithWeekday(fromPataphysicalDate(input)) };
		} catch (e) {
			if (e instanceof RangeError) return { ok: false, message: `${e.message}.` };
			throw e;
		}
	}
</script>

<div
	class="converter flex flex-col gap-5 rounded-xl border bg-card p-5 text-card-foreground sm:p-6"
>
	<div class="flex flex-wrap gap-2" role="group" aria-label="Sens de la conversion">
		<button
			type="button"
			class="direction"
			aria-pressed={direction === 'to-almanach'}
			onclick={() => (direction = 'to-almanach')}
		>
			Grégorien → Almanach
		</button>
		<button
			type="button"
			class="direction"
			aria-pressed={direction === 'to-gregorian'}
			onclick={() => (direction = 'to-gregorian')}
		>
			Almanach → Grégorien
		</button>
	</div>

	<div class="grid gap-6 sm:grid-cols-[minmax(0,18rem)_1fr]">
		{#if direction === 'to-almanach'}
			<div class="flex flex-col gap-2">
				<Label for="almanach-date">Date grégorienne</Label>
				<Input id="almanach-date" type="date" min={ERA_START} bind:value />
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-2">
					<Label for="almanach-era-year">An de l’Ère du Royaume</Label>
					<Input id="almanach-era-year" type="number" min={1} step={1} bind:value={eraYear} />
				</div>
				<div class="flex flex-col gap-2">
					<span class="text-sm leading-none font-medium"> Mois ou jour hors-mois </span>
					<MySelect
						type="single"
						bind:value={period}
						items={PERIOD_ITEMS}
						triggerAriaLabel={`Mois ou jour hors-mois : ${periodLabel}`}
					/>
				</div>
				{#if !isExtraDay}
					<div class="flex flex-col gap-2">
						<Label for="almanach-day">Jour (1 à {DAYS_PER_MONTH})</Label>
						<Input
							id="almanach-day"
							type="number"
							min={1}
							max={DAYS_PER_MONTH}
							step={1}
							bind:value={day}
						/>
					</div>
				{/if}
			</div>
		{/if}

		<div
			aria-live="polite"
			data-testid="almanach-conversion"
			class="flex flex-col justify-center gap-1"
		>
			{#if direction === 'to-almanach'}
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
							{EXTRA_DAY_NAMES[conversion.date.extraDay]} n’appartient à aucun mois et ne porte pas de
							numéro.
						</span>
					{:else if conversion.date.feast}
						<span class="mt-1 text-sm">Ce jour-là : {conversion.date.feast.name}.</span>
					{/if}
				{:else}
					<span class="text-muted-foreground">{conversion.message}</span>
				{/if}
			{:else if reverse.ok}
				<span class="text-sm text-muted-foreground">Dans le calendrier ordinaire</span>
				<strong
					class="font-serif-almanach text-2xl font-semibold"
					data-testid="almanach-conversion-gregorian"
				>
					{reverse.label}
				</strong>
			{:else}
				<span data-testid="almanach-conversion-error">{reverse.message}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.font-serif-almanach {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
	.direction {
		border: 1px solid var(--color-border);
		border-radius: 9999px;
		padding: 0.35rem 0.9rem;
		font-size: 0.875rem;
	}
	.direction[aria-pressed='true'] {
		background: var(--color-primary);
		color: var(--color-primary-foreground);
		border-color: var(--color-primary);
	}
	.direction:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
</style>
