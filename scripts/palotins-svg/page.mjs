// Monte la page de comparaison à partir de styles.json
import { readFileSync, writeFileSync } from 'node:fs';

const { result, meta, palotins, affirme } = JSON.parse(
	readFileSync(new URL('./styles.json', import.meta.url), 'utf8')
);
const ORDER = ['giron', 'pile', 'cotice'];
const LETTRES = { pantins: 'A', affiche: 'B', blason: 'C', gravure: 'D' };

// Les ids internes des SVG doivent rester uniques : chaque SVG est inséré plusieurs fois (grand, 64 px, 40 px)
const withSuffix = (svg, suffix) =>
	svg
		.replace(/id="([^"]+)"/g, `id="$1-${suffix}"`)
		.replace(/url\(#([^)]+)\)/g, `url(#$1-${suffix})`);

const sections = Object.keys(meta)
	.map((sk) => {
		const m = meta[sk];
		const grands = ORDER.map(
			(pk) => `<figure class="perso">
				<div class="portrait">${withSuffix(result[sk][pk], 'g')}</div>
				<figcaption><strong>${palotins[pk].nom}</strong><span>${palotins[pk].trait}</span></figcaption>
			</figure>`
		).join('');
		const petits = ORDER.map(
			(pk) => `<span class="mini m64">${withSuffix(result[sk][pk], 'm')}</span>`
		).join('');
		const tout = ORDER.map(
			(pk) => `<span class="mini m40">${withSuffix(result[sk][pk], 's')}</span>`
		).join('');
		return `<section class="style" id="style-${LETTRES[sk].toLowerCase()}">
			<header class="style-tete">
				<span class="lettre">${LETTRES[sk]}</span>
				<div>
					<h2>${m.titre}</h2>
					<p class="pitch">${m.pitch}</p>
				</div>
			</header>
			<div class="trio">${grands}</div>
			<div class="pied">
				<div class="tailles">
					<span class="etiquette">Dans l'appli : rond, 100 px (panneau) et 60 px (widget)</span>
					<div class="rangee">${petits}<span class="sep"></span>${tout}</div>
				</div>
				<dl class="bilan">
					<div><dt>Pour</dt><dd>${m.plus}</dd></div>
					<div><dt>Contre</dt><dd>${m.moins}</dd></div>
				</dl>
			</div>
		</section>`;
	})
	.join('');

const EXPR = [
	['neutral', 'Neutre', 'au repos, quiz de choix'],
	['happy', 'Content', 'bonne réponse, gain de fin de séance'],
	['sad', 'Triste', 'erreur, Constance perdue'],
	['thinking', 'Pensif', 'anecdotes du lore, thèmes'],
	['excited', 'Excité', 'Constance tenue, tour de panse, carte rare'],
	['encouraging', 'Encourageant', 'accueil, changement de Palotin']
];
const dataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const grille = `<section class="style retenu" id="expressions">
	<header class="style-tete">
		<span class="lettre">6×3</span>
		<div>
			<h2>Les six expressions, animées</h2>
			<p class="pitch">Les 18 fichiers qui remplaceront <code>static/images/buddies/</code>, avec l'animation au repos et recadrés en rond comme dans l'appli. Les gestes suivent l'humeur : Giron ne lève le pouce que s'il est content, excité ou encourageant, et met la main au menton quand il réfléchit ; Pile laisse tomber sa carte quand il est triste et la brandit quand il est excité ; Cotice ferme son livre quand il est triste et le lit quand il réfléchit.</p>
		</div>
	</header>
	<div class="grille-scroll"><table class="grille">
		<thead><tr><th></th>${EXPR.map(([, nom, quand]) => `<th><strong>${nom}</strong><span>${quand}</span></th>`).join('')}</tr></thead>
		<tbody>${ORDER.map((pk) => `<tr><th scope="row">${palotins[pk].nom}</th>${EXPR.map(([e]) => `<td><span class="vivant cellule"><img src="${dataUri(result.expressions[pk][e])}" alt="${palotins[pk].nom}, ${e}"></span></td>`).join('')}</tr>`).join('')}</tbody>
	</table></div>
	<div class="demo-boutons">
		<button type="button" id="btn-bond-x" data-reaction="bond" data-cible="#expressions">Bonne réponse</button>
		<button type="button" id="btn-tressaut-x" data-reaction="tressaut" data-cible="#expressions">Tour de panse gagné</button>
		<button type="button" id="btn-affaisse-x" data-reaction="affaisse" data-cible="#expressions">Erreur</button>
	</div>
</section>`;

const demo = `<section class="style retenu" id="demo">
	<header class="style-tete">
		<span class="lettre">▶</span>
		<div>
			<h2>Démo : les Palotins vivants</h2>
			<p class="pitch"><strong>Au repos</strong> (animation rangée dans le fichier SVG, affiché ici dans une simple image comme dans l'appli) : respiration, clignement des yeux, chapeau qui balance, et un geste propre à chacun : Giron agite son pouce et hausse les sourcils, Pile fait danser sa carte, la plume de Cotice frémit et son livre se soulève. Chacun a son rythme, pour qu'ils ne bougent jamais ensemble.</p>
			<p class="pitch"><strong>Réactions</strong> (dans le composant de l'appli, sans toucher aux dessins) : essaie les boutons.</p>
		</div>
	</header>
	<div class="demo-scene">${ORDER.map((pk) => `<figure class="perso demo-perso"><div class="vivant"><img src="${dataUri(result.anime[pk])}" alt="${palotins[pk].nom}, animé"></div><figcaption><strong>${palotins[pk].nom}</strong></figcaption></figure>`).join('')}</div>
	<div class="demo-boutons">
		<button type="button" id="btn-bond" data-reaction="bond">Bonne réponse</button>
		<button type="button" id="btn-tressaut" data-reaction="tressaut">Tour de panse gagné</button>
		<button type="button" id="btn-affaisse" data-reaction="affaisse">Erreur</button>
	</div>
	<div class="tailles">
		<span class="etiquette">Taille réelle : 100 px et 60 px</span>
		<div class="rangee">${ORDER.map((pk) => `<span class="mini m64 vivant"><img src="${dataUri(result.anime[pk])}" alt=""></span>`).join('')}<span class="sep"></span>${ORDER.map((pk) => `<span class="mini m40 vivant"><img src="${dataUri(result.anime[pk])}" alt=""></span>`).join('')}</div>
	</div>
	<p class="pitch">Les élèves qui ont réglé leur appareil sur « réduire les animations » les voient immobiles.</p>
</section>`;

const retenu = `<section class="style retenu" id="retenu">
	<header class="style-tete">
		<span class="lettre">B+</span>
		<div>
			<h2>Retenu : l'affiche, avec la pièce héraldique portée</h2>
			<p class="pitch" hidden><strong>Affermi le 21 octobre :</strong> tête plus petite et plus longue, mâchoire et cou marqués, yeux en amande avec paupières, sourcils effilés, nez dessinés, plis du sourire, ombre franche sur un côté du visage à la place des joues roses. Giron a la mâchoire carrée et des favoris ; Pile un visage long, un bouc et une moustache en croc ; Cotice un nœud papillon et une plume d'oie derrière l'oreille.</p>
			<p class="pitch">Le style B, plus la pièce de chaque Palotin sur son vêtement, prise au blason (C) : un écusson gironné d'or et de sable pour Giron, une pile d'or en plastron pour Pile, une cotice d'or en écharpe pour Cotice. Mains revues : Giron fait un vrai pouce en l'air (pouce au bord du poing, doigts repliés de côté), Pile pose le pouce sur sa carte, Cotice tient un livre ouvert au lieu de lever le doigt. Les mains sont rentrées vers le centre pour le cadre rond. Traits affinés d'environ 40 %.</p>
		</div>
	</header>
	<div class="trio">${ORDER.map((pk) => `<figure class="perso"><div class="portrait rond">${withSuffix(result.affiche[pk], 'r')}</div><figcaption><strong>${palotins[pk].nom}</strong><span>${palotins[pk].trait}</span></figcaption></figure>`).join('')}</div>
	<div class="tailles">
		<span class="etiquette">Dans l'appli : rond, 100 px (panneau) et 60 px (widget)</span>
		<div class="rangee">${ORDER.map((pk) => `<span class="mini m64">${withSuffix(result.affiche[pk], 'rm')}</span>`).join('')}<span class="sep"></span>${ORDER.map((pk) => `<span class="mini m40">${withSuffix(result.affiche[pk], 'rs')}</span>`).join('')}</div>
	</div>
	<div class="tailles">
		<span class="etiquette">Essai « affermi », écarté par David le 21 octobre</span>
		<div class="rangee">${ORDER.map((pk) => `<span class="mini m64">${withSuffix(affirme[pk], 'av')}</span>`).join('')}</div>
	</div>
	<p class="pitch">Étape suivante : dessiner les six expressions de chacun (neutre, content, triste, pensif, excité, encourageant) dans ce style.</p>
</section>
<h2 class="archives">Les quatre esquisses de départ</h2>`;

const html = `<title>Palotins, quatre styles</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600&display=swap">
<style>
/* Mise en page : une planche par style, les trois Palotins côte à côte, puis l'essai en petit et le bilan */
:root {
	--bg: hsl(40, 30%, 94%);
	--surface: hsl(40, 35%, 98%);
	--fg: hsl(220, 30%, 15%);
	--muted: hsl(220, 12%, 40%);
	--rule: hsl(38, 22%, 82%);
	--accent: hsl(140, 65%, 30%);
	--or: hsl(45, 85%, 45%);
	--display: 'Lora', Georgia, 'Times New Roman', serif;
	--body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--bg: hsl(222, 22%, 11%); --surface: hsl(222, 20%, 15%); --fg: hsl(40, 25%, 90%);
		--muted: hsl(220, 10%, 68%); --rule: hsl(222, 14%, 26%); --accent: hsl(140, 50%, 55%); --or: hsl(45, 85%, 60%);
		color-scheme: dark;
	}
}
:root[data-theme="dark"] {
	--bg: hsl(222, 22%, 11%); --surface: hsl(222, 20%, 15%); --fg: hsl(40, 25%, 90%);
	--muted: hsl(220, 10%, 68%); --rule: hsl(222, 14%, 26%); --accent: hsl(140, 50%, 55%); --or: hsl(45, 85%, 60%);
	color-scheme: dark;
}
* { box-sizing: border-box; }
body {
	background: var(--bg); color: var(--fg); font-family: var(--body); font-size: 15px; line-height: 1.55;
	padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
	padding-block: 40px 64px;
}
.page { max-width: 1040px; margin: 0 auto; display: grid; gap: 56px; }
.intro { display: grid; gap: 14px; max-width: 68ch; }
.eyebrow { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
h1 { font-family: var(--display); font-weight: 700; font-size: clamp(30px, 5vw, 44px); line-height: 1.1; margin: 0; text-wrap: balance; }
.intro p { margin: 0; color: var(--muted); }
.intro p strong { color: var(--fg); font-weight: 600; }
.regles { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 0; padding: 0; list-style: none; }
.regles li { font-size: 13px; padding: 4px 10px; border: 1px solid var(--rule); border-radius: 999px; background: var(--surface); }

.style { display: grid; gap: 22px; padding-top: 28px; border-top: 1px solid var(--rule); }
.style-tete { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: start; }
.lettre { font-family: var(--display); font-size: 44px; line-height: .9; color: var(--or); font-weight: 700; }
h2 { font-family: var(--display); font-size: 26px; margin: 0 0 6px; font-weight: 700; text-wrap: balance; }
.pitch { margin: 0; max-width: 70ch; color: var(--muted); }

.trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.perso { margin: 0; display: grid; gap: 10px; }
.portrait { aspect-ratio: 1; max-width: 100%; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 0 var(--rule), 0 8px 24px -16px hsl(220 30% 10% / .45); }
.portrait svg, .mini svg { display: block; width: 100%; height: 100%; }
figcaption { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
figcaption strong { font-family: var(--display); font-size: 18px; }
figcaption span { font-size: 13px; color: var(--muted); }

.pied { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 24px; align-items: start; }
.tailles { display: grid; gap: 10px; }
.etiquette { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
.rangee { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.mini { display: inline-block; border-radius: 50%; overflow: hidden; flex: none; box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--rule); }
.m64 { width: 100px; height: 100px; }
.m40 { width: 60px; height: 60px; }
.sep { width: 1px; height: 60px; background: var(--rule); margin: 0 4px; }
.bilan { margin: 0; display: grid; gap: 10px; }
.bilan div { display: grid; grid-template-columns: 64px 1fr; gap: 10px; }
.bilan dt { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; padding-top: 2px; }
.bilan div:first-child dt { color: var(--accent); }
.bilan div:last-child dt { color: var(--muted); }
.bilan dd { margin: 0; }

.grille-scroll { overflow-x: auto; }
.grille { border-collapse: separate; border-spacing: 8px; min-width: 640px; }
.grille thead th { font-weight: 400; text-align: center; vertical-align: bottom; font-size: 12px; color: var(--muted); line-height: 1.3; padding-bottom: 4px; }
.grille thead th strong { display: block; font-family: var(--display); font-size: 15px; color: var(--fg); }
.grille tbody th { font-family: var(--display); font-size: 16px; text-align: left; padding-right: 6px; }
.grille td { padding: 0; }
.cellule { width: 100%; max-width: 110px; margin: 0 auto; }
code { font-size: .92em; }
.demo-scene { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; justify-items: center; }
.demo-perso { width: 100%; max-width: 220px; }
.vivant { display: block; aspect-ratio: 1; max-width: 100%; border-radius: 50%; overflow: hidden; }
.vivant img { display: block; width: 100%; height: 100%; }
.demo-boutons { display: flex; flex-wrap: wrap; gap: 10px; }
.demo-boutons button { font: inherit; font-weight: 500; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--rule); background: var(--surface); color: var(--fg); cursor: pointer; }
.demo-boutons button:hover { border-color: var(--accent); }
.demo-boutons button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.bond { animation: bond .7s cubic-bezier(.3,.7,.4,1); }
.tressaut { animation: tressaut .9s ease-in-out; }
.affaisse { animation: affaisse 1.1s ease-in-out; }
@keyframes bond { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-14%) scale(1.03, .97); } 55% { transform: translateY(0) scale(1.04, .95); } 75% { transform: translateY(-4%); } }
@keyframes tressaut { 0%,100% { transform: scale(1) rotate(0); } 25% { transform: scale(1.12) rotate(-6deg); } 50% { transform: scale(1.12) rotate(6deg); } 75% { transform: scale(1.06) rotate(-3deg); } }
@keyframes affaisse { 0%,100% { transform: translateY(0) rotate(0); } 30%,65% { transform: translateY(5%) rotate(-5deg) scale(.97); } }
@media (prefers-reduced-motion: reduce) { .bond, .tressaut, .affaisse { animation: none; } }
.retenu { border-top: 3px solid var(--or); }
.portrait.rond { border-radius: 50%; }
.archives { font-size: 18px; color: var(--muted); margin: 0 0 -32px; font-weight: 500; }
.suite { display: grid; gap: 12px; max-width: 68ch; padding: 22px 24px; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; }
.suite h2 { font-size: 21px; margin: 0; }
.suite ul { margin: 0; padding-left: 1.1em; display: grid; gap: 6px; }

@media (max-width: 720px) {
	.trio { gap: 10px; }
	figcaption span { display: none; }
	figcaption strong { font-size: 15px; }
	.pied { grid-template-columns: 1fr; }
	.lettre { font-size: 34px; }
}
</style>
<main class="page">
	<header class="intro">
		<span class="eyebrow">Chiphre · les amis du Galopin</span>
		<h1>Quatre styles pour les Palotins</h1>
		<p>Chaque style redessine les trois Palotins d'<em>Ubu Roi</em> avec leur caractère du Compendium : <strong>Giron</strong> le costaud loyal (pouce levé), <strong>Pile</strong> le fourbe qui propose des échanges douteux (clin d'œil, carte à la main), <strong>Cotice</strong> le lettré bavard (lunettes, plume, index levé, bouche ouverte).</p>
		<p>Les trois gardent leur couleur et le couvre-chef qui porte leur pièce d'héraldique : le giron sur le bonnet, la pile sur le haut-de-forme, la cotice sur le béret. Expression montrée : <strong>content</strong>. Les cinq autres (neutre, triste, pensif, excité, encourageant) seraient dessinées dans le style retenu.</p>
		<ul class="regles"><li>Pas de gidouille sur le ventre (réservée au Père Ubu)</li><li>Joyeux</li><li>SVG, carré 100 × 100</li><li>Remplace les 18 fichiers actuels</li></ul>
	</header>
	${grille}
	${demo}
	${retenu}
	${sections}
	<aside class="suite">
		<h2>Pour choisir</h2>
		<ul>
			<li>On peut garder un style tel quel, ou en croiser deux, par exemple les visages de B avec les tabards de C.</li>
			<li>Ce sont des esquisses : une fois le style choisi, je reprends le trait, les mains et les six expressions de chaque Palotin.</li>
			<li>À regarder surtout : la rangée en petit. C'est la taille réelle, recadrée en rond comme dans le panneau et le widget du Palotin.</li>
		</ul>
	</aside>
</main>
<script>
document.querySelectorAll('.demo-boutons button').forEach((bouton) => {
	bouton.addEventListener('click', () => {
		const reaction = bouton.dataset.reaction;
		document.querySelectorAll((bouton.dataset.cible || '#demo') + ' .vivant').forEach((el, i) => {
			el.classList.remove('bond', 'tressaut', 'affaisse');
			void el.offsetWidth;
			el.style.animationDelay = (i % 3) * 0.08 + 's';
			el.classList.add(reaction);
		});
	});
});
document.querySelectorAll('.vivant').forEach((el) => el.addEventListener('animationend', () => el.classList.remove('bond', 'tressaut', 'affaisse')));
</script>`;

writeFileSync(new URL('./palotins-styles.html', import.meta.url), html);
console.log('ok', html.length);
