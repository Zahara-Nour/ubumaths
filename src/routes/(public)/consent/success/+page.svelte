<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2, ExternalLink } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Consentement accordé - UbuMaths</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-8">
	<div class="mx-auto max-w-lg">
		<!-- Logo/Header -->
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-blue-600">UbuMaths</h1>
			<p class="mt-2 text-muted-foreground">Plateforme éducative de mathématiques</p>
		</div>

		<Card class="border-green-200">
			<CardHeader>
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
				>
					<CheckCircle2 class="h-10 w-10 text-green-600" />
				</div>
				<CardTitle class="text-center text-xl text-green-700">
					Consentement accordé avec succès
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-6 text-center">
				<p class="text-muted-foreground">
					Merci ! Votre enfant peut maintenant utiliser toutes les fonctionnalités d'UbuMaths.
				</p>

				<div class="rounded-lg bg-blue-50 p-4 text-left">
					<h3 class="mb-2 font-medium">Votre enfant peut désormais :</h3>
					<ul class="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
						<li>Réaliser et soumettre des exercices</li>
						<li>Communiquer avec son enseignant</li>
						<li>Gagner des récompenses pour ses progrès</li>
						<li>Participer aux jeux éducatifs</li>
					</ul>
				</div>

				<p class="text-sm text-muted-foreground">
					Vous pouvez fermer cette page. Aucune action supplémentaire n'est requise.
				</p>

				<div class="pt-4">
					<Button variant="outline" asChild>
						<a href="/" class="inline-flex items-center gap-2">
							Découvrir UbuMaths
							<ExternalLink class="h-4 w-4" />
						</a>
					</Button>
				</div>
			</CardContent>
		</Card>

		<!-- Footer -->
		<div class="mt-8 text-center text-sm text-muted-foreground">
			<p>Des questions ? Contactez l'enseignant de votre enfant.</p>
		</div>
	</div>
</div>
