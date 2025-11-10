<!--
	ModerationLogsTable Component
	=============================

	Displays a table of moderation actions with pagination.

	Props:
		- logs: Array of moderation log entries

	Features:
		- Table with columns: Date | Action | Cible | Raison | Modérateur
		- Color-coded badges for actions
		- French date formatting
		- Client-side pagination (20 per page)
		- Empty state
		- Responsive design
-->
<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Component Props
	interface Props {
		logs: Array<{
			id: string;
			action: string;
			target_type: string;
			target_id: string;
			reason: string | null;
			metadata: Record<string, unknown>;
			created_at: string;
			moderator?: { firstname: string; lastname: string };
		}>;
	}

	let { logs }: Props = $props();

	// Pagination state
	const ITEMS_PER_PAGE = 20;
	let currentPage = $state(1);

	/**
	 * Total number of pages
	 */
	const totalPages = $derived(Math.ceil(logs.length / ITEMS_PER_PAGE));

	/**
	 * Current page items
	 */
	const paginatedLogs = $derived(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		const end = start + ITEMS_PER_PAGE;
		return logs.slice(start, end);
	});

	/**
	 * Navigate to previous page
	 */
	function previousPage(): void {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	/**
	 * Navigate to next page
	 */
	function nextPage(): void {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	/**
	 * Get badge variant for action type
	 */
	function getActionVariant(action: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (action === 'delete_message' || action === 'ban_user') {
			return 'destructive';
		}
		if (action === 'mute_user' || action === 'timeout_user') {
			return 'secondary'; // Yellow-ish
		}
		if (action === 'unmute_user' || action === 'unban_user') {
			return 'outline'; // Will style with green text
		}
		return 'default';
	}

	/**
	 * Translate action to French
	 */
	function translateAction(action: string): string {
		const translations: Record<string, string> = {
			delete_message: 'Message supprimé',
			mute_user: 'Utilisateur muté',
			unmute_user: 'Utilisateur démuté',
			timeout_user: 'Utilisateur suspendu',
			ban_user: 'Utilisateur banni',
			unban_user: 'Utilisateur débanni',
			review_report: 'Signalement révisé',
			export_conversation: 'Conversation exportée'
		};
		return translations[action] || action;
	}

	/**
	 * Translate target type to French
	 */
	function translateTargetType(targetType: string): string {
		const translations: Record<string, string> = {
			message: 'Message',
			user: 'Utilisateur',
			conversation: 'Conversation',
			report: 'Signalement'
		};
		return translations[targetType] || targetType;
	}

	/**
	 * Format date as relative time
	 */
	function formatDate(dateString: string): string {
		try {
			return formatDistanceToNow(new Date(dateString), {
				addSuffix: true,
				locale: fr
			});
		} catch {
			return dateString;
		}
	}

	/**
	 * Get moderator name
	 */
	function getModeratorName(moderator?: { firstname: string; lastname: string }): string {
		if (!moderator) {
			return 'Inconnu';
		}
		return `${moderator.firstname} ${moderator.lastname}`.trim() || 'Inconnu';
	}
</script>

{#if logs.length === 0}
	<div
		class="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/50 p-8"
	>
		<div class="text-center">
			<p class="text-lg font-medium text-muted-foreground">
				Aucune action de modération enregistrée
			</p>
			<p class="mt-2 text-sm text-muted-foreground">Les actions de modération apparaîtront ici</p>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<!-- Table -->
		<div class="rounded-lg border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[180px]">Date</Table.Head>
						<Table.Head class="w-[200px]">Action</Table.Head>
						<Table.Head class="w-[120px]">Cible</Table.Head>
						<Table.Head>Raison</Table.Head>
						<Table.Head class="w-[150px]">Modérateur</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each paginatedLogs() as log (log.id)}
						<Table.Row>
							<Table.Cell class="text-sm text-muted-foreground">
								{formatDate(log.created_at)}
							</Table.Cell>
							<Table.Cell>
								<Badge
									variant={getActionVariant(log.action)}
									class={log.action === 'unmute_user' || log.action === 'unban_user'
										? 'border-green-500 text-green-600 dark:text-green-400'
										: ''}
								>
									{translateAction(log.action)}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-sm">
								{translateTargetType(log.target_type)}
							</Table.Cell>
							<Table.Cell class="max-w-[300px] truncate text-sm">
								{log.reason || '—'}
							</Table.Cell>
							<Table.Cell class="text-sm">
								{getModeratorName(log.moderator)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					Page {currentPage} sur {totalPages}
				</p>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={previousPage} disabled={currentPage === 1}>
						<ChevronLeft class="h-4 w-4" />
						Précédent
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={nextPage}
						disabled={currentPage === totalPages}
					>
						Suivant
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}
