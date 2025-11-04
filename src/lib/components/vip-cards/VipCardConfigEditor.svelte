<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Database } from '$lib/types/database';

	type VipCardConfig = Database['public']['Tables']['vip_card_config']['Row'];

	interface Props {
		config?: VipCardConfig;
		onSave: (configData: CreateConfigData) => Promise<void>;
		onCancel: () => void;
	}

	interface CreateConfigData {
		config_name: string;
		description: string | null;
		probability_common: number;
		probability_rare: number;
		probability_epic: number;
		probability_legendary: number;
		valid_from: string | null;
		valid_until: string | null;
	}

	let { config, onSave, onCancel }: Props = $props();

	// Form state
	let formData = $state<CreateConfigData>({
		config_name: config?.config_name ?? '',
		description: config?.description ?? '',
		probability_common: config?.probability_common ?? 60,
		probability_rare: config?.probability_rare ?? 25,
		probability_epic: config?.probability_epic ?? 12,
		probability_legendary: config?.probability_legendary ?? 3,
		valid_from: config?.valid_from ?? null,
		valid_until: config?.valid_until ?? null
	});

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// Calculate total probability
	const totalProb = $derived(
		formData.probability_common +
			formData.probability_rare +
			formData.probability_epic +
			formData.probability_legendary
	);

	const isProbabilityValid = $derived(totalProb === 100);

	// Form validation
	const isFormValid = $derived(() => {
		const newErrors: Record<string, string> = {};

		if (!formData.config_name.trim()) {
			newErrors.config_name = 'Le nom de la configuration est requis';
		}

		if (!isProbabilityValid) {
			newErrors.probability = 'La somme des probabilités doit être exactement 100%';
		}

		if (formData.valid_from && formData.valid_until) {
			const from = new Date(formData.valid_from);
			const until = new Date(formData.valid_until);
			if (from >= until) {
				newErrors.valid_until = 'La date de fin doit être après la date de début';
			}
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	});

	// Auto-adjust probabilities to maintain 100% total
	function handleProbabilityChange(
		type: 'common' | 'rare' | 'epic' | 'legendary',
		newValue: number
	) {
		// Update the changed value
		formData[`probability_${type}`] = newValue;

		// If total is not 100%, adjust the largest other probability
		if (totalProb !== 100) {
			const otherTypes = (['common', 'rare', 'epic', 'legendary'] as const).filter(
				(t) => t !== type
			);

			// Find the largest other probability to adjust
			let largestType = otherTypes[0];
			let largestValue = formData[`probability_${largestType}`];

			for (const t of otherTypes) {
				if (formData[`probability_${t}`] > largestValue) {
					largestType = t;
					largestValue = formData[`probability_${t}`];
				}
			}

			// Adjust the largest to make total = 100
			const adjustment = 100 - totalProb;
			const newLargestValue = formData[`probability_${largestType}`] + adjustment;

			// Only adjust if result is valid (>= 0 and <= 100)
			if (newLargestValue >= 0 && newLargestValue <= 100) {
				formData[`probability_${largestType}`] = newLargestValue;
			}
		}
	}

	async function handleSubmit() {
		if (!isFormValid()) return;

		saving = true;
		try {
			await onSave(formData);
		} finally {
			saving = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Config Name -->
	<div class="space-y-2">
		<Label for="config_name">Nom de la configuration</Label>
		<Input
			id="config_name"
			bind:value={formData.config_name}
			placeholder="Noël 2025"
			class={errors.config_name ? 'border-destructive' : ''}
		/>
		{#if errors.config_name}
			<p class="text-sm text-destructive">{errors.config_name}</p>
		{/if}
	</div>

	<!-- Description -->
	<div class="space-y-2">
		<Label for="description">Description (optionnel)</Label>
		<Textarea
			id="description"
			bind:value={formData.description}
			placeholder="Configuration spéciale pour les fêtes de fin d'année"
			rows={2}
		/>
	</div>

	<!-- Probability Sliders -->
	<div class="space-y-4 rounded-lg border bg-muted/20 p-4">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold">Probabilités de tirage</h3>
			{#if isProbabilityValid}
				<span class="text-sm font-medium text-green-600">✅ Total: 100%</span>
			{:else}
				<span class="text-sm font-medium text-destructive">❌ Total: {totalProb}%</span>
			{/if}
		</div>

		<!-- Common -->
		<div class="space-y-2">
			<div class="flex justify-between">
				<Label for="prob_common">Communes</Label>
				<span class="font-mono text-sm">{formData.probability_common}%</span>
			</div>
			<input
				id="prob_common"
				type="range"
				min="0"
				max="100"
				bind:value={formData.probability_common}
				onchange={() => handleProbabilityChange('common', formData.probability_common)}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-gray-600"
			/>
		</div>

		<!-- Rare -->
		<div class="space-y-2">
			<div class="flex justify-between">
				<Label for="prob_rare">Rares</Label>
				<span class="font-mono text-sm">{formData.probability_rare}%</span>
			</div>
			<input
				id="prob_rare"
				type="range"
				min="0"
				max="100"
				bind:value={formData.probability_rare}
				onchange={() => handleProbabilityChange('rare', formData.probability_rare)}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-blue-200 accent-blue-600"
			/>
		</div>

		<!-- Epic -->
		<div class="space-y-2">
			<div class="flex justify-between">
				<Label for="prob_epic">Épiques</Label>
				<span class="font-mono text-sm">{formData.probability_epic}%</span>
			</div>
			<input
				id="prob_epic"
				type="range"
				min="0"
				max="100"
				bind:value={formData.probability_epic}
				onchange={() => handleProbabilityChange('epic', formData.probability_epic)}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
			/>
		</div>

		<!-- Legendary -->
		<div class="space-y-2">
			<div class="flex justify-between">
				<Label for="prob_legendary">Légendaires</Label>
				<span class="font-mono text-sm">{formData.probability_legendary}%</span>
			</div>
			<input
				id="prob_legendary"
				type="range"
				min="0"
				max="100"
				bind:value={formData.probability_legendary}
				onchange={() => handleProbabilityChange('legendary', formData.probability_legendary)}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-yellow-200 accent-yellow-600"
			/>
		</div>

		{#if errors.probability}
			<p class="text-sm text-destructive">{errors.probability}</p>
		{/if}
	</div>

	<!-- Valid From/Until -->
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label for="valid_from">Valide à partir du (optionnel)</Label>
			<Input id="valid_from" type="date" bind:value={formData.valid_from} />
		</div>

		<div class="space-y-2">
			<Label for="valid_until">Valide jusqu'au (optionnel)</Label>
			<Input
				id="valid_until"
				type="date"
				bind:value={formData.valid_until}
				class={errors.valid_until ? 'border-destructive' : ''}
			/>
			{#if errors.valid_until}
				<p class="text-sm text-destructive">{errors.valid_until}</p>
			{/if}
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2 border-t pt-4">
		<Button type="button" variant="outline" onclick={onCancel} disabled={saving}>Annuler</Button>
		<Button type="submit" disabled={!isFormValid() || saving}>
			{saving ? 'Enregistrement...' : config ? 'Modifier' : 'Créer'}
		</Button>
	</div>
</form>
