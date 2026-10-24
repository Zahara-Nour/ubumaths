<script lang="ts">
	import { dev } from '$app/environment';

	interface Scenario {
		href: string;
		label: string;
		expected: string;
		/** Chargement complet (rendu serveur) au lieu d'une navigation côté client. */
		reload?: boolean;
	}

	interface Group {
		title: string;
		scenarios: Scenario[];
	}

	const groups: Group[] = [
		{
			title: 'Adresse inconnue (404) et suggestions',
			scenarios: [
				{
					href: '/chifrement',
					label: '/chifrement',
					expected: '« Le Cabinet Noir » (faute de frappe)'
				},
				{ href: '/royame', label: '/royame', expected: '« Le Tour du Royaume »' },
				{
					href: '/a-propo',
					label: '/a-propo',
					expected: 'Titre qui finit par « ? » : pas de « ? ? »'
				},
				{ href: '/Glossaire/', label: '/Glossaire/', expected: 'Majuscule et « / » final ignorés' },
				{ href: '/legal', label: '/legal', expected: 'Trois pages filles : « A, B ou C ? »' },
				{
					href: '/chiffrement/cesr',
					label: '/chiffrement/cesr',
					expected: 'Page parente + page proche'
				},
				{
					href: '/chiffrement/vigenère',
					label: '/chiffrement/vigenère',
					expected: 'Accent ignoré'
				},
				{
					href: '/shtam/article-inconnu',
					label: '/shtam/article-inconnu',
					expected: 'Page parente seule'
				},
				{ href: '/api/nexiste', label: '/api/nexiste', expected: 'Aucune suggestion' },
				{
					href: '/dashboard/nimporte',
					label: '/dashboard/nimporte',
					expected: 'Sans en-tête ni barre latérale : seul le bouton ramène au site'
				}
			]
		},
		{
			title: 'Message précis en titre (4xx)',
			scenarios: [
				{
					href: '/exercice/nexiste-pas',
					label: '/exercice/nexiste-pas',
					expected: 'Route réelle : « Exercice introuvable »'
				},
				{
					href: '/dev/erreurs/page/404?message=Notebook introuvable',
					label: '404 + « Notebook introuvable »',
					expected: 'Le message remplace « Page introuvable »'
				},
				{
					href: '/dev/erreurs/page/404?message=Not Found',
					label: '404 + « Not Found »',
					expected: 'Formule générique masquée : « Page introuvable »'
				}
			]
		},
		{
			title: 'Codes avec leur propre texte',
			scenarios: [
				{
					href: '/dev/erreurs/page/400',
					label: '400',
					expected: '« Demande impossible », bien formé'
				},
				{
					href: '/dev/erreurs/page/401',
					label: '401',
					expected: '« Connexion requise » + bouton Se connecter'
				},
				{ href: '/dev/erreurs/page/403', label: '403', expected: '« Accès refusé », autorisé' },
				{ href: '/dev/erreurs/page/408', label: '408', expected: '« Délai dépassé » + Réessayer' },
				{
					href: '/dev/erreurs/page/410',
					label: '410',
					expected: '« Page disparue », bail éternel'
				},
				{
					href: '/dev/erreurs/page/429',
					label: '429',
					expected: '« Trop de demandes » + Réessayer'
				},
				{
					href: '/dev/erreurs/page/500',
					label: '500',
					expected: '« Le serveur a trébuché », tient bon (6 238ᵉ décimale, hors spirale)'
				},
				{
					href: '/dev/erreurs/page/503',
					label: '503',
					expected: '« Service indisponible » + Réessayer'
				}
			]
		},
		{
			title: 'Codes rares (repli sur la famille)',
			scenarios: [
				{ href: '/dev/erreurs/page/413', label: '413', expected: 'Repli 4xx : « n’a pas abouti »' },
				{
					href: '/dev/erreurs/page/502',
					label: '502',
					expected: 'Repli 5xx : « a perdu le fil » ; 31ᵉ décimale, coloré près du bord'
				},
				{
					href: '/dev/erreurs/page/418',
					label: '418',
					expected: 'Absent de la table π : pas de phrase sur π'
				}
			]
		},
		{
			title: 'Erreurs serveur et détails techniques',
			scenarios: [
				{
					href: '/dev/erreurs/page/500?message=relation "objectives" does not exist',
					label: '500 + message brut de la base',
					expected: 'Titre inchangé, message replié sous « Détails techniques »'
				},
				...(dev
					? [
							{
								href: '/dev/erreurs/page/plantage',
								label: 'Plantage (navigation dans le site)',
								expected:
									'Exception inattendue : message + début de pile sous « Détails techniques »'
							},
							{
								href: '/dev/erreurs/page/plantage',
								label: 'Plantage (chargement complet)',
								expected: 'Rendu serveur : 500 sans pile',
								reload: true
							}
						]
					: [])
			]
		}
	];
</script>

<svelte:head>
	<title>Test de la page d'erreur | Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
	<div class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">Page d’erreur : tous les cas</h1>
		<p class="text-muted-foreground">
			Chaque lien ouvre la vraie page d’erreur, avec le vrai code HTTP. Un lien suivi depuis ici
			fait apparaître « ← Page précédente » ; ouvert dans un nouvel onglet, il ne doit pas
			apparaître.
		</p>
	</div>

	{#each groups as group (group.title)}
		<section class="flex flex-col gap-3">
			<h2 class="text-xl font-semibold">{group.title}</h2>
			<ul class="flex flex-col divide-y rounded-lg border">
				{#each group.scenarios as scenario (scenario.label)}
					<li class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
						<a
							href={scenario.href}
							data-sveltekit-reload={scenario.reload ? '' : undefined}
							class="shrink-0 font-mono font-semibold text-amber-600 underline-offset-4 hover:underline sm:w-72 dark:text-amber-400"
						>
							{scenario.label}
						</a>
						<span class="text-sm text-muted-foreground">{scenario.expected}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
