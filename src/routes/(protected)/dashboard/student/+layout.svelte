<script lang="ts">
	/**
	 * Student Dashboard Layout (Client)
	 * ==================================
	 *
	 * Hydrates the student cache with server-loaded data for instant access.
	 * Also hydrates consent store for RGPD compliance UI.
	 *
	 * HYDRATION PROCESS:
	 * This component receives data from +layout.server.ts and populates the
	 * studentCache store. This avoids redundant API calls and ensures instant
	 * data availability for child pages.
	 *
	 * WHY AN EFFECT:
	 * - Runs when layout mounts, then when its own data is reloaded
	 * - Ensures cache is populated before child pages render
	 * - Data persists across navigation within student dashboard
	 *
	 * WORKFLOW:
	 * 1. Server (+layout.server.ts): Fetch data from database
	 * 2. Server: Pass data via layout props
	 * 3. Client (this file): Hydrate cache in an $effect
	 * 4. Child pages: Access data via studentCache getters
	 *
	 * CE QUE ÇA APPORTE :
	 * - les données hydratées ici ne sont pas redemandées par les pages filles
	 *   (les autres données restent chargées par chaque page)
	 * - accès immédiat dans les composants enfants, réactif ($state)
	 * - rechargement selon la durée de vie de chaque entrée (studentDashboardCache)
	 *
	 * CONSENT INTEGRATION (RGPD Article 8):
	 * - Consent status is passed from protected layout
	 * - ConsentBanner shows warning for students without consent
	 * - consent store enables UI disabling across child components
	 *
	 * @example
	 * // Example usage in child page
	 * import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
	 * let rewards = $derived(studentCache.getRewardsSync());
	 */

	import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
	import { consent } from '#lib/stores/consent.svelte.ts';
	import ConsentBanner from '#lib/components/ConsentBanner.svelte';
	import AgeQuestionDialog from '#lib/components/AgeQuestionDialog.svelte';
	import { refreshAll } from '$app/navigation';
	import { untrack } from 'svelte';

	// Get server data (includes consentStatus from parent protected layout)
	let { data, children } = $props();

	// Dernières données du layout versées au cache (comparées par référence, pas réactives).
	let hydratedRewards: typeof data.rewards = null;
	let hydratedBuddy: typeof data.buddy = undefined;

	// Réponse enregistrée : recharge le profil et l'état du consentement (bandeau).
	async function handleAgeAnswered() {
		await refreshAll();
		if (data.consentStatus) consent.set(data.consentStatus);
	}

	/**
	 * Hydrate cache au montage ET à chaque relecture du layout
	 *
	 * TIMING:
	 * - Runs when the layout mounts, then again when its data is reloaded
	 *   (`refreshAll()` après une action de formulaire : écart L45)
	 * - Data is available immediately for child components
	 * - No loading states needed in child pages
	 */
	$effect(() => {
		const { rewards, buddy, consentStatus } = data;
		untrack(() => {
			// Seulement des données NEUVES : `data` change aussi quand un layout parent
			// est relu, et réécrire le cache avec l'ancienne lecture effacerait les
			// mises à jour optimistes faites depuis.
			// Hydrate rewards cache (10min TTL)
			// `null` = lecture en échec : rien n'est versé, le cache garde ce qu'il a.
			if (rewards && rewards !== hydratedRewards) {
				studentCache.hydrateRewards(rewards);
				hydratedRewards = rewards;
			}

			// Hydrate buddy cache (10min TTL). Le Palotin lui-même (maison, écusson,
			// passages, quiz de choix) est montré par `PalotinPresence`, monté par le
			// layout racine (chantier `palotins`).
			// `undefined` = lecture en échec ; `null` = pas encore de Palotin (versé).
			if (buddy !== undefined && buddy !== hydratedBuddy) {
				studentCache.hydrateBuddy(buddy);
				hydratedBuddy = buddy;
			}

			// Hydrate consent store for UI disabling
			if (consentStatus) {
				consent.set(consentStatus);
			}
		});
	});
</script>

<!-- Consent Banner (shows warning for students without parental consent) -->
{#if data.consentStatus}
	<ConsentBanner consentStatus={data.consentStatus} />
{/if}

<!-- Question d'âge en 2nde : recalculée à chaque chargement du layout (profil relu en base) -->
<AgeQuestionDialog
	role={data.profile.role}
	grade={data.profile.grade}
	ageDeclaration={data.profile.age_declaration}
	consentRequired={data.profile.consent_required}
	onAnswered={handleAgeAnswered}
/>

{@render children()}
