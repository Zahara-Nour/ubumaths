<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		captureError,
		captureValidationError,
		capturePerformance
	} from '$lib/utils/errorMonitoring';

	function testClientError() {
		throw new Error('Erreur de test côté client');
	}

	function testPromiseRejection() {
		Promise.reject('Promesse rejetée de test, non gérée');
	}

	function testManualCapture() {
		try {
			throw new Error('Erreur de test capturée manuellement');
		} catch (err) {
			captureError(err as Error, {
				severity: 'warning',
				context: { testData: 'Contexte de test' },
				tags: ['test', 'manual']
			});
			alert('Erreur capturée à la main (voir la console)');
		}
	}

	function testValidationError() {
		captureValidationError('email', 'Adresse e-mail obligatoire', {
			email: '',
			name: 'Utilisateur de test'
		});
		alert('Erreur de validation capturée (voir le tableau des erreurs)');
	}

	function testPerformanceIssue() {
		// Simule une opération lente
		capturePerformance('testOperation', 5000, 1000, {
			operation: 'data_processing',
			recordCount: 10000
		});
		alert('Lenteur signalée (voir le tableau des erreurs)');
	}

	async function testServerError() {
		try {
			const response = await fetch('/api/errors/test-endpoint-that-does-not-exist');
			if (!response.ok) {
				alert('Erreur serveur provoquée (voir le tableau des erreurs)');
			}
		} catch (_err) {
			alert('Erreur serveur provoquée (voir le tableau des erreurs)');
		}
	}
</script>

<svelte:head>
	<title>Surveillance des erreurs · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container mx-auto max-w-4xl py-8">
	<h1 class="mb-6 text-3xl font-bold">Essai de la surveillance des erreurs</h1>

	<div class="space-y-4">
		<Card.Root>
			<Card.Header>
				<Card.Title>Erreurs dans le navigateur</Card.Title>
				<Card.Description>Capture automatique des erreurs côté navigateur</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testClientError} variant="destructive"
					>Provoquer une erreur JavaScript</Button
				>
				<p class="text-sm text-muted-foreground">
					Lève une erreur non rattrapée, capturée automatiquement
				</p>

				<Button onclick={testPromiseRejection} variant="destructive">
					Provoquer une promesse rejetée
				</Button>
				<p class="text-sm text-muted-foreground">Crée une promesse rejetée que personne ne gère</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Capture à la main</Card.Title>
				<Card.Description>Signalement d'une erreur avec son contexte</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testManualCapture}>Capturer une erreur avec contexte</Button>
				<p class="text-sm text-muted-foreground">
					Capture une erreur avec une gravité et un contexte choisis
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Erreurs de validation</Card.Title>
				<Card.Description>Suivi des erreurs de saisie dans un formulaire</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testValidationError}>Capturer une erreur de validation</Button>
				<p class="text-sm text-muted-foreground">Capture une erreur de validation de formulaire</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Lenteurs</Card.Title>
				<Card.Description>Suivi des opérations trop lentes</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testPerformanceIssue}>Signaler une opération lente</Button>
				<p class="text-sm text-muted-foreground">
					Signale une opération lente simulée (5 000 ms pour un seuil de 1 000 ms)
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Erreurs serveur</Card.Title>
				<Card.Description>Capture des erreurs côté serveur</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testServerError}>Provoquer une erreur 404</Button>
				<p class="text-sm text-muted-foreground">
					Envoie une requête vers une adresse d'API qui n'existe pas
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-green-500">
			<Card.Header>
				<Card.Title>Voir les résultats</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="mb-4">
					Après les essais, les erreurs capturées sont dans le tableau des erreurs :
				</p>
				<Button onclick={() => (window.location.href = '/dashboard/admin/errors')}>
					Ouvrir le tableau des erreurs
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
</div>
