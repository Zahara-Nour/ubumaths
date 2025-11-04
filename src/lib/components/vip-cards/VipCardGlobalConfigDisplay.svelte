<script lang="ts">
	import type { Database } from '$lib/types/database';

	type VipCardConfig = Database['public']['Tables']['vip_card_config']['Row'];

	interface Props {
		config: VipCardConfig | null;
	}

	let { config }: Props = $props();
</script>

{#if config}
	<div class="space-y-3">
		<div>
			<h3 class="text-lg font-semibold">{config.config_name}</h3>
			<!-- {#if config.description}
				<p class="mt-1 text-sm text-muted-foreground">{config.description}</p>
			{/if} -->
		</div>

		<!-- Compact probability display -->
		<div class="text-sm">
			<span class="font-medium text-foreground">Probabilités :</span>
			<span class="ml-2 font-mono text-foreground">
				{config.common_probability}% / {config.rare_probability}% / {config.epic_probability}% / {config.legendary_probability}%
			</span>
			<span class="ml-1 text-xs text-muted-foreground">(C/R/E/L)</span>
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
	</div>
{:else}
	<p class="text-muted-foreground">Aucune configuration active trouvée.</p>
{/if}
