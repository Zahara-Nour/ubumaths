<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
</script>

<SeoHead
	title="Mentions légales - Chiphre"
	description="Mentions légales de Chiphre : informations sur l’éditeur, l’hébergement et les conditions d’utilisation."
/>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Mentions légales</h1>

		<p class="lead text-muted-foreground">Dernière mise à jour : 15 juin 2026</p>

		<hr />

		<section>
			<h2>1. Éditeur du site</h2>
			<p>
				Le site <strong>Chiphre</strong> accessible à l'adresse
				<a href={resolve('/')}>chiph.re</a> est édité par :
			</p>
			<ul>
				<li><strong>Responsable de publication</strong> : [À COMPLÉTER]</li>
				<li><strong>Statut</strong> : [À COMPLÉTER]</li>
				<li><strong>Adresse</strong> : [À COMPLÉTER]</li>
				<li><strong>Email</strong> : contact@chiph.re</li>
			</ul>
		</section>

		<section>
			<h2>2. Hébergement</h2>

			<h3>2.1 Hébergement de l'application</h3>
			<div class="rounded-lg border border-border p-4">
				<p class="m-0 font-semibold">Vercel Inc.</p>
				<p class="m-0 text-sm text-muted-foreground">
					340 S Lemon Ave #4133, Walnut, CA 91789, USA<br />
					<a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
				</p>
			</div>

			<h3>2.2 Hébergement des données</h3>
			<div class="rounded-lg border border-border p-4">
				<p class="m-0 font-semibold">Supabase Inc.</p>
				<p class="m-0 text-sm text-muted-foreground">
					970 Toa Payoh North #07-04, Singapore 318992<br />
					<a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a
					><br />
					Localisation des serveurs :
					<strong>Union européenne (France &ndash; Paris, eu-west-3)</strong>
				</p>
			</div>
		</section>

		<section>
			<h2>3. Propriété intellectuelle</h2>
			<p>
				L'ensemble des éléments présents sur le site (textes, exercices, images, logos, code source,
				design) sont la propriété exclusive de Chiphre, sauf mention contraire.
			</p>
			<p>
				Toute reproduction, représentation, modification ou publication du site ou de son contenu,
				par quelque procédé que ce soit, est interdite sans autorisation préalable écrite.
			</p>
		</section>

		<section>
			<h2>4. Données personnelles</h2>

			<h3>4.1 Responsable du traitement</h3>
			<ul>
				<li><strong>Nom</strong> : [À COMPLÉTER]</li>
				<li><strong>Email</strong> : contact@chiph.re</li>
			</ul>

			<h3>4.2 Politique de confidentialité</h3>
			<p>
				Pour plus d'informations sur la collecte et le traitement des données personnelles,
				consultez notre <a href={resolve('/legal/confidentialite')}>Politique de confidentialité</a
				>.
			</p>

			<h3>4.3 Droits des utilisateurs</h3>
			<p>Conformément au RGPD, vous disposez des droits suivants :</p>
			<ul>
				<li>Droit d'accès à vos données</li>
				<li>Droit de rectification</li>
				<li>Droit à l'effacement</li>
				<li>Droit à la portabilité</li>
				<li>Droit d'opposition</li>
			</ul>
			<p>Pour exercer ces droits, contactez-nous à : <strong>contact@chiph.re</strong></p>

			<h3>4.4 Réclamation</h3>
			<p>En cas de difficulté, vous pouvez adresser une réclamation à la CNIL :</p>
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
			<h2>5. Cookies</h2>
			<p>Le site utilise uniquement des <strong>cookies strictement nécessaires</strong> :</p>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Cookie</th>
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
				Le site n'utilise <strong>aucun cookie</strong> de mesure d'audience, de publicité ou de
				suivi. La mesure de performance (Vercel) fonctionne <strong>sans cookie</strong>. Chiphre
				utilise par ailleurs le <strong>stockage local</strong> du navigateur à des fins strictement fonctionnelles
				(sauvegarde de vos documents tableur / tableau blanc et préférences d'affichage) ; ces données
				restent sur votre appareil.
			</p>
		</section>

		<section>
			<h2>6. Limitation de responsabilité</h2>
			<p>
				Chiphre s'efforce d'assurer la disponibilité du site 24h/24 et 7j/7, mais ne peut garantir
				une disponibilité permanente. Des interruptions pour maintenance peuvent survenir.
			</p>
			<p>
				Les informations présentes sur le site sont fournies à titre indicatif et pédagogique.
				Chiphre ne saurait être tenue responsable des erreurs ou omissions éventuelles.
			</p>
		</section>

		<section>
			<h2>7. Droit applicable</h2>
			<p>Les présentes mentions légales sont soumises au <strong>droit français</strong>.</p>
			<p>
				En cas de litige, et après échec de toute tentative de résolution amiable, les tribunaux
				français seront seuls compétents.
			</p>
		</section>

		<section>
			<h2>8. Contact</h2>
			<p>Pour toute question concernant ces mentions légales :</p>
			<ul>
				<li><strong>Email</strong> : contact@chiph.re</li>
			</ul>
		</section>

		<section>
			<h2>9. Crédits</h2>
			<h3>Technologies utilisées</h3>
			<ul>
				<li><strong>Framework</strong> : SvelteKit</li>
				<li><strong>Base de données</strong> : Supabase (PostgreSQL)</li>
				<li><strong>Hébergement</strong> : Vercel</li>
				<li><strong>Éditeur mathématique</strong> : MathLive</li>
			</ul>
			<h3>Icônes</h3>
			<p>Lucide Icons (licence MIT)</p>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Mentions légales conformes à la loi n°2004-575 du 21 juin 2004 pour la confiance dans
				l'économie numérique (LCEN).
			</em>
		</p>
	</article>
</div>
