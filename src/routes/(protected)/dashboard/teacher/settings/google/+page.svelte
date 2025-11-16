<!--
	Google Classroom Settings Page
	===============================

	Teacher interface for managing Google Classroom integration.
	Allows teachers to connect, sync, and disconnect their Google Classroom account.

	FEATURES:
	- Connection status display (connected/not connected)
	- Connect button (redirects to Google OAuth)
	- Sync button (triggers manual sync)
	- Disconnect button (with confirmation)
	- Toast notifications for user feedback
	- Loading states for all async operations
	- OAuth callback success handling

	NAVIGATION:
	- Accessible via teacher dashboard settings
	- Route: /dashboard/teacher/settings/google

	DATA FLOW:
	1. Page loads and fetches connection status
	2. User clicks "Connect" → redirects to Google OAuth
	3. After OAuth: redirects back with ?connected=true
	4. User clicks "Sync" → triggers sync via API
	5. User clicks "Disconnect" → confirms and disconnects

	SECURITY:
	- Only teachers can access this page
	- All API calls verify teacher role
	- OAuth uses CSRF protection + PKCE
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ============================================================================
	// Types
	// ============================================================================

	interface ConnectionStatus {
		connected: boolean;
		googleEmail: string | null;
		lastSync: string | null;
		connectedAt: string | null;
	}

	interface SyncResult {
		success: boolean;
		coursesSynced: number;
		courseworkSynced: number;
		errors: string[];
	}

	// ============================================================================
	// State Management
	// ============================================================================

	// Connection status from API
	let status = $state<ConnectionStatus | null>(null);

	// Loading states for async operations
	let loading = $state(false); // Connect button
	let syncing = $state(false); // Sync button
	let disconnecting = $state(false); // Disconnect button
	let fetchingStatus = $state(true); // Initial status fetch

	// ============================================================================
	// Lifecycle
	// ============================================================================

	/**
	 * Initialize page
	 * - Fetch connection status
	 * - Check for OAuth callback success message
	 */
	onMount(async () => {
		// Fetch initial status
		await fetchStatus();

		// Check if we just returned from OAuth
		if ($page.url.searchParams.get('connected') === 'true') {
			toaster.success('Google Classroom connecté avec succès');

			// Clean up URL (remove query param)
			const url = new URL($page.url);
			url.searchParams.delete('connected');
			await goto(url.pathname, { replaceState: true });
		}
	});

	// ============================================================================
	// API Functions
	// ============================================================================

	/**
	 * Fetch connection status from API
	 * Called on mount and after connect/disconnect
	 */
	async function fetchStatus() {
		fetchingStatus = true;
		try {
			const response = await fetch('/api/google/auth/status');

			if (!response.ok) {
				throw new Error('Failed to fetch status');
			}

			status = await response.json();
		} catch (error) {
			console.error('Error fetching status:', error);
			toaster.error('Erreur lors du chargement du statut');
		} finally {
			fetchingStatus = false;
		}
	}

	/**
	 * Initiate Google OAuth connection
	 * Gets authorization URL and redirects to Google
	 */
	async function handleConnect() {
		loading = true;
		try {
			const response = await fetch('/api/google/auth/connect', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to connect');
			}

			const data: { url: string } = await response.json();

			// Redirect to Google OAuth page
			window.location.href = data.url;
		} catch (error) {
			console.error('Error connecting:', error);
			toaster.error('Erreur lors de la connexion');
			loading = false;
		}
	}

	/**
	 * Trigger manual sync of Google Classroom data
	 * Syncs courses and coursework
	 */
	async function handleSync() {
		syncing = true;
		try {
			const response = await fetch('/api/google/sync', {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Sync failed');
			}

			const result: SyncResult = await response.json();

			// Show success message with counts
			if (result.errors.length > 0) {
				toaster.warning(
					`Synchronisation terminée avec ${result.errors.length} erreur(s). ` +
						`${result.coursesSynced} cours, ${result.courseworkSynced} travaux.`
				);
			} else {
				toaster.success(
					`Synchronisation terminée : ${result.coursesSynced} cours, ${result.courseworkSynced} travaux.`
				);
			}

			// Refresh status to update last sync time
			await fetchStatus();
		} catch (error) {
			console.error('Error syncing:', error);
			const message = error instanceof Error ? error.message : 'Erreur lors de la synchronisation';
			toaster.error(message);
		} finally {
			syncing = false;
		}
	}

	/**
	 * Disconnect Google Classroom integration
	 * Requires confirmation before proceeding
	 */
	async function handleDisconnect() {
		// Confirm with user
		if (!confirm('Êtes-vous sûr de vouloir déconnecter Google Classroom ?')) {
			return;
		}

		disconnecting = true;
		try {
			const response = await fetch('/api/google/auth/disconnect', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to disconnect');
			}

			toaster.success('Google Classroom déconnecté avec succès');

			// Refresh status
			await fetchStatus();
		} catch (error) {
			console.error('Error disconnecting:', error);
			toaster.error('Erreur lors de la déconnexion');
		} finally {
			disconnecting = false;
		}
	}

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Format ISO date string to French locale
	 */
	function formatDate(isoString: string | null): string {
		if (!isoString) return 'Jamais';

		const date = new Date(isoString);
		return date.toLocaleString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Format relative time (e.g., "il y a 5 minutes")
	 */
	function formatRelativeTime(isoString: string | null): string {
		if (!isoString) return 'Jamais';

		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);

		if (diffMinutes < 1) return "À l'instant";
		if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;

		const diffDays = Math.floor(diffHours / 24);
		return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
	}
</script>

<svelte:head>
	<title>Google Classroom - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-foreground">Google Classroom</h1>
		<p class="mt-2 text-muted-foreground">
			Synchronisez vos cours et travaux depuis Google Classroom
		</p>
	</div>

	<!-- Loading State -->
	{#if fetchingStatus}
		<Card.Root>
			<Card.Content class="pt-6">
				<p class="text-center text-muted-foreground">Chargement...</p>
			</Card.Content>
		</Card.Root>
	{:else if status}
		<!-- Connection Status Card -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Statut de connexion</Card.Title>
					{#if status.connected}
						<Badge variant="default" class="bg-green-600 text-white">Connecté</Badge>
					{:else}
						<Badge variant="outline">Non connecté</Badge>
					{/if}
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if status.connected}
					<!-- Connected State -->
					<div class="space-y-3">
						<div
							class="flex items-start justify-between rounded-lg border border-border bg-muted/30 p-4"
						>
							<div class="space-y-2">
								<div>
									<p class="text-sm font-medium text-muted-foreground">Compte Google</p>
									<p class="text-base font-semibold text-foreground">
										{status.googleEmail || 'Email non disponible'}
									</p>
								</div>
								<div>
									<p class="text-sm font-medium text-muted-foreground">Dernière synchronisation</p>
									<p class="text-base text-foreground">
										{formatRelativeTime(status.lastSync)}
										{#if status.lastSync}
											<span class="text-sm text-muted-foreground">
												({formatDate(status.lastSync)})
											</span>
										{/if}
									</p>
								</div>
								{#if status.connectedAt}
									<div>
										<p class="text-sm font-medium text-muted-foreground">Connecté le</p>
										<p class="text-base text-foreground">{formatDate(status.connectedAt)}</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Information Box -->
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
							<p class="font-medium">Comment ça marche ?</p>
							<ul class="mt-2 ml-5 list-disc space-y-1">
								<li>
									Vos cours Google Classroom sont synchronisés avec vos classes UbuMaths par nom
								</li>
								<li>Les travaux sont importés et peuvent être assignés aux élèves</li>
								<li>La synchronisation ne modifie jamais vos données Google Classroom</li>
							</ul>
						</div>
					</div>
				{:else}
					<!-- Not Connected State -->
					<div class="space-y-4">
						<p class="text-muted-foreground">
							Connectez votre compte Google Classroom pour synchroniser automatiquement vos cours et
							travaux avec UbuMaths.
						</p>

						<!-- Benefits List -->
						<div class="rounded-lg border border-border bg-muted/30 p-4">
							<p class="mb-3 font-medium text-foreground">Avantages de la connexion :</p>
							<ul class="ml-5 list-disc space-y-2 text-sm text-muted-foreground">
								<li>Importez vos cours Google Classroom existants</li>
								<li>Synchronisez les devoirs et exercices automatiquement</li>
								<li>Gagnez du temps en évitant la saisie manuelle</li>
								<li>Gardez vos cours à jour facilement</li>
							</ul>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Action Buttons -->
		<div class="flex flex-wrap gap-4">
			{#if status.connected}
				<!-- Sync Button -->
				<Button onclick={handleSync} disabled={syncing} size="lg">
					{#if syncing}
						<span class="flex items-center gap-2">
							<span
								class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></span>
							Synchronisation en cours...
						</span>
					{:else}
						Synchroniser maintenant
					{/if}
				</Button>

				<!-- Disconnect Button -->
				<Button onclick={handleDisconnect} disabled={disconnecting} variant="destructive" size="lg">
					{#if disconnecting}
						<span class="flex items-center gap-2">
							<span
								class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></span>
							Déconnexion...
						</span>
					{:else}
						Déconnecter
					{/if}
				</Button>
			{:else}
				<!-- Connect Button -->
				<Button onclick={handleConnect} disabled={loading} size="lg">
					{#if loading}
						<span class="flex items-center gap-2">
							<span
								class="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></span>
							Connexion...
						</span>
					{:else}
						Connecter Google Classroom
					{/if}
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="pt-6">
				<p class="text-center text-destructive">
					Erreur lors du chargement du statut. Veuillez rafraîchir la page.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
