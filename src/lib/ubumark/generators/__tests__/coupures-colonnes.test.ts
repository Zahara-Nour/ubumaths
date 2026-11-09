/**
 * Coupures de colonne et de page dans le PDF (chantier coupures-pdf, 2026-11-09)
 * ==============================================================================
 *
 * Mise en page RÉELLE, par le compilateur typst.ts de la production : on lit dans
 * le document compilé la page et la colonne de sondes posées dans le Typst produit.
 *
 * Règle (décision de David) : un paragraphe d'introduction reste collé au bloc qui
 * le suit (dessin, formule…) seulement quand la coupure tomberait en fin de PAGE.
 * En fin de colonne qui n'est pas la dernière de la page, l'introduction reste en
 * bas et le bloc commence en haut de la colonne suivante : les deux morceaux sont
 * sur la même feuille. Une fiche à une colonne garde l'ancien comportement.
 *
 * Le bloc qui suit l'introduction est une formule centrée remplacée, dans le Typst
 * produit, par un rectangle insécable de 8 cm : la place libre en bas de colonne
 * (remplissage `#v`) est trop petite pour lui.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

type Compilateur = ReturnType<typeof createTypstCompiler>;

/** Sonde lue dans le PDF : page (1, 2…) et colonne (1 = gauche, 2 = droite) */
interface Place {
	page: number;
	colonne: number;
}

// Largeur d'une page A4, en points
const A4_LARGEUR_PT = 595.28;
const PAGE_A4 = '#set page(paper: "a4")';
const FIN_EN_TETE = '// ubumark: fin de l’en-tête\n';
const BLOC_HAUT = 'block(breakable: false, rect(width: 100%, height: 8cm))';

let compilateur: Compilateur;

beforeAll(async () => {
	const wasm = readFileSync(
		resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
	);
	const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
		(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
	);
	// Hors réseau (cf. qr-typst-compilation.test.ts)
	vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
	compilateur = createTypstCompiler();
	await compilateur.init({
		getModule: () => wasm,
		beforeBuild: [loadFonts(fonts, { assets: false })]
	});
}, 120_000);

/**
 * Compile `source` et rend la valeur des `metadata` étiquetés `<place>`. La requête
 * se fait sur le document compilé du même passage (`query` de typst.ts seul ne
 * compile pas).
 */
async function interroger<T>(source: string): Promise<T[]> {
	compilateur.addSource('/main.typ', source);
	return compilateur.runWithWorld({ mainFilePath: '/main.typ' }, async (monde) => {
		const { diagnostics } = await monde.compile({ diagnostics: 'full' });
		// Ni erreur ni avertissement (« layout did not converge » compris), sauf la police
		// du texte, absente hors réseau
		const signales = (diagnostics ?? []).filter(
			(d: { message: string }) => !d.message.startsWith('unknown font family')
		);
		expect(signales).toEqual([]);
		return monde.query({ selector: '<place>', field: 'value' }) as Promise<T[]>;
	});
}

/** Remplace une chaîne qui doit être présente (sinon le test ne prouverait rien) */
function remplacer(source: string, avant: string, apres: string): string {
	expect(source, `« ${avant} » absent du Typst produit`).toContain(avant);
	return source.split(avant).join(apres);
}

/**
 * Compile `markdown` sur `colonnes` colonnes, après `remplissage` cm d'espace vide
 * (dans la 2e colonne si `colonneDeDepart` vaut 2), et rend la place de chaque sonde.
 * Sondes : les mots `INTRO`, `PHRASE` (sonde dans le texte) et les formules `FIG`,
 * `FORM` (remplacées par un bloc insécable de 8 cm, sonde en tête).
 */
async function placer(
	markdown: string,
	{
		colonnes,
		remplissage,
		colonneDeDepart = 1
	}: { colonnes: number; remplissage: number; colonneDeDepart?: number }
): Promise<Record<string, Place>> {
	let source = generateTypst(parseMarkdown(markdown));
	source = remplacer(source, PAGE_A4, `#set page(paper: "a4", columns: ${colonnes})`);
	const depart = colonneDeDepart === 2 ? '#colbreak()\n' : '';
	source = remplacer(source, FIN_EN_TETE, `${FIN_EN_TETE}${depart}#v(${remplissage}cm)\n`);
	for (const [mot, typstMath] of [
		['FIG', '$ F I G $'],
		['FORM', '$ F O R M $']
	]) {
		if (source.includes(typstMath))
			source = source.split(typstMath).join(`#metadata("${mot}") <sonde>\n#${BLOC_HAUT}`);
	}
	source = source.replace(/\b(INTRO\d*|PHRASE\d*)\b/g, '#metadata("$1") <sonde>$1');
	source +=
		'\n#context for m in query(<sonde>) [#metadata((m.value, m.location().page(), m.location().position().x / 1pt)) <place>]\n';
	const lignes = await interroger<[string, number, number]>(source);
	return Object.fromEntries(
		lignes.map(([nom, page, x]) => [nom, { page, colonne: x > A4_LARGEUR_PT / 2 ? 2 : 1 }])
	);
}

const INTRO_DESSIN = ['INTRO du dessin :', '', '$$FIG$$', '', 'Suite.'].join('\n');
const QUESTION_FORMULE = ['1. PHRASE de la question :', '', '   $$FORM$$', '', '2. Autre'].join(
	'\n'
);

describe("introduction et bloc qui la suit (paragraphe de l'énoncé)", () => {
	it('fin de colonne 1 sur deux colonnes : introduction en bas, dessin en haut de la colonne 2', async () => {
		const p = await placer(INTRO_DESSIN, { colonnes: 2, remplissage: 22 });
		expect(p.INTRO).toEqual({ page: 1, colonne: 1 });
		expect(p.FIG).toEqual({ page: 1, colonne: 2 });
	}, 120_000);

	it('fin de page (colonne 2) : introduction et dessin partent ensemble sur la page suivante', async () => {
		const p = await placer(INTRO_DESSIN, { colonnes: 2, remplissage: 22, colonneDeDepart: 2 });
		expect(p.INTRO).toEqual({ page: 2, colonne: 1 });
		expect(p.FIG).toEqual({ page: 2, colonne: 1 });
	}, 120_000);

	it('une seule colonne : comportement inchangé, ensemble sur la page suivante', async () => {
		const p = await placer(INTRO_DESSIN, { colonnes: 1, remplissage: 22 });
		expect(p.INTRO.page).toBe(2);
		expect(p.FIG.page).toBe(2);
	}, 120_000);
});

describe('question : numéro et première phrase, puis une formule', () => {
	it('fin de colonne 1 : numéro et phrase en bas, formule en haut de la colonne 2', async () => {
		const p = await placer(QUESTION_FORMULE, { colonnes: 2, remplissage: 22 });
		expect(p.PHRASE).toEqual({ page: 1, colonne: 1 });
		expect(p.FORM).toEqual({ page: 1, colonne: 2 });
	}, 120_000);

	it('fin de page : numéro, phrase et formule ensemble sur la page suivante', async () => {
		const p = await placer(QUESTION_FORMULE, { colonnes: 2, remplissage: 22, colonneDeDepart: 2 });
		expect(p.PHRASE).toEqual({ page: 2, colonne: 1 });
		expect(p.FORM).toEqual({ page: 2, colonne: 1 });
	}, 120_000);
});

describe('titre de partie dans un énoncé (relecture de #2518)', () => {
	// La 1re chaîne est en haut de la colonne 1 ; « Partie B », son introduction et
	// sa formule tombent en bas de la colonne 2 (dernière) : ils doivent partir
	// ensemble, d'après un marqueur posé avant le titre, pas d'après celui, périmé,
	// de la colonne 1
	it('fin de page : titre, introduction et formule ensemble sur la page suivante', async () => {
		let source = generateTypst(
			parseMarkdown(
				['ZERO :', '', '$$FIG$$', '', '## Partie B', '', 'INTRO :', '', '$$FORM$$'].join('\n')
			)
		);
		source = remplacer(source, PAGE_A4, '#set page(paper: "a4", columns: 2)');
		source = source.replace(
			/(#place\(left[^\n]*\n)?== Partie B/,
			'#colbreak()\n#v(21cm)\n$1== Partie B'
		);
		source = source.replace('$ F I G $', `#${BLOC_HAUT}`);
		source = remplacer(source, '$ F O R M $', `#metadata("FORM") <sonde>\n#${BLOC_HAUT}`);
		source = remplacer(source, 'INTRO :', '#metadata("INTRO") <sonde>INTRO :');
		source +=
			'\n#context for m in query(<sonde>) [#metadata((m.value, m.location().page())) <place>]\n';
		const page = Object.fromEntries(await interroger<[string, number]>(source));
		expect(page.FORM).toBe(2);
		expect(page.INTRO).toBe(2);
	}, 120_000);
});

describe('liste en grille (`:colonnes`, relecture de #2518)', () => {
	it('un seul marqueur, avant la grille, aucun dans ses cellules', () => {
		const source = generateTypst(
			parseMarkdown([':colonnes 2', '1. A :', '', '   $$x$$', '2. B :', '', '   $$y$$'].join('\n'))
		);
		const grille = source.indexOf('#grid(');
		expect(grille).toBeGreaterThan(-1);
		expect(source.slice(grille)).not.toContain('<ubu-coupure>');
		expect(source.slice(0, grille).trimEnd().endsWith('<ubu-coupure>]))')).toBe(true);
	});
});

describe('beaucoup de décisions dans un même document', () => {
	it("jamais d'introduction séparée de son dessin par un changement de page", async () => {
		const morceaux = Array.from({ length: 12 }, (_, k) =>
			[`INTRO${k} ${'mot '.repeat(15 + ((k * 7) % 40))}:`, '', '$$FIG$$', ''].join('\n')
		);
		let source = generateTypst(parseMarkdown(morceaux.join('\n')));
		source = remplacer(source, PAGE_A4, '#set page(paper: "a4", columns: 2)');
		// Chaque formule devient un bloc insécable de hauteur variable, sonde FIGk en tête
		let k = 0;
		source = source.replace(/\$ F I G \$/g, () => {
			const n = k++;
			return `#metadata("FIG${n}") <sonde>\n#block(breakable: false, rect(width: 100%, height: ${3 + ((n * 5) % 7)}cm))`;
		});
		source = source.replace(/\b(INTRO\d+)\b/g, '#metadata("$1") <sonde>$1');
		source +=
			'\n#context for m in query(<sonde>) [#metadata((m.value, m.location().page())) <place>]\n';
		const lignes = await interroger<[string, number]>(source);
		const page = Object.fromEntries(lignes);
		expect(Object.keys(page)).toHaveLength(24);
		for (let n = 0; n < 12; n++) expect(page[`FIG${n}`], `FIG${n}`).toBe(page[`INTRO${n}`]);
	}, 120_000);
});

describe("titre d'exercice : jamais seul en bas de page (§ 5 du journal)", () => {
	// Fiche 41737393 : « 4 Lire les variations » seul en bas de page. Titre et bloc de
	// l'énoncé tels que les pose `render-exercise.ts` ; le début de l'énoncé part sur
	// la page suivante (bloc insécable de 8 cm), le titre doit le suivre. Typst ne
	// fait suivre le titre que si le premier morceau de l'énoncé est vide : un dessin
	// `cetz` (un `layout` centré, imité ici) y laissait une trace.
	const TITRE =
		'#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[#metadata("TITRE") <sonde>Exercice 4]';
	const ENONCE = '#block(width: 100%, inset: 0pt, above: 0.5em)[';
	const ENONCE_INDISPENSABLE =
		'#block(width: 100%, inset: (left: 8pt), above: 0.5em, stroke: (left: 2pt + rgb("#f97316")))[';
	const DESSIN = `align(center, layout(ly => ${BLOC_HAUT}))`;

	async function pagesApresTitre(
		markdown: string,
		{ enonce = ENONCE, bloc = BLOC_HAUT }: { enonce?: string; bloc?: string } = {}
	): Promise<Record<string, number>> {
		const genere = generateTypst(parseMarkdown(markdown), { chainedStart: true });
		const [enTete, corps] = genere.split(FIN_EN_TETE);
		let source =
			remplacer(enTete, PAGE_A4, '#set page(paper: "a4", columns: 2)') +
			`${FIN_EN_TETE}#colbreak()\n#v(22cm)\n${TITRE}\n${enonce}\n${corps}\n]\n`;
		source = remplacer(source, '$ F O R M $', `#metadata("FORM") <sonde>\n#${bloc}`);
		source = source.replace(/\b(PHRASE|INTRO)\b/, '#metadata("$1") <sonde>$1');
		source +=
			'\n#context for m in query(<sonde>) [#metadata((m.value, m.location().page())) <place>]\n';
		return Object.fromEntries(await interroger<[string, number]>(source));
	}

	const QUESTION_BLOC = ['1. $$FORM$$', '', '   Suite', '', '2. Autre'].join('\n');
	const INTRO_QUESTION_BLOC = ['INTRO :', '', QUESTION_BLOC].join('\n');
	const CAS: [string, string, string][] = [
		['question dont la tête est collée à une formule', QUESTION_FORMULE, BLOC_HAUT],
		['question dont la tête est collée à un dessin', QUESTION_FORMULE, DESSIN],
		['question qui commence par une formule', QUESTION_BLOC, BLOC_HAUT],
		['question qui commence par un dessin', QUESTION_BLOC, DESSIN],
		['énoncé qui commence par un dessin', ['$$FORM$$', '', 'Suite.'].join('\n'), DESSIN],
		[
			"paragraphe d'introduction collé à une formule",
			INTRO_DESSIN.replace('FIG', 'FORM'),
			BLOC_HAUT
		],
		['introduction, puis une question qui commence par un dessin', INTRO_QUESTION_BLOC, DESSIN]
	];
	for (const [nom, markdown, bloc] of CAS) {
		it(`${nom} : le titre suit sur la page suivante`, async () => {
			const page = await pagesApresTitre(markdown, { bloc });
			expect(page.FORM).toBe(2);
			expect(page.TITRE).toBe(2);
			if (page.PHRASE !== undefined) expect(page.PHRASE).toBe(2);
			if (page.INTRO !== undefined) expect(page.INTRO).toBe(2);
		}, 120_000);
	}

	it('exercice indispensable (filet à gauche), tête collée à un dessin : idem', async () => {
		const page = await pagesApresTitre(QUESTION_FORMULE, {
			enonce: ENONCE_INDISPENSABLE,
			bloc: DESSIN
		});
		expect(page.FORM).toBe(2);
		expect(page.PHRASE).toBe(2);
		expect(page.TITRE).toBe(2);
	}, 120_000);
});

describe('espacement des items : identique à leur ancienne définition', () => {
	// Les items ont été réécrits (blocs vides, `v` faible) pour que le titre suive ;
	// leur espacement doit rester celui de `block(spacing: 1.5em)`, le plus grand
	// l'emportant sur celui du voisin (gabarit : `block(spacing: 1.8em)`)
	const ANCIENS = [
		'#let ubu-item(num, body, w: "a)", tete: none) = context { let n = measure(w).width + 0.5em; let ligne(x) = [#h(-n)#box(width: n - 0.5em, align(end, num))#h(0.5em)#x]; block(spacing: 1.5em, pad(left: n, if tete == none { ligne(body) } else { block(sticky: ubu-colle(), ligne(tete)); body })) }',
		'#let ubu-item-bloc(num, body, w: "a)") = context { let n = measure(w).width + 0.5em; block(spacing: 1.5em, grid(columns: (n, 1fr), box(width: n - 0.5em, align(end, num)), body)) }'
	];

	it('paragraphes, têtes collées, blocs, sous-items, introduction collée', async () => {
		const markdown = [
			'Paragraphe S1.',
			'',
			'1. S2 question',
			'2. S3 tête :',
			'',
			'   $$FORM$$',
			'',
			'   S4 suite',
			'3. $$FORM$$',
			'4. S5 question',
			'   1. S6 sous-question',
			'   2. S7 sous-tête :',
			'',
			'      $$FORM$$',
			'',
			'S8 introduction :',
			'',
			'1. S9 question',
			'',
			'$$FORM$$',
			'',
			'1. S10 après un bloc',
			'2. $$FORM$$',
			'3. S11 dernière'
		].join('\n');
		const genere = remplacer(
			remplacer(
				generateTypst(parseMarkdown(markdown)),
				PAGE_A4,
				'#set page(paper: "a4", columns: 2)\n#set block(spacing: 1.8em)'
			),
			'$ F O R M $',
			'#block(breakable: false, rect(width: 100%, height: 2cm))'
		);
		const sonde = (source: string) =>
			source
				.replace(/\b(S\d+)\b/g, '#metadata("$1") <sonde>$1')
				// Numéro d'un item qui commence par un bloc (posé par `place`) : sondé aussi
				.replace(
					/#ubu-item-bloc\(numbering\("([^"]+)", (\d+)\)/g,
					'#ubu-item-bloc([#metadata("N$2") <sonde>#numbering("$1", $2)]'
				) +
			'\n#context for m in query(<sonde>) [#metadata((m.value, m.location().page(), calc.round(m.location().position().x / 1pt, digits: 2), calc.round(m.location().position().y / 1pt, digits: 2))) <place>]\n';
		const lignes = genere.split('\n');
		const ancien = lignes
			.map((l) =>
				l.startsWith('#let ubu-item(')
					? ANCIENS[0]
					: l.startsWith('#let ubu-item-bloc(')
						? ANCIENS[1]
						: l
			)
			.join('\n');
		expect(ancien).not.toBe(genere);
		const nouveau = await interroger<[string, number, number, number]>(sonde(genere));
		const reference = await interroger<[string, number, number, number]>(sonde(ancien));
		expect(nouveau).toHaveLength(13);
		expect(nouveau).toEqual(reference);
	}, 120_000);
});
