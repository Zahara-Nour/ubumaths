<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	// Props
	let { class: className }: { class?: string } = $props();
</script>

<div
	class={cn(
		'p-6 rounded-lg border-2 border-dashed border-primary bg-primary/5',
		'space-y-4',
		className
	)}
	role="region"
	aria-label="Fonctionnalités premium"
>
	<div class="flex items-start gap-3">
		<span class="text-2xl" aria-hidden="true">🎁</span>
		<div class="flex-1">
			<h3 class="font-bold text-lg mb-2">Débloquez toutes les fonctionnalités !</h3>
			<p class="text-sm text-muted-foreground mb-4">
				Créez un compte gratuit pour profiter de tous les avantages du démineur UbuMaths :
			</p>

			<ul class="space-y-2 mb-4">
				<li class="flex items-start gap-2 text-sm">
					<span class="text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true">✅</span>
					<span>Sauvegarde automatique de vos parties en cours</span>
				</li>
				<li class="flex items-start gap-2 text-sm">
					<span class="text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true">💰</span>
					<span>Gagner des gidouilles selon vos performances</span>
				</li>
				<li class="flex items-start gap-2 text-sm">
					<span class="text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true">🏆</span>
					<span>Accéder au classement mondial et défier vos amis</span>
				</li>
				<li class="flex items-start gap-2 text-sm">
					<span class="text-green-600 dark:text-green-400 mt-0.5" aria-hidden="true">📊</span>
					<span>Consulter vos statistiques détaillées et votre historique</span>
				</li>
			</ul>

			<div class="flex flex-col sm:flex-row gap-2">
				<Button asChild size="default" class="flex-1">
					<a href="/login">
						<span class="mr-2" aria-hidden="true">🚀</span>
						Se connecter
					</a>
				</Button>
				<Button asChild variant="outline" size="default" class="flex-1">
					<a href="/register">
						<span class="mr-2" aria-hidden="true">✨</span>
						Créer un compte
					</a>
				</Button>
			</div>
		</div>
	</div>
</div>
