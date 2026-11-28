---
couvre:
  - src/routes/+layout.svelte
  - 'src/routes/(protected)/+layout.svelte'
  - 'src/routes/(protected)/dashboard/{admin,student,teacher}/*'
  - 'src/lib/components/{Header,EasyReadingToggle,Sidebar,InfoPanel,FlipCard,Wheel}.svelte'
  - 'src/lib/components/{skeleton,modals}/**'
  - 'src/lib/stores/{studentDashboardCache,teacherDashboardCache,selectedClass,selectedPeriod,activity,mobile,easyReading,modalStack}.svelte.ts'
  - 'src/lib/types/{student-cache,teacher-cache,cache-context}.ts'
  - src/lib/utils/cache-sync.ts
  - src/lib/utils/app-version.ts
  - 'src/routes/(protected)/dashboard/teacher/{recherche,documents}/**'
---

# Coquille de l'application et caches des tableaux de bord

> Vérifié contre le code le 2026-10-12 (commit 4ab55c5e8) ; Palotin revu le 2026-11-11 (chantier `palotins`) ; La Tortue ajoutée au menu le 2026-11-14 ; Programmes de calcul le 2026-11-15.

## À quoi ça sert

Tout ce qui entoure une page sans être la page :

- le **layout racine** (`src/routes/+layout.svelte`) : lien d'évitement, toasts, pile de modales,
  barre de chargement, en-tête et barre latérale **publics** ;
- le layout du groupe `(protected)` et les **layouts par rôle** sous `/dashboard/{admin,student,teacher}` ;
- les **caches des tableaux de bord** (élève, prof), remplis par ces layouts et lus par les pages ;
- les stores transverses : classe et période choisies, pile de modales, taille d'écran, compteurs.

Déjà documenté ailleurs, et seulement cité ici :

- en-tête, barre latérale et zone de contenu **du tableau de bord**, accueils :
  [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md) ;
- `load` racine, client Supabase, contrainte TDZ de Safari, motif optimiste :
  [architecture-generale.md](architecture-generale.md) ;
- gardes `(protected)/+layout.server.ts` et `dashboard/admin/+layout.server.ts`, élévation admin :
  [auth.md](auth.md) ;
- notifications, présence, realtime du layout du tableau de bord : [realtime.md](realtime.md) ;
- page d'erreur (toute erreur levée par ces layouts y arrive) : [page-erreur.md](page-erreur.md) ;
- Palotin (quiz, widget) : [buddy-palotins.md](buddy-palotins.md) ; bandeau de consentement :
  [conformite/consentement-parental.md](conformite/consentement-parental.md).

## Ce que voit l'utilisateur

**Hors tableau de bord** (accueil, outils publics, `/shtam`…) :

- au premier Tab, un lien « Aller au contenu », caché hors focus, qui mène au `<main>` ;
- un en-tête (`Header`) : gidouille et « Chiphre » (lien vers `/`), avatar (lien vers
  `/dashboard`) ou bouton « Connexion », et sur ordinateur taille du texte, « Lecture facilitée »,
  thème, plein écran ;
- sur ordinateur (`md` et plus), une barre d'icônes à gauche (`Sidebar`) : Accueil, Automaths, Jeux,
  Python (élève, prof), La Tortue, Programmes de calcul, Upsilon, Atelier, Chiffrement, Le Shtam, Whiteboard (prof), puis, sous un
  trait, Zygomatics ;
- sur mobile, le menu ouvre un tiroir (`Sheet`) avec les mêmes liens, le thème, la taille du
  texte et, connecté, « Mon cabinet » et « Déconnexion » ;
- sur `/` seulement, le bouton « Infos et confidentialité » en bas à droite (`InfoPanel`, règle
  `showsInfoButton` de `src/lib/utils/footer.ts`) : à propos, démonstrations (`/demo`), données
  personnelles, CGU, éditeur,
  copyright, version.

**Partout** : une barre fine en haut de l'écran pendant une navigation, les toasts en haut à
droite (cinq visibles au plus ; une seule, la plus récente, au téléphone : `AppToaster`), et les modales de la pile (cartes VIP, historiques, Démineur).

**Dans le tableau de bord** : l'en-tête et la barre latérale du tableau de bord remplacent ceux du
layout racine. En plus, selon le rôle :

- **élève** : bandeau de consentement si besoin, question d'âge (élèves de 2nde), quiz du
  Palotin à la première visite puis son widget ;
  depuis le 2026-11-11, le Palotin (quiz, maison, écusson, passages) est monté par le layout
  racine, `PalotinPresence` ([buddy-palotins.md](buddy-palotins.md#maison-et-passages-2026-11-11)) ;
- **admin par élévation** (un prof qui a élevé ses droits) : bandeau ambre collant « Mode
  administration · expire dans mm:ss » et bouton « Quitter le mode admin ». Un vrai compte admin
  n'a pas de bandeau ;
- `/dashboard/admin` : une page d'index minimale (« Sélectionnez une section dans le menu… »).

### Réglage « Lecture facilitée »

Interrupteur (`EasyReadingToggle`, icône livre ouvert) à côté de la taille du texte : en-tête,
layout du tableau de bord, tiroir mobile, menu mobile de l'en-tête, page profil. Visible par tous,
éteint par défaut, gardé dans le navigateur sous `easyReading` (`easyReading.svelte.ts`).
Allumé : classe `lecture-facilitee` sur `<html>`, et `app.css` passe le texte de `<main>` en
Luciole (titres et `.exercise-content` compris), lettres +0,02 em, mots +0,08 em, lignes 1,75 rem
× taille du texte ; l'en-tête et les menus gardent Inter. Les formules passent au jeu Luciole Math
(`switchMathFonts('luciole')`, cf. [utilitaires-et-demos.md](utilitaires-et-demos.md)). Police
absente → repli sur Inter. Crédit des polices : section « Polices » de `/a-propos`.
Les lignes plus espacées valent aussi pour les `p` / `li` du tableau de bord qui portent une
classe `text-xs` à `text-xl` (leurs règles `.dashboard-content .text-*` l'emportaient) : même
facteur 7/6. Un petit script inline de `app.html` pose la classe avant le premier affichage
(pas de passage Inter → Luciole au chargement) ; les formules basculent quand le store démarre.

## Comment c'est construit

### Les layouts, de haut en bas

| Fichier                                          | Ce qu'il fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/+layout.svelte`                      | CSS globales, analytics Vercel (import dynamique, échec silencieux sous Brave ; `beforeSend` masque le jeton des adresses `/carnet/…`, `src/lib/utils/analytics-redact.ts`), `ModeWatcher`, `Toaster`, `ModalStackRenderer`, `MathKeyboardClose` (bouton « Fermer le clavier » au-dessus du clavier MathLive, voir [questions.md](questions.md)), catalogue des cartes VIP (`initializeTemplates`), niveau du lecteur pour les mots cliquables (`provideReaderGrade`, voir [dictionnaire.md](dictionnaire.md)), Palotin de l'élève connecté (`PalotinPresence`, import dynamique, voir [buddy-palotins.md](buddy-palotins.md#maison-et-passages-2026-11-11)), route de la page affichée notée pour les mesures de performance (`afterNavigate` → `noteWebVitalsRoute`, identifiant de route et jamais l'adresse, voir [surveillance-des-erreurs.md](surveillance-des-erreurs.md)). |
| `src/routes/(protected)/+layout.svelte`          | Aucun habillage. Monte `PomodoroEffects` (sonnerie et annonce des changements de phase du pomodoro) pour tout utilisateur connecté. Remplit le magasin `consent` (boutons grisés sans consentement parental) à partir de `data.consentStatus`, pour toutes les pages protégées.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `dashboard/+layout.svelte`                       | Habillage du tableau de bord : [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `dashboard/student/+layout.server.ts`            | Refuse tout autre rôle que `student` (403). Lit les classes actives, les récompenses (`gidouilles`, `bonus`, `vip_cards`), le Palotin (pour le cache). La Constance perdue et le retour à fêter sont lus après l'affichage par `GET /api/student/buddy/presence`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dashboard/student/+layout.svelte`               | Remplit le cache élève au montage ; consentement, question d'âge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dashboard/teacher/+layout.server.ts`            | Refuse tout autre rôle que `teacher`, **admin compris** (403). Lit les classes (`getTeacherClassesWithCounts`) et les périodes de l'année active.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dashboard/teacher/+layout.svelte`               | Remplit le cache prof au montage, choisit une classe et une période par défaut, précharge élèves, récompenses et avertissements de la classe choisie.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `dashboard/admin/+layout.server.ts`              | Garde de la section : [auth.md § Élévation admin](auth.md#élévation-admin).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `dashboard/admin/+layout.svelte`, `+page.svelte` | Bandeau d'élévation et index de la section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Un échec de lecture dans les deux `load` élève et prof n'interrompt pas la page : il est journalisé
et remplacé par une valeur vide (classes `[]`, récompenses à 0, Palotin `null`). Côté prof, le
`load` rend en plus `classesLoaded` (vrai seulement si la lecture des classes a réussi) : des
classes `[]` après un échec ne purgent pas le cache et ne vident pas la classe retenue.

### Un en-tête et une barre latérale publics, pas ceux du tableau de bord

Le layout racine teste `page.url.pathname.startsWith('/dashboard')` (`+layout.svelte:66`). Hors
tableau de bord, il rend `Header` et `Sidebar`, son `<main>` défile et porte l'ancre
`contenu-principal`. Sous `/dashboard`, il ne rend ni l'un ni l'autre, cède l'ancre au `<main>` du
layout du tableau de bord et ne masque plus la page pendant une navigation : c'est ce layout-là qui
pose son propre squelette.

Le lien « Aller au contenu » (`+layout.svelte:109-113`, WCAG 2.4.1) est le premier élément
focusable. Il est caché par une translation (`-translate-y-[200%]`, `focus:translate-y-0`), pas
par `sr-only focus:not-sr-only` : choix fait quand `app.css` redéfinissait `.sr-only` hors couche,
ce qui annulait les variantes Tailwind. Ce doublon est retiré (écart V29) : `sr-only sm:not-sr-only`
affiche bien les libellés sur grand écran (`src/lib/__tests__/sr-only-variantes.svelte.test.ts`).
Test du lien : `src/lib/__tests__/accessibilite-k19.test.ts`.

Pendant une navigation hors tableau de bord, la page passe à `opacity-0` et un squelette la
recouvre, choisi par `getSkeletonType` (`src/lib/utils/skeleton-detector.ts`) : `SkeletonDashboard`,
`SkeletonList`, `SkeletonForm` ou `SkeletonPage`.

### Les caches de tableau de bord

Deux singletons en mémoire, un par rôle :

| Cache                                    | Entrées et durée de vie                                                                                 | Clé                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `studentCache` (`studentDashboardCache`) | récompenses (10 min), avertissements (10 min), Palotin (10 min)                                         | unique, sauf avertissements : `periodId`  |
| `teacherCache` (`teacherDashboardCache`) | élèves d'une classe (2 h), récompenses (10 min), avertissements (10 min), classe (24 h), périodes (1 h) | `classId`, `classId:periodId`, `schoolId` |

Les types sont dans `src/lib/types/student-cache.ts` et `teacher-cache.ts`. Ils vivent en mémoire de
l'onglet, rien dans `localStorage`. Les entrées sont des `$state` ou des `SvelteMap` : une page qui
les lit dans un `$derived` se met à jour quand le cache change.

**Remplissage**, trois voies :

1. **Hydratation par le layout**, dans un `$effect` qui se rejoue quand les données du layout
   sont relues (`refreshAll()` après une action de formulaire) : `hydrateRewards`, `hydrateBuddy`
   (élève, `student/+layout.svelte`) ; `hydrateAllClasses`, `setPeriods` (prof,
   `teacher/+layout.svelte`). Seule une donnée **neuve** (autre référence que la dernière versée)
   est réécrite : `data` change aussi quand un layout parent est relu, et réécrire l'ancienne
   lecture effacerait les mises à jour optimistes faites depuis. Test :
   `src/lib/components/__tests__/ecarts-coquille.svelte.test.ts` (« une classe ajoutée »). D'autres
   pages hydratent aussi : `TeacherDashboard` (classes lues dans `/api/teacher/classes` si le cache
   est vide), `teacher/classes` (classes), `PalotinPresence`, `PalotinQuiz` et
   `ChangePalotinModal` (Palotin).
2. **Lecture paresseuse** : `getRewards()`, `getWarnings(periodId)`, `getStudentBasic(classId)`,
   `getStudentRewards(classId)`, `getStudentWarnings(classId, periodId)` rendent l'entrée si elle a
   moins que son TTL, sinon appellent l'API (`/api/student/*`, `/api/classes/[id]/{students,gidouilles,warnings}`)
   et la stockent. Le layout prof les déclenche dans deux `$effect`, à chaque changement de classe
   ou de période choisie (`teacher/+layout.svelte:47-66`).

   **Un échec de lecture n'est jamais stocké** (réseau coupé, réponse HTTP en erreur). Les
   `fetch*` privés rendent alors `null` ; le getter rend la dernière valeur en cache si elle existe,
   **même expirée**, sinon la valeur vide (`[]`, `SvelteMap` vide, 0 gidouille), sans
   écrire le cache ni rafraîchir l'horodatage : l'accès suivant relit l'API. Une réponse réussie
   mais vide (0 gidouille, classe sans élève) est stockée normalement. Tests :
   `src/lib/stores/__tests__/teacherDashboardCache.test.ts` (« Échec réseau : jamais stocké ») et
   `studentDashboardCache-echecs.test.ts`.

3. **Mise à jour optimiste** : `update{Gidouilles,Bonus,VipCards,Warnings}Optimistic`,
   `updateBuddyXpOptimistic`, `updateBuddyConstanceOptimistic` (semaine et jours travaillés de la
   Constance Royale). Celles des récompenses (`update{Gidouilles,Bonus,VipCards}Optimistic`,
   `addVipCardOptimistic`) font repartir l'échéance de l'entrée (`fetchedAt` à maintenant) : sinon
   le gain disparaîtrait avec l'ancienne lecture. Chez le prof, c'est l'entrée de toute la classe
   qui repart. Les autres gardent leur horodatage. Test :
   `src/lib/stores/__tests__/cache-optimiste-echeance.test.ts`.

**Lecture synchrone** pour l'affichage : `get*Sync()` rend l'entrée si elle est encore fraîche,
sinon `null` (ou `[]`). `getRewardsMapReactive(classId)` rend la `SvelteMap` sans contrôle de TTL.

**Purge des classes** : `hydrateAllClasses(classes)` reçoit la liste **complète** des classes du
prof et retire du cache celles qui n'y sont plus (supprimées, désactivées) ; une liste vide vide le
cache des classes. Le layout prof ne l'appelle que si `classesLoaded` ; `TeacherDashboard` après une
lecture réussie de `/api/teacher/classes`.

**Invalidation** : `invalidate*()` vide une entrée ; la lecture suivante relit l'API. Appels réels :
`invalidateRewards` après une action sur les cartes VIP ou au marché (`marketplace.svelte.ts`,
`StudentVipCardsModal`, `VipCardUseDialog`, `marketplace/trade/[id]`). Personne n'appelle
`invalidateAll`, `invalidateClass` ni `invalidatePeriods`.

**Ce qui vide vraiment un cache, c'est le rechargement de la page.** La déconnexion soumet un vrai
formulaire `POST /auth/logout` (`submitLogoutForm`, `src/lib/utils/auth.ts`) et la bascule du mode
test fait `window.location.reload()` (`TestModeToggle.svelte`) : les deux repartent d'un module neuf,
donc d'un cache vide. Un autre compte sur le même onglet ne voit pas le cache du précédent.

### `cache-sync` : un composant partagé entre élève et prof

Un même composant (tirage, échange, boutique de cartes VIP ; inventaire ; énigme) peut agir pour
l'élève ou pour le prof sur un élève. Il reçoit un `CacheContext`
(`src/lib/types/cache-context.ts`) : `{ type: 'student' }` ou `{ type: 'teacher', classId, studentId }`.
`src/lib/utils/cache-sync.ts` aiguille vers le bon cache : `syncVipCards`, `syncGidouilles`,
`rollbackGidouilles` (le même delta, de signe opposé). Utilisateurs : `VipCardActivationButton`,
`StudentVipCardsModal`, `VipCardShopSection`, `VipCardDrawModal`, `VipCardExchangeModal`,
`VipCardChooseModal`, `student/riddles/[id]`, `student/inventory`. Test : `src/lib/utils/__tests__/cache-sync.test.ts`.

### Classe et période choisies (prof)

`selectedClass.svelte.ts` et `selectedPeriod.svelte.ts` : un identifiant en `$state`, recopié dans
`localStorage` (`teacher_selected_class_id`, `teacher_selected_period_id`) et relu au premier
appel. Le layout prof choisit la **période en cours** si aucune n'est retenue. Pour la classe, il
appelle `reconcileSelectedClass(ids)` à chaque liste neuve quand `classesLoaded` : un identifiant retenu
qui figure dans la liste est gardé ; sinon (aucun, ou classe supprimée) il est remplacé par la
**première classe**, ou vidé (`localStorage` compris) si le prof n'en a aucune. Cet effet est
déclaré avant les `$effect` de préchargement : la correction a lieu avant qu'ils lisent la classe.
Test : `src/lib/stores/__tests__/selectedClass-verification.test.ts`. `TeacherDashboard` (page
`/dashboard`, hors layout prof) fait de même après une lecture réussie de `/api/teacher/classes`,
et recopie la classe corrigée dans sa copie locale (celle du sélecteur).

### La pile de modales

`modalStack` (`src/lib/stores/modalStack.svelte.ts`) empile des `{ component, props, onReturn,
canDismiss }`. `ModalStackRenderer`, monté une fois dans le layout racine, n'affiche que le sommet,
avec un fond cliquable et un `z-index` de `1000 + profondeur`. Clic sur le fond ou Échap : `pop()`,
sauf si `canDismiss === false`. `pop()` appelle l'`onReturn` de la modale retirée. Le renderer
garde une copie du sommet (`modalSnapshot`) pour que le fondu de sortie ait encore un composant à
rendre.

Les ouvertures passent surtout par `src/lib/utils/vip-card-modals.ts` et `bonus-modals.ts` ;
aussi par le Démineur (`minesweeper.svelte.ts`), `RewardsBlock` et la page
`teacher/gamification/rewards`. Les autres fenêtres de l'app
(dont `InfoPanel`) utilisent le `Dialog` de bits-ui, pas cette pile. Test :
`src/lib/stores/__tests__/modalStack.test.ts`.

### Écran et périphériques d'entrée

- `mobileStore` (`mobile.svelte.ts`) : largeur de fenêtre suivie par un écouteur `resize`,
  `isMobile` (< 768), `isTablet`, `isDesktop` (≥ 1024). Côté serveur, largeur supposée 1024. Seul
  utilisateur : `MinesweeperBoard`.

La navigation elle-même choisit entre barre et tiroir par CSS (`md:hidden`, `hidden md:block`), pas
par ces stores.

### Compteurs de non-lus

`activityStore` de `activity.svelte.ts` lit `/api/notifications/unread-count` et
`/api/messages/unread-count` en parallèle et écrit dans `notificationStore` et `privateMessages`.
Un seul appel : au premier montage du layout du tableau de bord. Pas de minuterie ; pour les
notifications, le temps réel relance ensuite la lecture ([realtime.md](realtime.md)).

### Pages prof de la zone

- **`/dashboard/teacher/recherche`** : recherche globale. Requête dans l'URL (`?q=`, `?kinds=`,
  `?tags=`), formulaire `GET`, aucune lecture côté client. Moins de 2 caractères et aucun tag :
  pas de recherche. 50 résultats au plus, 10 tags au plus, 100 caractères au plus. Les liens
  viennent du registre `#lib/resources/index.ts`. Moteur : `searchResources` ([serveur.md](serveur.md)).
  Les filtres (types, tags) suivent l'adresse à chaque navigation, retour arrière compris (L41) ;
  sans résultat, le message cite le texte et les tags cherchés (« Aucun résultat pour le tag
  #fractions. », V74). Tests : `src/lib/components/__tests__/recherche-prof.svelte.test.ts`.
- **`/dashboard/teacher/documents`** : documents du tuteur IA (`DocumentManager`, RAG).

`Wheel.svelte` sert aussi à l'accueil prof, à `VipCardUseDialog` et à `/dev/roue`. Les
prénoms en double sont départagés par le plus court préfixe du nom (« Léa M. », « Léa P. »). Avec
`addJokerIfOdd`, une case « Joker » complète un nombre impair : si elle sort, aucun gagnant n'est
annoncé. Le gagnant se calcule à la fin de la transition CSS (`transitionend`).

### Petits composants

- `FlipCard` : carte à deux faces de même hauteur (grille CSS), face cachée `inert`. Utilisée par
  `FlashCard` et `/demo`.
- `skeleton/` : `SkeletonPage`, `SkeletonDashboard`, `SkeletonList`, `SkeletonForm` (layouts,
  marché).

### Onglet resté ouvert pendant un déploiement

Après un `deploy:prod`, un onglet ouvert garde l'ancien code. Ses fichiers JS chargés à la
demande n'existent plus, et les données du nouveau serveur peuvent avoir changé de forme (cas réel
du 2026-11-11 : `reading 'id'` sur `/dev/modeles`, onglet d'avant 0.81.0).

- `version.pollInterval` (options de `sveltekit()`, `vite.config.ts`) : toutes les 5 min, l'onglet lit
  `/_app/version.json` ; `updated.current` (`$app/state`) passe à vrai s'il a changé.
- `beforeNavigate` du `+layout.svelte` racine : nouvelle version + lien ou Précédent / Suivant →
  la page suivante se charge en entier. Lien : `cancel()` puis `location.href` (sans `cancel()`,
  Kit charge la page en parallèle avec l'ancien code). Précédent / Suivant : `location.reload()`,
  **sans** `cancel()` (Kit annulerait le déplacement dans l'historique). **Jamais sur un `goto` ni
  un formulaire** : ce sont des navigations du code, souvent en pleine activité.
- Rafraîchissement horaire du jeton (`+layout.ts`, `TOKEN_REFRESHED`) : `checkAppVersion` lit
  `version.json` sans cache ; nouvelle version → on ne recharge pas les données, la page
  suivante le fera. Fichier illisible (hors ligne, dev où il n'existe pas) → comme avant.
- Règles dans `src/lib/utils/app-version.ts` (sans dépendance, import statique sans risque TDZ),
  testées par `src/lib/utils/__tests__/app-version.test.ts`.
- Kit seul ne vérifie la version qu'après un échec de chargement de page (il recharge alors de
  lui-même) ; il ne voit pas l'échec d'un `await import()` de notre code.

## Pièges

- **Les getters `*Sync` ne réagissent pas au temps.** Ils comparent `Date.now()` au TTL, mais
  `Date.now()` n'est pas réactif : un `$derived` ne se recalcule pas à l'expiration. Il rend
  `null` au prochain recalcul déclenché par autre chose, et rien ne relit l'API tant qu'un getter
  asynchrone n'est pas appelé.
- **Les classes du cache prof ne viennent que de l'hydratation** : aucune lecture d'API ne
  remplit une classe seule (`getAllClassesSync` lit ce que les pages ont versé).
- **Le layout prof refuse l'admin.** Une garde `teacher || admin` dans une page sous
  `/dashboard/teacher` ne rendrait pas la page accessible à l'admin : le 403 du layout passe
  avant. Mais le load d'une page tourne **en parallèle** de celui du layout : il ne lit rien de
  sensible sans `await parent()` ou sa propre garde de rôle (`documents/+page.server.ts` ne rend
  rien et ne relit plus le rôle, M32).
- **Deux listes de liens publics** : `Header.svelte` (tiroir mobile) et `Sidebar.svelte` (barre)
  ont chacun leur copie. Une entrée ajoutée à l'une manque à l'autre.

## Écarts connus

Les écarts de cette zone sont au [registre des écarts](../ecarts/registre.md) : `pnpm ecarts`. Un écart s'écrit là-bas, jamais ici.
