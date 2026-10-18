// Génère la page de validation des verdicts modèle → point (C5, étape 2 bis).
// Lancer depuis ce dossier : node gen.mjs  → verdicts-modeles.html
import fs from 'node:fs';

const A = '../';
const R = '../../releves/';
const B = '../../bornes/';
const LOTS = ['cycle2', 'cm', 'sixieme', 'cycle4'];
const ORDRE_NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3'];
const VERDICTS = ['A_TRANCHER', 'MODIFIER', 'TAG_PAR_VARIATION', 'TAG', 'HORS_PROGRAMME'];

// Lecture d'un CSV « ; » avec guillemets
function parseCsv(txt) {
	const rows = [];
	let row = [], cell = '', q = false;
	for (let i = 0; i < txt.length; i++) {
		const ch = txt[i];
		if (q) {
			if (ch === '"' && txt[i + 1] === '"') { cell += '"'; i++; }
			else if (ch === '"') q = false;
			else cell += ch;
		} else if (ch === '"') q = true;
		else if (ch === ';') { row.push(cell); cell = ''; }
		else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
		else if (ch !== '\r') cell += ch;
	}
	if (cell || row.length) { row.push(cell); rows.push(row); }
	const [head, ...body] = rows;
	return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Bornes : point → bornes propres + générales du niveau
const bornes = {};
for (const f of ['cycle2', 'cycle3', 'cycle4']) Object.assign(bornes, JSON.parse(fs.readFileSync(B + f + '.json', 'utf8')));
function bornesPoint(g, code) {
	const p = bornes[g]?.points?.[code];
	if (!p) return null;
	return { l: p.libelle, b: (p.bornes || []).map((x) => [x.force, x.borne]), rem: p.remarque || '' };
}

// Résumé d'une plage relevée
function plage(v) {
	if (!v) return '';
	if (v.nature === 'texte ou expression') return v.nombres_contenus ? plage(v.nombres_contenus) : 'expression';
	let s = v.valeurs && v.nb_distinctes <= 12 ? '{' + v.valeurs.join(' ; ') + '}' : `${v.min} … ${v.max}`;
	if (v.nature && v.nature !== 'entier') s += ` (${v.nature}${v.decimales_max ? ', ' + v.decimales_max + ' déc.' : ''})`;
	if (v.negatif_possible) s += ', négatifs';
	return s;
}
function resumeVariation(v) {
	const vars = v.variables
		.filter((x) => x.valeurs_tirees && x.valeurs_tirees.nature !== 'texte ou expression')
		.map((x) => x.nom + ' : ' + plage(x.valeurs_tirees));
	const rep = (v.reponse_attendue || []).map((r) => plage(r.valeurs)).filter(Boolean);
	const f = v.format || {};
	const sym = Object.keys(f.symboles_affiches || {}).join(' ');
	return {
		n: v.variation,
		vars: vars.join(' · '),
		enonce: plage(v.nombres_enonce),
		rep: rep.join(' | '),
		fmt: [f.type_reponse, sym && 'symboles ' + sym, (f.unites || []).length ? 'unités ' + f.unites.join(' ') : '', f.contexte_probable ? 'problème en contexte' : ''].filter(Boolean).join(' · '),
		distincts: v.enonces_distincts,
		ex: (v.exemples || []).slice(0, 2).map((e) => ({ r: e.role, q: e.enonce, a: e.reponse }))
	};
}

const releveFiles = Object.fromEntries(fs.readdirSync(R).filter((f) => /^[0-9a-f-]{36}\.json$/.test(f)).map((f) => [f.slice(0, 36), f]));
const MODELES = [];
for (const lot of LOTS) {
	for (const x of parseCsv(fs.readFileSync(A + lot + '.csv', 'utf8'))) {
		const d = JSON.parse(fs.readFileSync(R + releveFiles[x.template_id], 'utf8'));
		const codes = x.code.split(/[,+/ ]+/).filter((c) => /^(CP|CE1|CE2|CM1|CM2|\d)-\d+$/.test(c));
		MODELES.push({
			id: x.template_id, g: x.grade, t: x.titre, st: x.sous_titre, cons: d.consigne || '', v: x.verdict,
			code: x.code, lib: x.libelle_point, hors: x.variations_hors, mod: x.modification, just: x.justification, anc: x.ancien_csv,
			pts: codes.map((c) => [c, bornesPoint(x.grade, c)]).filter(([, p]) => p),
			vars: d.variations.map(resumeVariation)
		});
	}
}
let QUESTIONS = [];
if (fs.existsSync(A + 'questions-modeles.json')) QUESTIONS = JSON.parse(fs.readFileSync(A + 'questions-modeles.json', 'utf8'));
const qParModele = {};
for (const q of QUESTIONS) for (const m of q.modeles || []) (qParModele[m] ||= []).push(q.id);
for (const m of MODELES) m.qs = qParModele[m.id] || [];

const NIVEAUX = ORDRE_NIVEAUX.map((g) => ({ g, m: MODELES.filter((m) => m.g === g) })).filter((n) => n.m.length);
const style = fs.readFileSync('style.html', 'utf8');
const j = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const html = `<title>Verdicts des modèles</title>
${style}
<style>
.vd { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.vd.TAG { background: var(--ok-soft); color: var(--ok); }
.vd.MODIFIER, .vd.TAG_PAR_VARIATION { background: var(--wait-soft); color: var(--wait); }
.vd.HORS_PROGRAMME { background: var(--code-bg); color: var(--muted); }
.vd.A_TRANCHER { background: var(--no-soft); color: var(--no); }
.mod { font-size: 14px; background: var(--wait-soft); border-radius: 6px; padding: 6px 10px; }
.mod b { color: var(--wait); }
.just { font-size: 14px; }
.anc { font-size: 12px; color: var(--muted); }
.var { border-top: 1px dashed var(--line); padding-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.var-h { font-size: 13px; color: var(--muted); }
.var-h b { color: var(--ink); font-family: var(--font-mono); font-weight: 500; }
.bp { font-size: 13px; color: var(--muted); }
.bp summary { cursor: pointer; color: var(--accent); }
.bp ul { margin: 4px 0 0; padding-left: 18px; }
.f { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
.q { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.q h3 { margin: 0; font-size: 1rem; }
.q p { margin: 0; max-width: 78ch; }
.q .src { font-size: 13px; color: var(--muted); }
.q.is-ok { border-color: var(--ok); } .q.is-no { border-color: var(--no); } .q.is-avis { border-color: var(--wait); }
.reco { font-size: 14px; background: var(--accent-soft); border-radius: 6px; padding: 8px 12px; max-width: 78ch; }
.reco b { color: var(--accent); }
.is-reco { box-shadow: inset 0 -2px 0 var(--accent); }
textarea.c { width: 100%; font: inherit; font-size: 13px; border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; background: var(--surface); color: var(--ink); min-height: 1.9em; resize: vertical; }
.qlink { font-size: 13px; color: var(--no); }
.qlink a { color: var(--no); }
.rq { max-width: 78ch; }
.r-act { flex-direction: column; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
<div class="wrap">
  <header>
    <h1>Verdicts des modèles</h1>
    <p class="lede">Chaque modèle du primaire et du collège confronté aux bornes validées de son point, à partir de 300 tirages par variation. Inclusion stricte : une seule question hors bornes refuse le tag. Tranche d'abord les questions, puis relis les verdicts niveau par niveau. Chaque réponse est enregistrée aussitôt.</p>
  </header>
  <div class="status" role="status">
    <span class="count" id="count">0 décidés</span>
    <div class="bar" aria-hidden="true"><i id="barfill"></i></div>
    <span class="conn" id="conn">Connexion à l'enregistrement…</span>
  </div>
  <nav class="toc" id="toc"></nav>
  <main id="main"></main>
</div>
<script>
const QUESTIONS = ${j(QUESTIONS)};
const NIVEAUX = ${j(NIVEAUX)};
const VERDICTS = ${j(VERDICTS)};
const VLAB = { A_TRANCHER: 'À trancher', MODIFIER: 'À modifier', TAG_PAR_VARIATION: 'Variations sur des points différents', TAG: 'Tag', HORS_PROGRAMME: 'Hors programme' };
const state = { questions: {}, niveaux: {}, modeles: {} };
let db = null, canWrite = true;
const drafts = {}, timers = {}, openState = {};
const GN = (g) => /^\\d$/.test(g) ? g + 'e' : g;
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== '') e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
// Texte avec $…$ et $$…$$ rendus par KaTeX (MathML seul)
function tex(s, display) {
  const src = s.replace(/\\[\\?\\]/g, '\\\\boxed{\\\\,?\\\\,}');
  if (!window.katex) return el('code', {}, s);
  const span = el('span');
  try { span.innerHTML = katex.renderToString(src, { output: 'mathml', displayMode: !!display, throwOnError: false }); } catch { span.textContent = s; }
  return span;
}
function rich(s) {
  const out = el('div', { class: 'card-q' });
  const parts = String(s).split(/(\\$\\$[\\s\\S]+?\\$\\$|\\$[^$]+?\\$)/);
  let p = el('p'); out.append(p);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('$$')) { out.append(el('p', {}, tex(part.slice(2, -2), true))); p = el('p'); out.append(p); }
    else if (part.startsWith('$')) p.append(tex(part.slice(1, -1)));
    else part.split('\\n').forEach((line, i) => { if (i) { p = el('p'); out.append(p); } p.append(line.replace(/\\[\\?\\]/g, '▢')); });
  }
  return out;
}
function setConn(t, bad) { const c = document.getElementById('conn'); c.textContent = t; c.classList.toggle('bad', !!bad); }
async function write(path, body) {
  if (!db) return;
  try { if (body === null) await db.doc(path).delete(); else await db.doc(path).set(body); }
  catch (e) { if (e && e.code === 'invalid_argument') { canWrite = false; render(); } setConn('Réponse non enregistrée : ' + ((e && e.message) || 'erreur') + '. Rechargez la page.', true); }
}
function btn(on, label, onclick, cls, reco) { return el('button', { class: (on ? (cls || 'on-ok') : '') + (reco ? ' is-reco' : ''), disabled: !canWrite, 'aria-pressed': on ? 'true' : 'false', onclick }, label); }
function choose(coll, id, c) { const cur = state[coll][id]; write(coll + '/' + id, cur && cur.c === c ? null : { c, note: (cur && cur.note) || '', at: new Date().toISOString() }); }
function noteBox(coll, id, ph) {
  const key = coll + '-' + id, cur = state[coll][id];
  const ta = el('textarea', { class: 'c', id: key, placeholder: ph || 'Ton avis (facultatif)', disabled: !canWrite, oninput: (ev) => {
    drafts[key] = ev.target.value; clearTimeout(timers[key]);
    timers[key] = setTimeout(() => { const c = state[coll][id], t = drafts[key]; if (c && c.note === t) return; if (!c && !t.trim()) return; write(coll + '/' + id, { ...(c || { c: 'avis' }), note: t, at: new Date().toISOString() }); }, 700);
  } });
  ta.value = drafts[key] ?? ((cur && cur.note) || '');
  return ta;
}
function qView(q) {
  const cur = state.questions[q.id];
  const box = el('div', { class: 'q' + (cur ? (cur.c === 'avis' ? ' is-avis' : cur.c === q.reco ? ' is-ok' : ' is-no') : ''), id: 'q-' + q.id },
    el('h3', {}, q.titre, el('span', { class: 'id' }, '  ' + q.id + ' · ' + (q.modeles || []).length + ' modèle' + ((q.modeles || []).length > 1 ? 's' : ''))),
    el('div', { class: 'rq' }, rich(q.question)),
    q.citations ? el('p', { class: 'src' }, 'Ce que disent les textes : ' + q.citations) : null,
    q.verdict_provisoire ? el('p', { class: 'src' }, 'En attendant : ' + q.verdict_provisoire) : null);
  if (q.info || !(q.options || []).length) { box.append(el('div', { class: 'reco' }, el('b', {}, 'Pour information. '), q.pourquoi || '')); return box; }
  const rl = (q.options.find(([k]) => k === q.reco) || [0, q.reco])[1];
  box.append(el('div', { class: 'reco' }, el('b', {}, 'Reco : ' + rl + '. '), q.pourquoi || '', q.consequence ? el('div', { class: 'src', style: 'margin-top:4px' }, 'Conséquence : ' + q.consequence) : null),
    el('div', { class: 'choice' }, q.options.map(([k, l]) => btn(cur && cur.c === k, l, () => choose('questions', q.id, k), k === q.reco ? 'on-ok' : 'on-no', k === q.reco)), btn(cur && cur.c === 'avis', 'Je ne tranche pas : mon avis', () => choose('questions', q.id, 'avis'), 'on-avis')),
    noteBox('questions', q.id, 'Ta réponse, une hésitation, une autre option… (facultatif)'));
  return box;
}
function modeleView(m, niveauOk) {
  const cur = state.modeles[m.id];
  const eff = cur ? cur.c : niveauOk ? 'ok' : null;
  const row = el('div', { class: 'row' + (eff === 'ok' ? ' is-ok' : eff === 'no' ? ' is-no' : eff === 'avis' ? ' is-avis' : '') });
  const main = el('div', { class: 'r-main' },
    el('div', { class: 'r-title' }, m.t, el('span', { class: 'id' }, m.id.slice(0, 8))),
    m.st ? el('div', { class: 'why' }, 'Sous-titre : ', rich(m.st).childNodes[0]) : null,
    m.cons ? el('div', { class: 'why' }, 'Consigne : ' + m.cons) : null,
    el('div', { class: 'point' }, el('span', { class: 'vd ' + m.v }, VLAB[m.v] || m.v), m.code ? el('span', { class: 'code' }, m.code) : null, m.lib ? el('span', {}, m.lib) : null),
    m.qs.length ? el('div', { class: 'qlink' }, 'Dépend de la question ', m.qs.map((id, i) => [i ? ', ' : '', el('a', { href: '#q-' + id }, id)])) : null,
    el('div', { class: 'just' }, m.just),
    m.mod ? el('div', { class: 'mod' }, el('b', {}, 'Modification proposée : '), m.mod) : null,
    m.hors ? el('div', { class: 'multi' }, 'Variations hors bornes : ' + m.hors) : null,
    m.pts.map(([c, p]) => el('details', { class: 'bp' }, el('summary', {}, 'Bornes de ' + c),
      el('ul', {}, p.b.length ? p.b.map(([f, b]) => el('li', {}, el('span', { class: 'f' }, f), ' ', b)) : el('li', {}, 'bornes générales du niveau seulement')),
      p.rem ? el('div', {}, p.rem) : null)),
    m.anc && !m.anc.startsWith(m.v + ' ' + m.code) ? el('div', { class: 'anc' }, 'Proposition précédente : ' + m.anc) : null,
    m.vars.map((v) => el('div', { class: 'var' },
      el('div', { class: 'var-h' }, el('b', {}, 'V' + v.n), ' · ', v.fmt, v.distincts < 300 ? ' · ' + v.distincts + ' énoncés distincts' : ''),
      v.vars ? el('div', { class: 'var-h' }, 'Variables tirées : ' + v.vars) : null,
      el('div', { class: 'var-h' }, 'Nombres de l\\u2019énoncé : ' + (v.enonce || '—') + ' · réponse : ' + (v.rep || '—')),
      el('div', { class: 'cards' }, v.ex.map((e) => el('div', { class: 'card' }, el('div', { class: 'card-h' }, 'Exemple · ' + e.r), rich(e.q),
        el('details', { class: 'card-a' }, el('summary', {}, 'Voir la réponse'), el('div', { class: 'card-r' }, (e.a || []).map((a) => tex(String(a)))))))))));
  const act = el('div', { class: 'r-act' },
    btn(cur && cur.c === 'ok', 'D\\u2019accord', () => choose('modeles', m.id, 'ok'), 'on-ok'),
    btn(cur && cur.c === 'no', 'Pas d\\u2019accord', () => choose('modeles', m.id, 'no'), 'on-no'),
    btn(cur && cur.c === 'avis', 'Je ne tranche pas', () => choose('modeles', m.id, 'avis'), 'on-avis'));
  row.append(main, act, el('div', { class: 'note' }, noteBox('modeles', m.id, 'Ton commentaire (facultatif)')));
  return row;
}
function niveauView(n) {
  const cur = state.niveaux[n.g], ok = cur && cur.c === 'ok';
  const answered = n.m.filter((m) => state.modeles[m.id]).length;
  const counts = VERDICTS.map((v) => [v, n.m.filter((m) => m.v === v).length]).filter(([, k]) => k);
  const d = el('details', { class: 'group', id: 'n-' + n.g });
  if (openState[n.g]) d.open = true;
  d.addEventListener('toggle', () => { if (!!openState[n.g] !== d.open) { openState[n.g] = d.open; render(); } });
  d.append(el('summary', {}, el('span', { class: 'chev', 'aria-hidden': 'true' }, '›'),
    el('span', { class: 'g-title' }, GN(n.g), el('small', {}, n.m.length + ' modèles · ' + counts.map(([v, k]) => k + ' ' + VLAB[v].toLowerCase()).join(' · '))),
    ok ? el('span', { class: 'pill ok' }, 'validé') : el('span', { class: 'pill wait' }, answered ? answered + ' réponse' + (answered > 1 ? 's' : '') : 'en attente')));
  d.append(el('div', { class: 'g-actions' }, btn(ok, ok ? 'Verdicts validés · annuler' : 'Valider tous les verdicts de ce niveau (sauf ceux où j\\u2019ai répondu)', () => choose('niveaux', n.g, 'ok'), 'on-ok')));
  if (!d.open) return d;
  for (const v of VERDICTS) {
    const ms = n.m.filter((m) => m.v === v);
    if (!ms.length) continue;
    d.append(el('div', { class: 'sub' }, VLAB[v] + ' (' + ms.length + ')'), el('div', { class: 'rows' }, ms.map((m) => modeleView(m, ok))));
  }
  return d;
}
function render() {
  const qs = QUESTIONS.filter((q) => !q.info && (q.options || []).length);
  const decided = (g) => n => state.modeles[n.id] || (state.niveaux[g] && state.niveaux[g].c === 'ok');
  const nm = NIVEAUX.reduce((s, n) => s + n.m.filter(decided(n.g)).length, 0), tm = NIVEAUX.reduce((s, n) => s + n.m.length, 0);
  const nq = qs.filter((q) => state.questions[q.id]).length;
  document.getElementById('count').textContent = nq + ' / ' + qs.length + ' questions · ' + nm + ' / ' + tm + ' modèles';
  document.getElementById('barfill').style.width = (100 * (nq + nm) / (qs.length + tm)).toFixed(1) + '%';
  document.getElementById('toc').replaceChildren(el('a', { href: '#questions' }, 'Questions', el('span', {}, qs.length)), ...NIVEAUX.map((n) => el('a', { href: '#n-' + n.g }, GN(n.g), el('span', {}, n.m.length))));
  const y = window.scrollY, fid = document.activeElement && document.activeElement.id;
  document.getElementById('main').replaceChildren(
    el('section', { class: 'part', id: 'questions' }, el('div', { class: 'part-head' }, el('span', { class: 'num' }, 'Partie 1'), el('h2', {}, 'Questions à trancher'), el('p', {}, 'Les cas où les bornes ou tes décisions précédentes ne suffisent pas. Les verdicts des modèles concernés sont provisoires.')),
      qs.length ? QUESTIONS.map(qView) : el('p', { class: 'empty' }, 'Aucune question.')),
    el('section', { class: 'part', id: 'niveaux' }, el('div', { class: 'part-head' }, el('span', { class: 'num' }, 'Partie 2'), el('h2', {}, 'Verdicts par niveau'), el('p', {}, 'Ouvre un niveau : les modèles sont rangés par verdict. Pour chacun : titre, sous-titre, consigne, point proposé et ses bornes, plages réellement tirées, deux exemples par variation (la plus grande et la plus petite valeur). Le bouton du niveau accepte d\\u2019un coup tous les verdicts auxquels tu n\\u2019as pas répondu.')), NIVEAUX.map(niveauView)));
  window.scrollTo(0, y);
  if (fid) { const f = document.getElementById(fid); if (f) { f.focus(); if (f.setSelectionRange) f.setSelectionRange(f.value.length, f.value.length); } }
}
render();
window.addEventListener('load', () => render());
(async () => {
  const c = window.claude;
  if (!c || !c.use) { canWrite = false; setConn('Enregistrement indisponible ici : ouvrez la page sur claude.ai.', true); render(); return; }
  db = await c.use('db');
  if (!db) { canWrite = false; setConn('Enregistrement indisponible : connectez-vous à claude.ai.', true); render(); return; }
  const user = await c.use('user');
  if (user && (await user.can('data.write')) === false) { canWrite = false; setConn('Lecture seule.', true); }
  let ready = 0;
  for (const [coll, bit] of [['questions', 1], ['niveaux', 2], ['modeles', 4]]) {
    db.collection(coll).onSnapshot((snap) => { const next = {}; for (const d of snap.docs) next[d.id] = d.data(); state[coll] = next; ready |= bit; if (ready === 7 && canWrite) setConn('Réponses enregistrées en direct.'); render(); }, (e) => setConn('Enregistrement interrompu (' + e.code + '). Rechargez la page.', true));
  }
})();
</script>
`;
fs.writeFileSync(process.env.OUT || 'verdicts-modeles.html', html);
console.log((html.length / 1e6).toFixed(2), 'Mo ·', MODELES.length, 'modèles ·', QUESTIONS.length, 'questions ·', MODELES.filter((m) => !m.pts.length && m.code).length, 'codes sans bornes trouvées');
