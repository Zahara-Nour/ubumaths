<!--
	Precision Editor Component
	==========================

	Editor for numerical question precision configuration.

	PRECISION TYPES:
	- none: Exact match only
	- decimal: Fixed decimal places (e.g., 2 decimal places)
	- significant: Significant figures (e.g., 3 sig figs)
	- magnitude: Order of magnitude (e.g., nearest 10)
	- tolerance: Absolute or relative tolerance (e.g., ±0.1 or ±5%)

	PROPS:
	- precision: PrecisionType (bindable)
-->

<script lang="ts">
	import type { PrecisionType } from '$lib/questions/types';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		precision: PrecisionType | undefined;
	}

	let { precision = $bindable() }: Props = $props();

	// Initialize if undefined
	if (!precision) {
		precision = { type: 'none' };
	}

	// Precision type options
	const PRECISION_TYPES = [
		{
			value: 'none',
			label: 'Aucune (valeur exacte)',
			description: 'La réponse doit être exactement égale'
		},
		{ value: 'decimal', label: 'Décimales', description: 'Nombre de décimales fixe' },
		{
			value: 'significant',
			label: 'Chiffres significatifs',
			description: 'Nombre de chiffres significatifs'
		},
		{ value: 'magnitude', label: 'Ordre de grandeur', description: 'Arrondi à la puissance de 10' },
		{ value: 'tolerance', label: 'Tolérance', description: "Marge d'erreur absolue ou relative" }
	];

	// Handle type change
	function handleTypeChange(newType: string) {
		switch (newType) {
			case 'none':
				precision = { type: 'none' };
				break;
			case 'decimal':
				precision = { type: 'decimal', digits: 2 };
				break;
			case 'significant':
				precision = { type: 'significant', digits: 3 };
				break;
			case 'magnitude':
				precision = { type: 'magnitude', digits: 1 };
				break;
			case 'tolerance':
				precision = { type: 'tolerance', tolerance: 0.1, mode: 'absolute' };
				break;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Précision de la réponse</Card.Title>
		<Card.Description>
			Configurez comment la réponse de l'élève sera comparée à la réponse attendue
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<!-- Precision type selector -->
		<div class="space-y-2">
			<Label for="precision-type">Type de précision</Label>
			<select
				id="precision-type"
				value={precision.type}
				onchange={(e) => handleTypeChange(e.currentTarget.value)}
				class="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#each PRECISION_TYPES as type (type.value)}
					<option value={type.value}>
						{type.label} - {type.description}
					</option>
				{/each}
			</select>
		</div>

		<!-- Type-specific configuration -->
		{#if precision.type === 'decimal'}
			<div class="space-y-2">
				<Label for="decimal-digits">Nombre de décimales</Label>
				<Input id="decimal-digits" type="number" min="0" max="10" bind:value={precision.digits} />
				<p class="text-xs text-muted-foreground">Exemple : 2 décimales → 3.14 accepté pour π</p>
			</div>
		{/if}

		{#if precision.type === 'significant'}
			<div class="space-y-2">
				<Label for="significant-digits">Nombre de chiffres significatifs</Label>
				<Input
					id="significant-digits"
					type="number"
					min="1"
					max="10"
					bind:value={precision.digits}
				/>
				<p class="text-xs text-muted-foreground">
					Exemple : 3 chiffres significatifs → 3.14 accepté pour π
				</p>
			</div>
		{/if}

		{#if precision.type === 'magnitude'}
			<div class="space-y-2">
				<Label for="magnitude-digits">Puissance de 10</Label>
				<Input
					id="magnitude-digits"
					type="number"
					min="-10"
					max="10"
					bind:value={precision.digits}
				/>
				<p class="text-xs text-muted-foreground">Exemple : 1 (dizaines) → 310 accepté pour 314</p>
			</div>
		{/if}

		{#if precision.type === 'tolerance'}
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="tolerance-mode">Mode de tolérance</Label>
					<select
						id="tolerance-mode"
						bind:value={precision.mode}
						class="flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="absolute">Absolue - ±valeur fixe</option>
						<option value="relative">Relative - ±pourcentage</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label for="tolerance-value">
						Valeur de tolérance
						{#if precision.mode === 'relative'}
							<Badge variant="outline" class="ml-2">en %</Badge>
						{/if}
					</Label>
					<Input
						id="tolerance-value"
						type="number"
						min="0"
						step={precision.mode === 'relative' ? '0.1' : '0.01'}
						bind:value={precision.tolerance}
					/>
					{#if precision.mode === 'absolute'}
						<p class="text-xs text-muted-foreground">
							Exemple : 0.1 → 3.04 à 3.24 accepté pour 3.14
						</p>
					{:else}
						<p class="text-xs text-muted-foreground">
							Exemple : 5% → 2.98 à 3.30 accepté pour 3.14
						</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if precision.type === 'none'}
			<p class="text-sm text-muted-foreground">
				La réponse de l'élève doit être exactement égale à la réponse attendue. Aucune tolérance
				n'est accordée.
			</p>
		{/if}
	</Card.Content>
</Card.Root>
