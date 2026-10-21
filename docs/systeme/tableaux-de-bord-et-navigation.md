---
couvre:
  - 'src/routes/(protected)/dashboard/+layout.svelte'
  - 'src/routes/(protected)/dashboard/+layout.server.ts'
  - 'src/routes/(protected)/dashboard/+page.svelte'
  - 'src/routes/(protected)/dashboard/+page.server.ts'
  - 'src/routes/(protected)/dashboard/StudentDashboard.svelte'
  - 'src/routes/(protected)/dashboard/TeacherDashboard.svelte'
  - 'src/routes/(protected)/dashboard/AdminDashboard.svelte'
  - src/lib/config/dashboard-nav.ts
  - 'src/lib/components/navigation/**'
---

# Tableaux de bord et navigation

> Vérifié contre le code le 2026-10-12 ; tuile « Ma progression » le 2026-10-21.

## À quoi ça sert

Toutes les pages sous `/dashboard` partagent une coquille : un en-tête, une barre latérale
d'icônes (un tiroir sur mobile) et une zone de contenu. `/dashboard` lui-même est l'**accueil**,
avec un écran par rôle : élève, prof, admin.

Cette doc couvre la navigation (en-tête, barre latérale, onglets de rubrique, bouton retour) et les
trois accueils. Le reste de la coquille a sa doc ou attend la sienne :

- realtime, notifications, présence : [realtime.md](realtime.md) ;
- caches des tableaux de bord, layouts par rôle (`dashboard/{admin,student,teacher}/+layout*`),
  en-tête public, modales, squelettes : pas encore documentés (`trous` de
  `scripts/doc-a-jour.config.ts`, note « coquille de l’app, caches »).

La règle du bouton retour (quand, où, vers quelle page) est dans
[composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire).

## Carte du code

| Fichier                                                                       | Rôle                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(protected)/dashboard/+layout.server.ts`                          | Pour tous : la date de l'Almanach du jour, calculée au serveur (fuseau de Paris, pas d'écart à l'hydratation). Prof : nombre de demandes d'activation de cartes VIP en attente. Élève : marché ouvert ou non. Une lecture en échec rend 0 ou `false`, journalisé. |
| `src/routes/(protected)/dashboard/+layout.svelte`                             | En-tête, barre latérale, tiroir mobile, zone de contenu, bouton de signalement de bug. Ses parties realtime sont décrites dans [realtime.md](realtime.md).                                                                                                        |
| `src/lib/config/dashboard-nav.ts`                                             | `getZoneTitle` (nom de l'espace), `getNavLinks` (liens par rôle), `isNavLinkActive` (lien surligné). Hors du layout pour être testé.                                                                                                                              |
| `src/lib/components/navigation/MobileNavDrawer.svelte`                        | Tiroir mobile : les mêmes liens, plus le thème et la taille du texte. Aussi utilisé par le layout de `/messages`, avec ses propres liens.                                                                                                                         |
| `src/lib/components/navigation/GroupedRouteLayout.svelte`                     | Libellé de rubrique et onglets (Mes contenus, Gamification, Modération) ; un onglet est actif sur toute adresse qui commence par la sienne.                                                                                                                       |
| `src/lib/components/navigation/BackLink.svelte`                               | Bouton retour, voir [composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire).                                                                                                                                             |
| `src/routes/(protected)/dashboard/+page.server.ts`                            | Données des accueils : semaine de l'école et périodes scolaires (prof, élève) ; pour l'élève, boîte de travail, progression et nombre d'énigmes résolues.                                                                                                         |
| `src/routes/(protected)/dashboard/+page.svelte`                               | Choisit l'accueil d'après `profile.role`.                                                                                                                                                                                                                         |
| `StudentDashboard.svelte`, `TeacherDashboard.svelte`, `AdminDashboard.svelte` | Les trois accueils (même dossier).                                                                                                                                                                                                                                |

## L'en-tête

De gauche à droite : le menu (mobile), la gidouille (lien vers l'accueil du site, `/`), le nom de l'espace
(« Mon cabinet », « Espace enseignant », « Administration ») avec la date de l'Almanach dessous, la
bascule du mode test (profs), l'avatar (lien vers le profil), puis sur ordinateur la taille du
texte, le thème et le plein écran. Le nom de l'espace n'est pas un titre : le seul `h1` est celui
de la page.

Couleur de fond selon le rôle du profil (élève, prof, admin).

## La barre latérale

- **Les liens dépendent du rôle de navigation** : `admin` si le profil est admin ou si une
  élévation admin est active (`adminElevation`, voir [auth.md](auth.md)), sinon le rôle du profil.
- **Élève** : accueil, Mes cours, Ma progression, Mon travail, Cahier de textes, amis, Chat, le
  marché s'il est ouvert, la Chatterie (Mathoux, [mathoux.md](mathoux.md)), inventaire, Mes
  Signalements.
- **Prof** : accueil, Classes, Mes cours, Cahier de textes, Programme, Avancement, Mes contenus,
  Recherche, observations, export des compétences, Séries, Contrôles en ligne, Mes exercices
  Python, Figures (figures géométriques stockées), Gamification (badge : demandes de cartes VIP en attente), Modération, amis, Chat,
  Administration. Ce dernier lien renvoie un prof non élevé vers l'écran d'élévation
  (`dashboard/admin/+layout.server.ts`).
- **Admin** : accueil, Administration et ses pages (écoles, utilisateurs, classes, questions,
  dictionnaire, cartes VIP, signalements, suivi du site, tâches CRON, documentation, débogage,
  réglages).
- **Pied**, sous un séparateur : Mon profil, Déconnexion.
- **Surlignage** (`isNavLinkActive`) : un lien est surligné sur sa propre adresse, et seulement
  elle. Exception : les entrées de `ACTIVE_PREFIXES` restent surlignées sur toute adresse qui
  commence par l'un de leurs préfixes. Ce sont les rubriques (débogage, docs et signalements de
  l'admin, Mes contenus, Figures, Gamification, Modération, signalements) et **Mon travail**, qui couvre
  aussi les listes complètes de fiches (`/dashboard/student/worksheets`) et de contrôles
  (`/dashboard/student/assessments`) : elles s'ouvrent depuis lui et y reviennent (#1121).

## La zone de contenu

Largeur `max-w-4xl`, sauf le tableau d'échange du marché (`/marketplace/trade/`), en pleine
largeur. Pendant une navigation, la page se masque derrière un squelette choisi d'après l'adresse
(`getSkeletonType`, `src/lib/utils/skeleton-detector.ts`).

Son `<main>` porte l'ancre `contenu-principal` (`tabindex="-1"`) : le lien d'évitement « Aller au
contenu » du layout racine (`src/routes/+layout.svelte`, WCAG 2.4.1, K19 D18 du 2026-10-12) y
mène, après l'en-tête et la barre latérale du tableau de bord. Hors tableau de bord, c'est le
`<main>` racine qui porte l'ancre ; sur le tableau de bord il la lui cède (une seule à la fois).
Test : `src/lib/__tests__/accessibilite-k19.test.ts`.

## Les trois accueils

`+page.svelte` choisit l'écran d'après `profile.role`, pas d'après le rôle de navigation : un prof
en élévation admin garde l'accueil prof. Un rôle inconnu affiche un message d'erreur.

### Élève (`StudentDashboard.svelte`)

Dans l'ordre :

1. **Travail urgent** (`InboxWidget`) : en retard et à rendre cette semaine, cinq au plus. La
   boîte entière est sur « Mon travail » (`getStudentWorkInbox`).
2. **Tuile « Ma progression »** vers `/dashboard/student/progression`, si l'élève a un
   programme pour son niveau ou une compétence observée. Elle compte les notions atteintes et en
   cours. Ses chiffres viennent de `$lib/server/progression`, la même source que la page. Une lecture en échec retire la tuile
   sans fermer l'accueil.
3. **Tuile « Énigmes »** vers `/dashboard/student/riddles`, seule entrée vers les énigmes
   (#1121). Elle affiche le nombre d'énigmes résolues (`riddle_attempts` où `is_correct`), ou
   « Découvre les énigmes » à zéro. Elle ne promet pas d'énigme du jour : certains jours n'en ont
   pas.
4. **Récompenses** (`RewardsBlock`) : gidouilles, bonus, cartes VIP, avertissements de la période
   en cours, lus dans le cache élève (`studentCache`), chargé au montage.

Les listes de l'espace élève absentes de la barre latérale ont chacune une entrée : fiches et
contrôles depuis « Mon travail », énigmes depuis cet accueil.

### Prof (`TeacherDashboard.svelte`)

- La période scolaire en cours.
- **Ma classe** : choix de la classe (retenu dans le navigateur, store `selectedClass`) et
  « Trouver ma classe ». Ce bouton cherche la classe dont l'emploi du temps correspond au jour et
  à l'heure, d'après la semaine de l'école (`weekConfig`). Un week-end, une absence de classe ou
  d'emploi du temps donnent un message.
- **Boutons de classe** : la roue de la fortune (tirage d'un élève, `Wheel`) et cinq cartes VIP
  (`VipCardUseDialog` : Batman & Robin, Mathémagie, Jeu, Help !, Trou de mémoire).
- **Élèves de la classe** (`StudentQuickActionsTable`) : le journal d'un élève s'ouvre avec
  `?depuis=accueil` et y revient.
- Lien vers les decks SRS.

Classes et périodes viennent de `/api/teacher/classes` et `/api/teacher/periods`, gardées dans le
cache prof (`teacherCache`).

### Admin (`AdminDashboard.svelte`)

La santé du système, lue dans `/api/admin/health-stats` (statistiques mises en cache au serveur,
`healthStats.ts`, voir [serveur.md](serveur.md)) : état critique, activité des utilisateurs,
performance et erreurs, contenu et activité, tâches de fond. Chargée à l'ouverture ; bouton
« Actualiser » ; actualisation automatique toutes les 2 minutes quand elle est cochée.

## Invariants

- **Un seul `h1` par page.** Le nom de l'espace dans l'en-tête et le libellé de
  `GroupedRouteLayout` sont des libellés. Les accueils élève et prof ont un `h1` masqué
  « Tableau de bord », l'accueil admin un `h1` visible.
- **Pas de bouton retour** sur une page qu'on ouvre depuis la barre latérale ou un onglet de
  rubrique ([composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)).
- **Toute liste de l'espace élève a une entrée** : dans la barre latérale, sur l'accueil, ou sur
  sa page parente (#1121).
- **Tuile-lien de l'accueil** : la carte (`Card.Root`), opaque, recouvre le fond du lien. Le
  survol colore donc la carte (`group` sur le lien, `group-hover:bg-accent/50` sur la carte) et le
  focus clavier est un anneau sur le lien (`focus-visible:ring-4 focus-visible:ring-ring/30`),
  jamais `focus:outline-none` seul.
- **Une tuile de résumé ne prive pas l'élève de son accueil** : une lecture en échec est
  journalisée et retombe sur un repli (pas de tuile, ou un compte à zéro).

## Comment étendre

- **Nouvelle entrée de la barre latérale** : `getNavLinks`. Si elle couvre des sous-pages, ajouter
  ses préfixes à `ACTIVE_PREFIXES` et un cas à `dashboard-nav.test.ts`.
- **Nouvelle page élève hors de la barre** : lui donner une entrée (tuile de l'accueil ou lien
  depuis sa page parente), et un `BackLink` vers ce parent si c'en est une sous-page.

## Tests

- `src/lib/config/__tests__/dashboard-nav.test.ts` : noms d'espace, liens par rôle, surlignage.
- `src/routes/(protected)/dashboard/student/__tests__/entrees-listes-eleve.svelte.test.ts` :
  entrées des fiches, des contrôles et des énigmes.
- `src/routes/(protected)/dashboard/__tests__/layout.server.test.ts` : date de l'Almanach.
- `src/lib/components/navigation/__tests__/` : `BackLink`, `GroupedRouteLayout`.
- `src/lib/__tests__/accessibilite-k19.test.ts` : lien d'évitement et ancre du contenu.

## Écarts connus

- **Requêtes sans affichage** : l'accueil élève charge encore les exercices récents et les succès
  du Démineur (`recentExercises`, `minesweeperAchievements`, `achievementStats`). Leurs blocs sont
  en commentaire dans `StudentDashboard.svelte`, donc deux requêtes pour rien à chaque accueil
  élève.
- `RewardsBlock` reçoit `riddlesSolved` sans s'en servir, depuis le retrait de son ancienne tuile
  (2025-12-08).
- **Commentaires d'en-tête périmés** : `TeacherDashboard.svelte` annonce `data.teacherClasses`
  (les classes viennent de `teacherCache`) ; `StudentDashboard.svelte` décrit des données
  « futures ».
- **Deux barres latérales** : `src/lib/components/Sidebar.svelte`, rendue par le layout racine, a
  sa propre fonction `isActive`, hors de cette doc.
