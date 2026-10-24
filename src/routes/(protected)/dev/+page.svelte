<!--
	Accueil des pages de dev (`/dev`, admin seul — garde : `reservedAreasHandle`).
	Chaque page déplacée sous `/dev` s'ajoute à `DEV_PAGES`.
-->
<script lang="ts">
	import PageIndex, { type IndexedPage } from '$lib/components/PageIndex.svelte';

	const DEV_PAGES: IndexedPage[] = [
		{
			href: '/dev/session',
			title: 'Session',
			description: 'Utilisateur, profil et jetons de la session en cours (masqués).'
		},
		{
			href: '/dev/rls',
			title: 'Policies RLS',
			description: 'Ce que lit le compte connecté, table par table.'
		},
		{
			href: '/dev/api',
			title: 'API (Swagger)',
			description: 'Documentation OpenAPI des routes de l’API.'
		},
		{
			href: '/dev/erreurs/surveillance',
			title: 'Surveillance des erreurs',
			description: 'Provoquer des erreurs pour vérifier qu’elles arrivent au tableau des erreurs.'
		},
		{
			href: '/dev/erreurs/page',
			title: 'Page d’erreur',
			description: 'Tous les cas de la page d’erreur, chacun avec ce qu’on doit y lire.'
		},
		{
			href: '/dev/avatar',
			title: 'Avatar',
			description: 'Avatar du compte connecté et ses métadonnées.'
		},
		{
			href: '/dev/roue',
			title: 'Roue',
			description: 'Le composant de roue de tirage au sort.'
		},
		{
			href: '/dev/champ-math',
			title: 'Champ de saisie MathLive',
			description: 'Le champ mathématique, ses options et ce qu’il produit.'
		},
		{
			href: '/dev/saisie-naturelle',
			title: 'Saisie naturelle',
			description: 'Prototype de saisie de Calcul, avec le panneau « sous le capot ».'
		},
		{
			href: '/dev/cadres',
			title: 'Cadres arrondis',
			description:
				'Banc de contrôle des cadres autour d’une formule, à chaque mise à jour de MathLive.'
		},
		{
			href: '/dev/polices',
			title: 'Polices des formules',
			description: 'Comparaison des polices de rendu, et PDF de démonstration du corrigé.'
		},
		{
			href: '/dev/apercu-question',
			title: 'Aperçu de question',
			description: 'La carte de base de l’aperçu d’une question.'
		},
		{
			href: '/dev/correction-generee',
			title: 'Correction générée',
			description: 'La correction produite par le générateur (mode B).'
		},
		{
			href: '/dev/pdf-typst',
			title: 'PDF Typst',
			description: 'Aperçu d’un PDF compilé par Typst.'
		},
		{
			href: '/dev/pdf-latex',
			title: 'PDF LaTeX',
			description: 'Aperçu d’un PDF compilé depuis du LaTeX.'
		},
		{
			href: '/dev/latex-vers-ubumark',
			title: 'LaTeX vers ubumark',
			description: 'Traduction d’un texte LaTeX en ubumark.'
		},
		{
			href: '/dev/carte-question',
			title: 'Carte question',
			description: 'Le composant FlashCard, ses réglages, son état et ses événements.'
		},
		{
			href: '/dev/editeur-riche',
			title: 'Éditeur riche',
			description: 'L’éditeur de texte avec formules : modes, import et export, messagerie.'
		},
		{
			href: '/dev/structure',
			title: 'Structure d’une expression',
			description: 'Survol, lecture en français et déplacement des termes ; corpus des saisies.'
		},
		{
			href: '/dev/mots-cliquables',
			title: 'Mots cliquables',
			description: 'Mots du lexique et indices, à essayer sur tablette ou téléphone.'
		},
		{
			href: '/dev/cartes',
			title: 'Cartes VIP',
			description: 'Le catalogue des cartes holographiques, et les exemples de configuration.'
		},
		{
			href: '/dev/diaporama',
			title: 'Diaporama',
			description: 'Diapositives de démonstration, en plein écran ou dans un cadre ; transitions.'
		},
		{
			href: '/dev/bancs-essai',
			title: 'Bancs d’essai',
			description: 'Champ MathLive, cartes retournables, journalisation, toasts.'
		},
		{
			href: '/dev/theme',
			title: 'Thème',
			description: 'Modes clair et sombre, palette de couleurs, composants Shadcn.'
		},
		{
			href: '/dev/blockly',
			title: 'Blockly',
			description: 'Bac à sable de programmation par blocs (pas encore ouvert aux élèves).'
		}
	];
</script>

<svelte:head>
	<title>Pages de dev · Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<PageIndex
	title="Pages de dev"
	intro="Bancs d'essai et outils de mise au point, réservés à l'administration."
	pages={DEV_PAGES}
/>
