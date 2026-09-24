/**
 * La vue Calcul, vue depuis l'écran.
 *
 * Le parcours que le lot promet : je définis une fonction, je l'évalue sans la
 * redéclarer, je garde un résultat sous un nom, et je le retrouve dans « Mes
 * objets ».
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

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

		// Les actions n'apparaissent que sur l'objet SÉLECTIONNÉ : il faut donc
		// d'abord cliquer la carte, comme le ferait l'élève.
		const carte = [...view.container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'f'
		) as HTMLElement | undefined;
		expect(carte, 'carte de f').toBeTruthy();
		carte!.querySelector('button')?.click();
		await settle();

		const bouton = [...carte!.querySelectorAll('button')].find((b) =>
			b.textContent?.trim().startsWith(label)
		) as HTMLButtonElement | undefined;
		expect(bouton, `bouton « ${label} »`).toBeTruthy();
		bouton!.click();
		await settle();
		return view;
	}

	it('« Dériver » écrit une ligne dans l’historique', async () => {
		const { container } = await clickAction('Dériver');

		expect(container.querySelector('.historique')?.textContent).toContain('2x');
	});

	it('et bascule sur la vue Calcul pour qu’on voie la réponse', async () => {
		const { container } = await clickAction('Dériver');

		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Calcul');
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

		const carte = [...view.container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'L'
		) as HTMLElement;
		carte.querySelector('button')?.click();
		await settle();
		const bouton = [...carte.querySelectorAll('button')].find((b) =>
			b.textContent?.trim().startsWith('Statistiques')
		) as HTMLButtonElement;
		expect(bouton, 'bouton Statistiques').toBeTruthy();
		expect(bouton.disabled).toBe(false);
		bouton.click();
		await settle();

		expect(view.container.querySelector('.historique')?.textContent).toMatch(/Médiane/);
	});

	it('« Image d’un nombre » prépare la saisie', async () => {
		const { field } = await clickAction('Image');

		expect(field.value).toBe('f(');
	});
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

	// ⚠️ Visible et DÉSACTIVÉE avec sa raison, jamais cachée — sinon l'élève
	// conclut que l'outil ne sait pas faire. Les commandes qui écrivent dans le
	// moteur sont dans ce cas : dans l'atelier, les noms viennent du panneau.
	it('désactive une commande indisponible sans la cacher', async () => {
		const { type, container } = await open();

		await type('.pose');

		const bouton = container.querySelector('.commandes button') as HTMLButtonElement;
		expect(bouton.disabled).toBe(true);
		expect(bouton.textContent).toContain('panneau');
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
