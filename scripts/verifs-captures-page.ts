/**
 * Page à cocher des captures (`pnpm verifs:captures-page <sortie.html> [titre]`)
 * ==============================================================================
 *
 * Lit les fiches JSON de `.captures/` (écrites par `pnpm test:verifs:captures`),
 * regroupe les captures par ligne de `docs/wip/verifications-manuelles.md` et
 * écrit UNE page HTML autonome, images comprises (data URI) : une fiche par
 * ligne, « OK / À revoir » et un commentaire. La page est publiée comme
 * artefact avec la capacité `db` : les réponses de David vont dans la
 * collection `verdicts` (un document par ligne), que Claude relit ensuite.
 *
 * Les écritures passent par une file unique, espacée, avec nouvel essai : une
 * réponse perdue en silence ne doit pas passer pour enregistrée.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CAPTURES_DIR, type Shot } from '../e2e/verifs/helpers/captures';

// ============================================================================
// TYPES
// ============================================================================

interface Sheet {
	/** Identifiant du document de verdict (`1315`, `1415-1416-1418-1419`) */
	id: string;
	pr: string;
	title: string;
	look: string;
	shots: { caption: string; theme: string; width: number; image: string }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Au-delà, l'artefact refuse la page (16 Mo, data URI comprises) : on prévient avant */
const MAX_BYTES = 15 * 1024 * 1024;

// ============================================================================
// FUNCTIONS
// ============================================================================

function sheetId(pr: string): string {
	return pr.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Le n° de la première PR de la ligne, pour ranger les fiches (les plus récentes d'abord) */
function prNumber(pr: string): number {
	return Number(/\d+/.exec(pr)?.[0] ?? 0);
}

function readSheets(): Sheet[] {
	const shots = readdirSync(CAPTURES_DIR)
		.filter((file) => file.endsWith('.json'))
		.map((file) => JSON.parse(readFileSync(`${CAPTURES_DIR}/${file}`, 'utf8')) as Shot);
	const byLine = new Map<string, Shot[]>();
	for (const shot of shots) byLine.set(shot.pr, [...(byLine.get(shot.pr) ?? []), shot]);
	return [...byLine.entries()]
		.sort(([a], [b]) => prNumber(b) - prNumber(a))
		.map(([pr, lineShots]) => {
			const first = lineShots[0];
			const ordered = lineShots.toSorted(
				(a, b) => a.order - b.order || a.width - b.width || a.theme.localeCompare(b.theme)
			);
			return {
				id: sheetId(pr),
				pr,
				title: first.title,
				look: first.look,
				shots: ordered.map((shot) => ({
					caption: shot.caption,
					theme: shot.theme,
					width: shot.width,
					image: `data:image/jpeg;base64,${readFileSync(`${CAPTURES_DIR}/${shot.file}`).toString('base64')}`
				}))
			};
		});
}

/** Le JSON dans un `<script>` : `</script>` et `<!--` ne doivent pas le fermer */
function embedJson(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

function page(sheets: Sheet[], heading: string): string {
	return `<title>Captures à cocher</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Une colonne de fiches ; barre du haut collante : compteurs, filtre, état des écritures */
:root {
	--bg: #f6f5f2; --surface: #ffffff; --fg: #1d1f24; --muted: #5d6270; --line: #dcdad3;
	--accent: #c56a00; --accent-soft: #fbeedd;
	--ok: #1f7a4d; --ok-soft: #e1f2e8; --bad: #b3261e; --bad-soft: #fbe4e2;
	--sans: "IBM Plex Sans", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
	--bg: #16171a; --surface: #1f2125; --fg: #ecebe7; --muted: #a2a5ad; --line: #34363c;
	--accent: #f0a040; --accent-soft: #3a2a14;
	--ok: #5fcf95; --ok-soft: #173326; --bad: #ff8a80; --bad-soft: #3d1c1a; color-scheme: dark } }
:root[data-theme="dark"] {
	--bg: #16171a; --surface: #1f2125; --fg: #ecebe7; --muted: #a2a5ad; --line: #34363c;
	--accent: #f0a040; --accent-soft: #3a2a14;
	--ok: #5fcf95; --ok-soft: #173326; --bad: #ff8a80; --bad-soft: #3d1c1a; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.5 var(--sans);
	padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
main { max-width: 1100px; margin: 0 auto; padding-block: 8px 64px; display: grid; gap: 20px; }
header { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg);
	padding-block: 14px 12px; border-bottom: 1px solid var(--line); display: grid; gap: 10px; }
h1 { font-size: 1.35rem; font-weight: 600; margin: 0; text-wrap: balance; }
.barre { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
.compteurs { font-variant-numeric: tabular-nums; color: var(--muted); }
.compteurs b { color: var(--fg); font-weight: 600; }
.filtres { display: flex; gap: 4px; margin-left: auto; }
.filtres button, .actions button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--fg);
	border-radius: 6px; padding: 5px 12px; cursor: pointer; }
.filtres button[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--fg); font-weight: 600; }
button:focus-visible, textarea:focus-visible, img:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.etat { padding: 8px 12px; border-radius: 6px; font-weight: 500; }
.etat.attente { background: var(--accent-soft); }
.etat.erreur { background: var(--bad-soft); color: var(--bad); }
.etat.fini { background: var(--ok-soft); color: var(--ok); }
article { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 18px; display: grid; gap: 12px; }
article.ok { border-left: 4px solid var(--ok); }
article.revoir { border-left: 4px solid var(--bad); }
.tete { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; }
.pr { font-family: var(--mono); font-size: 0.85rem; color: var(--accent); }
h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
.verdict { margin-left: auto; font-size: 0.85rem; font-weight: 600; padding: 2px 10px; border-radius: 999px; }
.verdict.ok { background: var(--ok-soft); color: var(--ok); }
.verdict.revoir { background: var(--bad-soft); color: var(--bad); }
.regarder { margin: 0; max-width: 75ch; }
.regarder::before { content: "À regarder · "; font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.captures { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 12px; }
figure { margin: 0; display: grid; gap: 4px; min-width: 0; }
figure img { width: 100%; height: auto; border: 1px solid var(--line); border-radius: 4px; cursor: zoom-in; background: var(--bg); }
figure.tel img { max-width: 220px; }
figcaption { font-size: 0.85rem; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
.actions button.choisi-ok { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); font-weight: 600; }
.actions button.choisi-revoir { background: var(--bad-soft); border-color: var(--bad); color: var(--bad); font-weight: 600; }
textarea { flex: 1 1 280px; min-width: 0; min-height: 2.6em; font: inherit; color: var(--fg); background: var(--bg);
	border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; resize: vertical; }
.vide { color: var(--muted); text-align: center; padding: 40px 0; }
dialog { border: none; padding: 0; background: transparent; max-width: 96vw; max-height: 96vh; }
dialog::backdrop { background: rgb(0 0 0 / 0.8); }
dialog img { max-width: 96vw; max-height: 92vh; display: block; cursor: zoom-out; }
@media (prefers-reduced-motion: no-preference) { article { transition: border-color 0.2s; } }
</style>

<main>
	<header>
		<h1>${heading}</h1>
		<div class="barre">
			<span class="compteurs" id="compteurs"></span>
			<div class="filtres" role="group" aria-label="Fiches montrées">
				<button type="button" id="f-reste" aria-pressed="true">Ce qui reste</button>
				<button type="button" id="f-revoir" aria-pressed="false">À revoir</button>
				<button type="button" id="f-tout" aria-pressed="false">Tout</button>
			</div>
		</div>
		<div class="etat attente" id="etat" role="status">Connexion à la base des réponses…</div>
	</header>
	<div id="fiches"></div>
</main>
<dialog id="loupe"><img id="loupe-img" alt=""></dialog>

<script type="application/json" id="donnees">${embedJson(sheets)}</script>
<script>
(() => {
	const sheets = JSON.parse(document.getElementById('donnees').textContent);
	/** Verdicts lus dans la base : id → { verdict, comment } */
	const verdicts = new Map();
	let filter = 'reste';
	let db = null;

	// --- File d'écriture unique : espacée, nouvel essai, jamais perdue en silence ---
	const queue = [];
	let writing = false;
	let failure = '';
	function enqueue(id, data) {
		const waiting = queue.find((item) => item.id === id);
		if (waiting) Object.assign(waiting.data, data);
		else queue.push({ id, data: { ...data } });
		pump();
		renderState();
	}
	async function pump() {
		if (writing || queue.length === 0 || db === null) return;
		writing = true;
		const item = queue[0];
		let delay = 2000;
		for (;;) {
			try {
				await db.collection('verdicts').doc(item.id).set({ ...(verdicts.get(item.id) ?? {}), ...item.data, at: new Date().toISOString() });
				failure = '';
				break;
			} catch (error) {
				failure = (error && error.message) || String(error);
				renderState();
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay = Math.min(delay * 2, 30000);
			}
		}
		queue.shift();
		writing = false;
		renderState();
		setTimeout(pump, 400);
	}
	window.addEventListener('beforeunload', (event) => { if (queue.length > 0) event.preventDefault(); });

	function renderState() {
		const state = document.getElementById('etat');
		const done = sheets.filter((sheet) => verdicts.get(sheet.id)?.verdict).length;
		const ok = sheets.filter((sheet) => verdicts.get(sheet.id)?.verdict === 'ok').length;
		const bad = sheets.filter((sheet) => verdicts.get(sheet.id)?.verdict === 'revoir').length;
		document.getElementById('compteurs').innerHTML =
			'<b>' + done + '</b> / ' + sheets.length + ' lignes relues · <b>' + ok + '</b> OK · <b>' + bad + '</b> à revoir';
		state.hidden = false;
		if (db === null) {
			state.className = 'etat erreur';
			state.textContent = 'Base des réponses injoignable : tes réponses ne seraient pas gardées. Recharge la page connecté à claude.ai.';
		} else if (failure !== '') {
			state.className = 'etat erreur';
			state.textContent = queue.length + ' réponse(s) pas encore enregistrée(s), nouvel essai en cours (' + failure + '). Ne ferme pas la page.';
		} else if (queue.length > 0) {
			state.className = 'etat attente';
			state.textContent = 'Enregistrement de ' + queue.length + ' réponse(s)…';
		} else if (done === sheets.length) {
			state.className = 'etat fini';
			state.textContent = 'Tout est relu et enregistré.';
		} else {
			state.hidden = true;
		}
	}

	function visible(sheet) {
		const verdict = verdicts.get(sheet.id)?.verdict;
		if (filter === 'reste') return verdict !== 'ok';
		if (filter === 'revoir') return verdict === 'revoir';
		return true;
	}

	function el(tag, attrs, children) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(attrs ?? {})) {
			if (key === 'text') node.textContent = value;
			else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
			else node.setAttribute(key, value);
		}
		for (const child of children ?? []) node.append(child);
		return node;
	}

	function render() {
		const list = document.getElementById('fiches');
		list.replaceChildren();
		const shown = sheets.filter(visible);
		if (shown.length === 0) {
			list.append(el('p', { class: 'vide', text: filter === 'revoir' ? 'Aucune ligne à revoir.' : 'Plus rien à relire ici.' }));
		}
		for (const sheet of shown) list.append(card(sheet));
		renderState();
	}

	function card(sheet) {
		const saved = verdicts.get(sheet.id) ?? {};
		const verdict = saved.verdict;
		const comment = el('textarea', { id: 'c-' + sheet.id, placeholder: 'Commentaire (ce qui ne va pas, ce qui est périmé…)', 'aria-label': 'Commentaire sur ' + sheet.pr });
		comment.value = saved.comment ?? '';
		comment.addEventListener('change', () => {
			verdicts.set(sheet.id, { ...(verdicts.get(sheet.id) ?? {}), comment: comment.value });
			enqueue(sheet.id, { comment: comment.value });
		});
		const choose = (value) => () => {
			verdicts.set(sheet.id, { ...(verdicts.get(sheet.id) ?? {}), verdict: value, comment: comment.value });
			enqueue(sheet.id, { verdict: value, comment: comment.value });
			render();
		};
		return el('article', { class: verdict ?? '', id: 'l-' + sheet.id }, [
			el('div', { class: 'tete' }, [
				el('span', { class: 'pr', text: sheet.pr }),
				el('h2', { text: sheet.title }),
				...(verdict ? [el('span', { class: 'verdict ' + verdict, text: verdict === 'ok' ? 'OK' : 'À revoir' })] : [])
			]),
			el('p', { class: 'regarder', text: sheet.look }),
			el('div', { class: 'captures' }, sheet.shots.map((shot) =>
				el('figure', { class: shot.width < 600 ? 'tel' : '' }, [
					el('img', { src: shot.image, alt: shot.caption + ' (' + shot.theme + ')', tabindex: '0', loading: 'lazy',
						onclick: () => zoom(shot), onkeydown: (event) => { if (event.key === 'Enter') zoom(shot); } }),
					el('figcaption', { text: shot.caption + ' · ' + shot.theme + (shot.width < 600 ? ' · téléphone' : '') })
				])
			)),
			el('div', { class: 'actions' }, [
				el('button', { type: 'button', class: verdict === 'ok' ? 'choisi-ok' : '', 'aria-pressed': String(verdict === 'ok'), onclick: choose('ok'), text: 'OK' }),
				el('button', { type: 'button', class: verdict === 'revoir' ? 'choisi-revoir' : '', 'aria-pressed': String(verdict === 'revoir'), onclick: choose('revoir'), text: 'À revoir' }),
				comment
			])
		]);
	}

	function zoom(shot) {
		const dialog = document.getElementById('loupe');
		document.getElementById('loupe-img').src = shot.image;
		dialog.showModal();
	}
	document.getElementById('loupe').addEventListener('click', (event) => event.currentTarget.close());

	for (const [id, value] of [['f-reste', 'reste'], ['f-revoir', 'revoir'], ['f-tout', 'tout']]) {
		document.getElementById(id).addEventListener('click', () => {
			filter = value;
			for (const other of ['f-reste', 'f-revoir', 'f-tout']) {
				document.getElementById(other).setAttribute('aria-pressed', String(other === id));
			}
			render();
		});
	}

	render();
	(async () => {
		db = window.claude ? await window.claude.use('db') : null;
		if (db === null) { renderState(); return; }
		db.collection('verdicts').onSnapshot((snapshot) => {
			for (const doc of snapshot.docs) {
				// Une réponse encore dans la file prime sur la base
				if (!queue.some((item) => item.id === doc.id)) verdicts.set(doc.id, doc.data());
			}
			// Pas de re-rendu pendant qu'un commentaire est en cours de frappe
			if (!(document.activeElement instanceof HTMLTextAreaElement)) render();
			else renderState();
		}, (error) => { failure = error.message; renderState(); });
		pump();
	})();
})();
</script>
`;
}

// ============================================================================
// MAIN
// ============================================================================

const [output, heading = 'Captures à cocher'] = process.argv.slice(2);
if (output === undefined) {
	console.error('Usage : pnpm verifs:captures-page <sortie.html> [titre]');
	process.exit(1);
}
const sheets = readSheets();
const html = page(sheets, heading);
writeFileSync(output, html);
const megabytes = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
console.log(
	`${sheets.length} lignes, ${sheets.reduce((sum, sheet) => sum + sheet.shots.length, 0)} captures, ${megabytes} Mo → ${output}`
);
if (Buffer.byteLength(html) > MAX_BYTES) {
	console.error(
		'⚠ Page trop lourde pour un artefact (16 Mo) : la scinder ou baisser la qualité des captures.'
	);
	process.exit(2);
}
