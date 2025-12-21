<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Users,
		Braces,
		Copy,
		Check,
		FileText,
		Share2,
		Trash2,
		Link,
		Clock,
		Globe
	} from 'lucide-svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { Database } from '$lib/types/database';
	import type { PageData } from './$types';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import type { ExerciseShareToken } from '$lib/exercises/types';

	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	let { data }: { data: PageData } = $props();

	/**
	 * Get variation from URL, default to 'guided'.
	 * NOTE: We use `page.url` from $app/state (not a store) - it's an object with reactive properties.
	 * We read the URL once at initialization; using $derived here would cause a render loop
	 * when combined with the URL update in handleVariationChange.
	 */
	let initialVariation = page.url.searchParams.get('variation') || 'guided';

	/**
	 * Update URL when variation changes (without triggering navigation)
	 * NOTE: We use history.replaceState instead of goto() to avoid triggering
	 * SvelteKit's reactive navigation, which would cause a render loop:
	 *   $effect fires → onvariationchange → goto → $page.url updates → re-render → $effect fires...
	 */
	function handleVariationChange(label: string) {
		if (!browser) return;
		const url = new URL(window.location.href);
		url.searchParams.set('variation', label);
		history.replaceState(history.state, '', url.toString());
	}

	let submitting = $state(false);
	let jsonDialogOpen = $state(false);
	let markdownDialogOpen = $state(false);
	let copied = $state(false);

	// Share dialog state
	let shareDialogOpen = $state(false);
	let shareTokens = $state<ExerciseShareToken[]>([]);
	let loadingTokens = $state(false);
	let creatingToken = $state(false);
	let selectedExpiration = $state<string>('none');
	let copiedTokenId = $state<string | null>(null);
	let revokingTokenId = $state<string | null>(null);

	// Expiration options for token creation
	const expirationOptions = [
		{ value: 'none', label: 'Sans expiration' },
		{ value: '7', label: '7 jours' },
		{ value: '30', label: '30 jours' },
		{ value: '90', label: '90 jours' }
	];

	// Format JSON for display
	let formattedJson = $derived(JSON.stringify(data.exercise, null, 2));

	// Generic functions config for markdown rendering
	let genericFunctionsConfig = $derived.by<GenericFunctionConfig | undefined>(() => {
		const gf = data.exercise.generic_functions;
		if (!gf || gf.length === 0) return undefined;
		return { names: gf, allowDerivatives: true, allowInverse: true };
	});

	/**
	 * Copy JSON to clipboard
	 */
	async function copyJson() {
		try {
			await navigator.clipboard.writeText(formattedJson);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toaster.error('Erreur lors de la copie');
		}
	}

	/**
	 * Update exercise
	 */
	async function handleUpdate(updatedData: Partial<ExerciseInsert>) {
		submitting = true;

		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updatedData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors de la mise à jour');
			}

			toaster.success('Exercice mis à jour avec succès');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating exercise:', error);
			toaster.error(
				error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'exercice"
			);
		} finally {
			submitting = false;
		}
	}

	/**
	 * Load share tokens when dialog opens
	 */
	async function loadShareTokens() {
		loadingTokens = true;
		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}/share`);
			if (!response.ok) {
				throw new Error('Erreur lors du chargement des liens de partage');
			}
			const result = await response.json();
			shareTokens = result.tokens;
		} catch (error) {
			console.error('Error loading share tokens:', error);
			toaster.error('Erreur lors du chargement des liens de partage');
		} finally {
			loadingTokens = false;
		}
	}

	/**
	 * Create a new share token
	 */
	async function createShareToken() {
		creatingToken = true;
		try {
			const body: { expires_in_days?: number } = {};
			if (selectedExpiration !== 'none') {
				body.expires_in_days = parseInt(selectedExpiration, 10);
			}

			const response = await fetch(`/api/exercises/${data.exercise.id}/share`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors de la création du lien');
			}

			toaster.success('Lien de partage créé avec succès');
			await loadShareTokens();
		} catch (error) {
			console.error('Error creating share token:', error);
			toaster.error(
				error instanceof Error ? error.message : 'Erreur lors de la création du lien de partage'
			);
		} finally {
			creatingToken = false;
		}
	}

	/**
	 * Revoke a share token
	 */
	async function revokeShareToken(tokenId: string) {
		revokingTokenId = tokenId;
		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}/share/${tokenId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors de la révocation');
			}

			toaster.success('Lien de partage révoqué');
			await loadShareTokens();
		} catch (error) {
			console.error('Error revoking share token:', error);
			toaster.error(
				error instanceof Error ? error.message : 'Erreur lors de la révocation du lien'
			);
		} finally {
			revokingTokenId = null;
		}
	}

	/**
	 * Build share URL for a token
	 */
	function buildShareUrl(token: ExerciseShareToken): string {
		const origin = browser ? window.location.origin : '';
		const slug = data.exercise.slug || data.exercise.id;
		return `${origin}/exercice/${slug}?token=${token.token}`;
	}

	/**
	 * Copy share URL to clipboard
	 */
	async function copyShareUrl(token: ExerciseShareToken) {
		try {
			await navigator.clipboard.writeText(buildShareUrl(token));
			copiedTokenId = token.id;
			setTimeout(() => (copiedTokenId = null), 2000);
			toaster.success('Lien copié dans le presse-papiers');
		} catch {
			toaster.error('Erreur lors de la copie du lien');
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/**
	 * Check if token is expired
	 */
	function isTokenExpired(token: ExerciseShareToken): boolean {
		if (!token.expires_at) return false;
		return new Date(token.expires_at) < new Date();
	}

	/**
	 * Handle share dialog open
	 */
	function handleShareDialogOpen(open: boolean) {
		shareDialogOpen = open;
		if (open) {
			loadShareTokens();
		}
	}
</script>

<svelte:head>
	<title>Modifier {data.exercise.title || "l'exercice"} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-6 flex items-start justify-between">
		<div class="flex items-center gap-3">
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-3xl font-bold">Modifier l'exercice</h1>
					{#if data.exercise.is_public}
						<Badge variant="success" class="flex items-center gap-1">
							<Globe class="h-3 w-3" />
							Public
						</Badge>
					{/if}
				</div>
				<p class="text-muted-foreground">
					{data.exercise.title || '(Sans titre)'}
				</p>
			</div>
			<!-- Debug JSON Button -->
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (jsonDialogOpen = true)}
				title="Voir le JSON"
				class="text-muted-foreground hover:text-foreground"
			>
				<Braces class="h-5 w-5" />
			</Button>
			<!-- Debug Markdown Button -->
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (markdownDialogOpen = true)}
				title="Voir le Markdown"
				class="text-muted-foreground hover:text-foreground"
			>
				<FileText class="h-5 w-5" />
			</Button>
		</div>

		<!-- Actions section -->
		<div class="flex items-center gap-3">
			<!-- Share Button -->
			<Button variant="outline" onclick={() => handleShareDialogOpen(true)}>
				<Share2 class="mr-2 h-4 w-4" />
				Partager
			</Button>

			<!-- Assignments Quick Access -->
			{#if data.assignmentCount > 0}
				<Card.Root class="w-64">
					<Card.Content class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Users class="h-5 w-5 text-muted-foreground" />
								<div>
									<div class="text-sm font-medium">Assignations</div>
									<div class="text-xs text-muted-foreground">
										{data.assignmentCount} active{data.assignmentCount > 1 ? 's' : ''}
									</div>
								</div>
							</div>
							<Button
								size="sm"
								variant="outline"
								href="/dashboard/teacher/exercises/{data.exercise.id}/assign"
							>
								Gérer
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Button variant="outline" href="/dashboard/teacher/exercises/{data.exercise.id}/assign">
					<Users class="mr-2 h-4 w-4" />
					Assigner
				</Button>
			{/if}
		</div>
	</div>

	<ExerciseForm
		exercise={data.exercise}
		onsubmit={handleUpdate}
		{submitting}
		supabase={data.supabase}
		userId={data.user?.id}
		{initialVariation}
		onvariationchange={handleVariationChange}
	/>
</div>

<!-- JSON Debug Dialog -->
<Dialog.Root bind:open={jsonDialogOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-5xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Braces class="h-5 w-5" />
				JSON de l'exercice
			</Dialog.Title>
			<Dialog.Description class="flex items-center justify-between">
				<span>Donnees brutes importees de la base de donnees</span>
				<Button variant="outline" size="sm" onclick={copyJson}>
					{#if copied}
						<Check class="mr-1 h-4 w-4 text-green-500" />
						Copié
					{:else}
						<Copy class="mr-1 h-4 w-4" />
						Copier
					{/if}
				</Button>
			</Dialog.Description>
		</Dialog.Header>

		<CodeViewer value={formattedJson} language="json" height="60vh" label="JSON de l'exercice" />
	</Dialog.Content>
</Dialog.Root>

<!-- Markdown Debug Dialog -->
<Dialog.Root bind:open={markdownDialogOpen}>
	<Dialog.Content class="max-h-[90vh] w-[95vw] max-w-[1600px] sm:max-w-[1600px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="h-5 w-5" />
				Markdown de l'exercice
			</Dialog.Title>
			<Dialog.Description>
				Visualisation du markdown brut et rendu de l'énoncé et de la solution
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value="statement" class="w-full">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="statement">Énoncé</Tabs.Trigger>
				<Tabs.Trigger value="solution">Solution</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="statement" class="mt-4">
				<div class="grid grid-cols-2 gap-4">
					<!-- Raw Markdown -->
					<div class="flex flex-col">
						<h3 class="mb-2 text-sm font-medium text-muted-foreground">Source Markdown</h3>
						<div class="h-[50vh] overflow-hidden rounded-lg border">
							<CodeViewer
								value={data.exercise.statement_md || '(Aucun énoncé)'}
								height="100%"
								label="Énoncé markdown"
								lineWrap
							/>
						</div>
					</div>
					<!-- Rendered -->
					<div class="flex flex-col">
						<h3 class="mb-2 text-sm font-medium text-muted-foreground">Rendu</h3>
						<div class="h-[50vh] overflow-auto rounded-lg border bg-background p-4">
							{#if data.exercise.statement_md}
								<MarkdownRenderer
									content={data.exercise.statement_md}
									genericFunctions={genericFunctionsConfig}
								/>
							{:else}
								<p class="text-muted-foreground">(Aucun énoncé)</p>
							{/if}
						</div>
					</div>
				</div>
			</Tabs.Content>

			<Tabs.Content value="solution" class="mt-4">
				<div class="grid grid-cols-2 gap-4">
					<!-- Raw Markdown -->
					<div class="flex flex-col">
						<h3 class="mb-2 text-sm font-medium text-muted-foreground">Source Markdown</h3>
						<div class="h-[50vh] overflow-hidden rounded-lg border">
							<CodeViewer
								value={data.exercise.solution_md || '(Aucune solution)'}
								height="100%"
								label="Solution markdown"
								lineWrap
							/>
						</div>
					</div>
					<!-- Rendered -->
					<div class="flex flex-col">
						<h3 class="mb-2 text-sm font-medium text-muted-foreground">Rendu</h3>
						<div class="h-[50vh] overflow-auto rounded-lg border bg-background p-4">
							{#if data.exercise.solution_md}
								<MarkdownRenderer
									content={data.exercise.solution_md}
									genericFunctions={genericFunctionsConfig}
								/>
							{:else}
								<p class="text-muted-foreground">(Aucune solution)</p>
							{/if}
						</div>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<!-- Share Dialog -->
<Dialog.Root open={shareDialogOpen} onOpenChange={handleShareDialogOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-lg overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Share2 class="h-5 w-5" />
				Partager l'exercice
			</Dialog.Title>
			<Dialog.Description>
				Créez des liens de partage pour donner accès à cet exercice sans authentification.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Create token section -->
		<div class="mt-4 space-y-4">
			<div class="flex items-end gap-3">
				<div class="flex-1">
					<label for="expiration-select" class="mb-2 block text-sm font-medium"> Expiration </label>
					<MySelect
						id="expiration-select"
						type="single"
						bind:value={selectedExpiration}
						items={expirationOptions}
						triggerClass="w-full h-9 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<Button onclick={createShareToken} disabled={creatingToken}>
					{#if creatingToken}
						<Clock class="mr-2 h-4 w-4 animate-spin" />
						Création...
					{:else}
						<Link class="mr-2 h-4 w-4" />
						Créer un lien
					{/if}
				</Button>
			</div>
		</div>

		<!-- Existing tokens section -->
		{#if loadingTokens}
			<div class="mt-6 flex items-center justify-center py-8">
				<Clock class="h-5 w-5 animate-spin text-muted-foreground" />
				<span class="ml-2 text-sm text-muted-foreground">Chargement...</span>
			</div>
		{:else if shareTokens.length > 0}
			<Separator class="my-6" />
			<div class="space-y-3">
				<h3 class="text-sm font-medium">Liens existants</h3>
				<div class="space-y-2">
					{#each shareTokens as token (token.id)}
						{@const expired = isTokenExpired(token)}
						{@const inactive = !token.is_active}
						<div
							class="flex items-center justify-between rounded-lg border p-3 {expired || inactive
								? 'opacity-60'
								: ''}"
						>
							<div class="min-w-0 flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<code class="rounded bg-muted px-2 py-0.5 font-mono text-xs">
										{token.token.substring(0, 8)}...
									</code>
									{#if expired}
										<Badge variant="destructive">Expiré</Badge>
									{:else if inactive}
										<Badge variant="secondary">Révoqué</Badge>
									{:else}
										<Badge variant="success">Actif</Badge>
									{/if}
								</div>
								<div class="flex items-center gap-3 text-xs text-muted-foreground">
									<span>Créé le {formatDate(token.created_at)}</span>
									{#if token.expires_at}
										<span>Expire le {formatDate(token.expires_at)}</span>
									{/if}
									<span>{token.access_count} accès</span>
								</div>
							</div>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onclick={() => copyShareUrl(token)}
									disabled={expired || inactive}
									title="Copier le lien"
								>
									{#if copiedTokenId === token.id}
										<Check class="h-4 w-4 text-green-500" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => revokeShareToken(token.id)}
									disabled={revokingTokenId === token.id || inactive}
									title="Révoquer le lien"
									class="text-destructive hover:text-destructive"
								>
									{#if revokingTokenId === token.id}
										<Clock class="h-4 w-4 animate-spin" />
									{:else}
										<Trash2 class="h-4 w-4" />
									{/if}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mt-6 py-8 text-center text-sm text-muted-foreground">
				Aucun lien de partage créé pour cet exercice.
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
