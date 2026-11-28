/**
 * Liens de la navigation publique : la barre latérale (`Sidebar.svelte`, grand écran) et le
 * tiroir mobile (`Header.svelte`) lisent cette seule liste, pour qu'un lien ajouté à l'une
 * ne manque pas à l'autre (écart L46).
 */
import {
	Home,
	Gamepad2,
	PenTool,
	Terminal,
	Turtle,
	Blocks,
	Calculator,
	Laugh,
	FlaskConical,
	Zap,
	Newspaper,
	KeyRound
} from '@lucide/svelte';
import type { LucideIcon } from '@lucide/svelte';

// Types
/** Rubrique de la barre latérale : « serious » par défaut, « fun » à part. Le tiroir l'ignore. */
export type NavSection = 'serious' | 'fun';

export type NavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	roles?: string[];
	section?: NavSection;
};

// Constantes
export const PUBLIC_NAV_ITEMS: NavItem[] = [
	{ label: 'Accueil', href: '/', icon: Home },
	// D14 (décision de David, 2026-10-12) : les deux pages publiques les plus vivantes
	{ label: 'Automaths', href: '/automaths', icon: Zap },
	{ label: 'Jeux', href: '/games', icon: Gamepad2 },
	{
		label: 'Python',
		href: '/python',
		icon: Terminal,
		roles: ['student', 'teacher']
	},
	// La Tortue (chantier blockly, PR 3) : publique, aucune donnée serveur
	{ label: 'La Tortue', href: '/tortue', icon: Turtle },
	// Programmes de calcul (chantier blockly) : publique, aucune donnée serveur
	{ label: 'Programmes de calcul', href: '/programmes-de-calcul', icon: Blocks },
	{ label: 'Upsilon', href: '/upsilon', icon: Calculator },
	// Sans `roles` : l'atelier, Automaths et le Shtam ne lisent aucune donnée serveur
	// réservée, ils sont donc ouverts, y compris hors connexion.
	// L'atelier est l'entrée unique du grapheur (`/grapheur` y mène encore,
	// ouvert sur le Graphe) : décision G1 de David, 2026-10-04.
	{ label: 'Atelier', href: '/atelier', icon: FlaskConical },
	// Le Cabinet Noir de Turingrad : public, aucune donnée serveur
	{ label: 'Chiffrement', href: '/chiffrement', icon: KeyRound },
	{ label: 'Le Shtam', href: '/shtam', icon: Newspaper },
	{
		label: 'Whiteboard',
		href: '/whiteboard',
		icon: PenTool,
		roles: ['teacher']
	},
	{
		label: 'Zygomatics',
		href: '/presques-evaluations',
		icon: Laugh,
		section: 'fun'
	}
];

// Functions
/**
 * Un lien est surligné si l'adresse est la sienne ou commence par elle + `/` : un article
 * du Shtam surligne « Le Shtam ». « Accueil » (`/`) ne l'est que sur `/`. Même règle pour
 * la barre latérale et le tiroir (écart V75).
 */
export function isNavItemActive(href: string, pathname: string): boolean {
	if (pathname === href) return true;
	return href !== '/' && pathname.startsWith(href + '/');
}
