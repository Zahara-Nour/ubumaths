<script lang="ts">
	/**
	 * WeekConfigEditor - Week Configuration Editor with Presets
	 *
	 * Features:
	 * - Visual calendar week representation
	 * - Preset configurations (Western, Israeli, Middle East)
	 * - Interactive day selection for school days and weekend
	 * - First day and last day of week selectors
	 * - Real-time validation
	 *
	 * @example
	 * <WeekConfigEditor bind:config={weekConfig} />
	 */

	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { DEFAULT_WEEK_CONFIG, type WeekConfig } from '$lib/utils/week-config';

	let {
		config = $bindable<WeekConfig>(structuredClone(DEFAULT_WEEK_CONFIG)),
		disabled = false
	}: {
		config?: WeekConfig;
		disabled?: boolean;
	} = $props();

	// Day names in French
	const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
	const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

	// Day selector items
	const dayItems = DAY_NAMES.map((name, index) => ({
		value: String(index),
		label: name
	}));

	// Preset configurations
	const PRESETS = {
		western: {
			label: 'Occidental (Lun-Ven)',
			config: {
				first_day: 0,
				last_day: 6,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			} satisfies WeekConfig
		},
		israeli: {
			label: 'Israélien (Dim-Jeu)',
			config: {
				first_day: 0,
				last_day: 6,
				school_days: [0, 1, 2, 3, 4],
				weekend_days: [5, 6]
			} satisfies WeekConfig
		},
		middle_east: {
			label: 'Moyen-Orient (Sam-Mer)',
			config: {
				first_day: 0,
				last_day: 6,
				school_days: [6, 0, 1, 2, 3],
				weekend_days: [4, 5]
			} satisfies WeekConfig
		}
	} as const;

	// Day checkboxes state
	let schoolDaysChecked = $state<Record<number, boolean>>({});
	let weekendDaysChecked = $state<Record<number, boolean>>({});

	// Initialize checkboxes from config
	$effect(() => {
		const newSchoolDays: Record<number, boolean> = {};
		const newWeekendDays: Record<number, boolean> = {};

		for (let i = 0; i < 7; i++) {
			newSchoolDays[i] = config.school_days.includes(i);
			newWeekendDays[i] = config.weekend_days.includes(i);
		}

		schoolDaysChecked = newSchoolDays;
		weekendDaysChecked = newWeekendDays;
	});

	// Validation error
	const validationError = $derived(() => {
		const schoolDays = Object.entries(schoolDaysChecked)
			.filter(([, checked]) => checked)
			.map(([day]) => Number(day));

		const weekendDays = Object.entries(weekendDaysChecked)
			.filter(([, checked]) => checked)
			.map(([day]) => Number(day));

		// Check for overlap
		const overlap = schoolDays.filter((day) => weekendDays.includes(day));
		if (overlap.length > 0) {
			return 'Les jours scolaires et les jours de weekend ne peuvent pas se chevaucher';
		}

		// Check all 7 days are covered
		const allDays = new Set([...schoolDays, ...weekendDays]);
		if (allDays.size !== 7) {
			return 'Les 7 jours de la semaine doivent être assignés';
		}

		// Check at least 1 school day
		if (schoolDays.length === 0) {
			return 'Au moins un jour scolaire doit être sélectionné';
		}

		return null;
	});

	// Update config when checkboxes change
	function updateConfigFromCheckboxes() {
		const schoolDays = Object.entries(schoolDaysChecked)
			.filter(([, checked]) => checked)
			.map(([day]) => Number(day))
			.sort((a, b) => a - b);

		const weekendDays = Object.entries(weekendDaysChecked)
			.filter(([, checked]) => checked)
			.map(([day]) => Number(day))
			.sort((a, b) => a - b);

		config = {
			...config,
			school_days: schoolDays,
			weekend_days: weekendDays
		};
	}

	function handleSchoolDayChange(day: number, checked: boolean) {
		schoolDaysChecked[day] = checked;
		if (checked) {
			// Uncheck from weekend
			weekendDaysChecked[day] = false;
		}
		updateConfigFromCheckboxes();
	}

	function handleWeekendDayChange(day: number, checked: boolean) {
		weekendDaysChecked[day] = checked;
		if (checked) {
			// Uncheck from school days
			schoolDaysChecked[day] = false;
		}
		updateConfigFromCheckboxes();
	}

	function applyPreset(presetKey: keyof typeof PRESETS) {
		config = structuredClone(PRESETS[presetKey].config);
	}
</script>

<div class="space-y-6">
	<!-- Presets -->
	<div class="space-y-2">
		<Label class="text-sm font-medium text-foreground">Préconfigurations rapides</Label>
		<div class="flex flex-wrap gap-2">
			{#each Object.entries(PRESETS) as [key, preset] (key)}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => applyPreset(key as keyof typeof PRESETS)}
					{disabled}
				>
					{preset.label}
				</Button>
			{/each}
		</div>
	</div>

	<!-- First and Last Day -->
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label class="text-sm font-medium text-foreground">Premier jour de la semaine</Label>
			<MySelect
				value={String(config.first_day)}
				onValueChange={(val) => (config.first_day = Number(val))}
				items={dayItems}
				type="single"
				{disabled}
				class="w-full"
			/>
		</div>
		<div class="space-y-2">
			<Label class="text-sm font-medium text-foreground">Dernier jour de la semaine</Label>
			<MySelect
				value={String(config.last_day)}
				onValueChange={(val) => (config.last_day = Number(val))}
				items={dayItems}
				type="single"
				{disabled}
				class="w-full"
			/>
		</div>
	</div>

	<!-- Visual Week Calendar -->
	<div class="space-y-3">
		<Label class="text-sm font-medium text-foreground">Configuration de la semaine</Label>

		<!-- Week Days Header -->
		<div class="grid grid-cols-7 gap-2">
			{#each DAY_NAMES_SHORT as dayName, dayIndex (dayIndex)}
				<div
					class="rounded-md border border-border bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
				>
					{dayName}
				</div>
			{/each}
		</div>

		<!-- School Days Row -->
		<div class="space-y-2">
			<div class="text-xs font-medium text-foreground">Jours scolaires</div>
			<div class="grid grid-cols-7 gap-2">
				{#each Array(7) as _, dayIndex (dayIndex)}
					<div class="flex justify-center">
						<MyCheckbox
							bind:checked={schoolDaysChecked[dayIndex]}
							onCheckedChange={(checked) => handleSchoolDayChange(dayIndex, checked === true)}
							{disabled}
							class="h-5 w-5"
						/>
					</div>
				{/each}
			</div>
		</div>

		<!-- Weekend Days Row -->
		<div class="space-y-2">
			<div class="text-xs font-medium text-foreground">Jours de weekend</div>
			<div class="grid grid-cols-7 gap-2">
				{#each Array(7) as _, dayIndex (dayIndex)}
					<div class="flex justify-center">
						<MyCheckbox
							bind:checked={weekendDaysChecked[dayIndex]}
							onCheckedChange={(checked) => handleWeekendDayChange(dayIndex, checked === true)}
							{disabled}
							class="h-5 w-5"
						/>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Validation Error -->
	{#if validationError()}
		<div
			class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{validationError()}
		</div>
	{/if}

	<!-- Summary -->
	<div class="space-y-2 rounded-md border border-border bg-muted p-4 text-sm">
		<div class="font-medium text-foreground">Résumé de la configuration</div>
		<div class="text-muted-foreground">
			<div>
				<strong>Jours scolaires:</strong>
				{#if config.school_days.length > 0}
					{config.school_days.map((d) => DAY_NAMES_SHORT[d]).join(', ')}
				{:else}
					Aucun
				{/if}
			</div>
			<div>
				<strong>Jours de weekend:</strong>
				{#if config.weekend_days.length > 0}
					{config.weekend_days.map((d) => DAY_NAMES_SHORT[d]).join(', ')}
				{:else}
					Aucun
				{/if}
			</div>
			<div>
				<strong>Semaine:</strong>
				{DAY_NAMES_SHORT[config.first_day]} → {DAY_NAMES_SHORT[config.last_day]}
			</div>
		</div>
	</div>
</div>
