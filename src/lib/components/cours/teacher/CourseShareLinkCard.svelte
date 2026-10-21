<!--
	CourseShareLinkCard
	===================

	Le lien du cours d'une classe, côté professeur (ADR 0025) : calque du bloc
	« Lien de consultation » du cahier de texte. Créer, copier, renouveler,
	révoquer.

	Les formulaires visent les actions `?/shareCourseLink` et
	`?/revokeCourseLink` de la page Cours d'une classe, qui prennent la classe
	dans l'adresse : le composant ne vit que là.

	@module components/cours/teacher/CourseShareLinkCard
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import QrCodeButton from '$lib/components/qr/QrCodeButton.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Check, Copy, Link2 } from '@lucide/svelte';

	interface Props {
		/** URL complète du lien actif, `null` s'il n'y en a pas. */
		shareUrl: string | null;
		expiresAt: string | null;
		accessCount: number;
	}

	let { shareUrl, expiresAt, accessCount }: Props = $props();

	let copied = $state(false);

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}
</script>

<Card.Root class="mb-6">
	<Card.Content class="space-y-3 p-4">
		<div class="flex items-center gap-2 text-sm font-medium">
			<Link2 class="h-4 w-4" />
			Lien de consultation du cours
		</div>

		{#if shareUrl}
			<p class="text-sm text-muted-foreground">
				À donner aux élèves sans compte et à leurs familles. Il permet de <strong>lire</strong> le cours
				publié — chapitres visibles, documents, fiches distribuées, objectifs, séries — rien d'autre ;
				il n'inscrit personne dans la classe. Distinct du lien du cahier de texte.
			</p>
			<!-- Les contenus sont du texte libre : c'est par eux qu'une donnée
			     personnelle pourrait sortir, et ça ne se corrige pas en SQL. -->
			<p class="text-sm text-amber-700 dark:text-amber-500">
				⚠️ Toute personne ayant ce lien lit le cours publié, sans compte et sans contrôle de qui le
				transmet. N'y nommez aucun élève.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<code class="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
					{shareUrl}
				</code>
				<Button size="sm" variant="outline" onclick={copyShareUrl}>
					{#if copied}
						<Check class="mr-2 h-4 w-4" />Copié
					{:else}
						<Copy class="mr-2 h-4 w-4" />Copier
					{/if}
				</Button>
				<QrCodeButton url={shareUrl} label="le cours" containsToken />
			</div>
			<p class="text-xs text-muted-foreground">
				{#if expiresAt}
					Expire le {new Date(expiresAt).toLocaleDateString('fr-FR')} ·
				{/if}
				consulté {accessCount} fois
			</p>
			<div class="flex flex-wrap gap-2">
				<form method="POST" action="?/shareCourseLink" use:enhance>
					<Button type="submit" size="sm" variant="ghost">Renouveler</Button>
				</form>
				<form method="POST" action="?/revokeCourseLink" use:enhance>
					<Button type="submit" size="sm" variant="ghost">Révoquer</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				Aucun lien actif. En créer un rendra le cours publié de cette classe consultable par toute
				personne ayant le lien, sans compte.
			</p>
			<form method="POST" action="?/shareCourseLink" use:enhance>
				<Button type="submit" size="sm">Créer le lien</Button>
			</form>
		{/if}
	</Card.Content>
</Card.Root>
