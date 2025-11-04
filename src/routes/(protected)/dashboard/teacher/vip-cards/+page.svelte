<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import VipCardGlobalConfigDisplay from '$lib/components/vip-cards/VipCardGlobalConfigDisplay.svelte';
	import VipCardOverrideGrid from '$lib/components/vip-cards/VipCardOverrideGrid.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Build overrides map from database data
	let overrides = $state<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		data.overrides.forEach((override) => {
			initial[override.card_id] = override.is_enabled;
		});
		return initial;
	});

	let hasChanges = $state(false);
	let saving = $state(false);

	// Track changes
	function handleChange(cardId: string, enabled: boolean) {
		overrides[cardId] = enabled;
		hasChanges = true;
	}

	// Save all overrides
	async function handleSave() {
		saving = true;

		try {
			const response = await fetch('/api/teacher/vip-cards/overrides', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ overrides })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to save');
			}

			toaster.success('Préférences enregistrées avec succès');
			hasChanges = false;
		} catch (error) {
			console.error('Save error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
		} finally {
			saving = false;
		}
	}

	// Reset all overrides
	async function handleReset() {
		if (
			!confirm(
				'Réinitialiser toutes vos préférences ?\n\nToutes les cartes suivront la configuration globale par défaut.'
			)
		) {
			return;
		}

		saving = true;

		try {
			const response = await fetch('/api/teacher/vip-cards/overrides', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to reset');
			}

			// Clear all overrides
			overrides = {};
			hasChanges = false;
			toaster.success('Préférences réinitialisées avec succès');
		} catch (error) {
			console.error('Reset error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la réinitialisation');
		} finally {
			saving = false;
		}
	}

	// Count enabled cards by rarity for validation
	const enabledByRarity = $derived(() => {
		const counts = {
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};

		data.templates.forEach((template) => {
			const isEnabled = overrides[template.id] ?? template.is_enabled;
			if (isEnabled) {
				counts[template.rarity]++;
			}
		});

		return counts;
	});

	const hasMinimumCards = $derived(() => {
		// Require at least 1 card of each rarity to be enabled
		return (
			enabledByRarity().common >= 1 &&
			enabledByRarity().rare >= 1 &&
			enabledByRarity().epic >= 1 &&
			enabledByRarity().legendary >= 1
		);
	});
</script>

<svelte:head>
	<title>Paramètres Cartes VIP - Professeur | UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-8 py-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Paramètres Cartes VIP (Professeur)</h1>
	</div>

	<!-- Global Config Display (Read-only) -->
	<div class="rounded-lg border bg-muted/30 p-6">
		<h2 class="mb-4 text-xl font-semibold">Configuration Globale (Lecture seule)</h2>
		<VipCardGlobalConfigDisplay config={data.globalConfig} />
	</div>

	<!-- Teacher Overrides -->
	<div class="space-y-6">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Vos Préférences de Cartes</h2>
			<p class="text-sm text-muted-foreground">
				Activez ou désactivez les cartes VIP que vos élèves peuvent tirer. Ces paramètres
				s'appliquent à toutes vos classes.
			</p>
		</div>

		<!-- Warning Box -->
		<div
			class="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950/20"
		>
			<div class="flex gap-3">
				<div class="text-xl">⚠️</div>
				<div class="space-y-2 text-sm">
					<p>
						<strong>Ces paramètres s'appliquent à TOUTES vos classes.</strong> Si vous désactivez une
						carte, vos élèves ne pourront PAS la tirer, même si elle est activée globalement.
					</p>
					<p>
						Si un élève a plusieurs professeurs, la règle la plus stricte gagne : si UN professeur
						désactive une carte, elle est bloquée pour l'élève dans TOUTES ses classes.
					</p>
					<p class="font-medium">
						Vous devez laisser au moins 1 carte activée par rareté pour que le système fonctionne
						correctement.
					</p>
				</div>
			</div>
		</div>

		<!-- Cards Grid -->
		<VipCardOverrideGrid templates={data.templates} {overrides} onChange={handleChange} />

		<!-- Validation Warning -->
		{#if !hasMinimumCards()}
			<div
				class="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/20"
			>
				<div class="flex gap-3">
					<div class="text-xl">⛔</div>
					<div class="text-sm">
						<p class="font-medium text-red-900 dark:text-red-100">Attention !</p>
						<p class="text-red-800 dark:text-red-200">
							Vous devez laisser au moins 1 carte activée pour chaque rareté :
						</p>
						<ul class="mt-2 list-inside list-disc text-red-700 dark:text-red-300">
							{#if enabledByRarity().common === 0}
								<li>Communes : Aucune carte activée (minimum requis : 1)</li>
							{/if}
							{#if enabledByRarity().rare === 0}
								<li>Rares : Aucune carte activée (minimum requis : 1)</li>
							{/if}
							{#if enabledByRarity().epic === 0}
								<li>Épiques : Aucune carte activée (minimum requis : 1)</li>
							{/if}
							{#if enabledByRarity().legendary === 0}
								<li>Légendaires : Aucune carte activée (minimum requis : 1)</li>
							{/if}
						</ul>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex items-center justify-between gap-4 border-t pt-4">
			<div class="text-sm text-muted-foreground">
				{#if hasChanges}
					<span class="font-medium text-orange-600">Modifications non enregistrées</span>
				{:else}
					<span>Aucune modification en attente</span>
				{/if}
			</div>

			<div class="flex gap-2">
				<Button variant="outline" onclick={handleReset} disabled={saving || !hasChanges}>
					Réinitialiser
				</Button>
				<Button onclick={handleSave} disabled={saving || !hasChanges || !hasMinimumCards()}>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</Button>
			</div>
		</div>
	</div>

	<!-- Info Box -->
	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
	>
		<p class="text-sm">
			<strong>ℹ️ Comment ça marche ?</strong> Lorsqu'un élève tire une carte VIP, le système :
		</p>
		<ol class="mt-2 list-inside list-decimal space-y-1 text-sm">
			<li>Utilise les probabilités de la configuration globale active</li>
			<li>Filtre les cartes en fonction de vos préférences (et celles de tous ses professeurs)</li>
			<li>Tire une carte au hasard parmi celles disponibles</li>
		</ol>
		<p class="mt-2 text-sm">
			Si vous ne modifiez rien, vos élèves pourront tirer toutes les cartes activées globalement par
			l'administrateur.
		</p>
	</div>
</div>
