<script lang="ts">
	import type { Database } from '$lib/types/database';

	type VipCardConfig = Database['public']['Tables']['vip_card_config']['Row'];

	interface Props {
		config: VipCardConfig | null;
	}

	let { config }: Props = $props();
</script>

{#if config}
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Configuration active : {config.config_name}</h3>

		{#if config.description}
			<p class="text-sm text-muted-foreground">{config.description}</p>
		{/if}

		<div class="space-y-3">
			<!-- Common cards progress bar -->
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span class="font-medium">Communes</span>
					<span class="text-muted-foreground">{config.probability_common}%</span>
				</div>
				<div class="h-2.5 w-full rounded-full bg-gray-200">
					<div
						class="h-2.5 rounded-full bg-gray-600 transition-all"
						style="width: {config.probability_common}%"
					></div>
				</div>
			</div>

			<!-- Rare cards progress bar -->
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span class="font-medium">Rares</span>
					<span class="text-muted-foreground">{config.probability_rare}%</span>
				</div>
				<div class="h-2.5 w-full rounded-full bg-blue-200">
					<div
						class="h-2.5 rounded-full bg-blue-600 transition-all"
						style="width: {config.probability_rare}%"
					></div>
				</div>
			</div>

			<!-- Epic cards progress bar -->
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span class="font-medium">Épiques</span>
					<span class="text-muted-foreground">{config.probability_epic}%</span>
				</div>
				<div class="h-2.5 w-full rounded-full bg-purple-200">
					<div
						class="h-2.5 rounded-full bg-purple-600 transition-all"
						style="width: {config.probability_epic}%"
					></div>
				</div>
			</div>

			<!-- Legendary cards progress bar -->
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span class="font-medium">Légendaires</span>
					<span class="text-muted-foreground">{config.probability_legendary}%</span>
				</div>
				<div class="h-2.5 w-full rounded-full bg-yellow-200">
					<div
						class="h-2.5 rounded-full bg-yellow-600 transition-all"
						style="width: {config.probability_legendary}%"
					></div>
				</div>
			</div>
		</div>

		{#if config.valid_from || config.valid_until}
			<div class="text-sm text-muted-foreground">
				<p class="mb-1 font-medium">Période de validité :</p>
				<p>
					{#if config.valid_from}
						Du {new Date(config.valid_from).toLocaleDateString('fr-FR')}
					{/if}
					{#if config.valid_until}
						au {new Date(config.valid_until).toLocaleDateString('fr-FR')}
					{/if}
				</p>
			</div>
		{/if}

		<p class="mt-4 text-sm text-muted-foreground italic">
			ℹ️ Seul l'administrateur peut modifier les configurations globales.
		</p>
	</div>
{:else}
	<p class="text-muted-foreground">Aucune configuration active trouvée.</p>
{/if}
