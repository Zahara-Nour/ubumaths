<!--
	ChapterTemplateIndicator
	========================

	Dit qu'un chapitre est LIÉ à un modèle (ADR 0029) : il relie le contenu du
	modèle, qui s'y corrige aussitôt. Plus de version ni de « mise à jour
	disponible » : le lien est vivant, il n'y a rien à migrer.

	Le nom du modèle mène à sa page, où le contenu se corrige. « Détacher du
	modèle » ne fait que DEMANDER : la confirmation vit dans la page, qui porte
	l'action de formulaire.

	@module components/templates/ChapterTemplateIndicator
-->
<script lang="ts">
	import type { InstantiationWithStatus } from '$lib/types/chapter-templates';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import { Link2, Unlink } from '@lucide/svelte';

	// Props
	interface Props {
		instantiation: InstantiationWithStatus | null;
		/** Le professeur demande à détacher le chapitre ; la page confirme. */
		onDetach?: () => void;
		class?: string;
	}

	let { instantiation, onDetach, class: className = '' }: Props = $props();

	// Un modèle supprimé laisse l'instanciation en place : une absence à dire.
	const isDeleted = $derived(
		instantiation !== null && (!instantiation.templateTitle || instantiation.templateId === null)
	);

	const isDetached = $derived(instantiation?.isDetached ?? false);

	/** La page du modèle, où son contenu se corrige. */
	const templateHref = $derived(
		instantiation?.templateId
			? `/dashboard/teacher/contenu/templates/${instantiation.templateId}`
			: null
	);
</script>

<!--
	⚠️ `Tooltip.Provider` est porté ICI, et pas laissé à l'appelant : sans lui,
	bits-ui jette « Context "Tooltip.Provider" not found » au montage, et c'est
	toute l'hydratation de la page hôte qui s'arrête. Un composant qui pose des
	tooltips apporte son contexte, sinon il casse la première page qui l'insère
	sans le savoir.
-->
{#if instantiation}
	<Tooltip.Provider>
		<div class={cn('flex flex-wrap items-center gap-2 text-sm', className)}>
			<Link2 class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			{#if isDeleted}
				<span class="text-muted-foreground">Le modèle de ce chapitre a été supprimé</span>
			{:else if isDetached}
				<span class="text-muted-foreground">
					Détaché du modèle « {instantiation.templateTitle} »
				</span>
			{:else}
				<span>
					Chapitre lié au modèle
					{#if templateHref}
						<a
							href={templateHref}
							class="font-medium text-primary underline-offset-4 hover:underline"
							>« {instantiation.templateTitle} »</a
						>
					{:else}
						« {instantiation.templateTitle} »
					{/if}
				</span>

				{#if onDetach}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="sm"
									onclick={onDetach}
									class="h-7 text-muted-foreground"
								>
									<Unlink class="mr-1 h-4 w-4" />
									Détacher du modèle
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Copier le contenu du modèle dans ce chapitre, qui ne le suivra plus</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			{/if}
		</div>
	</Tooltip.Provider>
{/if}
