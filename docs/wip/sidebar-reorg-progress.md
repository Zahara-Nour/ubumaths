# Réorganisation des sidebars — Progression

> **Objectif** : clarifier la distinction entre la zone publique (outils/jeux indépendants) et la zone perso (travail, classe, amis, récompenses) pour que les élèves comprennent immédiatement "à quoi sert le dashboard".

## Décisions de vocabulaire (validées par utilisateur)

| Zone                   | Nom retenu            |
| ---------------------- | --------------------- |
| Sidebar publique       | **Outils libres**     |
| Dashboard élève        | **Mon espace**        |
| Dashboard prof         | **Espace enseignant** |
| Dashboard admin        | **Administration**    |
| Premier item dashboard | **Tableau de bord**   |

### Renommages d'items

| Avant                | Après                |
| -------------------- | -------------------- |
| Dashboard            | Tableau de bord      |
| Cours (élève + prof) | Mes cours            |
| Contenu (prof)       | Mes contenus         |
| Python (prof)        | Mes exercices Python |
| Gamification (prof)  | Récompenses          |

### Items déplacés / retirés

- **Retirés de "Outils libres"** : Mon travail, Cahier (x2 student+teacher), Worksheets — c'étaient soit des doublons, soit des items perso mal placés.
- **Ajoutés à Mon espace et Espace enseignant** : Cahier de textes (n'y était pas).
- **Footer de chaque sidebar perso** : Mon profil + Déconnexion (séparés par un divider).

### Comportement de l'avatar

- Avatar header = **lien direct** vers `/dashboard` sur pages publiques, vers `/dashboard/profile` sur pages dashboard.
- Plus de dropdown.
- Conséquences :
  - Mobile : dark/light + taille texte → menu hamburger (public Header + dashboard MobileNavDrawer).
  - GDPR (Export, Supprimer mon compte) → page **Mon profil**.
  - Items redondants (Amis/Chat/Messages) supprimés du défunt dropdown.

### Ajustement architectural (découvert en Phase 0)

Les deux sidebars sont des **rails étroits** (w-20 = 80px) avec icône + mini-label. Y mettre un header textuel "OUTILS LIBRES" / "MON ESPACE" ne fonctionne pas visuellement.

**Décision** : le **label de zone va dans le header du haut**, pas dans la sidebar.

- Header public (`Header.svelte`) : sous-titre "Outils libres" sous "UbuMaths".
- Header dashboard (`+layout.svelte`) : titre "Mon espace" / "Espace enseignant" / "Administration" remplace le "Dashboard" hardcodé.

Cohérence : le rail conserve sa fonction visuelle de navigation, l'identité de zone est au-dessus dans le bandeau principal.

---

## Vérifications préalables (Phase 0)

✅ Routes Cahier de textes existent : `/dashboard/student/cahier-texte` et `/dashboard/teacher/cahier-texte`.
✅ Pages settings prof/admin existent : `/dashboard/teacher/settings`, `/dashboard/admin/settings`. Pas de settings élève.
✅ Pas de page profil dédiée — il faut créer `/dashboard/profile/+page.svelte` (placeholder + GDPR).
✅ Composant `MobileNavDrawer.svelte` existe pour dashboard mobile. Header public utilise un `Sheet.Root` inline.
✅ Test infra : `vitest-browser-svelte`, pattern minimal dans `src/routes/(public)/page.svelte.test.ts`.

---

## Phases

### Phase 0 — Vérifications préalables ✅ TERMINÉE

### Phase 1 — Sidebar publique "Outils libres" ✅ TERMINÉE

**Fichiers modifiés** :

- `src/lib/components/Sidebar.svelte` — retiré Mon travail, Cahier (×2), Worksheets de `items`. Nettoyé imports lucide (FileSpreadsheet, BookOpen, ListTodo) et commentaires morts.
- `src/lib/components/Header.svelte` — ajouté sous-titre "Outils libres" sous le titre. **Synchronisé `sidebarItems` (drawer mobile) avec la nouvelle liste de Sidebar.svelte** : Accueil, Jeux, Python, Upsilon, Whiteboard, Zygomatics (avec roles). Nettoyé imports.

**Tests créés** :

- `src/lib/components/Sidebar.svelte.test.ts` — 16 tests browser (vitest-browser-svelte) : items présents par rôle, items retirés absents, séparation serious/fun.

**Découverte importante** :
Le Header.svelte avait sa propre `sidebarItems` (drawer mobile public) DIFFÉRENTE de Sidebar.svelte. Sans synchronisation, mobile aurait gardé les items que desktop avait perdus (régression silencieuse). Maintenant aligné.

**Dette tech notée** :

- Deux sources de vérité pour les items publics (Sidebar.svelte + Header.svelte). Refacto possible mais hors scope.
- Cast `resolve(item.href as '/')` dans Sidebar.svelte et Header.svelte — workaround pour typage strict de `resolve`.

### Phase 2 — Sidebars dashboard ✅ TERMINÉE

**Fichiers modifiés / créés** :

- `src/lib/config/dashboard-nav.ts` (NEW) — config nav extraite du layout. Fonction pure `getNavLinks(role, pendingVip, marketplaceEnabled)` + helper `getZoneTitle(role)`. Types `DashboardNavLink` avec `footer?: boolean` et `logout?: boolean`.
- `src/lib/config/dashboard-nav.test.ts` (NEW) — 18 tests (renommages, ajouts, conditional marketplace, badge, footer items, fallback).
- `src/routes/(protected)/dashboard/+layout.svelte` — utilise la config extraite, titre rôle-specific via `getZoneTitle`, rendu rail en 2 sections (main + footer séparés par `<hr>`), Déconnexion = `<button>` avec `handleLogout`. Snippet `linkBody` pour réutiliser icon+label+badge.
- `src/lib/components/navigation/MobileNavDrawer.svelte` — type `NavItem` étendu avec `footer`/`logout`. Prop `onLogout?: () => void`. Rendu en 2 sections + snippet `itemLink`. `resolve()` ajouté.
- `src/routes/(protected)/dashboard/profile/+page.svelte` (NEW) — placeholder Mon profil : avatar + info utilisateur + bouton déconnexion. GDPR à migrer ici en Phase 3.

**Renommages appliqués** :

- Dashboard → Tableau de bord
- Cours (élève + prof) → Mes cours
- Contenu (prof) → Mes contenus
- Python (prof) → Mes exercices Python
- Gamification (prof) → Récompenses

**Ajouts** :

- Cahier de textes (élève + prof)
- Mon profil + Déconnexion (footer, séparés par `<hr>`)

**Tests** : 18/18 dashboard-nav + 16/16 Sidebar tous verts.

### Phase 3 — Avatar + contrôles mobile ✅ TERMINÉE

**Fichiers modifiés** :

- `src/lib/components/Header.svelte` — Avatar = `<a href={resolve('/dashboard')}>` (plus de dropdown). Section "Compte" ajoutée au bas du Sheet mobile drawer (raccourci Mon espace + Déconnexion). Imports `DropdownMenu`, `Users`, `MessageCircle`, `Mail` retirés.
- `src/routes/(protected)/dashboard/+layout.svelte` — Avatar = `<a href="/dashboard/profile">`. Supprimé : DropdownMenu entier, `handleExport`, `isExporting`, `accountDeletionDialogOpen`, `<AccountDeletionDialog>` + import. `MobileNavDrawer` reçoit maintenant `showSettings=true`. Imports `DropdownMenu`, `Trash2`, `Download`, `Loader2` retirés. Aria-labels traduits en français (Réduire/Augmenter la taille du texte, Basculer le mode sombre/plein écran, Retour à l'accueil). Rail nav reçoit `aria-label="Navigation principale"`.
- `src/lib/components/navigation/MobileNavDrawer.svelte` — Nouveau prop optionnel `showSettings?: boolean` (default false → rétrocompat avec `/messages/+layout.svelte`). Quand true, render section "Préférences" en bas (dark mode + taille texte) avec aria-labels français.
- `src/routes/(protected)/dashboard/profile/+page.svelte` — Étoffé : sections Informations utilisateur / Préférences d'affichage / Compte. Inclut bouton Export, Déconnexion, Supprimer mon compte + AccountDeletionDialog. Icônes Lucide marquées `aria-hidden="true"` (décoratives, le texte du bouton porte le sens).

**Audits effectués** :

- Code review (Opus) : OK avec 1 fix appliqué (bordure visuelle restaurée sur l'avatar).
- Accessibilité (Sonnet) : 6 findings, 5 corrigés (titre redondant retiré, aria-labels traduits, nav aria-label ajouté, icônes décoratives marquées). 1 hors scope (UserAvatar `<img alt>` double-annonce — dette tech à traiter dans le composant lui-même).

**Dette tech notée** (pour plus tard) :

- `handleLogout` dupliqué 3× (Header.svelte, +layout.svelte, profile/+page.svelte) → extraire dans `$lib/utils/auth.ts`.
- `UserAvatar.svelte` `<img alt>` non muet quand le wrapper porte déjà `aria-label` → ajouter un prop `imageAlt` ou marquer interne `aria-hidden`.
- 4 warnings "href without resolve()" pré-existants dans `+layout.svelte` (gidouille + rail nav links + footer nav links) — pattern existant, non corrigé dans cette phase.

### Phase 4 — Quality checks ✅ TERMINÉE

- ✅ ESLint : lancé automatiquement via lintstaged à chaque commit (Phases 1-3). Aucune erreur après la correction du dernier `LogOut` orphelin en Phase 3.
- ✅ `pnpm check:incremental` : **9 errors / 46 warnings** — identique à la baseline documentée dans MEMORY.md, **aucune régression**.
- ⏳ Test UI manuel : à la charge de l'utilisateur.

**Statistiques finales** :

- 3 commits propres : `806a24d1b` (Phase 1), `eee78b076` (Phase 2), `49a6abfdd` (Phase 3).
- 18 tests serveur (`dashboard-nav.test.ts`) + 16 tests browser (`Sidebar.svelte.test.ts`) — tous verts.
- 6 fichiers `.svelte` modifiés, 2 fichiers `.ts` créés (config + tests), 1 fichier `.svelte` créé (page profil).

---

## Documents produits

- `docs/wip/sidebar-reorg-progress.md` (ce fichier)

## Test manuel recommandé pour l'utilisateur

1. **Outils libres (déconnecté)** : aller sur `/`, vérifier sous-titre "Outils libres" + sidebar avec Accueil/Jeux/Python/Upsilon/Zygomatics.
2. **Outils libres (connecté élève)** : même chose + Python visible.
3. **Mon espace (élève)** : cliquer l'avatar → arrive sur `/dashboard`. Vérifier titre header "Mon espace" + items Tableau de bord / Mes cours / Mon travail / Cahier de textes / Amis / Chat / Inventaire / Mes Signalements + footer Mon profil / Déconnexion.
4. **Cliquer Mon profil** → arrive sur `/dashboard/profile`. Vérifier sections Informations / Préférences / Compte, et boutons Export / Déconnexion / Supprimer mon compte.
5. **Cliquer Déconnexion** → redirection vers `/`.
6. **Espace enseignant (prof)** : cliquer l'avatar → arrive sur `/dashboard`. Vérifier titre "Espace enseignant" + items renommés (Mes cours / Mes contenus / Mes exercices Python / Récompenses).
7. **Mobile (élève ou prof)** : ouvrir hamburger → vérifier nav + section Préférences (dark mode + taille texte) + footer Mon profil / Déconnexion.
8. **Avatar mobile** : tap → va à `/dashboard` ou `/dashboard/profile` selon le contexte.
