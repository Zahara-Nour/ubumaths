<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import * as Alert from '$lib/components/ui/alert';

	let { data, form } = $props();

	let resolutionNotes = $state('');
	let isResolving = $state(false);

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'medium',
			timeStyle: 'medium'
		}).format(date);
	}

	// Get severity badge variant
	function getSeverityVariant(
		severity: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (severity) {
			case 'critical':
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'default';
		}
	}

	// Get error type display name
	function getErrorTypeName(type: string): string {
		const types: Record<string, string> = {
			client_js: 'Client JavaScript',
			server_api: 'API Serveur',
			server_load: 'Chargement Serveur',
			server_action: 'Action Serveur',
			validation: 'Validation',
			performance: 'Performance',
			database: 'Base de données'
		};
		return types[type] || type;
	}

	// Copy to clipboard
	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			alert('Copié dans le presse-papiers');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="container mx-auto py-8 max-w-6xl">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" onclick={() => goto('/dashboard/admin/errors')}>
			← Retour à la liste
		</Button>
	</div>

	{#if form?.success}
		<Alert.Root class="mb-6">
			<Alert.Title>✓ Erreur résolue</Alert.Title>
			<Alert.Description>L'erreur a été marquée comme résolue avec succès.</Alert.Description>
		</Alert.Root>
	{/if}

	{#if form?.error}
		<Alert.Root variant="destructive" class="mb-6">
			<Alert.Title>Erreur</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Error Overview -->
	<Card.Root class="mb-6">
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Détails de l'Erreur</Card.Title>
					<Card.Description>ID: {data.error.id}</Card.Description>
				</div>
				<div class="flex gap-2">
					<Badge variant={getSeverityVariant(data.error.severity)}>
						{data.error.severity}
					</Badge>
					<Badge variant="outline">{getErrorTypeName(data.error.error_type)}</Badge>
					{#if data.error.resolved}
						<Badge variant="secondary">✓ Résolu</Badge>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Error Message -->
			<div>
				<h3 class="font-semibold mb-2">Message</h3>
				<p class="text-sm bg-muted p-3 rounded">{data.error.message}</p>
			</div>

			<Separator />

			<!-- Error Details Grid -->
			<div class="grid md:grid-cols-2 gap-4">
				<div>
					<h4 class="font-medium text-sm mb-2">Informations Générales</h4>
					<dl class="space-y-2 text-sm">
						<div>
							<dt class="text-muted-foreground">Date</dt>
							<dd>{formatDate(data.error.created_at)}</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Type d'erreur</dt>
							<dd>{getErrorTypeName(data.error.error_type)}</dd>
						</div>
						{#if data.error.error_name}
							<div>
								<dt class="text-muted-foreground">Nom de l'erreur</dt>
								<dd>{data.error.error_name}</dd>
							</div>
						{/if}
					</dl>
				</div>

				<div>
					<h4 class="font-medium text-sm mb-2">Localisation</h4>
					<dl class="space-y-2 text-sm">
						<div>
							<dt class="text-muted-foreground">URL</dt>
							<dd class="break-all">{data.error.url}</dd>
						</div>
						{#if data.error.file_path}
							<div>
								<dt class="text-muted-foreground">Fichier</dt>
								<dd>
									{data.error.file_path}{#if data.error.line_number}:{data.error.line_number}{/if}{#if data.error.column_number}:{data.error.column_number}{/if}
								</dd>
							</div>
						{/if}
						{#if data.error.request_method}
							<div>
								<dt class="text-muted-foreground">Méthode</dt>
								<dd>{data.error.request_method}</dd>
							</div>
						{/if}
						{#if data.error.status_code}
							<div>
								<dt class="text-muted-foreground">Code HTTP</dt>
								<dd>{data.error.status_code}</dd>
							</div>
						{/if}
					</dl>
				</div>
			</div>

			<!-- User Context -->
			{#if data.error.user_id || data.error.user_role}
				<Separator />
				<div>
					<h4 class="font-medium text-sm mb-2">Contexte Utilisateur</h4>
					<dl class="space-y-2 text-sm">
						{#if data.error.user_id}
							<div>
								<dt class="text-muted-foreground">ID Utilisateur</dt>
								<dd class="font-mono text-xs">{data.error.user_id}</dd>
							</div>
						{/if}
						{#if data.error.user_role}
							<div>
								<dt class="text-muted-foreground">Rôle</dt>
								<dd>{data.error.user_role}</dd>
							</div>
						{/if}
						{#if data.error.session_id}
							<div>
								<dt class="text-muted-foreground">Session ID</dt>
								<dd class="font-mono text-xs">{data.error.session_id}</dd>
							</div>
						{/if}
					</dl>
				</div>
			{/if}

			<!-- Browser Context -->
			{#if data.error.browser_name || data.error.os_name}
				<Separator />
				<div>
					<h4 class="font-medium text-sm mb-2">Environnement</h4>
					<dl class="grid md:grid-cols-2 gap-2 text-sm">
						{#if data.error.browser_name}
							<div>
								<dt class="text-muted-foreground">Navigateur</dt>
								<dd>
									{data.error.browser_name}
									{#if data.error.browser_version}{data.error.browser_version}{/if}
								</dd>
							</div>
						{/if}
						{#if data.error.os_name}
							<div>
								<dt class="text-muted-foreground">Système</dt>
								<dd>{data.error.os_name}</dd>
							</div>
						{/if}
						{#if data.error.device_type}
							<div>
								<dt class="text-muted-foreground">Appareil</dt>
								<dd>{data.error.device_type}</dd>
							</div>
						{/if}
						{#if data.error.viewport_width}
							<div>
								<dt class="text-muted-foreground">Viewport</dt>
								<dd>{data.error.viewport_width}×{data.error.viewport_height}</dd>
							</div>
						{/if}
					</dl>
				</div>
			{/if}

			<!-- Performance -->
			{#if data.error.response_time}
				<Separator />
				<div>
					<h4 class="font-medium text-sm mb-2">Performance</h4>
					<dl class="space-y-2 text-sm">
						<div>
							<dt class="text-muted-foreground">Temps de réponse</dt>
							<dd>{data.error.response_time}ms</dd>
						</div>
					</dl>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Stack Trace -->
	{#if data.error.stack_trace}
		<Card.Root class="mb-6">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Stack Trace</Card.Title>
					<Button
						variant="outline"
						size="sm"
						onclick={() => copyToClipboard(data.error.stack_trace || '')}
					>
						Copier
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<pre
					class="text-xs bg-muted p-4 rounded overflow-x-auto">{data.error.stack_trace}</pre>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Additional Context -->
	{#if data.error.context}
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Contexte Additionnel</Card.Title>
			</Card.Header>
			<Card.Content>
				<pre class="text-xs bg-muted p-4 rounded overflow-x-auto">{JSON.stringify(
						data.error.context,
						null,
						2
					)}</pre>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Resolution Section -->
	{#if data.error.resolved}
		<Card.Root>
			<Card.Header>
				<Card.Title>Résolution</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<div>
					<dt class="text-sm text-muted-foreground">Résolu par</dt>
					<dd class="text-sm">{data.error.resolved_by || 'Inconnu'}</dd>
				</div>
				<div>
					<dt class="text-sm text-muted-foreground">Date de résolution</dt>
					<dd class="text-sm">{data.error.resolved_at ? formatDate(data.error.resolved_at) : 'Inconnue'}</dd>
				</div>
				{#if data.error.resolution_notes}
					<div>
						<dt class="text-sm text-muted-foreground">Notes</dt>
						<dd class="text-sm">{data.error.resolution_notes}</dd>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Marquer comme Résolu</Card.Title>
				<Card.Description>Ajouter une note et marquer cette erreur comme résolue</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/resolve" use:enhance={() => {
					isResolving = true;
					return async ({ update }) => {
						await update();
						isResolving = false;
					};
				}}>
					<div class="space-y-4">
						<div>
							<label for="notes" class="text-sm font-medium">
								Notes de résolution (optionnel)
							</label>
							<Textarea
								id="notes"
								name="notes"
								placeholder="Décrivez comment le problème a été résolu..."
								bind:value={resolutionNotes}
								rows={4}
								class="mt-2"
							/>
						</div>
						<Button type="submit" disabled={isResolving}>
							{isResolving ? 'Résolution...' : 'Marquer comme résolu'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
