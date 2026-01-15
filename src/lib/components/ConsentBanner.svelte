<!--
	Consent Banner Component
	========================

	Displays a warning banner for students who require parental consent
	but haven't received it yet.

	Props:
	- consentStatus: The consent status object from the server

	Display logic:
	- Hidden for teachers/admins
	- Hidden for students with consent granted
	- Shows warning for students in grace period (with days remaining)
	- Shows error for students without consent (read-only mode)
-->
<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Clock, ShieldAlert } from 'lucide-svelte';
	import type { ConsentStatus } from '$lib/utils/consent';

	interface Props {
		consentStatus: ConsentStatus;
	}

	let { consentStatus }: Props = $props();

	// Calculate days remaining in grace period (memoized value, not function)
	const daysRemaining = $derived.by(() => {
		if (!consentStatus.inGracePeriod || !consentStatus.gracePeriodEnds) return 0;
		const now = new Date();
		const end = new Date(consentStatus.gracePeriodEnds);
		const diff = end.getTime() - now.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	// Should we show the banner?
	const showBanner = $derived(consentStatus.required && !consentStatus.granted);
</script>

{#if showBanner}
	{#if consentStatus.inGracePeriod}
		<!-- Grace Period Warning -->
		<Alert.Root variant="default" class="border-amber-200 bg-amber-50">
			<Clock class="h-4 w-4 text-amber-600" />
			<Alert.Title class="text-amber-800">Période de grâce</Alert.Title>
			<Alert.Description class="text-amber-700">
				Tu as un accès complet pendant encore
				<strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>. Après cette date, ton
				accès sera limité jusqu'à ce que tes parents donnent leur consentement. Contacte ton
				enseignant pour plus d'informations.
			</Alert.Description>
		</Alert.Root>
	{:else}
		<!-- No Consent - Read-Only Mode -->
		<Alert.Root variant="destructive">
			<ShieldAlert class="h-4 w-4" />
			<Alert.Title>Accès limité</Alert.Title>
			<Alert.Description>
				Le consentement parental est requis pour utiliser toutes les fonctionnalités d'UbuMaths. Tu
				peux consulter tes cours et devoirs, mais tu ne peux pas soumettre de réponses, envoyer de
				messages ou jouer aux jeux. Contacte ton enseignant pour qu'il envoie un email à tes
				parents.
			</Alert.Description>
		</Alert.Root>
	{/if}
{/if}
