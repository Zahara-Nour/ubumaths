<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
</script>

<SeoHead
	title="Conditions générales d’utilisation - Chiphre"
	description="Conditions générales d’utilisation de Chiphre : règles d’utilisation de la plateforme éducative de mathématiques."
/>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Conditions générales d’utilisation</h1>

		<p class="lead text-muted-foreground">Dernière mise à jour : 15 janvier 2026 | Version 1.0</p>

		<hr />

		<section>
			<h2>1. Objet</h2>
			<p>
				Les présentes Conditions générales d'utilisation (ci-après "CGU") ont pour objet de définir
				les modalités et conditions d'utilisation de la plateforme <strong>Chiphre</strong>,
				accessible à l'adresse <a href={resolve('/')}>chiph.re</a>.
			</p>
			<p class="rounded-lg bg-muted p-4">
				<strong
					>L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU.</strong
				>
			</p>
		</section>

		<section>
			<h2>2. Présentation du Service</h2>
			<p>
				Chiphre est une plateforme éducative de mathématiques destinée aux élèves du secondaire
				(collège et lycée) et à leurs enseignants.
			</p>

			<h3>2.1 Fonctionnalités principales</h3>
			<ul>
				<li>
					<strong>Exercices interactifs</strong> : Exercices de mathématiques adaptés au niveau scolaire
				</li>
				<li><strong>Suivi de progression</strong> : Statistiques et indicateurs de maîtrise</li>
				<li><strong>Gamification</strong> : Système de points, récompenses et classements</li>
				<li><strong>Communication</strong> : Messagerie entre élèves et enseignants</li>
				<li><strong>Intégration Google Classroom</strong> : Synchronisation des classes</li>
				<li><strong>Tableau blanc</strong> : Outil de dessin mathématique</li>
			</ul>

			<h3>2.2 Types d'utilisateurs</h3>
			<ul>
				<li>
					<strong>Élèves</strong> : Accès aux exercices, progression, messagerie avec leurs enseignants
				</li>
				<li>
					<strong>Enseignants</strong> : Gestion des classes, suivi des élèves, création de devoirs
				</li>
			</ul>
		</section>

		<section>
			<h2>3. Accès au Service</h2>

			<h3>3.1 Inscription</h3>
			<p>
				L'accès au Service nécessite la création d'un compte utilisateur via l'authentification
				Google (OAuth 2.0).
			</p>
			<p>
				Pour les <strong>élèves de moins de 15 ans</strong>, le consentement d'un parent ou tuteur
				légal est requis conformément à l'article 8 du RGPD.
			</p>

			<h3>3.2 Conditions d'accès</h3>
			<p>L'utilisateur s'engage à :</p>
			<ul>
				<li>Fournir des informations exactes lors de l'inscription</li>
				<li>Maintenir la confidentialité de ses identifiants de connexion</li>
				<li>Ne pas partager son compte avec des tiers</li>
				<li>Signaler immédiatement toute utilisation non autorisée de son compte</li>
			</ul>

			<h3>3.3 Gratuité</h3>
			<p class="rounded-lg bg-green-50 p-4 dark:bg-green-950">
				L'utilisation du Service est <strong>gratuite</strong> pour les élèves et les enseignants.
			</p>
		</section>

		<section>
			<h2>4. Obligations de l'utilisateur</h2>

			<h3>4.1 Comportement général</h3>
			<p>L'utilisateur s'engage à utiliser le Service de manière responsable et à ne pas :</p>
			<ul>
				<li>Perturber le fonctionnement normal du Service</li>
				<li>Tenter d'accéder à des fonctionnalités ou données non autorisées</li>
				<li>Utiliser le Service à des fins illégales</li>
				<li>Publier des contenus injurieux, diffamatoires, obscènes ou discriminatoires</li>
				<li>Harceler d'autres utilisateurs</li>
				<li>Usurper l'identité d'un autre utilisateur</li>
			</ul>

			<h3>4.2 Contenu utilisateur</h3>
			<p>
				L'utilisateur est seul responsable des contenus qu'il publie sur le Service (messages,
				réponses aux exercices). Ces contenus doivent respecter la législation en vigueur.
			</p>
		</section>

		<section>
			<h2>5. Propriété intellectuelle</h2>
			<p>
				L'ensemble des éléments du Service (exercices, textes, images, logos, code source) sont la
				propriété exclusive de Chiphre et sont protégés par les lois relatives à la propriété
				intellectuelle.
			</p>
			<p>
				Chiphre accorde à l'utilisateur une licence personnelle, non exclusive et non transférable
				pour utiliser le Service dans le cadre de son usage pédagogique.
			</p>
		</section>

		<section>
			<h2>6. Protection des données personnelles</h2>
			<p>
				Le traitement des données personnelles est décrit dans notre
				<a href={resolve('/legal/confidentialite')}>Politique de confidentialité</a>.
			</p>
			<p>En résumé :</p>
			<ul>
				<li>Seules les données nécessaires au Service sont collectées</li>
				<li>Les données ne sont jamais vendues à des tiers</li>
				<li>L'utilisateur dispose de droits d'accès, rectification et suppression</li>
				<li>Des mesures de sécurité appropriées sont mises en œuvre</li>
			</ul>
		</section>

		<section>
			<h2>7. Responsabilités</h2>

			<h3>7.1 Responsabilité de Chiphre</h3>
			<p>Chiphre s'engage à :</p>
			<ul>
				<li>Assurer la disponibilité du Service dans la mesure du possible</li>
				<li>Mettre en œuvre des mesures de sécurité appropriées</li>
				<li>Corriger les dysfonctionnements signalés dans des délais raisonnables</li>
			</ul>

			<h3>7.2 Responsabilité de l'utilisateur</h3>
			<p>L'utilisateur est responsable :</p>
			<ul>
				<li>De l'utilisation qu'il fait du Service</li>
				<li>De la confidentialité de ses identifiants</li>
				<li>Des contenus qu'il publie</li>
				<li>Du respect des présentes CGU</li>
			</ul>

			<h3>7.3 Cas des mineurs</h3>
			<p>
				Pour les utilisateurs mineurs, les parents ou tuteurs légaux restent responsables de
				l'utilisation du Service par leur enfant.
			</p>
		</section>

		<section>
			<h2>8. Modération et sanctions</h2>
			<p>
				Les enseignants ont accès aux messages de leurs élèves dans le cadre du suivi pédagogique.
				Les contenus contraires aux CGU peuvent être supprimés sans préavis.
			</p>
			<p>En cas de non-respect des CGU, Chiphre se réserve le droit de :</p>
			<ul>
				<li>Adresser un avertissement à l'utilisateur</li>
				<li>Suspendre temporairement l'accès au Service</li>
				<li>Supprimer définitivement le compte de l'utilisateur</li>
			</ul>
		</section>

		<section>
			<h2>9. Disponibilité du Service</h2>
			<p>
				Chiphre peut interrompre temporairement le Service pour des opérations de maintenance. Ces
				interruptions seront, dans la mesure du possible, planifiées en dehors des heures de cours.
			</p>
			<p>
				En cas d'arrêt définitif du Service, les utilisateurs seront informés avec un préavis
				raisonnable pour leur permettre de récupérer leurs données.
			</p>
		</section>

		<section>
			<h2>10. Modification des CGU</h2>
			<p>
				Chiphre se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
				seront informés des modifications substantielles par une notification dans l'application.
			</p>
			<p>
				La poursuite de l'utilisation du Service après modification vaut acceptation des nouvelles
				CGU.
			</p>
		</section>

		<section>
			<h2>11. Droit applicable</h2>
			<p>Les présentes CGU sont soumises au <strong>droit français</strong>.</p>
			<p>
				En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les
				tribunaux français seront compétents.
			</p>
		</section>

		<section>
			<h2>12. Contact</h2>
			<p>Pour toute question relative aux présentes CGU :</p>
			<ul>
				<li><strong>Email</strong> : contact@chiph.re</li>
			</ul>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Conditions générales d'utilisation conformes au droit français et au Règlement général sur
				la protection des données (RGPD).
			</em>
		</p>
	</article>
</div>
