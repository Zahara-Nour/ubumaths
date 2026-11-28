# Lot coquille : 29 points (32 blocs après découpage)

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     28 |
| CORRIGÉ      |      0 |
| FAUX         |      1 |
| PAS UN ÉCART |      3 |
| NON VÉRIFIÉ  |      0 |
| DOUBLON      |      0 |

Registre relu (`docs/ecarts/registre.md`, 60 lignes) : aucun point du lot n'y figure. Toutes les commandes « preuve » ci-dessous ont été lancées à la racine : code de sortie **1** partout aujourd'hui (elles sortiront en 0 quand l'écart aura disparu). Chaque commande commence par `test -f` sur le fichier visé.

## Points

### coquille-et-caches.md:328 [V] — VRAI

- **Point** : pile de modales : dialogue dans un `<button>`, focus ni déplacé ni piégé.
- **Vu** : `src/lib/components/modals/ModalStackRenderer.svelte:~73-93` : `<button class="modal-backdrop">` contient `<div role="dialog" aria-modal="true" tabindex="-1">` ; aucune gestion de focus (grep `focus|inert|trap` vide).
- **Registre** : V · modales · quand une fenêtre s'ouvre, le clavier et le lecteur d'écran restent sur la page derrière et la fenêtre est rendue dans un bouton (HTML invalide) · preuve : commande `test -f src/lib/components/modals/ModalStackRenderer.svelte && ! grep -q 'class="modal-backdrop"' src/lib/components/modals/ModalStackRenderer.svelte` (sortie 1) ; à terme, test à écrire : le dialogue n'a aucun ancêtre `button` et reçoit le focus à l'ouverture.

### coquille-et-caches.md:346 (a, tag seul sans résultat) [V] — VRAI

- **Vu** : `src/routes/(protected)/dashboard/teacher/recherche/+page.svelte:130` : `Aucun résultat pour « {data.query} ».` ; `+page.server.ts:44` accepte un tag seul, donc `query` est vide.
- **Registre** : V · recherche du prof · une recherche par tag seul sans résultat affiche « Aucun résultat pour « ». » · preuve : commande `test -f 'src/routes/(protected)/dashboard/teacher/recherche/+page.svelte' && ! grep -q 'Aucun résultat pour « {data.query} »' 'src/routes/(protected)/dashboard/teacher/recherche/+page.svelte'` (sortie 1).

### coquille-et-caches.md:346 (b, filtres figés) [L] — VRAI

- **Vu** : `recherche/+page.svelte:31-32` : `selectedKinds` / `selectedTags` initialisés par `untrack(() => [...data.kinds])`, jamais resynchronisés.
- **Registre** : L · recherche du prof · en revenant en arrière sur une autre recherche, les cases cochées gardent les anciens filtres · preuve : test à écrire (composant monté, `data` changé, les champs reflètent les nouveaux paramètres).

### coquille-et-caches.md:350 [V] — VRAI

- **Vu** : `src/lib/components/Sidebar.svelte:92-94` : `isActive` = adresse exacte ; `Header.svelte:170-175` accepte `startsWith(href + '/')`. `/shtam` est dans les deux listes (Sidebar:56, Header:138).
- **Registre** : V · navigation publique · sur un article du Shtam, le tiroir mobile surligne « Le Shtam », la barre latérale non · preuve : commande `test -f src/lib/components/Sidebar.svelte && grep -q 'startsWith' src/lib/components/Sidebar.svelte` (sortie 1).

### page-erreur.md:179 [L] — VRAI

- **Vu** : `src/lib/server/warnings.ts:120,143,191,214,270,317,370` : `error(500, \`Failed to … : ${rpcError.message}\`)`(anglais + message brut de la base) ;`src/routes/api/achievements/student/[studentId]/+server.ts:83`:`error(403, 'Not authorized')`, `api/student/warnings/[periodId]/+server.ts:64`:`error(400, 'Invalid period ID format')`. La page d'erreur montre le message des 5xx en « Détails techniques » (`src/lib/error-page/error-copy.ts:138`). Limite connue de la doc, mais bien réelle.
- **Registre** : L · messages d'erreur · certaines réponses d'API (4xx) et erreurs 500 de la base restent en anglais · preuve : commande `test -d src/routes/api && ! grep -rqE "error\(4[0-9]{2}, '(Not authorized|Invalid)" src/routes/api --include=+server.ts` (sortie 1).

### coquille-et-caches.md:289 [L] — VRAI

- **Vu** : `src/lib/stores/studentDashboardCache.svelte.ts:~436-445` (`getProfileSync`) et les autres getters `*Sync` : `Date.now()` comparé au TTL dans un getter, donc non réactif.
- **Registre** : L · cache élève · une donnée périmée n'est pas relue toute seule : l'écran la perd au prochain recalcul sans rechargement · preuve : test à écrire (avancer le temps fictif au-delà du TTL, le `$derived` doit se recalculer ou relancer la lecture).

### coquille-et-caches.md:293 [L] — VRAI

- **Vu** : `studentDashboardCache.svelte.ts:512-530` (`updateGidouillesOptimistic`) : `{...cached, rewards: {...}}`, `fetchedAt` inchangé ; idem `teacherDashboardCache.svelte.ts:423-460` (`.set(classId, …)` sans nouveau `fetchedAt`, à confirmer sur la ligne exacte).
- **Registre** : L · cache · une récompense corrigée à l'instant par une mise à jour optimiste disparaît du cache à l'échéance de l'ancienne lecture · preuve : test à écrire (`fetchedAt` après `updateGidouillesOptimistic` égal ou postérieur à l'appel).

### coquille-et-caches.md:295 [L] — VRAI

- **Vu** : `teacherDashboardCache.svelte.ts:~763-791` : `fetchClassInfo` / `fetchSchoolInfo` lèvent « non disponible » ; seuls les tests appellent `getClassInfo` / `getSchoolInfo` (grep hors tests vide).
- **Registre** : M (code mort plutôt que latent) · cache prof · deux lectures du cache échouent toujours et ne sont appelées par rien · preuve : commande `test -f src/lib/stores/teacherDashboardCache.svelte.ts && ! grep -q 'fetchClassInfo not implemented' src/lib/stores/teacherDashboardCache.svelte.ts` (sortie 1). Lettre corrigée L → M.

### coquille-et-caches.md:298 [L] — VRAI

- **Vu** : `teacher/+layout.svelte:21-25` et `student/+layout.svelte:66-80` : `hydrate*` dans `onMount` ; `refreshAll()` appelé par `src/lib/utils/form-action.ts:182` relance les `load` mais pas `onMount`.
- **Registre** : L · cache · après une action de formulaire (`refreshAll`), les données neuves du layout n'atteignent pas le cache · preuve : test à écrire (changer `data` du layout monté, le cache reflète la nouvelle valeur).

### coquille-et-caches.md:303 [L] — VRAI

- **Vu** : `Sidebar.svelte:~49-56` et `Header.svelte:~132-138` : deux tableaux de liens distincts, aucun module commun.
- **Registre** : L · navigation publique · un lien ajouté à la barre peut manquer au tiroir mobile (et inversement) · preuve : test à écrire (les listes publiques des deux composants ont les mêmes `href`).

### coquille-et-caches.md:308 [L] — VRAI

- **Vu** : `reconcileSelectedClass` n'est appelée que dans `teacher/+layout.svelte:26` (grep) ; `src/routes/(protected)/dashboard/TeacherDashboard.svelte` n'y fait pas appel.
- **Registre** : L · accueil du prof · une classe retenue qui n'existe plus peut rester sélectionnée sur l'accueil · preuve : commande `test -f 'src/routes/(protected)/dashboard/TeacherDashboard.svelte' && grep -q reconcileSelectedClass 'src/routes/(protected)/dashboard/TeacherDashboard.svelte'` (sortie 1).

### coquille-et-caches.md:313 [L] — VRAI

- **Vu** : `teacher/classes/+page.svelte:~126-130` : `hydrateSchoolInfo(data.school as never, // @ts-expect-error current_period …)` ; la signature (`teacherDashboardCache.svelte.ts:917`) attend `(schoolId, schoolInfo)`. Aucun lecteur.
- **Registre** : L · cache prof · le cache de l'école est rempli avec un mauvais identifiant et n'est jamais lu · preuve : commande `test -f 'src/routes/(protected)/dashboard/teacher/classes/+page.svelte' && ! grep -q 'ts-expect-error current_period' 'src/routes/(protected)/dashboard/teacher/classes/+page.svelte'` (sortie 1).

### coquille-et-caches.md:319 [L] — VRAI

- **Vu** : `src/routes/api/student/buddy/presence/+server.ts:25` (GET) → `loadBuddyPresence` → `src/lib/server/buddy-presence.ts:66` `await resetLostConstance(studentId)` (écriture, client service).
- **Registre** : L · Palotin · le simple affichage d'une page peut remettre la Constance Royale à 0 (écriture dans une lecture GET) · preuve : test à écrire (un GET de présence ne modifie aucune ligne).

### coquille-et-caches.md:333 [L] — VRAI

- **Vu** : `src/lib/stores/modalStack.svelte.ts:104-110` : `popTo` appelle `onReturn` de la modale restante, pas des retirées (contraire de `pop`, l.~75) ; `:43-44` `component: Component<any, any, any>` ; `popTo` n'a d'appelant que les tests.
- **Registre** : L · modales · `popTo` appelle la mauvaise modale (sans appelant aujourd'hui) et un composant est typé `any` · preuve : commande `test -f src/lib/stores/modalStack.svelte.ts && ! grep -q 'Component<any' src/lib/stores/modalStack.svelte.ts` (sortie 1).

### coquille-et-caches.md:341 [L] — VRAI

- **Vu** : `teacher/wheel/+page.svelte:84` `<select id="class-select" bind:value={selectedClassId}>` (règle MySelect) ; `selectedClassId` local ; le gain (`:40-55`) ne touche pas `teacherCache` (grep `teacherCache` vide dans le fichier).
- **Registre** : L · roue du prof · sélecteur de classe natif, sélection non partagée, récompenses du cache non mises à jour après un gain · preuve : commande `test -f 'src/routes/(protected)/dashboard/teacher/wheel/+page.svelte' && ! grep -q '<select' 'src/routes/(protected)/dashboard/teacher/wheel/+page.svelte'` (sortie 1).

### coquille-et-caches.md:353 (a, spinDuration) [L] — VRAI

- **Vu** : `src/lib/components/Wheel.svelte:124,176` : prop `spinDuration = 4` déclarée, « duration is hardcoded in CSS ».
- **Registre** : L · roue · la durée de rotation demandée est ignorée · preuve : test à écrire (`spinDuration=2` change la durée de transition).

### coquille-et-caches.md:353 (b, frontières) [L] — VRAI

- **Vu** : `Wheel.svelte:344` : `const sliceSize = Math.floor(360 / wheelData().length)` ; pour 7 cases : 51 au lieu de 51,43, les frontières évitées sont décalées.
- **Registre** : L · roue · l'évitement des frontières de case est faux quand 360 n'est pas multiple du nombre de cases (résultat ambigu rare) · preuve : commande `test -f src/lib/components/Wheel.svelte && ! grep -q 'Math.floor(360' src/lib/components/Wheel.svelte` (sortie 1).

### tableaux-de-bord-et-navigation.md:180 [L] — VRAI

- **Vu** : `src/routes/(protected)/dashboard/+page.server.ts:85,254,261,274` charge `recentExercises` ; `StudentDashboard.svelte:263-349` : bloc « EXERCISES SECTION » entièrement en commentaire (`<!-- … -->`, l.349 `</div> -->`).
- **Registre** : L · accueil élève · une requête est faite à chaque accueil pour un bloc non affiché · preuve : commande `test -f 'src/routes/(protected)/dashboard/+page.server.ts' && ! grep -q recentExercises 'src/routes/(protected)/dashboard/+page.server.ts'` (sortie 1).

### seo.md:103 [L] — VRAI

- **Vu** : `src/lib/seo/site.ts:13` `'https://www.chiph.re'` ; `src/lib/email-templates/welcome.ts:12` `export const SITE_URL = 'https://www.chiph.re/'`.
- **Registre** : L · courriel de bienvenue · deux constantes d'adresse du site, avec et sans barre finale · preuve : commande `test -f src/lib/email-templates/welcome.ts && ! grep -q 'export const SITE_URL' src/lib/email-templates/welcome.ts` (sortie 1).

### coquille-et-caches.md:339 [D] — VRAI

- **Vu** : grep `teacher/wheel` et `teacher/documents` dans `src/` hors de leurs propres dossiers : aucun lien (ni `Sidebar`, ni `Header`, ni navigation).
- **Registre** : D · navigation du prof · la roue et la page Documents du prof ne sont accessibles que par l'adresse · preuve : à la main · décision de David.
- **Question à David** : « Sur ton espace, il y a une page "Roue" (tirage au sort d'un élève de la classe, avec gain de gidouilles) et une page "Documents". Aucun bouton ni menu n'y mène : on n'y arrive qu'en tapant l'adresse. Veux-tu : (1) ajouter un lien dans le menu prof ; (2) les laisser cachées volontairement (outils de séance connus de toi seul) ; (3) retirer la page qui ne sert plus ? » (à poser séparément pour chacune des deux pages).

### seo.md:106 [D] — FAUX

- **Vu** : `<JsonLd` est utilisé dans `src/routes/(public)/+page.svelte:41` (accueil), `shtam/[slug]/+page.svelte:45` (article) et `src/lib/components/kingdom-tour/AudienceView.svelte:81` (FAQ des pages d'audience, `faqJsonLd`). Donc plus « deux pages » : accueil, Shtam, pages d'audience. Toujours rien pour les exercices publics ni les outils.
- **Question à David** (limite à ajuster seulement) : « Google reçoit des fiches enrichies pour l'accueil, les articles du Shtam et les pages Professeurs/Élèves/Parents (FAQ). Veux-tu en ajouter pour les exercices publics (ex. : un exercice "Équations du 1er degré" apparaîtrait avec son niveau) ? Réponses : oui, plus tard (chantier SEO), non. » Doc à corriger (trois sortes de pages).

### qr-codes.md:142 (a, pas de QR pour l'Atelier) [D] — PAS UN ÉCART

- **Vu** : aucun usage de QR dans `src/routes/(public)/atelier` ni ses composants ; la doc dit que c'est une décision de David (attendre un atelier public sauvegardé). Limite voulue.

### qr-codes.md:142 (b, pas de bouton QR sur les fiches) [D] — PAS UN ÉCART

- **Vu** : QR présents dans `SeriesLinkShare.svelte`, `CourseShareLinkCard.svelte`, `QrBlock.svelte`, `typst/templates/site-mark.ts`, mais aucun composant de fiche ; choix (a) « non retenu à ce jour » = idée d'évolution documentée, pas un défaut.

### coquille-et-caches.md:311 [M] — VRAI

- **Vu** : `teacher/+layout.server.ts:59` `depends('teacher:classes')` ; grep `teacher:classes` dans `src/` : seule occurrence.
- **Registre** : M · cache prof · une marque de dépendance sans aucune invalidation correspondante · preuve : commande `test -f 'src/routes/(protected)/dashboard/teacher/+layout.server.ts' && ! grep -q "depends('teacher:classes')" 'src/routes/(protected)/dashboard/teacher/+layout.server.ts'` (sortie 1).

### coquille-et-caches.md:316 [M] — VRAI

- **Vu** : `getProfile`, `getProfileSync`, `refetchProfile`, `refetchRewards`, `refetchWarnings`, `syncWarnings` : hors `src/lib/utils/cache-sync.ts`, le store et les tests, aucun appelant (grep) ; `hydrateProfile` remplit toujours le cache (`student/+layout.svelte:69`).
- **Registre** : M · cache élève · profil et fonctions de relecture du cache sans lecteur · preuve : commande `test -f src/lib/utils/cache-sync.ts && ! grep -q 'export async function refetchProfile' src/lib/utils/cache-sync.ts` (sortie 1).

### coquille-et-caches.md:336 [M] — VRAI

- **Vu** : grep d'import (hors tests) vide pour `stores/auth.svelte`, `LoadingDashboard`, `LoadingTable`, `FontSelector`, `SkeletonAvatar`, `SkeletonButton`, `SkeletonIcon`, `SkeletonNavItem` ; `input-capability.svelte.ts` n'est cité que par son test ; `ExampleModal.svelte` ne s'importe que lui-même (exemple en commentaire). Les fichiers existent encore.
- **Registre** : M · code mort · dix fichiers sans importeur · preuve : commande `! test -f src/lib/stores/auth.svelte.ts && ! test -f src/lib/components/LoadingTable.svelte && ! test -f src/lib/components/FontSelector.svelte` (sortie 1).

### coquille-et-caches.md:344 [M] — VRAI

- **Vu** : `teacher/documents/+page.server.ts:15-30` : `.from('profiles').select('role')` puis refus si ni teacher ni admin ; le layout prof garantit déjà le rôle (et refuse l'admin).
- **Registre** : M · page Documents · relecture inutile du rôle (une requête de trop, garde jamais atteinte pour l'admin) · preuve : commande `test -f 'src/routes/(protected)/dashboard/teacher/documents/+page.server.ts' && ! grep -q "from('profiles')" 'src/routes/(protected)/dashboard/teacher/documents/+page.server.ts'` (sortie 1).

### coquille-et-caches.md:358 [M] — VRAI

- **Vu** : `src/routes/+layout.svelte:109-115` (la doc dit 81-85, lignes décalées) : `$effect(() => { void theme.dark; void fontSize.size; void easyReading.enabled; })` sans effet de bord.
- **Registre** : M · layout racine · un effet qui ne fait que lire trois stores · preuve : commande `test -f src/routes/+layout.svelte && ! grep -q 'void easyReading.enabled' src/routes/+layout.svelte` (sortie 1).

### tableaux-de-bord-et-navigation.md:185 [M] — VRAI

- **Vu** : `src/lib/components/RewardsBlock.svelte:36,41` : `riddlesSolved: _riddlesSolved` jamais lu ; `+page.server.ts:84,253` continue de le calculer (mais `StudentDashboard.svelte:203` l'affiche ailleurs).
- **Registre** : M · accueil élève · propriété reçue sans usage · preuve : commande `test -f src/lib/components/RewardsBlock.svelte && ! grep -q '_riddlesSolved' src/lib/components/RewardsBlock.svelte` (sortie 1).

### coquille-et-caches.md:355 [C] — VRAI

- **Vu** : `src/lib/components/Header.svelte:30-34` décrit `invalidate('supabase:auth')` et « popup menu » (l.15-18) ; le code n'appelle plus `invalidate` (grep) et le lien/formulaire de déconnexion existe (l.217, 383). `student/+layout.svelte:26,29` : « Zero API calls on page load », « Automatic TTL-based expiration ».
- **Registre** : C · documentation du code · en-têtes de `Header.svelte` et du layout élève périmés · preuve : commande `test -f src/lib/components/Header.svelte && ! grep -q "Call invalidate('supabase:auth')" src/lib/components/Header.svelte` (sortie 1).

### tableaux-de-bord-et-navigation.md:187 [C] — VRAI

- **Vu** : `TeacherDashboard.svelte:43` « data.teacherClasses » alors que `:116` lit `teacherCache.getAllClassesSync()` ; `StudentDashboard.svelte:24,26` « Future: Will receive real … data », « FUTURE ENHANCEMENTS ».
- **Registre** : C · documentation du code · en-têtes des deux tableaux de bord périmés · preuve : commande `test -f 'src/routes/(protected)/dashboard/TeacherDashboard.svelte' && ! grep -q 'data.teacherClasses' 'src/routes/(protected)/dashboard/TeacherDashboard.svelte'` (sortie 1).

### tableaux-de-bord-et-navigation.md:190 [C] — PAS UN ÉCART

- **Vu** : `Sidebar.svelte:92-94` a bien sa propre `isActive` ; le point est une lacune de la doc (que la barre n'est pas décrite dans cette page), pas un défaut du code. Le comportement différent est déjà couvert par le point coquille-et-caches.md:350.

## Vu en passant

- Docs : les numéros de ligne cités (`+layout.svelte:81-85`, `ModalStackRenderer.svelte:73-93`) ont bougé ; à rafraîchir à l'occasion.
- `student/+layout.svelte` : commentaire « Zero API calls on page load » faux depuis que la présence du Palotin est lue après l'affichage par un GET (à rattacher au point 355).
- `Wheel.svelte:344-349` : si la roue a plus de 360 cases, `sliceSize` vaut 0 et la boucle `do … while` ne s'arrête pas (cas irréaliste).
