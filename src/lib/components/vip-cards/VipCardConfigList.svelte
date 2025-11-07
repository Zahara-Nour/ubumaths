<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Database } from '$lib/types/database';

	type VipCardConfig = Database['public']['Tables']['vip_card_config']['Row'];

	interface Props {
		configs: VipCardConfig[];
		onActivate: (configId: string) => Promise<void>;
		onEdit: (config: VipCardConfig) => void;
		onDelete: (configId: string) => Promise<void>;
		onCreate: () => void;
	}

	let { configs, onActivate, onEdit, onDelete, onCreate }: Props = $props();

	let activating = $state<string | null>(null);
	let deleting = $state<string | null>(null);

	async function handleActivate(configId: string) {
		activating = configId;
		try {
			await onActivate(configId);
		} finally {
			activating = null;
		}
	}

	async function handleDelete(configId: string, configName: string) {
		if (!confirm(`Supprimer la configuration "${configName}" ?`)) return;

		deleting = configId;
		try {
			await onDelete(configId);
		} finally {
			deleting = null;
		}
	}

	function formatDateRange(from: string | null, until: string | null): string {
		if (!from && !until) return '';

		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		};

		if (from && until) {
			return `Du ${new Date(from).toLocaleDateString('fr-FR', options)} au ${new Date(until).toLocaleDateString('fr-FR', options)}`;
		} else if (from) {
			return `À partir du ${new Date(from).toLocaleDateString('fr-FR', options)}`;
		} else if (until) {
			return `Jusqu'au ${new Date(until).toLocaleDateString('fr-FR', options)}`;
		} else {
			return 'Pas de limite de date';
		}
	}
</script>

<div class="space-y-6">
	<!-- Create Button -->
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">Configurations de probabilités</h2>
		<Button onclick={onCreate}>+ Nouvelle Configuration</Button>
	</div>

	<!-- Configs List -->
	{#if configs.length === 0}
		<div class="rounded-lg border bg-muted/20 py-12 text-center">
			<p class="text-muted-foreground">Aucune configuration trouvée</p>
			<Button onclick={onCreate} variant="outline" class="mt-4">
				Créer la première configuration
			</Button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each configs as config (config.id)}
				<div
					class="rounded-lg border p-4 transition-all {config.is_active
						? 'border-green-500 bg-green-50 dark:bg-green-950/20'
						: 'border-border bg-card'}"
				>
					<div class="flex items-start justify-between gap-4">
						<!-- Left: Status indicator and info -->
						<div class="flex flex-1 items-start gap-3">
							<!-- Active indicator -->
							<div class="pt-1">
								{#if config.is_active}
									<span class="text-xl font-bold text-green-600">●</span>
								{:else}
									<span class="text-xl text-gray-300">○</span>
								{/if}
							</div>

							<!-- Config info -->
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<h3 class="text-lg font-semibold">{config.config_name}</h3>
									{#if config.is_active}
										<span class="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">
											ACTIF
										</span>
									{/if}
								</div>

								{#if config.description}
									<p class="mt-1 text-sm text-muted-foreground">{config.description}</p>
								{/if}

								<!-- Probabilities -->
								<p class="mt-2 text-sm">
									<span class="font-medium text-foreground">Probabilités :</span>
									<span class="ml-2 font-mono text-foreground">
										{config.common_probability}% / {config.rare_probability}% / {config.epic_probability}%
										/ {config.legendary_probability}%
									</span>
									<span class="ml-1 text-xs text-muted-foreground">(C/R/E/L)</span>
								</p>

								<!-- Date range -->
								{#if config.valid_from || config.valid_until}
									<p class="mt-1 text-xs text-muted-foreground">
										{formatDateRange(config.valid_from, config.valid_until)}
									</p>
								{/if}
							</div>
						</div>

						<!-- Right: Action buttons -->
						<div class="flex min-w-fit flex-col gap-2">
							{#if !config.is_active}
								<Button
									size="sm"
									onclick={() => handleActivate(config.id)}
									disabled={activating === config.id}
								>
									{activating === config.id ? 'Activation...' : 'Activer'}
								</Button>
							{/if}

							<Button size="sm" variant="outline" onclick={() => onEdit(config)}>Modifier</Button>

							<Button
								size="sm"
								variant="destructive"
								onclick={() => handleDelete(config.id, config.config_name)}
								disabled={config.is_active || deleting === config.id}
							>
								{deleting === config.id ? 'Suppression...' : 'Supprimer'}
							</Button>
						</div>
					</div>

					{#if config.is_active}
						<p class="mt-3 text-xs text-green-700 italic dark:text-green-400">
							Cette configuration est actuellement utilisée pour tous les tirages de cartes VIP.
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Info box -->
	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
	>
		<p class="text-sm">
			<strong>ℹ️ Note :</strong> Une seule configuration peut être active à la fois. Activer une nouvelle
			configuration désactivera automatiquement l'actuelle. La configuration active ne peut pas être
			supprimée.
		</p>
	</div>
</div>
