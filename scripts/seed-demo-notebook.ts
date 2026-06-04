/**
 * Seed a feature-tour notebook for the first teacher in the DB.
 *
 * The notebook exercises every UI feature we shipped on the Python
 * notebook subsystem:
 *   - markdown h1/h2/h3 → outline sidebar (`ListTree` toggle)
 *   - long stdout output → 20-line fold + "Afficher les N lignes
 *     masquées" toggle
 *   - 3 checkpoint modes (assert / unit_test / variable_check)
 *   - teacher-authored `hint` on 3 checkpoints → "Voir l'indice"
 *     button appears after 2 failed Vérifier clicks
 *   - sleep loop → elapsed-time badge ("Exécution… 3s")
 *   - several short code cells → drag-and-drop reordering
 *   - any code edit after a run → blue "modified" dot
 *   - teacher "Vue élève" toggle works on this notebook regardless
 *
 * Usage:  pnpm tsx scripts/seed-demo-notebook.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const NOTEBOOK_TITLE = 'Démo — Statistiques descriptives (tour des features)';

let cellCounter = 0;
function cellId(): string {
	cellCounter += 1;
	return `cell-${Date.now()}-demo-${cellCounter}`;
}

function md(source: string) {
	return {
		id: cellId(),
		type: 'markdown' as const,
		source,
		execution_count: null,
		outputs: [],
		state: 'idle' as const
	};
}

function code(source: string) {
	return {
		id: cellId(),
		type: 'code' as const,
		source,
		execution_count: null,
		outputs: [],
		state: 'idle' as const
	};
}

function checkpointAssert(title: string, code: string, hint?: string) {
	return {
		id: cellId(),
		type: 'checkpoint' as const,
		source: code,
		execution_count: null,
		outputs: [],
		state: 'idle' as const,
		title,
		checkpoint: { mode: 'assert' as const, code },
		...(hint ? { hint } : {})
	};
}

function checkpointUnitTest(
	title: string,
	functionName: string,
	testCases: Array<{ args: unknown[]; expected: unknown }>,
	hint?: string
) {
	return {
		id: cellId(),
		type: 'checkpoint' as const,
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle' as const,
		title,
		checkpoint: {
			mode: 'unit_test' as const,
			function_name: functionName,
			test_cases: testCases
		},
		...(hint ? { hint } : {})
	};
}

function checkpointVariableCheck(
	title: string,
	expectedVars: Record<string, unknown>,
	hint?: string
) {
	return {
		id: cellId(),
		type: 'checkpoint' as const,
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle' as const,
		title,
		checkpoint: { mode: 'variable_check' as const, expected_vars: expectedVars },
		...(hint ? { hint } : {})
	};
}

async function main(): Promise<void> {
	console.log('🔍 Locating the first teacher...');
	const { data: teacher, error: teacherErr } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email, created_at')
		.eq('role', 'teacher')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (teacherErr) {
		console.error('❌ Failed to fetch teachers:', teacherErr);
		process.exit(1);
	}
	if (!teacher) {
		console.error('❌ No teacher found in profiles. Seed at least one first.');
		process.exit(1);
	}

	const teacherLabel =
		`${teacher.firstname ?? ''} ${teacher.lastname ?? ''}`.trim() || teacher.email;
	console.log(`✅ Target teacher: ${teacherLabel} (${teacher.id})`);

	const now = new Date().toISOString();

	const cells = [
		md(
			`# Statistiques descriptives en Python\n\nCe notebook fait le **tour des features** mises en place sur les notebooks UbuMaths. Tu peux le suivre cellule par cellule pour voir chaque outil en action.\n\n> **Astuce sommaire** : clique sur l'icône d'arborescence en haut à gauche pour ouvrir le sommaire et naviguer entre les parties.\n\n> **Astuce indice** : sur certains checkpoints, si tu rates la vérification **deux fois**, un bouton **« Voir l'indice »** apparaît avec un coup de pouce du prof. Essaie de te tromper exprès sur la médiane ou la variance pour voir !`
		),

		md(`## Partie 1 — La moyenne arithmétique`),

		md(
			`La moyenne d'une liste de valeurs est la somme de ces valeurs divisée par leur nombre. Commence par exécuter la cellule suivante : elle définit une fonction \`moyenne\`.`
		),

		code(
			`def moyenne(lst):\n    """Retourne la moyenne arithmétique d'une liste de nombres."""\n    return sum(lst) / len(lst)\n\nprint("Fonction moyenne définie.")\n`
		),

		checkpointUnitTest('Vérifier la fonction moyenne', 'moyenne', [
			{ args: [[1, 2, 3]], expected: 2 },
			{ args: [[10, 20, 30, 40]], expected: 25 },
			{ args: [[5]], expected: 5 }
		]),

		md(`## Partie 2 — La médiane`),

		md(
			`La médiane est la valeur qui sépare l'échantillon en deux moitiés. Complète puis exécute :`
		),

		code(
			`def mediane(lst):\n    """Retourne la médiane d'une liste de nombres (triée puis prise au milieu)."""\n    triee = sorted(lst)\n    n = len(triee)\n    if n % 2 == 1:\n        return triee[n // 2]\n    return (triee[n // 2 - 1] + triee[n // 2]) / 2\n\nprint(mediane([3, 1, 2]))\nprint(mediane([4, 1, 3, 2]))\n`
		),

		checkpointUnitTest(
			'Vérifier la fonction médiane',
			'mediane',
			[
				{ args: [[1, 2, 3]], expected: 2 },
				{ args: [[1, 2, 3, 4]], expected: 2.5 },
				{ args: [[7]], expected: 7 }
			],
			"Deux pièges classiques :\n\n1. Pense à **trier la liste** avant de prendre la valeur du milieu (sinon mediane([3, 1, 2]) renvoie 1).\n2. Quand la liste a une longueur **paire**, la médiane est la **moyenne des deux valeurs centrales**, pas l'une des deux."
		),

		md(`## Partie 3 — L'écart-type\n\nOn procède en deux étapes : variance puis racine carrée.`),

		md(
			`### Rappel des formules\n\nPour un échantillon $(x_1, x_2, \\dots, x_n)$, on définit :\n\n- la **moyenne** par $$\\overline{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$\n- la **variance** par $$V = \\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\overline{x})^2$$\n- l'**écart-type** par $$\\sigma = \\sqrt{V}$$\n\nEn syntaxe UbuMaths (plus rapide à taper au tableau), on peut aussi écrire la moyenne ~m = (x_1 + x_2 + ... + x_n) / n~ et la variance ~~V = ((x_1 - m)^2 + ... + (x_n - m)^2) / n~~.\n\n> Remarque : on divise par $n$ (variance d'un échantillon observé), pas par $n-1$ (estimateur sans biais).`
		),

		md(`### Étape 3.1 — La variance`),

		code(
			`def variance(lst):\n    """Variance d'un échantillon (moyenne des écarts au carré)."""\n    m = moyenne(lst)\n    return sum((x - m) ** 2 for x in lst) / len(lst)\n\nprint(variance([1, 2, 3, 4, 5]))\n`
		),

		checkpointAssert(
			'Vérifier la variance sur un exemple',
			`assert abs(variance([1, 2, 3, 4, 5]) - 2.0) < 1e-9\nassert variance([5, 5, 5]) == 0\n`,
			"Rappel : la variance est la **moyenne des écarts au carré** par rapport à la moyenne.\n\n- Étape 1 : calcule la moyenne `m = moyenne(lst)`.\n- Étape 2 : somme des `(x - m) ** 2` pour chaque `x` dans `lst`.\n- Étape 3 : divise par `len(lst)` (variance d'un échantillon, pas n - 1)."
		),

		md(`### Étape 3.2 — La racine carrée`),

		code(
			`import math\n\ndef ecart_type(lst):\n    """Écart-type d'un échantillon = racine carrée de la variance."""\n    return math.sqrt(variance(lst))\n\nresultat = ecart_type([1, 2, 3, 4, 5])\nprint(f"Écart-type = {resultat:.4f}")\n`
		),

		checkpointUnitTest(
			'Vérifier la fonction écart-type',
			'ecart_type',
			[
				{ args: [[1, 2, 3, 4, 5]], expected: 1.4142135623730951 },
				{ args: [[5, 5, 5]], expected: 0 }
			],
			"L'écart-type est la **racine carrée de la variance** (pas la variance elle-même).\n\nUtilise `math.sqrt(variance(lst))` — n'oublie pas `import math` en haut de la cellule."
		),

		md(
			`## Partie 4 — Variables stockées\n\nCalculons quelques indicateurs sur un échantillon concret. Le checkpoint qui suit vérifie les **valeurs des variables** plutôt qu'une fonction.`
		),

		code(
			`echantillon = [12, 15, 14, 10, 18, 11, 13, 16, 17, 14]\n\nm = moyenne(echantillon)\nmed = mediane(echantillon)\nsigma = round(ecart_type(echantillon), 2)\n\nprint(f"Moyenne   : {m}")\nprint(f"Médiane   : {med}")\nprint(f"Écart-type: {sigma}")\n`
		),

		checkpointVariableCheck('Vérifier les indicateurs', {
			m: 14,
			med: 14,
			sigma: 2.45
		}),

		md(
			`## Partie 5 — Sortie longue (test du fold)\n\nLa cellule suivante imprime 60 lignes. Le notebook **plie** automatiquement la sortie à 20 lignes — clique sur **Afficher les N lignes masquées** pour tout voir.`
		),

		code(
			`# Table de multiplication étendue (60 lignes)\nfor i in range(1, 13):\n    for j in range(1, 6):\n        print(f"{i:2} x {j} = {i * j:3}")\n`
		),

		md(
			`## Partie 6 — Cellule lente (test du timer)\n\nLa cellule suivante attend 4 secondes pour simuler un long calcul. Après 2 s, tu verras apparaître **Exécution… 3s** sous la cellule.`
		),

		code(
			`import time\n\nprint("Démarrage d'un long calcul…")\ntime.sleep(4)\nprint("Terminé !")\n`
		),

		md(
			`## Partie 7 — À toi de jouer\n\n- **Réordonne** les cellules par glisser-déposer (icône grip à droite quand tu survoles).\n- **Édite** une cellule code après exécution → un **point bleu** apparaît dans la gouttière à côté du \`[In N]\`.\n- **Vue élève** (bouton en haut à droite) bascule le notebook en mode démonstration : les checkpoints fonctionnent mais ne sont pas enregistrés dans le tableau de résultats.\n- **Indices** : en mode élève, casse exprès la fonction \`mediane\` (par exemple en oubliant le \`sorted\`) et clique deux fois sur **Vérifier** — le bouton **« Voir l'indice »** apparaît avec un coup de pouce. En mode édition, le champ **Indice (optionnel)** sous le titre de chaque checkpoint te permet de personnaliser ce message.`
		)
	];

	const content = {
		version: '1.0' as const,
		metadata: {
			title: NOTEBOOK_TITLE,
			created_at: now,
			updated_at: now
		},
		cells
	};

	console.log(`\n📓 Building notebook with ${cells.length} cells…`);

	const { data: inserted, error: insertErr } = await supabase
		.from('python_notebooks')
		.insert({
			title: NOTEBOOK_TITLE,
			description:
				'Tour complet des features du module Notebook UbuMaths : outline, fold, checkpoints, timer, drag-and-drop, dirty indicator.',
			author_id: teacher.id,
			is_public: false,
			// `content` is JSONB in the DB; supabase-js stringifies on insert.
			content:
				content as unknown as Database['public']['Tables']['python_notebooks']['Insert']['content']
		})
		.select('id, title')
		.single();

	if (insertErr) {
		console.error('❌ Failed to insert notebook:', insertErr);
		process.exit(1);
	}

	console.log(`\n✅ Notebook créé : ${inserted.title}`);
	console.log(`   Notebook ID    : ${inserted.id}`);
	console.log(`   URL locale     : http://localhost:5173/python-notebook/${inserted.id}`);
	console.log(`   Auteur         : ${teacherLabel}`);
}

main().catch((err) => {
	console.error('❌ Unexpected error:', err);
	process.exit(1);
});
