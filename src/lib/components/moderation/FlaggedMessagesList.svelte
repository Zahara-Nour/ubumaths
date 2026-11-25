<!--
	FlaggedMessagesList
	===================

	Liste des messages marqués automatiquement par le filtre de gros mots
	(`messages.is_flagged`), pour l'onglet « Messages marqués » de la modération
	(écart T21). Lecture seule : le prof agit depuis la conversation, dans le chat.

	Un message supprimé reste listé, avec son texte (décision de David,
	2026-11-25) : supprimer une insulte ne la cache pas au prof. La mention dit
	« par la modération » seulement quand la suppression est tracée ; sinon
	« supprimé » seul, car rien ne prouve qui l'a fait.

	Le texte est celui de `plain_text`, rendu comme du texte (jamais comme du HTML).

	Props:
		- messages : messages marqués, les plus récents d'abord
		- limit : plafond de la liste côté serveur (pour dire qu'elle est tronquée)
-->
<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	export interface FlaggedMessage {
		id: string;
		conversationId: string | null;
		text: string;
		reason: string | null;
		createdAt: string | null;
		senderName: string | null;
		conversationName: string | null;
		isGroup: boolean | null;
		/** Suppression tracée par la modération, non tracée, ou `null` si non supprimé. */
		deletedBy: 'moderation' | 'untraced' | null;
	}

	interface Props {
		messages: FlaggedMessage[];
		limit: number;
	}

	let { messages, limit }: Props = $props();

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'date inconnue';
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return 'date inconnue';
		return formatDistanceToNow(date, { addSuffix: true, locale: fr });
	}

	function conversationLabel(message: FlaggedMessage): string {
		if (message.conversationName) return message.conversationName;
		if (message.isGroup === false) return 'Conversation privée';
		return 'Conversation sans nom';
	}

	function deletionLabel(deletedBy: FlaggedMessage['deletedBy']): string | null {
		if (deletedBy === 'moderation') return 'supprimé par la modération';
		if (deletedBy === 'untraced') return 'supprimé';
		return null;
	}
</script>

{#if messages.length === 0}
	<div
		class="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-muted/50 p-8"
	>
		<div class="text-center">
			<p class="text-lg font-medium text-muted-foreground">Aucun message marqué</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Les messages repérés par le filtre automatique apparaîtront ici.
			</p>
		</div>
	</div>
{:else}
	<ul class="space-y-3">
		{#each messages as message (message.id)}
			{@const deletion = deletionLabel(message.deletedBy)}
			<li class="rounded-lg border border-border p-4">
				<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
					<span>
						<span class="font-medium">{message.senderName ?? 'Auteur inconnu'}</span>
						<span class="text-muted-foreground">dans {conversationLabel(message)}</span>
					</span>
					<span class="text-muted-foreground">{formatDate(message.createdAt)}</span>
				</div>
				<p class="mt-2 text-sm break-words whitespace-pre-wrap">
					{message.text || '(message sans texte)'}
				</p>
				{#if deletion}
					<p class="mt-2 text-xs text-muted-foreground italic">Message {deletion}</p>
				{/if}
			</li>
		{/each}
	</ul>
	{#if messages.length >= limit}
		<p class="text-sm text-muted-foreground">
			Seuls les {limit} messages marqués les plus récents sont affichés.
		</p>
	{/if}
{/if}
