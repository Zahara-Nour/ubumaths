/**
 * La vue Calcul, vue depuis l'écran.
 *
 * Le parcours que le lot promet : je définis une fonction, je l'évalue sans la
 * redéclarer, je garde un résultat sous un nom, et je le retrouve dans « Mes
 * objets ».
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';
import { commandCatalog } from '$lib/atelier/commands';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

/** Laisser Svelte appliquer ses effets ET le DOM se mettre à jour. */
async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

async function open(atelier = new Atelier()) {
	const view = await render(AtelierContainer, { atelier, ephemeral: true });
	const field = view.container.querySelector('input[type="text"]') as HTMLInputElement;
	const form = view.container.querySelector('form') as HTMLFormElement;

	async function type(text: string) {
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
	}

	async function submit(text: string) {
		await type(text);
		form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		await settle();
	}

	// On rend explicitement ce que le helper expose, sans étaler `view`
	// (en vitest-browser-svelte 2.x, l'étalement copiait un `then` qui faisait
	// perdre `field` et `atelier` à l'`await` de l'appelant).
	return { container: view.container, atelier, field, type, submit };
}

describe('le parcours de la vue Calcul', () => {
	it('ouvre sur un champ de saisie', async () => {
		const { field } = await open();

		expect(field).toBeTruthy();
		expect(field.getAttribute('aria-label')).toContain('Calcul');
	});

	it('crée un objet quand on écrit une définition', async () => {
		const { atelier, submit, container } = await open();

		await submit('f(x) = x^2 - 3x + 1');

		expect(atelier.names).toEqual(['f']);
		// Et « Mes objets » le montre, sans que l'élève change de vue
		expect(container.textContent).toContain('f');
	});

	// LE point du lot : l'élève ne redéclare rien
	it('évalue une fonction du panneau sans la redéclarer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });
		const { submit, container } = await open(atelier);

		await submit('f(2)');

		// ⚠️ MathLive compose un vrai signe moins (U+2212), pas le tiret ASCII :
		// chercher « -1 » ferait échouer un rendu pourtant correct.
		expect(container.querySelector('.historique')?.textContent).toMatch(/[-\u2212]1/);
	});

	it('rend une fraction en mathématiques, pas en texte brut', async () => {
		const { submit, container } = await open();

		await submit('1/3 + 1/6');

		// MathLive compose la fraction : le texte brut « 1/2 » ne suffirait pas
		expect(container.querySelector('.math')).toBeTruthy();
	});

	it('garde un résultat sous un nom proposé', async () => {
		const { atelier, submit, container } = await open();
		await submit('1/3 + 1/6');

		const garder = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Garder')
		) as HTMLButtonElement;
		garder.click();
		await settle();

		expect(atelier.names.length).toBe(1);
		// ⚠️ `.retour`, pas `.avis` : le conteneur a sa propre région aria-live, et
		// interroger « .avis » lisait la sienne — vide — en croyant lire celle-ci.
		expect(container.querySelector('.retour')?.textContent).toContain('Gardé');
	});

	it('dit pourquoi quand une saisie est refusée', async () => {
		const { atelier, submit, container } = await open();

		await submit('x = 3');

		expect(atelier.names).toEqual([]);
		expect(container.querySelector('.refus')).toBeTruthy();
	});

	// Décision de David (2026-10-08, Q1) : une seule lettre est la variable.
	// L'ancienne indication « Calcul par rapport à x » n'a plus lieu d'être ;
	// une note visible avec la réponse reste couverte par « f′ existe déjà ».
	it('`.dériver t^2` montre la réponse en t, sans indication de variable', async () => {
		const { submit, container } = await open();

		await submit('.dériver t^2');

		const reponse = container.querySelector('.historique li .reponse');
		expect(reponse?.querySelector('.math')).toBeTruthy();
		expect(reponse?.textContent).not.toContain('Calcul par rapport à x');
	});

	// ⚠️ « f′ existe déjà » était collé au TEXTE de la ligne, que la vue
	// n'affiche pas quand la réponse se compose en mathématiques : invisible
	it('`.dériver f` une seconde fois dit, à l’écran, que f′ existe déjà', async () => {
		const { submit, container } = await open();

		await submit('f(x) = x^3');
		await submit('.dériver f');
		await submit('.dériver f');

		const lignes = [...container.querySelectorAll('.historique li .reponse')];
		const ligne = lignes.find((l) => l.textContent?.includes('existe déjà'));
		expect(ligne, 'une ligne qui dit « existe déjà »').toBeTruthy();
		expect(ligne?.querySelector('.math')).toBeTruthy();
	});
});

/**
 * ⚠️ Le bloquant trouvé en revue : le lot avait rendu « Dériver », « Résoudre »,
 * « Variations » et « Image d'un nombre » ACTIVES dans le panneau, mais aucun
 * composant n'appelait `runAction`. L'élève cliquait, et rien n'arrivait — pas
 * même le message « prochain lot » que le lot précédent affichait.
 */
describe('les actions du panneau répondent vraiment', () => {
	async function clickAction(label: string) {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });
		const view = await open(atelier);

		// Lot 3 de la refonte : les actions d'une fonction sont dans le menu de sa carte
		await chooseCardAction(view.container, 'f', label);
		await settle();
		return view;
	}

	it('« Dériver » écrit une ligne dans l’historique', async () => {
		const { container } = await clickAction('Dériver');

		expect(container.querySelector('.historique')?.textContent).toContain('2x');
	});

	// Même défaut par le bouton : la note était collée au texte, invisible
	it('« Dériver » une seconde fois dit, à l’écran, que f′ existe déjà', async () => {
		const { container } = await clickAction('Dériver');
		// Une seconde fois, par le même menu
		await chooseCardAction(container, 'f', 'Dériver');
		await settle();

		const lignes = [...container.querySelectorAll('.historique li .reponse')];
		const ligne = lignes.find((l) => l.textContent?.includes('existe déjà'));
		expect(ligne, 'une ligne qui dit « existe déjà »').toBeTruthy();
		expect(ligne?.querySelector('.math')).toBeTruthy();
	});

	it('et la réponse reste sous les yeux : la console ouverte ne se ferme pas', async () => {
		const { container } = await clickAction('Dériver');

		const console = container.querySelector('[role="region"][aria-label="Console"]');
		expect(console?.hasAttribute('inert')).toBe(false);
		expect(console?.querySelectorAll('.historique li').length).toBeGreaterThan(0);
	});

	it('« Variations » parle de la fonction, pas de son nom', async () => {
		const { container } = await clickAction('Variations');
		const historique = container.querySelector('.historique');

		// ⚠️ L'intention n'a pas changé — la ligne doit parler de la FONCTION —
		// mais sa forme, oui : le `3/2` venait du bloc texte du moteur
		// (« Points critiques : x = 3/2 »), retiré parce qu'il répétait le
		// tableau. Il y figure désormais, composé par MathLive, et la ligne
		// porte la dérivée.
		expect(historique?.querySelectorAll('table').length).toBeGreaterThan(0);
		expect(historique?.querySelector('.math')).not.toBeNull();
	});

	/**
	 * ⚠️ Même garde qu'au lot 3 : libérer une action dans `actions.ts` sans la
	 * brancher donne un bouton actif et muet. Ces trois-là viennent d'être
	 * libérées, donc elles doivent répondre.
	 */
	it('« Statistiques » répond sur une liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });
		const view = await open(atelier);

		// Lot 4a de la refonte : l'action est dans le menu de la carte
		await chooseCardAction(view.container, 'L', 'Statistiques');
		await settle();

		expect(view.container.querySelector('.historique')?.textContent).toMatch(/Médiane/);
	});

	// « Image d'un nombre » ne prépare plus la saisie de Calcul : c'est un champ
	// de la carte (phase 0 `/grapheur` §3 A4), testé dans
	// `actions-sans-bascule.svelte.test.ts`.
});

describe('les commandes se découvrent', () => {
	it('propose les commandes dès le point', async () => {
		const { type, container } = await open();

		await type('.');

		const liste = container.querySelector('.commandes');
		expect(liste).toBeTruthy();
		// Bien plus que les 8 écrites en dur dans /calc
		expect(liste!.querySelectorAll('button').length).toBeGreaterThan(4);
	});

	it('filtre sur ce qui est tapé', async () => {
		const { type, container } = await open();

		await type('.dér');

		const noms = [...container.querySelectorAll('.commandes .nom')].map((n) => n.textContent);
		expect(noms.some((n) => n?.includes('dériver'))).toBe(true);
	});

	it('décrit les commandes en français', async () => {
		const { type, container } = await open();

		await type('.dér');

		expect(container.querySelector('.commandes .quoi')?.textContent).toContain('Dériver');
	});

	// Les commandes qui écrivent dans le moteur n'existent pas dans l'atelier
	// (décision de David, 2026-10-13) : les noms viennent du panneau. Elles
	// étaient grisées dans la liste — et exécutées une fois tapées.
	it('ne propose pas une commande qui n’existe pas dans l’atelier', async () => {
		const { type, container } = await open();

		await type('.pose');

		const noms = [...container.querySelectorAll('.commandes .nom')].map((n) => n.textContent);
		expect(noms).not.toContain('.poser');
	});

	// `.taylor` était désactivée tant que le dispatch la tuait sur ses propres
	// arguments. Le correctif l'a rendue utilisable : elle doit redevenir active.
	it('propose .taylor, réparée', async () => {
		const { type, container } = await open();

		await type('.tay');

		const bouton = container.querySelector('.commandes button') as HTMLButtonElement;
		expect(bouton.disabled).toBe(false);
	});

	it('ne propose plus rien une fois la commande choisie', async () => {
		const { type, container } = await open();

		await type('.dériver x^2');

		expect(container.querySelector('.commandes')).toBeNull();
	});
});

// Outils statistiques v2, Q80 : le graphique d'une simulation sous la ligne
describe('les simulations dessinent sous la ligne', () => {
	it('.fréquence : une courbe VISIBLE dans l’historique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 0' });
		atelier.create({ kind: 'list', name: 'M', definition: '1/2 ; 1/2' });
		const { submit, container } = await open(atelier);

		await submit('.fréquence L M 300');
		const curve = container.querySelector<SVGPolylineElement>('.stat-polygone');

		expect(curve).not.toBeNull();
		expect(curve!.getBoundingClientRect().width).toBeGreaterThan(0);
		expect(container.textContent).toContain('espérance 1/2');
	});

	it('.échantillons : un histogramme dans l’historique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3 ; 4 ; 5 ; 6' });
		atelier.create({ kind: 'list', name: 'M', definition: '1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6' });
		const { submit, container } = await open(atelier);

		await submit('.échantillons L M 30 40');

		expect(container.querySelectorAll('.stat-rectangle').length).toBeGreaterThan(0);
	});
});

// Outils statistiques v2, Q89 : le tableau croisé sous la ligne de l'historique
describe('.croiser dessine le tableau sous la ligne', () => {
	it('un tableau accessible, cases et totaux lisibles', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: 'fille ; garçon ; fille' });
		atelier.create({ kind: 'list', name: 'M', definition: 'oui ; oui ; non' });
		const { submit, container } = await open(atelier);

		await submit('.croiser L M');
		const tableEl = container.querySelector('table.stat-tableau');

		expect(tableEl).not.toBeNull();
		expect(tableEl!.querySelector('caption')?.textContent?.trim()).toBe('Tableau croisé');
		// Une case précise (fille × oui = 1) et le coin lu par le lecteur d'écran
		const fille = [...tableEl!.querySelectorAll('tbody tr')].find(
			(row) => row.querySelector('th')?.textContent?.trim() === 'fille'
		);
		expect([...fille!.querySelectorAll('td')].map((td) => td.textContent?.trim())).toEqual([
			'1',
			'1',
			'2'
		]);
		expect(tableEl!.textContent).toContain('lignes : L, colonnes : M');
	});
});

describe('les lois dans l’historique (manche 13, PR c)', () => {
	it('`.exponentielle` montre la courbe de densité et son aire hachurée', async () => {
		const { submit, container } = await open();

		await submit('.exponentielle T 0,5 P(T ⩽ 2)');

		expect(container.querySelector('polyline.stat-densite')).not.toBeNull();
		expect(container.querySelector('polygon.stat-aire')).not.toBeNull();
	});
});

// =============================================================================
// Exporter l'historique (lot C1, `atelier-suppression-export-phase0.md`)
// =============================================================================

describe('exporter l’historique', () => {
	/**
	 * L'historique en ubumark, seul reste de la barre « Exporter l'historique »,
	 * est dans le menu de la console (lot 2 de `atelier-refonte-interface-phase0.md`) :
	 * l'atelier s'enregistre par la barre d'icônes.
	 */
	async function sheetLink(container: HTMLElement): Promise<HTMLElement> {
		const trigger = container.querySelector(
			'button[aria-label="Menu de la console"]'
		) as HTMLButtonElement;
		await userEvent.click(trigger);
		return vi.waitFor(() => {
			const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) =>
				i.textContent?.includes('Télécharger l’historique (ubumark)')
			);
			expect(item).toBeTruthy();
			return item!;
		});
	}

	it('plus de barre « Exporter l’historique » : ni JSON, ni rejeu dans la vue', async () => {
		const { container, submit } = await open();

		await submit('f(x)=x^2');

		expect(container.querySelector('.export')).toBeNull();
		expect(container.textContent).not.toContain('JSON (pour rejouer)');
		expect(container.textContent).not.toContain('Rejouer un historique');
	});

	it('historique vide : l’historique ubumark est indisponible dans le menu', async () => {
		const { container } = await open();

		const item = await sheetLink(container);
		expect(item.getAttribute('aria-disabled') ?? item.getAttribute('data-disabled')).not.toBeNull();
	});

	it('après une saisie, le menu télécharge l’historique en ubumark', async () => {
		const { container, submit } = await open();
		const downloads = watchDownloads();
		try {
			await submit('2+3');

			(await sheetLink(container)).click();

			await vi.waitFor(() => expect(downloads.files).toHaveLength(1));
			expect(downloads.files[0].name).toMatch(/^calcul-\d{4}-\d{2}-\d{2}\.md$/);
			expect(await downloads.files[0].blob.text()).toContain('2+3');
		} finally {
			downloads.restore();
		}
	});

	/** Les fichiers que la page a lancés en téléchargement, sans rien enregistrer. */
	function watchDownloads() {
		const files: { name: string; blob: Blob }[] = [];
		const blobs = new Map<string, Blob>();
		const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
			const url = `blob:test-${blobs.size}`;
			blobs.set(url, blob as Blob);
			return url;
		});
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			const blob = blobs.get(this.href);
			if (blob) files.push({ name: this.download, blob });
		});
		return {
			files,
			restore() {
				create.mockRestore();
				click.mockRestore();
			}
		};
	}

	it('`.exporter` tapé télécharge le même fichier JSON que le bouton (retrait de /cas)', async () => {
		const { container, submit } = await open();
		const downloads = watchDownloads();
		try {
			await submit('2+3');
			await submit('a = 5');
			await submit('.exporter');

			expect(downloads.files).toHaveLength(1);
			const [file] = downloads.files;
			expect(file.name).toMatch(/^calcul-\d{4}-\d{2}-\d{2}\.json$/);
			const content = JSON.parse(await file.blob.text());
			expect(content.format).toBe('chiphre-calcul');
			expect(content.entries.map((e: { label: string }) => e.label)).toEqual(['2+3', 'a = 5']);
			expect(container.querySelector('.retour')?.textContent).toContain('Historique exporté');
		} finally {
			downloads.restore();
		}
	});

	it('`.exporter` sur un historique vide : rien à exporter, et on le dit', async () => {
		const { container, submit } = await open();
		const downloads = watchDownloads();
		try {
			await submit('.exporter');

			expect(downloads.files).toEqual([]);
			expect(container.querySelector('.retour')?.textContent).toBe(
				'Rien à exporter pour l’instant.'
			);
		} finally {
			downloads.restore();
		}
	});
});

/**
 * Le clavier de Calcul (phase 0 `docs/wip/atelier-cas-phase0.md`, PR 1).
 *
 * ⚠️ De VRAIES frappes (`userEvent.keyboard`) : Entrée doit être empêchée
 * d'envoyer le formulaire, Tab de quitter le champ — un `KeyboardEvent`
 * fabriqué ne déclenche aucune de ces actions par défaut, et le test
 * passerait sur une vue qui les laisse faire.
 */
describe('le clavier de Calcul', () => {
	async function typing(keys: string, atelier = new Atelier()) {
		const opened = await open(atelier);
		await userEvent.click(opened.field);
		if (keys !== '') await userEvent.keyboard(keys);
		await settle();
		return opened;
	}

	const lines = (container: HTMLElement) => container.querySelectorAll('.historique > li').length;
	const highlighted = (container: HTMLElement) =>
		container.querySelector('.commandes [aria-selected="true"]');

	describe('↑ / ↓ rappellent les saisies', () => {
		it('↑ rappelle les saisies, ↓ redescend', async () => {
			const { field, submit } = await typing('');
			await submit('1+1');
			await submit('2+2');
			await userEvent.click(field);

			await userEvent.keyboard('{ArrowUp}');
			await settle();
			expect(field.value).toBe('2+2');
			await userEvent.keyboard('{ArrowUp}');
			await settle();
			expect(field.value).toBe('1+1');
			await userEvent.keyboard('{ArrowDown}');
			await settle();
			expect(field.value).toBe('2+2');
		});

		// Revue : une ligne rappelée qui commence par un point rouvrait la liste,
		// et `.pose` (aucune commande disponible) bloquait ↑ et ↓
		it('une commande rappelée n’ouvre pas la liste, et ↑ continue de remonter', async () => {
			const { field, submit, container } = await typing('');
			await submit('1+1');
			await submit('.pose');
			await userEvent.click(field);

			await userEvent.keyboard('{ArrowUp}');
			await settle();
			expect(field.value).toBe('.pose');
			expect(container.querySelector('.commandes')).toBeNull();

			await userEvent.keyboard('{ArrowUp}');
			await settle();
			expect(field.value).toBe('1+1');
		});

		it('le curseur se place à la fin de la ligne rappelée', async () => {
			const { field, submit } = await typing('');
			await submit('12+345');
			await userEvent.click(field);

			await userEvent.keyboard('{ArrowUp}');
			await settle();

			expect(field.selectionStart).toBe('12+345'.length);
			expect(field.selectionEnd).toBe('12+345'.length);
		});
	});

	describe('la liste des commandes au clavier', () => {
		it('le champ annonce la liste, et la première commande est surlignée', async () => {
			const { field, container } = await typing('.dé');

			expect(field.getAttribute('role')).toBe('combobox');
			expect(field.getAttribute('aria-expanded')).toBe('true');
			const first = highlighted(container);
			expect(first).toBeTruthy();
			expect(field.getAttribute('aria-activedescendant')).toBe(first!.id);
		});

		it('↓ parcourt la liste, et boucle', async () => {
			const { container } = await typing('.d');
			const available = [...container.querySelectorAll('.commandes [role="option"]')];
			expect(available.length).toBeGreaterThan(1);

			const seen: string[] = [];
			for (let i = 0; i < available.length; i++) {
				seen.push(highlighted(container)!.id);
				await userEvent.keyboard('{ArrowDown}');
				await settle();
			}

			expect(seen).toEqual(available.map((o) => o.id));
			// Revenu au début
			expect(highlighted(container)!.id).toBe(available[0].id);
		});

		it('↑ depuis la première commande va à la dernière disponible', async () => {
			const { container } = await typing('.d');
			const available = [...container.querySelectorAll('.commandes [role="option"]')];

			await userEvent.keyboard('{ArrowUp}');
			await settle();

			expect(highlighted(container)!.id).toBe(available.at(-1)!.id);
		});

		it('retaper le début d’une commande surligne de nouveau la première', async () => {
			const { container, type } = await typing('.d{ArrowDown}');
			const first = container.querySelector('.commandes [role="option"]');
			expect(highlighted(container)!.id).not.toBe(first!.id);

			await type('');
			await userEvent.keyboard('.d');
			await settle();

			expect(highlighted(container)!.id).toBe(first!.id);
		});

		it('↑ dans la liste ne rappelle pas une saisie', async () => {
			const { field, submit, container } = await typing('');
			await submit('1+1');
			await userEvent.click(field);
			await userEvent.keyboard('.dé');
			await settle();

			await userEvent.keyboard('{ArrowUp}');
			await settle();

			expect(field.value).toBe('.dé');
			expect(highlighted(container)).toBeTruthy();
		});

		it('Entrée choisit la commande surlignée, sans rien calculer', async () => {
			const { field, container } = await typing('.dér');

			await userEvent.keyboard('{Enter}');
			await settle();

			expect(field.value).toBe('.dériver ');
			expect(lines(container)).toBe(0);
			expect(container.querySelector('.commandes')).toBeNull();
		});

		// Décision de David (2026-10-11) : une commande complète qui se lance
		// sans argument ne demande pas deux Entrée
		it('Entrée lance une commande sans argument tapée en entier', async () => {
			const { field, container } = await typing('.aide');

			await userEvent.keyboard('{Enter}');
			await settle();

			expect(lines(container)).toBe(1);
			expect(field.value).toBe('');
		});

		it('mais choisit tant que son nom n’est pas complet', async () => {
			const { field, container } = await typing('.ai');

			await userEvent.keyboard('{Enter}');
			await settle();

			expect(field.value).toBe('.aide ');
			expect(lines(container)).toBe(0);
		});

		it('et choisit toujours une commande qui attend la suite, même tapée en entier', async () => {
			const { field, container } = await typing('.dériver');

			await userEvent.keyboard('{Enter}');
			await settle();

			expect(field.value).toBe('.dériver ');
			expect(lines(container)).toBe(0);
		});

		it('Tab choisit aussi, et le champ garde la main', async () => {
			const { field } = await typing('.dér');

			await userEvent.keyboard('{Tab}');
			await settle();

			expect(field.value).toBe('.dériver ');
			expect(document.activeElement).toBe(field);
		});

		it('Maj+Tab quitte le champ sans rien choisir', async () => {
			const { field } = await typing('.dér');

			await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
			await settle();

			expect(field.value).toBe('.dér');
			expect(document.activeElement).not.toBe(field);
		});

		it('Échap ferme la liste sans toucher au champ ; elle revient à la frappe suivante', async () => {
			const { field, container } = await typing('.dé');

			await userEvent.keyboard('{Escape}');
			await settle();
			expect(container.querySelector('.commandes')).toBeNull();
			expect(field.value).toBe('.dé');
			expect(field.getAttribute('aria-expanded')).toBe('false');

			await userEvent.keyboard('r');
			await settle();
			expect(container.querySelector('.commandes')).toBeTruthy();
		});

		it('sans commande proposée, Entrée calcule comme avant', async () => {
			const { container } = await typing('.zz');
			expect(container.querySelector('.commandes')).toBeNull();

			await userEvent.keyboard('{Enter}');
			await settle();

			expect(lines(container)).toBe(1);
		});
	});

	describe('le modèle de la commande choisie', () => {
		const taylor = commandCatalog(new WebReplEngine()).find((c) => c.french === 'taylor')!;

		it('s’affiche sous le champ une fois la commande choisie', async () => {
			const { container } = await typing('.tay{Enter}');

			expect(container.querySelector('.modele')?.textContent).toContain(taylor.example);
		});

		it('reste pendant qu’on tape la suite, part quand le champ est vidé', async () => {
			const { container, type } = await typing('.tay{Enter}sin(x)');
			expect(container.querySelector('.modele')?.textContent).toContain(taylor.example);

			await type('');

			expect(container.querySelector('.modele')).toBeNull();
		});

		// `.poser` n'existe pas dans l'atelier : aucun modèle à montrer
		it('ne s’affiche pas pour une commande qui n’existe pas', async () => {
			const { container } = await typing('.poser a');

			expect(container.querySelector('.modele')).toBeNull();
		});

		it('apparaît aussi pour une commande tapée en entier, raccourci compris', async () => {
			const derive = commandCatalog(new WebReplEngine()).find((c) => c.french === 'dériver')!;
			const { container } = await typing('.diff x');

			expect(container.querySelector('.modele')?.textContent).toContain(derive.example);
		});
	});
});

/**
 * Le bouton exact ⇄ décimal de chaque ligne (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 2). Un VRAI clic (`userEvent.click`).
 */
describe('le bouton valeur approchée', () => {
	const lastLine = (container: HTMLElement) =>
		[...container.querySelectorAll('.historique > li')].at(-1)!;
	const toggle = (line: Element) =>
		[...line.querySelectorAll('button')].find((b) =>
			/Valeur (approchée|exacte)/.test(b.textContent ?? '')
		);

	it('montre la valeur approchée, puis revient à l’exacte', async () => {
		const { submit, container } = await open();
		await submit('\\sqrt{2}/2');
		const line = lastLine(container);
		const exact = line.querySelector('.reponse')!.textContent;

		const button = toggle(line)!;
		expect(button.textContent).toContain('Valeur approchée');
		await userEvent.click(button);
		await settle();
		expect(line.querySelector('.reponse')!.textContent).toMatch(/0,7071/);
		expect(toggle(line)!.textContent).toContain('Valeur exacte');

		await userEvent.click(toggle(line)!);
		await settle();
		expect(line.querySelector('.reponse')!.textContent).toBe(exact);
	});

	it('pas de bouton sur un entier', async () => {
		const { submit, container } = await open();
		await submit('1+2');

		expect(toggle(lastLine(container))).toBeUndefined();
	});

	it('chaque ligne bascule seule', async () => {
		const { submit, container } = await open();
		await submit('\\sqrt{2}');
		await submit('\\sqrt{3}');
		const [first, second] = [...container.querySelectorAll('.historique > li')];

		await userEvent.click(toggle(second)!);
		await settle();

		expect(second.querySelector('.reponse')!.textContent).toMatch(/1,7321/);
		expect(first.querySelector('.reponse')!.textContent).not.toMatch(/1,4142/);
	});
});

/**
 * La complétion des fonctions et des lettres grecques (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 3). De VRAIES frappes : Tab ne doit pas
 * quitter le champ, et Entrée doit CALCULER même liste ouverte (décision de
 * David : `3ta` avec t et a dans le panneau donne 3·t·a, pas `3tan(`).
 */
describe('la complétion des fonctions et des lettres grecques', () => {
	async function typing(keys: string) {
		const opened = await open();
		await userEvent.click(opened.field);
		await userEvent.keyboard(keys);
		await settle();
		return opened;
	}
	const proposals = (container: HTMLElement) =>
		[...container.querySelectorAll('.propositions [role="option"]')].map(
			(o) => o.querySelector('.nom')?.textContent
		);
	const highlightedProposal = (container: HTMLElement) =>
		container.querySelector('.propositions [aria-selected="true"] .nom')?.textContent;

	it('`si` ouvre la liste, la première proposition surlignée', async () => {
		const { container, field } = await typing('si');

		expect(proposals(container)).toEqual(['sin(', 'sinh(', 'sign(', 'σ']);
		expect(highlightedProposal(container)).toBe('sin(');
		expect(field.getAttribute('aria-expanded')).toBe('true');
	});

	it('Tab insère, le curseur après, et le champ garde la main', async () => {
		const { field, container } = await typing('2si{Tab}');

		expect(field.value).toBe('2sin(');
		expect(field.selectionStart).toBe(5);
		expect(document.activeElement).toBe(field);
		expect(container.querySelector('.propositions')).toBeNull();
	});

	it('↓ puis Tab insère la proposition suivante', async () => {
		const { field } = await typing('si{ArrowDown}{Tab}');

		expect(field.value).toBe('sinh(');
	});

	it('une lettre grecque s’insère en symbole', async () => {
		const { field } = await typing('2al{Tab}');

		expect(field.value).toBe('2α');
	});

	it('Entrée calcule, même liste ouverte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 't', definition: '2' });
		atelier.create({ kind: 'value', name: 'a', definition: '5' });
		const opened = await open(atelier);
		await userEvent.click(opened.field);
		await userEvent.keyboard('3ta');
		await settle();
		expect(proposals(opened.container)).toContain('tan(');

		await userEvent.keyboard('{Enter}');
		await settle();

		expect(opened.field.value).toBe('');
		expect(opened.container.querySelector('.historique')?.textContent).toContain('30');
	});

	it('Échap ferme la liste ; elle revient à la frappe suivante', async () => {
		const { container } = await typing('co{Escape}');
		expect(container.querySelector('.propositions')).toBeNull();

		await userEvent.keyboard('s');
		await settle();
		expect(proposals(container)).toEqual(['cos(', 'cosh(']);
	});

	it('un clic insère aussi', async () => {
		const { field, container } = await typing('2al');
		const alpha = container.querySelector('.propositions [role="option"]') as HTMLElement;

		await userEvent.click(alpha);
		await settle();

		expect(field.value).toBe('2α');
	});

	// Le mot en cours est celui du CURSEUR : déplacé au clavier, il doit suivre
	it('au milieu du champ, le mot du curseur est complété', async () => {
		const { field } = await typing('co + 1{Home}{ArrowRight}{ArrowRight}');

		await userEvent.keyboard('{Tab}');
		await settle();

		expect(field.value).toBe('cos( + 1');
		expect(field.selectionStart).toBe(4);
	});

	// Revue : Cmd+← (Mac) ne donne pas de relâchement de touche, une sélection
	// à la souris peut finir hors du champ — le curseur RETENU était périmé, et
	// Tab insérait à l'ancienne place. Le curseur déplacé sans frappe ni clic :
	it('Tab complète le mot du curseur réel, même déplacé sans touche ni clic', async () => {
		const { field } = await typing('co + si');

		field.setSelectionRange(2, 2);
		await userEvent.keyboard('{Tab}');
		await settle();

		expect(field.value).toBe('cos( + si');
	});

	it('la liste suit un curseur déplacé sans touche ni clic', async () => {
		const { field, container } = await typing('co + 1');
		expect(container.querySelector('.propositions')).toBeNull();

		field.setSelectionRange(2, 2);
		await settle();

		expect(proposals(container)).toEqual(['cos(', 'cosh(']);
	});

	it('Retour arrière rouvre la liste sur le mot raccourci', async () => {
		const { container } = await typing('cox');
		expect(container.querySelector('.propositions')).toBeNull();

		await userEvent.keyboard('{Backspace}');
		await settle();

		expect(proposals(container)).toEqual(['cos(', 'cosh(']);
	});

	it('après un clic sur une proposition, le champ a la main, curseur après l’insertion', async () => {
		const { field, container } = await typing('co + 1{Home}{ArrowRight}{ArrowRight}');
		const cos = container.querySelector('.propositions [role="option"]') as HTMLElement;

		await userEvent.click(cos);
		await settle();

		expect(field.value).toBe('cos( + 1');
		expect(document.activeElement).toBe(field);
		expect(field.selectionStart).toBe(4);
	});

	it('dans le nom d’une commande, c’est la liste des commandes', async () => {
		const { container } = await typing('.si');

		expect(container.querySelector('.propositions')).toBeNull();
		expect(container.querySelector('.commandes')).toBeTruthy();
	});

	it('rien pour une lettre seule', async () => {
		const { container } = await typing('2x+a');

		expect(container.querySelector('.propositions')).toBeNull();
	});
});

/**
 * L'écriture d'une réponse à l'écran (phase 0 `docs/archive/wip/grandeurs-phase0.md`,
 * lot B) : mesuré avant, `π/3` s'affichait « 1/3π » en ligne ; `5[km]` est une
 * non-régression (son unité passe par l'arbre depuis le lot A).
 */
describe('une réponse s’écrit comme en mathématiques', () => {
	const lastAnswer = (container: HTMLElement) =>
		[...container.querySelectorAll('.historique > li .reponse')].at(-1)!;

	it('π/3 : une fraction empilée', async () => {
		const { submit, container } = await open();
		await submit('π/3');

		// π DANS la fraction : ⅓ π serait aussi une fraction empilée, mais sans π
		const fraction = lastAnswer(container).querySelector('.ML__mfrac');
		expect(fraction?.textContent).toContain('π');
	});

	it('5[km] : l’unité est affichée', async () => {
		const { submit, container } = await open();
		await submit('5[km]');

		expect(lastAnswer(container).textContent?.replace(/\s+/g, '')).toContain('km');
	});
});

describe('l’historique descend sur la nouvelle entrée (2026-10-23)', () => {
	it('après vingt calculs, le dernier est visible en bas', async () => {
		const { submit, container } = await open();
		const list = container.querySelector<HTMLElement>('.historique');
		if (list === null) throw new Error('pas d’historique');

		for (let n = 1; n <= 20; n++) await submit(`${n} + 1`);

		// L'historique déborde bel et bien : sinon le test ne prouverait rien
		expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
		await vi.waitFor(() =>
			expect(list.scrollTop + list.clientHeight).toBeGreaterThanOrEqual(list.scrollHeight - 1)
		);
	});
});
