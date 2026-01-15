<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Politique de Confidentialite - UbuMaths</title>
	<meta
		name="description"
		content="Politique de confidentialite d'UbuMaths. Decouvrez comment nous collectons, utilisons et protegeons vos donnees personnelles."
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Politique de Confidentialite</h1>

		<p class="lead text-muted-foreground">Derniere mise a jour : 15 janvier 2026 | Version 1.0</p>

		<hr />

		<section>
			<h2>1. Identite du responsable de traitement</h2>
			<p><strong>UbuMaths</strong> est edite par :</p>
			<ul>
				<li><strong>Responsable</strong> : [A COMPLETER]</li>
				<li><strong>Adresse</strong> : [A COMPLETER]</li>
				<li><strong>Email de contact</strong> : contact@ubumaths.fr</li>
				<li><strong>Site web</strong> : <a href={resolve('/')}>ubumaths.fr</a></li>
			</ul>
		</section>

		<section>
			<h2>2. Objet du service</h2>
			<p>
				UbuMaths est une plateforme educative de mathematiques destinee aux eleves du secondaire
				(college et lycee) et a leurs enseignants. Le service permet :
			</p>
			<ul>
				<li>La realisation d'exercices de mathematiques interactifs</li>
				<li>Le suivi de la progression pedagogique</li>
				<li>La communication entre eleves et enseignants</li>
				<li>L'integration avec Google Classroom (pour les enseignants)</li>
				<li>Des fonctionnalites de gamification pour motiver l'apprentissage</li>
			</ul>
		</section>

		<section>
			<h2>3. Donnees personnelles collectees</h2>

			<h3>3.1 Donnees d'identification</h3>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Donnee</th>
							<th>Finalite</th>
							<th>Base legale</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Nom et prenom</td>
							<td>Identification de l'utilisateur</td>
							<td>Execution du contrat</td>
						</tr>
						<tr>
							<td>Adresse email</td>
							<td>Authentification et communication</td>
							<td>Execution du contrat</td>
						</tr>
						<tr>
							<td>Photo de profil (avatar)</td>
							<td>Personnalisation du compte</td>
							<td>Execution du contrat</td>
						</tr>
						<tr>
							<td>Niveau scolaire</td>
							<td>Adaptation des exercices</td>
							<td>Execution du contrat</td>
						</tr>
						<tr>
							<td>Role (eleve, enseignant)</td>
							<td>Gestion des droits d'acces</td>
							<td>Execution du contrat</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3>3.2 Donnees pedagogiques</h3>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Donnee</th>
							<th>Finalite</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Reponses aux exercices</td>
							<td>Evaluation et feedback</td>
						</tr>
						<tr>
							<td>Resultats (correct/incorrect)</td>
							<td>Suivi de la progression</td>
						</tr>
						<tr>
							<td>Temps passe par exercice</td>
							<td>Analyse pedagogique</td>
						</tr>
						<tr>
							<td>Niveau de maitrise</td>
							<td>Personnalisation du parcours</td>
						</tr>
						<tr>
							<td>Points et progression</td>
							<td>Gamification</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3>3.3 Donnees NON collectees</h3>
			<p>
				Conformement au principe de minimisation des donnees (Art. 5(1)(c) RGPD), nous ne collectons
				<strong>pas</strong> :
			</p>
			<ul>
				<li>Le genre / sexe</li>
				<li>La date de naissance precise</li>
				<li>L'adresse postale</li>
				<li>Le numero de telephone</li>
				<li>Les donnees biometriques</li>
				<li>Les donnees de sante</li>
			</ul>
		</section>

		<section>
			<h2>4. Finalites du traitement</h2>
			<p>Vos donnees sont utilisees exclusivement pour :</p>
			<ol>
				<li>
					<strong>Fourniture du service educatif</strong> : Affichage des exercices adaptes, calcul de
					la progression, delivrance des recompenses
				</li>
				<li>
					<strong>Suivi pedagogique</strong> : Permettre aux enseignants de suivre la progression de
					leurs eleves
				</li>
				<li><strong>Communication</strong> : Echanges entre eleves et enseignants</li>
				<li>
					<strong>Securite et maintenance</strong> : Detection des incidents, correction des bugs
				</li>
				<li><strong>Conformite legale</strong> : Reponse aux obligations legales</li>
			</ol>
		</section>

		<section>
			<h2>5. Protection des mineurs</h2>

			<h3>5.1 Age des utilisateurs</h3>
			<p>
				UbuMaths est destine principalement aux eleves ages de <strong>11 a 18 ans</strong>.
				Conformement a l'article 8 du RGPD et aux recommandations de la CNIL :
			</p>
			<ul>
				<li>
					<strong>Eleves de 15 ans et plus</strong> : Peuvent creer un compte de maniere autonome
				</li>
				<li><strong>Eleves de moins de 15 ans</strong> : Le consentement parental est requis</li>
			</ul>

			<h3>5.2 Mesures de protection specifiques</h3>
			<ul>
				<li>
					<strong>Minimisation</strong> : Seules les donnees strictement necessaires sont collectees
				</li>
				<li>
					<strong>Messagerie moderee</strong> : Les enseignants ont acces aux messages de leurs eleves
				</li>
				<li><strong>Pas de publicite</strong> : Aucune publicite ciblee n'est affichee</li>
				<li><strong>Pas de profilage commercial</strong> : Les donnees ne sont jamais vendues</li>
			</ul>
		</section>

		<section>
			<h2>6. Destinataires des donnees</h2>

			<h3>6.1 Acces internes</h3>
			<ul>
				<li><strong>Enseignant</strong> : Acces aux donnees de ses eleves uniquement</li>
				<li><strong>Administrateur</strong> : Acces pour maintenance et support</li>
			</ul>

			<h3>6.2 Sous-traitants</h3>
			<p>Nous faisons appel aux sous-traitants suivants :</p>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Sous-traitant</th>
							<th>Fonction</th>
							<th>Localisation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Supabase</td>
							<td>Hebergement base de donnees</td>
							<td>Union Europeenne</td>
						</tr>
						<tr>
							<td>Vercel</td>
							<td>Hebergement application</td>
							<td>USA/EU</td>
						</tr>
						<tr>
							<td>Google</td>
							<td>Authentification, Classroom</td>
							<td>USA</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="rounded-lg bg-muted p-4">
				<strong>Nous ne vendons jamais vos donnees personnelles a des tiers.</strong>
			</p>
		</section>

		<section>
			<h2>7. Duree de conservation</h2>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Type de donnees</th>
							<th>Duree</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Profil utilisateur</td>
							<td>Duree de la scolarite + 5 ans</td>
						</tr>
						<tr>
							<td>Donnees pedagogiques</td>
							<td>5 ans apres la derniere activite</td>
						</tr>
						<tr>
							<td>Messages</td>
							<td>3 ans</td>
						</tr>
						<tr>
							<td>Logs techniques</td>
							<td>90 jours</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section>
			<h2>8. Vos droits</h2>
			<p>Conformement au RGPD, vous disposez des droits suivants :</p>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit d'acces (Art. 15)</h4>
					<p class="text-sm text-muted-foreground">
						Obtenir une copie de vos donnees personnelles via Parametres > Exporter mes donnees
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit de rectification (Art. 16)</h4>
					<p class="text-sm text-muted-foreground">
						Corriger vos donnees inexactes via Parametres > Mon profil
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit a l'effacement (Art. 17)</h4>
					<p class="text-sm text-muted-foreground">
						Demander la suppression de votre compte via Parametres > Supprimer mon compte
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit a la portabilite (Art. 20)</h4>
					<p class="text-sm text-muted-foreground">
						Telecharger vos donnees en format JSON via Parametres > Exporter
					</p>
				</div>
			</div>

			<h3>Droit de reclamation</h3>
			<p>
				Si vous estimez que vos droits ne sont pas respectes, vous pouvez deposer une reclamation
				aupres de la CNIL :
			</p>
			<ul>
				<li>
					<strong>Site web</strong> :
					<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
				</li>
				<li>
					<strong>Adresse</strong> : CNIL - 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07
				</li>
			</ul>
		</section>

		<section>
			<h2>9. Securite des donnees</h2>
			<p>Nous mettons en oeuvre les mesures de securite suivantes :</p>
			<ul>
				<li>
					<strong>Chiffrement en transit</strong> : Toutes les communications sont chiffrees en HTTPS
					(TLS 1.3)
				</li>
				<li>
					<strong>Chiffrement au repos</strong> : Les donnees sensibles (tokens Google) sont chiffrees
					en AES-256-GCM
				</li>
				<li>
					<strong>Controle d'acces</strong> : Row-Level Security (RLS) sur toutes les tables de la base
					de donnees
				</li>
				<li>
					<strong>Protection CSRF</strong> : Protection contre les attaques Cross-Site Request Forgery
				</li>
				<li>
					<strong>Cookies securises</strong> : Attributs httpOnly, secure et sameSite
				</li>
			</ul>
		</section>

		<section>
			<h2>10. Cookies</h2>
			<p>UbuMaths utilise uniquement des <strong>cookies strictement necessaires</strong> :</p>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Nom</th>
							<th>Finalite</th>
							<th>Duree</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>sb-*</code></td>
							<td>Session Supabase</td>
							<td>Session</td>
						</tr>
						<tr>
							<td><code>csrf_token</code></td>
							<td>Protection CSRF</td>
							<td>10 minutes</td>
						</tr>
						<tr>
							<td><code>oauth_*</code></td>
							<td>Flux OAuth Google</td>
							<td>10 minutes</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="rounded-lg bg-muted p-4">
				<strong>UbuMaths n'utilise aucun cookie d'analyse ou de publicite.</strong>
			</p>
		</section>

		<section>
			<h2>11. Contact</h2>
			<p>Pour toute question relative a cette politique ou pour exercer vos droits :</p>
			<ul>
				<li><strong>Email</strong> : contact@ubumaths.fr</li>
			</ul>
			<p>Nous nous engageons a repondre dans un delai d'un mois conformement au RGPD.</p>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Cette politique de confidentialite est conforme au Reglement General sur la Protection des
				Donnees (RGPD - Reglement UE 2016/679) et a la loi Informatique et Libertes modifiee.
			</em>
		</p>
	</article>
</div>
