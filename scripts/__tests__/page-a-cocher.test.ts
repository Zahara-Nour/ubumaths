import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireLot } from '../lib/lot-questions';
import {
	assemblerPage,
	cheminDuNoeud,
	dessinerBlocs,
	exemplesDuModele,
	ficheDuModele,
	HTML,
	type Fiche,
	type InfosEnBase
} from '../lib/page-a-cocher';

const LOT = lireLot('tests/fixtures/lot-questions');
const modele = (fichier: string) => {
	const m = LOT.find((x) => x.fichier === fichier);
	if (!m) throw new Error(fichier);
	return m.modele;
};
const BASE: InfosEnBase = {
	id: 'ded05f7c-555c-4eec-aeeb-5cf04dbfab44',
	statut: 'draft',
	niveau: 1,
	rangement: 'Nombres et calculs > Entiers : numération > dénombrement',
	codes: ['CP-002']
};
const BORNES = {
	'CP-002': {
		libelle: 'Lire et écrire les nombres.',
		bornes: [{ borne: 'Nombres jusqu’à 100.' }],
		remarque: 'Cardinal ≤ 100.'
	}
};
/** Le gabarit découpe l'énoncé aux lignes vides : un dessin n'en contient jamais */
const surUneLigne = (md: string) =>
	md
		.split('\n')
		.filter((l) => l.startsWith(HTML))
		.every((l) => !l.slice(HTML.length).includes('\n'));

describe('dessinerBlocs', () => {
	it('monnaie à plusieurs ensembles : une figure légendée par ensemble', () => {
		const r = dessinerBlocs(
			'Qui ?\n\n```monnaie\npièces: 2×2 2×1 ; 1×2 2×1\nlégendes: Léa ; Tom\n```'
		);
		expect(r.markdown.startsWith(`Qui ?\n\n${HTML}<div class="m-bloc">`)).toBe(true);
		expect(r.markdown.match(/<figure class="m-fig">/g)).toHaveLength(2);
		expect(r.markdown).toContain('<figcaption>Léa</figcaption>');
		expect(r.markdown).toContain('<figcaption>Tom</figcaption>');
		// 2 + 1 pièces de 2 € (anneau), 2 + 2 pièces de 1 €
		expect(r.markdown.match(/class="m-anneau"/g)).toHaveLength(3);
		expect(r.solutions).toEqual([]);
		expect(r.nonDessines).toEqual([]);
	});

	it('taille: du bloc : la largeur suit, comme --monnaie-taille dans l’appli', () => {
		const defaut = dessinerBlocs('```monnaie\nbillets: 1×10\n```').markdown;
		const quatre = dessinerBlocs('```monnaie\nbillets: 1×10\ntaille: 4cm\n```').markdown;
		expect(defaut).toMatch(/width:calc\(8cm \* /);
		expect(quatre).toMatch(/width:calc\(4cm \* /);
	});

	it('monnaie sans légende et à un seul ensemble : pas de légende A', () => {
		const r = dessinerBlocs('```monnaie\nbillets: 1×10\n```');
		expect(r.markdown).not.toContain('figcaption');
		expect(r.markdown).toContain('class="m-billet"');
	});

	it('monnaie à construire : réserve, plan vide, et la construction juste à part', () => {
		const r = dessinerBlocs('```monnaie\ncase: 0\nconstruire: 8\n```');
		expect(r.markdown).toContain('<span class="r-tag">Réserve</span>');
		expect(r.markdown).toContain('plan de travail (vide au départ)');
		expect(r.solutions).toHaveLength(1);
		// 8 € = 5 + 2 + 1 : un billet, deux pièces
		expect(r.solutions[0].match(/class="m-billet"/g)).toHaveLength(1);
		expect(r.solutions[0].match(/<circle class="m-(anneau|piece)"/g)).toHaveLength(3);
	});

	it('collection à construire : la construction juste pose les barres et les cubes', () => {
		const r = dessinerBlocs('```collection\ncase: 0\nconstruire: 23\n```');
		expect(r.solutions).toHaveLength(1);
		// 2 barres (9 séparations chacune) et 3 cubes
		expect(r.solutions[0].match(/class="c-sep"/g)).toHaveLength(18);
		expect(r.solutions[0].match(/<rect class="c-forme"/g)).toHaveLength(5);
	});

	it('horloge : un cadran par heure, la grande aiguille seulement si elle est montrée', () => {
		const deux = dessinerBlocs('```horloge\nheure: 3 h ; 9 h 30\n```');
		expect(deux.markdown.match(/class="h-cadran"/g)).toHaveLength(2);
		expect(deux.markdown.match(/h-minutes/g)).toHaveLength(2);
		expect(deux.markdown).toContain('<figcaption>A</figcaption>');
		const cachees = dessinerBlocs('```horloge\nheure: 3 h\nminutes: cachées\n```');
		expect(cachees.markdown).not.toContain('h-minutes');
		expect(cachees.markdown).toContain('h-heures');
	});

	it('figure : le SVG de figureToSvg', () => {
		const r = dessinerBlocs(
			'```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un segment.\n---\nA = point(1, 1)\nB = point(8, 1)\ns = segment(A, B)\n```'
		);
		expect(r.markdown).toMatch(new RegExp(`^${HTML}<svg class="fig"`));
		expect(r.markdown).toContain('<line ');
	});

	it('courbe : le SVG de la scène de Courbe.svelte (termes d’une suite, escalier)', () => {
		const r = dessinerBlocs(
			'```courbe\nx: -1 ; 9\ny: -1 ; 8\nu(n) = 3+n/2 pour n de 0 à 8   bleu   nom=u_n\n```'
		);
		expect(r.nonDessines).toEqual([]);
		expect(r.markdown).toMatch(new RegExp(`^${HTML}<svg class="courbe"`));
		// Neuf termes, un disque chacun, à la couleur du thème
		expect(r.markdown.match(/<circle [^>]*fill:var\(--color-fig-bleu\)/g)).toHaveLength(9);
		const escalier = dessinerBlocs(
			'```courbe\nx: -1 ; 11\ny: -1 ; 11\nu(0) = 2 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 2   rouge   escalier termes   nom=C_f\n```'
		);
		expect(escalier.markdown).toContain('class="ce"');
		expect(escalier.markdown).toContain('class="cr"');
		expect(surUneLigne(escalier.markdown)).toBe(true);
	});

	it('python : le programme tel quel, échappé, sans alerte', () => {
		const r = dessinerBlocs('```python\ndef f(n):\n    return n < 3\n```');
		expect(r.nonDessines).toEqual([]);
		expect(r.markdown).toBe(
			`${HTML}<pre class="code"><code>def f(n):<br>    return n &lt; 3</code></pre>`
		);
	});

	it('courbe : coordonnées de Courbe.svelte (cadre 400 × 300, marge 26), nom calligraphique', () => {
		// x et y de 0 à 10 : le terme (2 ; 8) tombe à 26 + 2/10 × 400 = 106, 26 + 2/10 × 300 = 86
		const r = dessinerBlocs(
			'```courbe\nx: 0 ; 10\ny: 0 ; 10\nu(n) = 4*n pour n de 2 à 2   bleu\nf(x) = x   rouge   nom=\\mathcal{C}_f\n```'
		);
		expect(r.markdown).toContain(
			'<circle cx="106" cy="86" r="3" style="fill:var(--color-fig-bleu)"/>'
		);
		expect(r.markdown).toContain('viewBox="0 0 452 352"');
		expect(r.markdown).toContain('𝒞<tspan class="ci" dy="4">f</tspan>');
	});

	it('courbe : un avertissement du bloc remonte en alerte de fiche', () => {
		const r = dessinerBlocs(
			'```courbe\nx: -4 ; 6\ny: -8 ; 12\nf(x) = x\npoints: A(1 ; 2), B(10 ; 0)\n```'
		);
		expect(r.avertissements.length).toBeGreaterThan(0);
		expect(r.avertissements[0]).toMatch(/^bloc courbe : /);
	});

	it('courbe en erreur : la page s’arrête', () => {
		expect(() => dessinerBlocs('```courbe\nx: 5 ; 1\n```')).toThrow(/bloc courbe en erreur/);
	});

	it('bloc inconnu de la page : sa source, échappée, et signalé', () => {
		const r = dessinerBlocs('```operation\ncalcul: 44 + 25 <b>\n```');
		expect(r.nonDessines).toEqual(['operation']);
		expect(r.markdown).toContain('bloc operation, non dessiné ici');
		expect(r.markdown).toContain('calcul: 44 + 25 &lt;b>');
	});

	it('un bloc en erreur arrête la page (jamais une fiche fausse en silence)', () => {
		expect(() => dessinerBlocs('```monnaie\nn’importe quoi\n```')).toThrow(
			/bloc monnaie en erreur/
		);
	});
});

describe('exemplesDuModele', () => {
	it('un exemple par variation, chaque bloc dessiné sur une seule ligne', () => {
		for (const { fichier, modele: m } of LOT) {
			const { exemples } = exemplesDuModele(m);
			expect(
				exemples.map((e) => e.variation),
				fichier
			).toEqual(m.variations.map((_, i) => i + 1));
			for (const e of exemples) {
				expect(surUneLigne(e.statement), fichier).toBe(true);
				expect(e.statement, fichier).not.toContain('```');
			}
		}
	});

	it('décimaux à la française, comme à l’écran : virgule dans les formules et les réponses', () => {
		for (const { fichier, modele: m } of lireLot('tests/fixtures/lot-questions-decimaux')) {
			for (const e of exemplesDuModele(m).exemples) {
				const textes = [
					e.statement,
					e.answer,
					...e.steps,
					...(e.choices ?? []).map((c) => c.content)
				];
				const formules = textes.flatMap((t) => t.match(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g) ?? []);
				expect(formules.length, fichier).toBeGreaterThan(0);
				for (const f of [...formules, e.answer])
					expect(f, `${fichier} v${e.variation}`).not.toMatch(/\d\.\d/);
				expect(textes.join(' '), fichier).toMatch(/\d\{,\}\d/);
			}
		}
	});

	it('reproductible : deux appels donnent les mêmes exemples', () => {
		const m = modele('02-rends-la-monnaie.json');
		expect(exemplesDuModele(m)).toEqual(exemplesDuModele(m));
	});

	it('convention « expression » : la formule reçoit sa case, comme à l’écran', () => {
		const [e] = exemplesDuModele(modele('05-ajouter-1-ou-2.json')).exemples;
		expect(e.statement).toMatch(/^Calcule\.\n\n\$\$\d+ \+ [12] = \\placeholder\[0\]\{\}\$\$$/);
		expect(e.statement).not.toContain('<<expr:');
		expect(e.answer).toMatch(/^\d+$/);
	});

	it('case de texte {{blank:N}} : la même case que dans une formule', () => {
		const [e] = exemplesDuModele(modele('04-lire-l-heure.json')).exemples;
		expect(e.statement).toContain('Il est $\\placeholder[0]{}$ h.');
		expect(e.statement).not.toContain('{{blank');
	});

	it('QCM : les choix et le bon, aucune réponse de case', () => {
		const { exemples } = exemplesDuModele(modele('03-qui-a-le-plus.json'));
		for (const e of exemples) {
			expect(e.choices?.filter((c) => c.bon)).toHaveLength(1);
			expect(e.answer).toBe('');
		}
	});

	it('à construire : la construction juste accompagne l’exemple', () => {
		const { exemples } = exemplesDuModele(modele('01-construis-le-nombre.json'));
		for (const e of exemples) expect(e.solution).toContain('Une construction juste');
	});

	it('bloc non dessiné : signalé une fois pour le modèle', () => {
		const r = exemplesDuModele(modele('07-addition-posee.json'));
		expect(r.nonDessines).toEqual(['operation']);
	});
});

describe('ficheDuModele', () => {
	const m = modele('01-construis-le-nombre.json');

	it('réunit le fichier, la base et les bornes du point', () => {
		const f = ficheDuModele(m, BASE, BORNES);
		expect(f).toMatchObject({
			id: BASE.id,
			code: 'CP-002',
			titre: 'Construis le nombre',
			rangement: BASE.rangement,
			niveau: 1,
			statut: 'draft',
			libelle: 'Lire et écrire les nombres.',
			bornes: ['Nombres jusqu’à 100.', 'Cardinal ≤ 100.'],
			alertes: []
		});
		expect(f.exemples).toHaveLength(m.variations.length);
		expect(f.specs).toHaveLength(m.testSpecs?.length ?? 0);
		expect(f.variables[0]).toMatch(/^v1 : /);
	});

	it('écrit les réponses des specs en formules ($…$), que la page rend en KaTeX', () => {
		const f = ficheDuModele(m, BASE, BORNES);
		const spec = m.testSpecs?.[0];
		expect(spec?.answers?.length).toBeGreaterThan(0);
		expect(f.specs[0]).toBe(
			`${spec?.description} : ${spec?.answers?.map((a) => `$${a}$`).join(', ')} → ${spec?.expected.status}`
		);
	});

	it('signale un modèle sans point et sans nœud', () => {
		const f = ficheDuModele(m, { ...BASE, codes: [], rangement: null }, BORNES);
		expect(f.alertes).toEqual(['sans point', 'sans nœud']);
		expect(f.code).toBe('—');
		expect(f.bornes).toEqual([]);
	});

	it('signale deux points d’un même programme (ADR 0020) et un point absent des bornes', () => {
		expect(ficheDuModele(m, { ...BASE, codes: ['CP-002', 'CP-005'] }, BORNES).alertes).toEqual([
			'2 points de CP (ADR 0020 : un par programme)',
			'point CP-005 absent des bornes'
		]);
		expect(ficheDuModele(m, { ...BASE, codes: ['CP-999'] }, BORNES).alertes).toEqual([
			'point CP-999 absent des bornes'
		]);
	});

	it('un point par programme est permis : chaque borne dit son point', () => {
		const bornes = {
			...BORNES,
			'CE1-004': { libelle: 'Comparer des nombres.', bornes: [{ borne: 'Jusqu’à 1000.' }] }
		};
		const f = ficheDuModele(m, { ...BASE, codes: ['CE1-004', 'CP-002'] }, bornes);
		expect(f.alertes).toEqual([]);
		expect(f.libelle).toBe(
			'CE1-004 : Comparer des nombres. · CP-002 : Lire et écrire les nombres.'
		);
		expect(f.bornes).toContain('CP-002 : Nombres jusqu’à 100.');
		expect(f.bornes).toContain('CE1-004 : Jusqu’à 1000.');
	});

	it('signale un niveau en base différent du fichier, et montre celui de la base', () => {
		const f = ficheDuModele(m, { ...BASE, niveau: 3 }, BORNES);
		expect(f.alertes).toEqual(['niveau 3 en base, 1 dans le fichier']);
		expect(f.niveau).toBe(3);
	});

	it('signale un bloc non dessiné', () => {
		const f = ficheDuModele(modele('07-addition-posee.json'), BASE, BORNES);
		expect(f.alertes).toContain("bloc operation non dessiné : le jouer dans l'aperçu");
	});
});

describe('cheminDuNoeud', () => {
	const arbre = new Map([
		['b', { name: 'Nombres et calculs', parent_id: null }],
		['n', { name: 'Entiers : numération', parent_id: 'b' }],
		['s', { name: 'dénombrement', parent_id: 'n' }]
	]);

	it('remonte de la sous-notion à la branche', () => {
		expect(cheminDuNoeud('s', arbre)).toBe(
			'Nombres et calculs > Entiers : numération > dénombrement'
		);
		expect(cheminDuNoeud('n', arbre)).toBe('Nombres et calculs > Entiers : numération');
	});

	it('nœud inconnu : null', () => {
		expect(cheminDuNoeud('x', arbre)).toBeNull();
	});
});

describe('assemblerPage', () => {
	const gabarit = readFileSync('scripts/questions/page-a-cocher.html', 'utf8');
	const fiche: Fiche = ficheDuModele(modele('05-ajouter-1-ou-2.json'), BASE, BORNES);

	it('remplit le titre (échappé), l’introduction (HTML) et les fiches', () => {
		const page = assemblerPage(gabarit, {
			titre: 'Relecture CP — lot <A>',
			intro: 'Deux modèles <strong>neufs</strong>.',
			fiches: [fiche]
		});
		expect(page).toContain('<title>Relecture CP — lot &lt;A&gt;</title>');
		expect(page).toContain('<h1>Relecture CP — lot &lt;A&gt;</h1>');
		expect(page).toContain('<p class="intro">Deux modèles <strong>neufs</strong>.</p>');
		expect(page).not.toContain('@@TITRE@@');
		expect(page).not.toContain('@@MODELES@@');
		const donnees = /const MODELES = (\[.*\]);/.exec(page)?.[1];
		expect(JSON.parse(donnees ?? 'null')).toEqual([fiche]);
	});

	it('une donnée qui contient </script> ne ferme pas le script du gabarit', () => {
		const page = assemblerPage(gabarit, {
			titre: 't',
			intro: '',
			fiches: [{ ...fiche, titre: '</script><b>' }]
		});
		// autant de fermetures que dans le gabarit (KaTeX + script de la page) : aucune venue des données
		expect(page.match(/<\/script>/g)).toHaveLength(gabarit.match(/<\/script>/g)?.length ?? 0);
		expect(page).not.toContain('</script><b>');
	});

	it('une donnée qui contient <!-- reste une donnée', () => {
		const page = assemblerPage(gabarit, {
			titre: 't',
			intro: '',
			fiches: [{ ...fiche, titre: '<!--<script>' }]
		});
		const donnees = /const MODELES = (\[.*\]);/.exec(page)?.[1] ?? '';
		expect(donnees).not.toContain('<!--');
		expect(JSON.parse(donnees)[0].titre).toBe('<!--<script>');
	});

	it('une introduction avec « $ » reste telle quelle (pas de motif de remplacement)', () => {
		const page = assemblerPage(gabarit, { titre: 't', intro: 'Prix : 5 $& $1', fiches: [] });
		expect(page).toContain('<p class="intro">Prix : 5 $& $1</p>');
	});

	it('refuse un gabarit sans ses marques', () => {
		expect(() =>
			assemblerPage('<p>@@TITRE@@ @@INTRO@@</p>', { titre: 't', intro: '', fiches: [] })
		).toThrow(/marque \/\*@@MODELES@@\*\//);
	});
});
