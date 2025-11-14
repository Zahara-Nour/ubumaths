<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Settings, ShoppingBag, AlertCircle, Info, Check, X } from 'lucide-svelte';
	import { z } from 'zod';

	interface MarketplaceConfig {
		is_enabled: boolean;
		max_listings_per_student: number;
		max_trades_per_day: number;
		created_by?: string;
		created_at?: string;
		updated_at?: string;
	}

	let {
		config,
		isTeacher = false,
		onUpdate = () => {}
	}: {
		config: MarketplaceConfig | null;
		isTeacher?: boolean;
		onUpdate?: () => void;
	} = $props();

	// Form state
	let isEnabled = $state(config?.is_enabled || false);
	let maxListingsPerStudent = $state(config?.max_listings_per_student || 5);
	let maxTradesPerDay = $state(config?.max_trades_per_day || 10);
	let isLoading = $state(false);
	let hasChanges = $state(false);

	// Validation schema
	const configSchema = z.object({
		is_enabled: z.boolean(),
		max_listings_per_student: z
			.number()
			.int('Doit être un nombre entier')
			.min(1, 'Minimum 1 annonce')
			.max(20, 'Maximum 20 annonces')
			.finite('La valeur doit être un nombre fini'),
		max_trades_per_day: z
			.number()
			.int('Doit être un nombre entier')
			.min(1, 'Minimum 1 échange')
			.max(50, 'Maximum 50 échanges')
			.finite('La valeur doit être un nombre fini')
	});

	// Track changes
	$effect(() => {
		if (config) {
			hasChanges =
				isEnabled !== config.is_enabled ||
				maxListingsPerStudent !== config.max_listings_per_student ||
				maxTradesPerDay !== config.max_trades_per_day;
		} else {
			hasChanges = true; // New config, any values are changes
		}
	});

	// Save settings
	async function saveSettings() {
		// Validate input
		const validation = configSchema.safeParse({
			is_enabled: isEnabled,
			max_listings_per_student: maxListingsPerStudent,
			max_trades_per_day: maxTradesPerDay
		});

		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return;
		}

		isLoading = true;
		try {
			const response = await fetch('/api/marketplace/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					enabled_for_class: isEnabled,
					max_listings_per_student: maxListingsPerStudent,
					max_trades_per_day: maxTradesPerDay
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}

			toaster.success('Paramètres du marché sauvegardés');
			hasChanges = false;
			onUpdate();
		} catch (err) {
			console.error('Error saving marketplace settings:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isLoading = false;
		}
	}

	// Reset to defaults
	function resetToDefaults() {
		if (config) {
			isEnabled = config.is_enabled;
			maxListingsPerStudent = config.max_listings_per_student;
			maxTradesPerDay = config.max_trades_per_day;
		} else {
			isEnabled = false;
			maxListingsPerStudent = 5;
			maxTradesPerDay = 10;
		}
		hasChanges = false;
		toaster.info('Paramètres réinitialisés');
	}

	// Format date
	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<CardTitle class="flex items-center gap-2">
					<ShoppingBag class="h-5 w-5" />
					Marché d'échange
				</CardTitle>
				<CardDescription>
					{#if isTeacher}
						Configurez le marché d'échange pour votre école
					{:else}
						Gérez les paramètres du marché d'échange pour l'école
					{/if}
				</CardDescription>
			</div>
			{#if isEnabled}
				<Badge class="bg-green-100 text-green-800">
					<Check class="mr-1 h-3 w-3" />
					Activé
				</Badge>
			{:else}
				<Badge variant="secondary">
					<X class="mr-1 h-3 w-3" />
					Désactivé
				</Badge>
			{/if}
		</div>
	</CardHeader>
	<CardContent class="space-y-6">
		<!-- Enable/Disable Toggle -->
		<div class="space-y-3">
			<MyCheckbox bind:checked={isEnabled} label="Activer le marché d'échange" />
			{#if isEnabled}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
					<div class="flex gap-2">
						<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
						<p class="text-sm text-blue-800">
							Le marché permet aux élèves d'échanger des cartes VIP et des gidouilles entre eux. Les
							enseignants peuvent surveiller toutes les transactions.
						</p>
					</div>
				</div>
			{:else}
				<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
					<div class="flex gap-2">
						<AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
						<p class="text-sm text-yellow-800">
							Le marché est actuellement désactivé. Les élèves ne peuvent pas créer d'annonces ni
							effectuer d'échanges.
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Configuration Options -->
		{#if isEnabled}
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="max-listings">
						Maximum d'annonces par élève
						<span class="ml-1 text-xs text-muted-foreground">
							(nombre d'annonces actives simultanément)
						</span>
					</Label>
					<Input
						id="max-listings"
						type="number"
						bind:value={maxListingsPerStudent}
						min={1}
						max={20}
						class="w-32"
					/>
				</div>

				<div class="space-y-2">
					<Label for="max-trades">
						Maximum d'échanges par jour
						<span class="ml-1 text-xs text-muted-foreground"> (limite quotidienne par élève) </span>
					</Label>
					<Input
						id="max-trades"
						type="number"
						bind:value={maxTradesPerDay}
						min={1}
						max={50}
						class="w-32"
					/>
				</div>
			</div>
		{/if}

		<!-- Metadata -->
		{#if config}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
				<div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
					<div>
						<span class="font-medium">Dernière modification:</span>
						<span class="ml-1">{formatDate(config.updated_at)}</span>
					</div>
					<div>
						<span class="font-medium">Créé le:</span>
						<span class="ml-1">{formatDate(config.created_at)}</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex justify-between">
			<Button variant="outline" onclick={resetToDefaults} disabled={!hasChanges || isLoading}>
				Réinitialiser
			</Button>
			<Button onclick={saveSettings} disabled={!hasChanges || isLoading}>
				{#if isLoading}
					<span class="mr-2 animate-spin">⏳</span>
				{:else}
					<Settings class="mr-2 h-4 w-4" />
				{/if}
				Enregistrer
			</Button>
		</div>
	</CardContent>
</Card>
