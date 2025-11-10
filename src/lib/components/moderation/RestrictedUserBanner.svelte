<!--
	RestrictedUserBanner Component
	==============================

	Displays an alert banner to restricted users explaining why they cannot send messages.

	Props:
		- restriction: Restriction details (type, reason, expires_at, scope_type)

	Features:
		- Different styling based on restriction_type (mute: warning, timeout: info, ban: destructive)
		- Shows reason and expiration countdown
		- Indicates scope (global or conversation-specific)
-->
<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Ban, Clock, AlertTriangle } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Component Props
	interface Props {
		restriction: {
			restriction_type: 'mute' | 'timeout' | 'ban';
			reason: string;
			expires_at: string | null;
			scope_type: 'conversation' | 'global';
		};
	}

	let { restriction }: Props = $props();

	/**
	 * Get alert variant based on restriction type
	 */
	const alertVariant = $derived(restriction.restriction_type === 'ban' ? 'destructive' : 'default');

	/**
	 * Get icon component based on restriction type
	 */
	const IconComponent = $derived(
		restriction.restriction_type === 'mute'
			? AlertTriangle
			: restriction.restriction_type === 'timeout'
				? Clock
				: Ban
	);

	/**
	 * Get title text based on restriction type
	 */
	const titleText = $derived(
		restriction.restriction_type === 'mute'
			? 'Vous êtes muté'
			: restriction.restriction_type === 'timeout'
				? 'Vous êtes temporairement bloqué'
				: 'Vous êtes banni'
	);

	/**
	 * Get scope text
	 */
	const scopeText = $derived(
		restriction.scope_type === 'global'
			? 'Vous êtes restreint de toutes les conversations'
			: 'Vous êtes restreint de cette conversation'
	);

	/**
	 * Get expiration text
	 */
	const expirationText = $derived(
		restriction.expires_at
			? (() => {
					try {
						const timeLeft = formatDistanceToNow(new Date(restriction.expires_at), {
							addSuffix: true,
							locale: fr
						});
						return `Restriction expire ${timeLeft}`;
					} catch {
						return null;
					}
				})()
			: null
	);
</script>

<Alert.Root variant={alertVariant} class="border-l-4">
	{@const Icon = IconComponent}
	<Icon class="h-4 w-4" />
	<Alert.Title>{titleText}</Alert.Title>
	<Alert.Description class="mt-2 space-y-2">
		<p class="font-medium">Raison : {restriction.reason}</p>
		<p class="text-sm">{scopeText}</p>
		{#if expirationText}
			<p class="text-sm font-semibold">{expirationText}</p>
		{/if}
	</Alert.Description>
</Alert.Root>
