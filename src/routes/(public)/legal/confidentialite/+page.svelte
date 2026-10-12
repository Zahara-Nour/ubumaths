<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
</script>

<SeoHead
	title="Politique de confidentialité - Chiphre"
	description="Politique de confidentialité de Chiphre : comment nous collectons, utilisons et protégeons vos données personnelles."
/>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Politique de confidentialité</h1>

		<p class="lead text-muted-foreground">Dernière mise à jour : 15 juin 2026 | Version 1.1</p>

		<hr />

		<section>
			<h2>1. Identité du responsable de traitement</h2>
			<p><strong>Chiphre</strong> est édité par :</p>
			<ul>
				<li><strong>Responsable</strong> : [À COMPLÉTER]</li>
				<li><strong>Adresse</strong> : [À COMPLÉTER]</li>
				<li><strong>Email de contact</strong> : contact@chiph.re</li>
				<li><strong>Site web</strong> : <a href={resolve('/')}>chiph.re</a></li>
			</ul>
		</section>

		<section>
			<h2>2. Objet du service</h2>
			<p>
				Chiphre est une plateforme éducative de mathématiques destinée aux élèves du secondaire
				(collège et lycée) et à leurs enseignants. Le service permet :
			</p>
			<ul>
				<li>La réalisation d'exercices de mathématiques interactifs</li>
				<li>Le suivi de la progression pédagogique</li>
				<li>La communication entre élèves et enseignants</li>
				<li>L'intégration avec Google Classroom (pour les enseignants)</li>
				<li>Des fonctionnalités de gamification pour motiver l'apprentissage</li>
			</ul>
		</section>

		<section>
			<h2>3. Données personnelles collectées</h2>

			<h3>3.1 Données d'identification</h3>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Donnée</th>
							<th>Finalité</th>
							<th>Base légale</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Nom et prénom</td>
							<td>Identification de l'utilisateur</td>
							<td>Exécution du contrat</td>
						</tr>
						<tr>
							<td>Adresse email</td>
							<td>Authentification et communication</td>
							<td>Exécution du contrat</td>
						</tr>
						<tr>
							<td>Photo de profil (avatar)</td>
							<td>Personnalisation du compte</td>
							<td>Exécution du contrat</td>
						</tr>
						<tr>
							<td>Niveau scolaire</td>
							<td>Adaptation des exercices</td>
							<td>Exécution du contrat</td>
						</tr>
						<tr>
							<td>Rôle (élève, enseignant)</td>
							<td>Gestion des droits d'accès</td>
							<td>Exécution du contrat</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3>3.2 Données pédagogiques</h3>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Donnée</th>
							<th>Finalité</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Réponses aux exercices</td>
							<td>Évaluation et feedback</td>
						</tr>
						<tr>
							<td>Résultats (correct/incorrect)</td>
							<td>Suivi de la progression</td>
						</tr>
						<tr>
							<td>Temps passé par exercice</td>
							<td>Analyse pédagogique</td>
						</tr>
						<tr>
							<td>Niveau de maîtrise</td>
							<td>Personnalisation du parcours</td>
						</tr>
						<tr>
							<td>Points et progression</td>
							<td>Gamification</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3>3.3 Données NON collectées</h3>
			<p>
				Conformément au principe de minimisation des données (Art. 5(1)(c) RGPD), nous ne collectons
				<strong>pas</strong> :
			</p>
			<ul>
				<li>Le genre / sexe</li>
				<li>La date de naissance précise</li>
				<li>L'adresse postale</li>
				<li>Le numéro de téléphone</li>
				<li>Les données biométriques</li>
				<li>Les données de santé</li>
			</ul>
		</section>

		<section>
			<h2>4. Finalités du traitement</h2>
			<p>Vos données sont utilisées exclusivement pour :</p>
			<ol>
				<li>
					<strong>Fourniture du service éducatif</strong> : Affichage des exercices adaptés, calcul de
					la progression, délivrance des récompenses
				</li>
				<li>
					<strong>Suivi pédagogique</strong> : Permettre aux enseignants de suivre la progression de leurs
					élèves
				</li>
				<li><strong>Communication</strong> : Échanges entre élèves et enseignants</li>
				<li>
					<strong>Sécurité et maintenance</strong> : Détection des incidents, correction des bugs
				</li>
				<li><strong>Conformité légale</strong> : Réponse aux obligations légales</li>
			</ol>
		</section>

		<section>
			<h2>5. Protection des mineurs</h2>

			<h3>5.1 Âge des utilisateurs</h3>
			<p>
				Chiphre est destiné principalement aux élèves âgés de <strong>11 à 18 ans</strong>.
				Conformément à l'article 8 du RGPD et aux recommandations de la CNIL :
			</p>
			<ul>
				<li>
					<strong>Élèves de 15 ans et plus</strong> : Peuvent créer un compte de manière autonome
				</li>
				<li><strong>Élèves de moins de 15 ans</strong> : Le consentement parental est requis</li>
			</ul>

			<h3>5.2 Mesures de protection spécifiques</h3>
			<ul>
				<li>
					<strong>Minimisation</strong> : Seules les données strictement nécessaires sont collectées
				</li>
				<li>
					<strong>Messagerie modérée</strong> : Les enseignants ont accès aux messages de leurs élèves
				</li>
				<li><strong>Pas de publicité</strong> : Aucune publicité ciblée n'est affichée</li>
				<li><strong>Pas de profilage commercial</strong> : Les données ne sont jamais vendues</li>
			</ul>
		</section>

		<section>
			<h2>6. Destinataires des données</h2>

			<h3>6.1 Accès internes</h3>
			<ul>
				<li><strong>Enseignant</strong> : Accès aux données de ses élèves uniquement</li>
				<li><strong>Administrateur</strong> : Accès pour maintenance et support</li>
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
							<td>Hébergement base de données</td>
							<td>Union européenne (France &ndash; Paris, eu-west-3)</td>
						</tr>
						<tr>
							<td>Vercel</td>
							<td>Hébergement application</td>
							<td>USA/EU</td>
						</tr>
						<tr>
							<td>Google</td>
							<td>Authentification, Classroom</td>
							<td>USA</td>
						</tr>
						<tr>
							<td>Brevo</td>
							<td>Envoi des e-mails (consentement parental, comptes)</td>
							<td>Union européenne (France)</td>
						</tr>
						<tr>
							<td>Groq</td>
							<td>
								Tuteur IA : messages et images saisis par l'élève, sans nom ni e-mail ajouté par
								Chiphre
							</td>
							<td>USA</td>
						</tr>
						<tr>
							<td>Hugging Face</td>
							<td>
								Recherche dans les cours pour le tuteur (quand elle est activée) : le texte de la
								question de l'élève lui est envoyé pour être converti en vecteur
							</td>
							<td>USA</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="rounded-lg bg-muted p-4">
				<strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong>
			</p>
		</section>

		<section>
			<h2>7. Durée de conservation</h2>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Type de données</th>
							<th>Durée</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Profil utilisateur (élève)</td>
							<td>Supprimé après 5 ans sans activité</td>
						</tr>
						<tr>
							<td>Données pédagogiques</td>
							<td>Supprimées avec le profil, après 5 ans sans activité</td>
						</tr>
						<tr>
							<td>Conversations avec le tuteur IA</td>
							<td>1 an après le dernier message</td>
						</tr>
						<tr>
							<td>Préinscriptions non activées</td>
							<td>1 an</td>
						</tr>
						<tr>
							<td>Messages</td>
							<td>3 ans</td>
						</tr>
						<tr>
							<td>Logs techniques</td>
							<td>30 jours</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section>
			<h2>8. Vos droits</h2>
			<p>Conformément au RGPD, vous disposez des droits suivants :</p>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit d'accès (Art. 15)</h4>
					<p class="text-sm text-muted-foreground">
						Obtenir une copie de vos données personnelles via Paramètres > Exporter mes données
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit de rectification (Art. 16)</h4>
					<p class="text-sm text-muted-foreground">
						Corriger vos données inexactes via Paramètres > Mon profil
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit à l'effacement (Art. 17)</h4>
					<p class="text-sm text-muted-foreground">
						Demander la suppression de votre compte via Paramètres > Supprimer mon compte
					</p>
				</div>

				<div class="rounded-lg border border-border p-4">
					<h4 class="font-semibold">Droit à la portabilité (Art. 20)</h4>
					<p class="text-sm text-muted-foreground">
						Télécharger vos données en format JSON via Paramètres > Exporter
					</p>
				</div>
			</div>

			<h3>Droit de réclamation</h3>
			<p>
				Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation
				auprès de la CNIL :
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
			<h2>9. Sécurité des données</h2>
			<p>Nous mettons en œuvre les mesures de sécurité suivantes :</p>
			<ul>
				<li>
					<strong>Chiffrement en transit</strong> : Toutes les communications sont chiffrées en HTTPS
					(TLS 1.3)
				</li>
				<li>
					<strong>Chiffrement au repos</strong> : Les données sensibles (tokens Google) sont chiffrées
					en AES-256-GCM
				</li>
				<li>
					<strong>Contrôle d'accès</strong> : Row-Level Security (RLS) sur toutes les tables de la base
					de données
				</li>
				<li>
					<strong>Protection CSRF</strong> : Protection contre les attaques Cross-Site Request Forgery
				</li>
				<li>
					<strong>Cookies sécurisés</strong> : Attributs httpOnly, secure et sameSite
				</li>
			</ul>
		</section>

		<section>
			<h2>10. Cookies</h2>
			<p>Chiphre utilise uniquement des <strong>cookies strictement nécessaires</strong> :</p>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Nom</th>
							<th>Finalité</th>
							<th>Durée</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>sb-*</code></td>
							<td>Session d'authentification (Supabase)</td>
							<td>Session</td>
						</tr>
						<tr>
							<td><code>google_oauth_state</code>, <code>google_code_verifier</code></td>
							<td>Sécurité du flux de connexion Google (OAuth)</td>
							<td>10 minutes</td>
						</tr>
						<tr>
							<td><code>maintenance_bypass</code></td>
							<td>Accès pendant une maintenance (administration)</td>
							<td>8 heures</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="rounded-lg bg-muted p-4">
				<strong>Chiphre n'utilise aucun cookie d'analyse ou de publicité.</strong> La mesure de
				performance (Vercel) fonctionne sans cookie. Chiphre utilise par ailleurs le
				<strong>stockage local</strong> du navigateur à des fins strictement fonctionnelles (sauvegarde
				de vos documents tableur / tableau blanc et préférences d'affichage), conservées sur votre appareil.
			</p>
		</section>

		<section>
			<h2>11. Contact</h2>
			<p>Pour toute question relative à cette politique ou pour exercer vos droits :</p>
			<ul>
				<li><strong>Email</strong> : contact@chiph.re</li>
			</ul>
			<p>Nous nous engageons à répondre dans un délai d'un mois conformément au RGPD.</p>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Cette politique de confidentialité est conforme au Règlement général sur la protection des
				Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et Libertés modifiée.
			</em>
		</p>
	</article>
</div>
