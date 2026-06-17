/**
 * Dashboard navigation configuration
 * ----------------------------------
 * Returns the list of navigation items for the dashboard rail sidebar,
 * filtered by role. Used by both desktop rail and the MobileNavDrawer.
 *
 * Decoupled from `+layout.svelte` so it can be unit-tested.
 */

import {
	LayoutDashboard,
	Users,
	ShoppingBag,
	School,
	Settings,
	Gift,
	Clock,
	Sparkles,
	Bug,
	MessageCircle,
	BookOpen,
	FileText,
	Book,
	Layers,
	ListTodo,
	Code,
	ShieldAlert,
	Package,
	GraduationCap,
	Kanban,
	Target,
	ClipboardList,
	Brain,
	User as UserIcon,
	LogOut
} from '@lucide/svelte';
import type { LucideIcon } from '@lucide/svelte';

export type DashboardNavLink = {
	href: string;
	label: string;
	icon: LucideIcon;
	badge?: number;
	/** Marks footer items (Mon profil, Déconnexion) rendered after a separator. */
	footer?: boolean;
	/** When true, the link triggers logout instead of navigation. */
	logout?: boolean;
};

export type DashboardRole = 'student' | 'teacher' | 'admin';

/**
 * Zone title displayed in the dashboard header, replacing the generic
 * "Dashboard" label. Drives the mental model "you are in Mon espace".
 */
export function getZoneTitle(role: DashboardRole | string): string {
	if (role === 'student') return 'Mon espace';
	if (role === 'teacher') return 'Espace enseignant';
	if (role === 'admin') return 'Administration';
	return 'Mon espace';
}

const footerLinks: DashboardNavLink[] = [
	{ href: '/dashboard/profile', label: 'Mon profil', icon: UserIcon, footer: true },
	{ href: '/auth/logout', label: 'Déconnexion', icon: LogOut, footer: true, logout: true }
];

export function getNavLinks(
	role: DashboardRole | string,
	pendingVipRequestsCount: number = 0,
	marketplaceEnabled: boolean = false
): DashboardNavLink[] {
	const common: DashboardNavLink[] = [
		{ href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard }
	];

	if (role === 'student') {
		const links: DashboardNavLink[] = [
			...common,
			{ href: '/dashboard/student/cours', label: 'Mes cours', icon: Book },
			{ href: '/dashboard/student/objectifs', label: 'Mes objectifs', icon: Target },
			{ href: '/dashboard/student/competences', label: 'Mes compétences math', icon: Brain },
			{ href: '/dashboard/student/work', label: 'Mon travail', icon: ListTodo },
			{
				href: '/dashboard/student/cahier-texte',
				label: 'Cahier de textes',
				icon: BookOpen
			},
			{ href: '/dashboard/friends', label: 'Amis', icon: Users },
			{ href: '/dashboard/chat', label: 'Chat', icon: MessageCircle }
		];

		if (marketplaceEnabled) {
			links.push({
				href: '/dashboard/student/marketplace',
				label: 'Boutique',
				icon: ShoppingBag
			});
		}

		links.push(
			{ href: '/dashboard/student/inventory', label: 'Inventaire', icon: Package },
			{ href: '/dashboard/bug-reports', label: 'Mes Signalements', icon: Bug },
			...footerLinks
		);
		return links;
	}

	if (role === 'teacher') {
		return [
			...common,
			{ href: '/dashboard/teacher/classes', label: 'Classes', icon: GraduationCap },
			{ href: '/dashboard/teacher/cours', label: 'Mes cours', icon: Book },
			{
				href: '/dashboard/teacher/cahier-texte',
				label: 'Cahier de textes',
				icon: BookOpen
			},
			{ href: '/dashboard/teacher/contenu', label: 'Mes contenus', icon: Layers },
			{
				href: '/dashboard/teacher/evaluation-tasks',
				label: "Tâches d'évaluation",
				icon: ClipboardList
			},
			{ href: '/python-exercises/mine', label: 'Mes exercices Python', icon: Code },
			{
				href: '/dashboard/teacher/gamification',
				label: 'Récompenses',
				icon: Gift,
				badge: pendingVipRequestsCount > 0 ? pendingVipRequestsCount : undefined
			},
			{ href: '/dashboard/teacher/moderation', label: 'Modération', icon: ShieldAlert },
			{ href: '/dashboard/friends', label: 'Amis', icon: Users },
			{ href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
			...footerLinks
		];
	}

	if (role === 'admin') {
		return [
			...common,
			{ href: '/dashboard/admin/schools', label: 'Schools', icon: School },
			{ href: '/dashboard/admin/users', label: 'Users', icon: Users },
			{ href: '/dashboard/admin/classes', label: 'Classes', icon: GraduationCap },
			{ href: '/dashboard/admin/questions', label: 'Questions', icon: BookOpen },
			{ href: '/dashboard/admin/vip-cards', label: 'VIP Cards', icon: Sparkles },
			{ href: '/dashboard/admin/bug-reports', label: 'Bug Reports', icon: Bug },
			// Personal kanban board(s) for tracking site-wide work (features,
			// bugs, roadmap). RLS already lets admins own + manage their own
			// boards out of the box; this link is the only thing they were
			// missing to reach it without typing the URL.
			{ href: '/organisation/kanban', label: 'Suivi du site', icon: Kanban },
			{ href: '/dashboard/admin/cron', label: 'CRON Jobs', icon: Clock },
			{ href: '/dashboard/admin/docs', label: 'Documentation', icon: FileText },
			{ href: '/dashboard/admin/debug/database', label: 'Debug', icon: Settings },
			{ href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
			...footerLinks
		];
	}

	return [...common, ...footerLinks];
}
