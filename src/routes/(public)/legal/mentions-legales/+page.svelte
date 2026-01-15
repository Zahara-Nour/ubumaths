<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Mentions Legales - UbuMaths</title>
	<meta
		name="description"
		content="Mentions legales d'UbuMaths. Informations sur l'editeur, l'hebergement et les conditions d'utilisation."
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<article class="prose max-w-none prose-slate dark:prose-invert">
		<h1>Mentions Legales</h1>

		<p class="lead text-muted-foreground">Derniere mise a jour : 15 janvier 2026</p>

		<hr />

		<section>
			<h2>1. Editeur du site</h2>
			<p>
				Le site <strong>UbuMaths</strong> accessible a l'adresse
				<a href={resolve('/')}>ubumaths.fr</a> est edite par :
			</p>
			<ul>
				<li><strong>Responsable de publication</strong> : [A COMPLETER]</li>
				<li><strong>Statut</strong> : [A COMPLETER]</li>
				<li><strong>Adresse</strong> : [A COMPLETER]</li>
				<li><strong>Email</strong> : contact@ubumaths.fr</li>
			</ul>
		</section>

		<section>
			<h2>2. Hebergement</h2>

			<h3>2.1 Hebergement de l'application</h3>
			<div class="rounded-lg border border-border p-4">
				<p class="m-0 font-semibold">Vercel Inc.</p>
				<p class="m-0 text-sm text-muted-foreground">
					340 S Lemon Ave #4133, Walnut, CA 91789, USA<br />
					<a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
				</p>
			</div>

			<h3>2.2 Hebergement des donnees</h3>
			<div class="rounded-lg border border-border p-4">
				<p class="m-0 font-semibold">Supabase Inc.</p>
				<p class="m-0 text-sm text-muted-foreground">
					970 Toa Payoh North #07-04, Singapore 318992<br />
					<a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a
					><br />
					Localisation des serveurs : <strong>Union Europeenne</strong>
				</p>
			</div>
		</section>

		<section>
			<h2>3. Propriete intellectuelle</h2>
			<p>
				L'ensemble des elements presents sur le site (textes, exercices, images, logos, code source,
				design) sont la propriete exclusive d'UbuMaths, sauf mention contraire.
			</p>
			<p>
				Toute reproduction, representation, modification ou publication du site ou de son contenu,
				par quelque procede que ce soit, est interdite sans autorisation prealable ecrite.
			</p>
		</section>

		<section>
			<h2>4. Donnees personnelles</h2>

			<h3>4.1 Responsable du traitement</h3>
			<ul>
				<li><strong>Nom</strong> : [A COMPLETER]</li>
				<li><strong>Email</strong> : contact@ubumaths.fr</li>
			</ul>

			<h3>4.2 Politique de confidentialite</h3>
			<p>
				Pour plus d'informations sur la collecte et le traitement des donnees personnelles,
				consultez notre <a href={resolve('/legal/confidentialite')}>Politique de Confidentialite</a
				>.
			</p>

			<h3>4.3 Droits des utilisateurs</h3>
			<p>Conformement au RGPD, vous disposez des droits suivants :</p>
			<ul>
				<li>Droit d'acces a vos donnees</li>
				<li>Droit de rectification</li>
				<li>Droit a l'effacement</li>
				<li>Droit a la portabilite</li>
				<li>Droit d'opposition</li>
			</ul>
			<p>Pour exercer ces droits, contactez-nous a : <strong>contact@ubumaths.fr</strong></p>

			<h3>4.4 Reclamation</h3>
			<p>En cas de difficulte, vous pouvez adresser une reclamation a la CNIL :</p>
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
			<p>Le site utilise uniquement des <strong>cookies strictement necessaires</strong> :</p>
			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Cookie</th>
							<th>Finalite</th>
							<th>Duree</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>sb-*</code></td>
							<td>Session d'authentification</td>
							<td>Session</td>
						</tr>
						<tr>
							<td><code>csrf_token</code></td>
							<td>Protection securite</td>
							<td>10 minutes</td>
						</tr>
						<tr>
							<td><code>oauth_*</code></td>
							<td>Flux d'authentification Google</td>
							<td>10 minutes</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="rounded-lg bg-muted p-4">
				Le site n'utilise <strong>aucun cookie</strong> de mesure d'audience, de publicite ou de suivi.
			</p>
		</section>

		<section>
			<h2>6. Limitation de responsabilite</h2>
			<p>
				UbuMaths s'efforce d'assurer la disponibilite du site 24h/24 et 7j/7, mais ne peut garantir
				une disponibilite permanente. Des interruptions pour maintenance peuvent survenir.
			</p>
			<p>
				Les informations presentes sur le site sont fournies a titre indicatif et pedagogique.
				UbuMaths ne saurait etre tenue responsable des erreurs ou omissions eventuelles.
			</p>
		</section>

		<section>
			<h2>7. Droit applicable</h2>
			<p>Les presentes mentions legales sont soumises au <strong>droit francais</strong>.</p>
			<p>
				En cas de litige, et apres echec de toute tentative de resolution amiable, les tribunaux
				francais seront seuls competents.
			</p>
		</section>

		<section>
			<h2>8. Contact</h2>
			<p>Pour toute question concernant ces mentions legales :</p>
			<ul>
				<li><strong>Email</strong> : contact@ubumaths.fr</li>
			</ul>
		</section>

		<section>
			<h2>9. Credits</h2>
			<h3>Technologies utilisees</h3>
			<ul>
				<li><strong>Framework</strong> : SvelteKit</li>
				<li><strong>Base de donnees</strong> : Supabase (PostgreSQL)</li>
				<li><strong>Hebergement</strong> : Vercel</li>
				<li><strong>Editeur mathematique</strong> : MathLive</li>
			</ul>
			<h3>Icones</h3>
			<p>Lucide Icons (licence MIT)</p>
		</section>

		<hr />

		<p class="text-sm text-muted-foreground">
			<em>
				Mentions legales conformes a la loi n°2004-575 du 21 juin 2004 pour la confiance dans
				l'economie numerique (LCEN).
			</em>
		</p>
	</article>
</div>
