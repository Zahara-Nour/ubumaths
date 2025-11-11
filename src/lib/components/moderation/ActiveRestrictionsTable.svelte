<!--
	ActiveRestrictionsTable Component
	=================================

	Displays a table of active user restrictions with ability to remove them.

	Props:
		- restrictions: Array of active restrictions
		- onUnrestrict: Callback when restriction is removed

	Features:
		- Table with columns: Utilisateur | Type | Portée | Raison | Expire | Actions
		- Color-coded badges for restriction types
		- Confirmation dialog before removal
		- French date formatting
		- Loading states
		- Empty state
		- Responsive design
-->
<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Component Props
	interface Props {
		restrictions: Array<{
			id: string;
			user_id: string;
			restriction_type: 'mute' | 'timeout' | 'ban';
			scope_type: 'conversation' | 'global';
			scope_id: string | null;
			reason: string;
			expires_at: string | null;
			created_at: string;
			user?: { firstname: string; lastname: string };
			conversation?: { name: string | null };
		}>;
		onUnrestrict?: (restrictionId: string) => void;
	}

	let { restrictions, onUnrestrict }: Props = $props();

	// State
	let showConfirmDialog = $state(false);
	let selectedRestriction = $state<Props['restrictions'][0] | null>(null);
	let isRemoving = $state(false);

	/**
	 * Open confirmation dialog
	 */
	function openConfirmDialog(restriction: Props['restrictions'][0]): void {
		selectedRestriction = restriction;
		showConfirmDialog = true;
	}

	/**
	 * Close confirmation dialog
	 */
	function closeConfirmDialog(): void {
		showConfirmDialog = false;
		selectedRestriction = null;
	}

	/**
	 * Remove restriction
	 */
	async function removeRestriction(): Promise<void> {
		if (!selectedRestriction) return;

		isRemoving = true;

		try {
			const response = await fetch('/api/moderation/unrestrict-user', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ restrictionId: selectedRestriction.id })
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || 'Failed to remove restriction');
			}

			toaster.success('Restriction retirée avec succès');

			// Call callback to refresh data
			if (onUnrestrict) {
				onUnrestrict(selectedRestriction.id);
			}
		} catch (error) {
			console.error('Failed to remove restriction:', error);
			toaster.error('Erreur lors du retrait de la restriction');
		} finally {
			isRemoving = false;
			selectedRestriction = null;
		}
	}

	/**
	 * Get badge variant for restriction type
	 */
	function getRestrictionVariant(
		type: 'mute' | 'timeout' | 'ban'
	): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (type === 'ban') return 'destructive';
		if (type === 'timeout') return 'default';
		if (type === 'mute') return 'secondary';
		return 'default';
	}

	/**
	 * Translate restriction type to French
	 */
	function translateRestrictionType(type: 'mute' | 'timeout' | 'ban'): string {
		const translations = {
			mute: 'Muet',
			timeout: 'Suspendu',
			ban: 'Banni'
		};
		return translations[type];
	}

	/**
	 * Get scope text
	 */
	function getScopeText(restriction: Props['restrictions'][0]): string {
		if (restriction.scope_type === 'global') {
			return 'Global';
		}
		return restriction.conversation?.name || 'Conversation';
	}

	/**
	 * Get expiration text
	 */
	function getExpirationText(expiresAt: string | null): string {
		if (!expiresAt) {
			return 'Jamais';
		}

		try {
			return formatDistanceToNow(new Date(expiresAt), {
				addSuffix: true,
				locale: fr
			});
		} catch {
			return 'Jamais';
		}
	}

	/**
	 * Get user name
	 */
	function getUserName(user?: { firstname: string; lastname: string }): string {
		if (!user) {
			return 'Utilisateur inconnu';
		}
		return `${user.firstname} ${user.lastname}`.trim() || 'Utilisateur inconnu';
	}
</script>

{#if restrictions.length === 0}
	<div
		class="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/50 p-8"
	>
		<div class="text-center">
			<p class="text-lg font-medium text-muted-foreground">Aucune restriction active</p>
			<p class="mt-2 text-sm text-muted-foreground">Les restrictions actives apparaîtront ici</p>
		</div>
	</div>
{:else}
	<div class="rounded-lg border border-border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[200px]">Utilisateur</Table.Head>
					<Table.Head class="w-[120px]">Type</Table.Head>
					<Table.Head class="w-[150px]">Portée</Table.Head>
					<Table.Head>Raison</Table.Head>
					<Table.Head class="w-[150px]">Expire</Table.Head>
					<Table.Head class="w-[100px] text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each restrictions as restriction (restriction.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							{getUserName(restriction.user)}
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getRestrictionVariant(restriction.restriction_type)}>
								{translateRestrictionType(restriction.restriction_type)}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-sm">
							{getScopeText(restriction)}
						</Table.Cell>
						<Table.Cell class="max-w-[300px] truncate text-sm">
							{restriction.reason}
						</Table.Cell>
						<Table.Cell class="text-sm text-muted-foreground">
							{getExpirationText(restriction.expires_at)}
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => openConfirmDialog(restriction)}
								class="text-destructive hover:text-destructive"
							>
								<Trash2 class="h-4 w-4" />
								<span class="sr-only">Retirer la restriction</span>
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}

<!-- Confirmation Dialog -->
<ConfirmDialog
	bind:open={showConfirmDialog}
	title="Confirmer la suppression"
	description={selectedRestriction
		? `Êtes-vous sûr de vouloir retirer cette restriction pour ${getUserName(selectedRestriction.user)} ? Cette action ne peut pas être annulée.`
		: ''}
	confirmLabel={isRemoving ? 'Retrait...' : 'Retirer'}
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={removeRestriction}
	onCancel={closeConfirmDialog}
/>
