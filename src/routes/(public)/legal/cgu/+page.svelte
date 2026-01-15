<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Conditions Generales d'Utilisation - UbuMaths</title>
	<meta
		name="description"
		content="Conditions Generales d'Utilisation d'UbuMaths. Regles d'utilisation de la plateforme educative de mathematiques."
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Conditions Generales d'Utilisation</h1>

		<p class="lead text-muted-foreground">Derniere mise a jour : 15 janvier 2026 | Version 1.0</p>

		<hr />

		<section>
			<h2>1. Objet</h2>
			<p>
				Les presentes Conditions Generales d'Utilisation (ci-apres "CGU") ont pour objet de definir
				les modalites et conditions d'utilisation de la plateforme <strong>UbuMaths</strong>,
				accessible a l'adresse <a href={resolve('/')}>ubumaths.fr</a>.
			</p>
			<p class="rounded-lg bg-muted p-4">
				<strong
					>L'utilisation du Service implique l'acceptation pleine et entiere des presentes CGU.</strong
				>
			</p>
		</section>

		<section>
			<h2>2. Presentation du Service</h2>
			<p>
				UbuMaths est une plateforme educative de mathematiques destinee aux eleves du secondaire
				(college et lycee) et a leurs enseignants.
			</p>

			<h3>2.1 Fonctionnalites principales</h3>
			<ul>
				<li>
					<strong>Exercices interactifs</strong> : Exercices de mathematiques adaptes au niveau scolaire
				</li>
				<li><strong>Suivi de progression</strong> : Statistiques et indicateurs de maitrise</li>
				<li><strong>Gamification</strong> : Systeme de points, recompenses et classements</li>
				<li><strong>Communication</strong> : Messagerie entre eleves et enseignants</li>
				<li><strong>Integration Google Classroom</strong> : Synchronisation des classes</li>
				<li><strong>Tableau blanc</strong> : Outil de dessin mathematique</li>
			</ul>

			<h3>2.2 Types d'utilisateurs</h3>
			<ul>
				<li>
					<strong>Eleves</strong> : Acces aux exercices, progression, messagerie avec leurs enseignants
				</li>
				<li>
					<strong>Enseignants</strong> : Gestion des classes, suivi des eleves, creation de devoirs
				</li>
			</ul>
		</section>

		<section>
			<h2>3. Acces au Service</h2>

			<h3>3.1 Inscription</h3>
			<p>
				L'acces au Service necessite la creation d'un compte utilisateur via l'authentification
				Google (OAuth 2.0).
			</p>
			<p>
				Pour les <strong>eleves de moins de 15 ans</strong>, le consentement d'un parent ou tuteur
				legal est requis conformement a l'article 8 du RGPD.
			</p>

			<h3>3.2 Conditions d'acces</h3>
			<p>L'utilisateur s'engage a :</p>
			<ul>
				<li>Fournir des informations exactes lors de l'inscription</li>
				<li>Maintenir la confidentialite de ses identifiants de connexion</li>
				<li>Ne pas partager son compte avec des tiers</li>
				<li>Signaler immediatement toute utilisation non autorisee de son compte</li>
			</ul>

			<h3>3.3 Gratuite</h3>
			<p class="rounded-lg bg-green-50 p-4 dark:bg-green-950">
				L'utilisation du Service est <strong>gratuite</strong> pour les eleves et les enseignants.
			</p>
		</section>

		<section>
			<h2>4. Obligations de l'utilisateur</h2>

			<h3>4.1 Comportement general</h3>
			<p>L'utilisateur s'engage a utiliser le Service de maniere responsable et a ne pas :</p>
			<ul>
				<li>Perturber le fonctionnement normal du Service</li>
				<li>Tenter d'acceder a des fonctionnalites ou donnees non autorisees</li>
				<li>Utiliser le Service a des fins illegales</li>
				<li>Publier des contenus injurieux, diffamatoires, obscenes ou discriminatoires</li>
				<li>Harceler d'autres utilisateurs</li>
				<li>Usurper l'identite d'un autre utilisateur</li>
			</ul>

			<h3>4.2 Contenu utilisateur</h3>
			<p>
				L'utilisateur est seul responsable des contenus qu'il publie sur le Service (messages,
				reponses aux exercices). Ces contenus doivent respecter la legislation en vigueur.
			</p>
		</section>

		<section>
			<h2>5. Propriete intellectuelle</h2>
			<p>
				L'ensemble des elements du Service (exercices, textes, images, logos, code source) sont la
				propriete exclusive d'UbuMaths et sont proteges par les lois relatives a la propriete
				intellectuelle.
			</p>
			<p>
				UbuMaths accorde a l'utilisateur une licence personnelle, non exclusive et non transferable
				pour utiliser le Service dans le cadre de son usage pedagogique.
			</p>
		</section>

		<section>
			<h2>6. Protection des donnees personnelles</h2>
			<p>
				Le traitement des donnees personnelles est decrit dans notre
				<a href={resolve('/legal/confidentialite')}>Politique de Confidentialite</a>.
			</p>
			<p>En resume :</p>
			<ul>
				<li>Seules les donnees necessaires au Service sont collectees</li>
				<li>Les donnees ne sont jamais vendues a des tiers</li>
				<li>L'utilisateur dispose de droits d'acces, rectification et suppression</li>
				<li>Des mesures de securite appropriees sont mises en oeuvre</li>
			</ul>
		</section>

		<section>
			<h2>7. Responsabilites</h2>

			<h3>7.1 Responsabilite d'UbuMaths</h3>
			<p>UbuMaths s'engage a :</p>
			<ul>
				<li>Assurer la disponibilite du Service dans la mesure du possible</li>
				<li>Mettre en oeuvre des mesures de securite appropriees</li>
				<li>Corriger les dysfonctionnements signales dans des delais raisonnables</li>
			</ul>

			<h3>7.2 Responsabilite de l'utilisateur</h3>
			<p>L'utilisateur est responsable :</p>
			<ul>
				<li>De l'utilisation qu'il fait du Service</li>
				<li>De la confidentialite de ses identifiants</li>
				<li>Des contenus qu'il publie</li>
				<li>Du respect des presentes CGU</li>
			</ul>

			<h3>7.3 Cas des mineurs</h3>
			<p>
				Pour les utilisateurs mineurs, les parents ou tuteurs legaux restent responsables de
				l'utilisation du Service par leur enfant.
			</p>
		</section>

		<section>
			<h2>8. Moderation et sanctions</h2>
			<p>
				Les enseignants ont acces aux messages de leurs eleves dans le cadre du suivi pedagogique.
				Les contenus contraires aux CGU peuvent etre supprimes sans preavis.
			</p>
			<p>En cas de non-respect des CGU, UbuMaths se reserve le droit de :</p>
			<ul>
				<li>Adresser un avertissement a l'utilisateur</li>
				<li>Suspendre temporairement l'acces au Service</li>
				<li>Supprimer definitivement le compte de l'utilisateur</li>
			</ul>
		</section>

		<section>
			<h2>9. Disponibilite du Service</h2>
			<p>
				UbuMaths peut interrompre temporairement le Service pour des operations de maintenance. Ces
				interruptions seront, dans la mesure du possible, planifiees en dehors des heures de cours.
			</p>
			<p>
				En cas d'arret definitif du Service, les utilisateurs seront informes avec un preavis
				raisonnable pour leur permettre de recuperer leurs donnees.
			</p>
		</section>

		<section>
			<h2>10. Modification des CGU</h2>
			<p>
				UbuMaths se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs
				seront informes des modifications substantielles par une notification dans l'application.
			</p>
			<p>
				La poursuite de l'utilisation du Service apres modification vaut acceptation des nouvelles
				CGU.
			</p>
		</section>

		<section>
			<h2>11. Droit applicable</h2>
			<p>Les presentes CGU sont soumises au <strong>droit francais</strong>.</p>
			<p>
				En cas de litige, les parties s'efforceront de trouver une solution amiable. A defaut, les
				tribunaux francais seront competents.
			</p>
		</section>

		<section>
			<h2>12. Contact</h2>
			<p>Pour toute question relative aux presentes CGU :</p>
			<ul>
				<li><strong>Email</strong> : contact@ubumaths.fr</li>
			</ul>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Conditions Generales d'Utilisation conformes au droit francais et au Reglement General sur
				la Protection des Donnees (RGPD).
			</em>
		</p>
	</article>
</div>
