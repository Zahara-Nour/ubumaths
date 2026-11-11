# amelioration — pistes d'amélioration du site

## Reprendre ici

_Mis à jour le 2026-11-11, après #2553._

- **État** : piste 4 (c) close : volets 1, 2 (#2545), 3 (#2552), 4 (#2553, silhouette de l'atelier rendue par le serveur) mergés ; rien de #2553, #2552, #2545, #2542, #2541, #2540, #2539, #2538, #2536, #2535 en prod · **Prochaine action** : mesure de l'atelier à froid après `deploy:prod` (banc 4G ×4/×6) · **Défaut relevé, à proposer** : bureau 1280×800, « Mes objets » et la zone débordent de la grille (777 px pour 736) → la 2e rangée « + Point / + Courbe » est coupée sous l'écran (existait avant #2553) · **À proposer** (piste 3) : INP compté sur les seules interactions (`interactionId`) et URL de l'interaction · **Après le prochain `deploy:prod`** : vérifier dans `error_logs` qu'un même message INP ne revient plus ×10 pour un élève ; lignes #2545 et #2553 de `verifications-manuelles.md` · **Tranché** : B et C de la piste 4 (c) écartés ; `created_by` laissé tel quel ; molette = points remarquables masqués comme au glisser ; #1788 : point 3 laissé, point 1 plus tard · **Pièges en cours** : un module de `src/lib` qui agit au chargement hors de `scripts/side-effect-modules.ts` disparaît du build en silence — garde = test serveur ; `chalk` cité par les seuls `cli.ts`/`repl.ts`/`terminal-palette.ts` (garde) ; `db:migrate` refusé par le classifieur du mode auto → David le lance par `! pnpm db:migrate` ; les dimensions de la silhouette recopient `AtelierContainer`/`ObjectPanel`/`ToolButton` · **Worktree / branche** : aucun

## Pistes proposées au départ (2026-11-09)

David a demandé des idées d'amélioration du site ; il a choisi de commencer par la connexion (1).
Le reste n'est pas commencé. Sources : relevé Web Vitals #2094, issues ouvertes, `docs/wip/`.

1. **Ce que vivent les élèves en premier** : connexion lente (→ traitée, sections suivantes) ;
   Atelier affiché en 4,3 s (17 mesures, MathLive + moteur chargés d'un bloc) ; `/automaths`
   lent à répondre aux clics, 648 ms (2 mesures, à confirmer).
2. **« Mon cours »** (`/cours/[token]`, 85 mesures sur 210) : une fiche distribuée apparaît à trois
   endroits (Mon travail, onglet Fiches, cahier de texte), point mis de côté dans #1788 (ouverte)
   en attendant un vrai chapitre — il existe depuis le 2026-09-14. Même issue : objectif
   réinséré en double, pas d'unicité `chapter_id` (migration).
3. **Voir où les élèves bloquent** (réponses d'élèves) : gros chantier, RGPD ; phase 0 d'abord.
4. **Confort de développement** : test de CI qui échoue au hasard (navigateur qui plante en fin
   de lot) → 7 issues « Nightly CI triage » ouvertes ; #71 et #74 (mots de passe des comptes de
   prod à changer, David) ; #2191 (bumps risqués) ; tri des ~100 journaux de `docs/wip/`.
5. **Contenu** (`outils-manquants.md`) : n° 26 (règle graduée posée par l'élève), n° 24
   (corrigé PDF des gestes de tracé).

## Diagnostic de la connexion lente (2026-11-09)

Relevé #2094 : `/auth/login` LCP 5,8 s, TTFB 2,4 s au p75 (10 mesures).

- La page est légère (une vérification de session, aucune requête pour un visiteur).
- Mesuré en prod au `curl` : 1er appel 2,4 s, suivants 0,12-0,16 s ; `/dashboard` → 303 vers la
  connexion : 4,0 s au 1er appel, puis 0,07-0,17 s. → **démarrage à froid** de la fonction Vercel.
- Tout le site tient dans **une seule fonction** (~78 Mo sur une build locale du 19 octobre).
- Les connexions lentes de `error_logs` tombent à 7 h 11, 7 h 41, 8 h 06 (Paris) : le premier
  élève du matin paie le réveil, et la connexion est presque toujours la première page vue.
- Notre propre suivi (`initWebVitals`) enregistrait des valeurs absurdes pour un onglet ouvert
  en arrière-plan (« LCP 221 489 280 ms » le 2026-11-08) → PR 1.

## Pistes, dans l'ordre recommandé

1. **PR 1 (#2512, mergée)** : écarter FCP/LCP mesurés après le passage en arrière-plan.
2. **Fluid compute** sur Vercel : activé depuis longtemps (David, précisé le 2026-11-10 : rien à voir avec les gains de 0.80.0). Sur Hobby, le préchauffage garanti
   est réservé aux offres payantes : le réveil du matin reste probable.
3. **Alléger le démarrage du serveur** : build fraîche (`pnpm build`), mesurer ce que chargent
   `hooks.server.ts` et ses dix handles, ne charger les gros modules qu'à la demande.
4. Ping planifié à 7 h 30 en semaine : dernier recours (masque le symptôme).

## PR 2 — démarrage du serveur (2026-11-09)

Mesuré sur une build locale (`pnpm build`), fonction `catchall.func` lancée telle que Vercel la
lance (`new Server(manifest)`, `init`, puis `respond`), Mac mini M6 : les durées sont à
multiplier sur Vercel (CPU plus lent, disque froid), le nombre de fichiers lus ne change pas.

| Mesure                                       | Avant                | Après              |
| -------------------------------------------- | -------------------- | ------------------ |
| Modules chargés par `init` (hooks)           | 826 (7,5 Mo)         | 217                |
| Durée import + `init` (médiane de 7)         | ~155 ms              | ~48 ms             |
| `/dashboard` sans session (303), 1re requête | 854 modules, ~637 ms | 30 modules, ~20 ms |
| `/auth/login`, 1re requête                   | ~70 ms               | ~58 ms             |
| Taille de la fonction                        | 88 Mo                | 83 Mo              |

- **jsdom** (~650 modules, ~110 ms sur 155) : `hooks.server` → `errorMonitoring` →
  `notifications` → `sanitization` → `isomorphic-dompurify`. Désormais `notifications.ts` importe
  `./sanitization` à l'écriture d'une notification seulement. Test :
  `notifications-chargement-paresseux.test.ts` (rouge sans le changement).
- **date-fns** : laissé externe en SSR, Node chargeait les barrels `date-fns` et `date-fns/locale`
  (826 fichiers). `ssr.noExternal: ['date-fns']` dans `vite.config.ts` : élagué comme côté client.
- **Reste, hors PR** : les composants markdown assainissent en SSR avec `isomorphic-dompurify`
  (`$lib/utils/sanitize.ts`, synchrone) : jsdom se charge à la première page qui en rend. Le
  remplacer côté serveur par un DOM plus léger serait un autre chantier. Pages connectées non
  mesurées (il faut une session).

## Après le déploiement 0.80.0 (2026-11-09)

Mesure au `curl`, 17 h 36, 43 min après le déploiement (instance froide non garantie) :

| Appel                    | Avant (même méthode) | Après                                                                            |
| ------------------------ | -------------------- | -------------------------------------------------------------------------------- |
| `/auth/login`, 1er appel | 2,4 s                | 1,71 s                                                                           |
| `/auth/login`, suivants  | 0,12-0,16 s          | 0,12 s                                                                           |
| `/dashboard` (303)       | 4,0 s (1er appel)    | 0,69 s, mais juste après `/auth/login` : instance déjà réveillée, pas comparable |

Un seul échantillon : à confirmer par un réveil du matin et par le TTFB p75 des web vitals.

Réveil du matin, 2026-11-10 à 5 h 41 (nuit sans élèves) : `/auth/login` **0,31 s** au 1er appel,
puis 0,11 et 0,09 s ; `/dashboard` 0,23 s juste après. Avant : 2,4 s. On ne peut pas savoir au
`curl` si l'instance était vraiment froide.

2026-11-10 à 12 h 04, ni élèves ni David depuis plusieurs heures : `/auth/login` **0,73 s** au
1er appel (connexion TCP 0,01 s), puis 0,11 et 0,08 s ; `/dashboard` 0,23 s juste après. Le
1er appel est nettement plus lent que les suivants : c'est bien un réveil, et il coûte 0,7 s
au lieu de 2,4 s. Fluid compute était déjà activé lors de la mesure à 2,4 s : le gain vient du déploiement 0.80.0,
vraisemblablement de #2515.

## Piste 1 suite — Atelier et Automaths (diagnostic du 2026-11-10, rien de modifié)

Sources : Speed Insights #2094 (Atelier 17 mesures, Automaths 2), `error_logs` de prod (60 j),
`curl` et Playwright sur la prod (Mac mini, réseau rapide ; le bridage réseau n'a pas pris).

**Automaths : déjà traité par le chantier `automaths-apercus` (#2376, en prod 0.70.0 le
2026-11-04 à 12 h 29 ; journal : `docs/archive/wip/automaths-apercus-progress.md`).**

- ⚠️ Premier diagnostic faux : il mélangeait les logs d'avant et d'après 0.70.0. Relu après
  0.70.0 : **aucun** « Slow request » sur `/automaths`, **aucune** tâche longue ni INP lent.
- Les lenteurs restantes de `/api/questions/templates/all` et `/automaths/test` tombent toutes
  le 2026-11-06 vers 13 h, avec 41 requêtes lentes sur tout le site en une heure : incident
  général, pas Automaths.
- Reste mineur : la liste publique pèse 11 Mo bruts (1,7 Mo compressés, 2 131 modèles), dont
  `test_specs` = 31 % (3,5 Mo), a priori inutile au catalogue, au panier et au test (à vérifier).
- Les relevés Speed Insights de #2094 (2 mesures Automaths) datent en partie d'avant 0.70.0.

**Atelier : peu de données, cause probable le poids du JavaScript.**

- 1,7 Mo de JS en 199 fichiers (accueil : 0,3 Mo, 86 fichiers) ; la zone de l'atelier reste
  vide tant que tout n'est pas chargé (`opened` = null au rendu serveur).
- `error_logs` : ~6 visites lentes réelles en octobre (FCP 3,4-3,7 s, LCP 3,4-5,0 s), rien
  depuis le 2026-10-28. Les FCP/LCP absurdes (382 604 ms) = onglet en arrière-plan (#2512).
- ⚠️ Bug de notre suivi : le même INP est renvoyé plusieurs fois (616 ms ×15, 304 ms ×9) :
  les comptes d'INP de `error_logs` sont gonflés.

## PR 3 — liste des modèles sans `test_specs` (2026-11-10)

- Décision de David : retirer `test_specs` de la liste publique, avec un type dédié.
- `+server.ts` : colonnes listées (`TEMPLATE_COLUMN_LIST`) au lieu de `*`, garde de compilation
  (`ForgottenColumn`) vérifiée en retirant `delay` : `check:incremental` échoue en la nommant.
- `CatalogueTemplate = Omit<QuestionTemplate, 'testSpecs'>` pour `questionTemplatesCache` ;
  `check:incremental` = 0 erreur sans autre changement : aucun lecteur du cache ne lisait
  `testSpecs`. Test `@ts-expect-error` dans le test du cache.
- Vérifié en local avec la vraie liste de prod sans `test_specs` (8,45 Mo au lieu de 11,2 Mo),
  injectée à la place de l'API : catalogue rangé, rubrique « ordre » avec aperçus, panier.
- Vu au passage, sans lien (même rendu en prod) : les choix du QCM « Comparer deux nombres
  entiers » s'affichent `$$<$$` en brut dans le catalogue et le panier.
- Mergée le 2026-11-10 (#2532), revues sans bloquant.
- **Revue de code** : le cache garde les lignes brutes (snake_case) ; le type refuse `testSpecs` et
  `test_specs`, la vraie protection est la liste de colonnes (commentaire et doc corrigés).
- **Bug ancien découvert, non corrigé** : le générateur lit `template.exerciseInstruction`
  (`instance-generator.ts:1348`) mais le cache n'a que `exercise_instruction` : les 19 modèles
  publiés qui ont une consigne d'exercice la perdraient dans Automaths (panier, test). Correctif
  probable : `mapDbTemplateToForm` à la lecture du cache. Pas encore vu à l'écran.
- **Revue de sécurité** (hors PR, déjà vrai avant) : `created_by` sort publiquement (UUID du seul
  auteur, l'admin) ; la policy anon « Anon can view published templates » laisse lire toutes les
  colonnes des modèles publiés par PostgREST, `test_specs` compris : la PR allège la réponse,
  elle ne cache rien. Protéger des colonnes = migration à part.

## Consigne d'exercice (2026-11-10)

But du champ (David) : consigne partagée par toutes les variations, affichée **une seule fois**
dans un PDF pour les questions du même genre. Jamais fait : le seul PDF qui la lit
(`serie-automatismes.ts:452-456`, ajouté le 2026-09-28) la colle devant CHAQUE question ; le PDF
du panier Automaths n'existe pas (« Fonctionnalité à venir »).

- **PR 4** (#2534, mergée le 2026-11-10, revue sans bloquant) : cartes Automaths. Cause : le cache garde les lignes de la base
  (`exercise_instruction`), le générateur lit `exerciseInstruction`. Correctif :
  `mapDbTemplateToForm` dans `questionTemplatesCache`. Test de rendu
  `catalogue-consigne.svelte.test.ts` (rouge avant). Vu à l'écran avec la liste de prod :
  « Calcule. » sur les « Table d'addition' ».
- **PR 5, décisions de David** : (1a) dans une série qui mélange des modèles, chaque consigne une
  fois au début de chaque groupe de questions CONSÉCUTIVES qui la partagent ; placée **au début
  de l'exercice** (première ligne du groupe), le titre de l'exercice (donné par le prof) inchangé.
- **PR 5, phase 0 validée le 2026-11-10** (branche `feat/amelioration-consigne-serie`) : consigne
  en **paragraphe au-dessus du groupe**, hors numérotation (la liste reprend à « 3. ») ; **mêmes
  places au corrigé** ; groupe = même TEXTE de consigne (deux modèles, une consigne → un groupe) ;
  une question sans consigne coupe le groupe ; doublons comparés consigne comprise (inchangé).
  **Séries existantes non touchées** (figées en base, `buildSerie` n'est appelé que par les
  scripts `create-automatismes-*`) : les recréer se décidera série par série.
  Vérifié sans rien changer : `questionItems` (cadres de réponse) et `generateBody` numérotent
  d'une liste à l'autre ; un paragraphe reste collé à la liste qui le suit (`keepsWithNext`).
  Tests : `serie-automatismes.test.ts` § « consigne d'exercice, une fois par groupe » (6 rouges
  avant).

## Piste 2 — choix `$$<$$` affichés en brut (2026-11-10)

- **Cause** : un choix qui n'est qu'une formule `$$…$$` est lu comme un bloc de formule, pas comme
  un paragraphe ; `ChoiceList` (liste A, B, C du catalogue, du panier, et liste corrigée) le
  passait à `InlineMarkdown`, qui ne garde que le premier paragraphe et retombe sur le texte brut.
  Les 4 modèles publiés « Comparer deux nombres entiers » (niveaux 1 à 4) sont touchés ; la saisie
  (`MultipleChoiceInput`, `MarkdownRenderer`) ne l'était pas.
- **Correctif** (branche `fix/choix-formule-seule`) : un choix qui n'est pas un seul paragraphe
  passe par `MarkdownRenderer`, comme à la saisie (formule centrée, comme à la saisie). Tests :
  `ChoiceList.svelte.test.ts` § « choix qui ne sont qu'une formule » (2 rouges avant). Mergée le 2026-11-10 (#2536), sans revue (correctif d'affichage d'une douzaine de lignes).
- **(2b) Formule calée à gauche** (branche `fix/choix-formule-gauche`, 2026-11-10) : dans
  `ChoiceList` (catalogue, panier, corrigé), une formule seule était centrée au milieu de la ligne,
  à ~280 px de sa lettre ; elle est désormais contre la lettre, comme un choix de texte
  (`.choice-formula` : `justify-content: flex-start`). L'écran de réponse (`MultipleChoiceInput`)
  est inchangé. Test : « formule seule calée à gauche » (rouge avant : écart 278 px).

## Piste 3 — INP renvoyé plusieurs fois par notre suivi (2026-11-11)

- **Mesure** (`error_logs`, 60 j, messages INP reçus plus de 2 fois) : « INP 1688ms » ×28,
  « 616ms » ×18, « 408ms » ×14, « 1080ms » ×13, « 2024ms » ×12… chaque fois **un seul
  élève**, une ou deux pages, sur un à trois jours : un onglet laissé ouvert.
- **Cause** : `initWebVitals` envoyait INP et CLS à **chaque** passage en arrière-plan, avec la
  pire valeur depuis l'ouverture ; seule la fenêtre anti-doublon de 5 minutes les retenait.
- **Correctif** (branche `fix/inp-renvoye`, PR #2539) : une valeur ne repart que si elle a grandi
  depuis le dernier envoi (`reportedInp`, `reportedCls`), et n'est marquée envoyée que si
  `queueError` l'a prise (sinon, limite par minute atteinte, elle retente au passage suivant :
  `queueError` et `reportWebVital` rendent un booléen). Tests :
  `errorMonitoring-web-vitals.svelte.test.ts` (INP et CLS non renvoyés : rouges sans la garde ;
  INP abandonné renvoyé : rouge si on marque sans condition ; INP plus lent renvoyé). Piège :
  `vi.resetModules()` ne recharge pas le module en mode navigateur → valeurs distinctes par test.
- **Revue** (`code-reviewer`, Sonnet) : 2 points retenus. (1) valeur marquée envoyée alors que
  l'envoi a été abandonné → corrigé ; (2) un premier jet détachait les écouteurs au
  `beforeunload` (`AbortController`), ce qui coupait INP et CLS après un retour du bfcache
  ou un `beforeunload` annulé → retiré.
- **Non traité** (à proposer) : notre « INP » est la durée de l'événement le plus lent de toute
  la session, y compris les événements sans `interactionId` (pas des interactions) ; le vrai
  INP ne compte que les interactions. Et l'URL envoyée est celle de la page au moment du
  passage en arrière-plan, pas celle où l'interaction lente a eu lieu.

## Piste 4 — Atelier lent : mesures du 2026-11-11 (rien de modifié)

David ne se rappelait plus le geste lent → mesures larges. Banc Playwright sur la **prod**
(`/atelier`, public), processeur bridé ×1/×4/×6 (CDP), réseau rapide ou 4G simulée ; profil CPU
sur le serveur de dev (noms lisibles, la prod n'a pas de sourcemaps). Scripts jetables, non
versionnés. ⚠️ Un nom de fonction ne prend pas de chiffre (`g1(x)` refusé) : un premier
« 10 courbes » n'en traçait qu'une.

- **Calculs de la console : rapides.** Au ×6, toutes les commandes (`.dériver`, `.résoudre`,
  `.variations`, `.intégrer`, `.taylor`, `.binomiale`…) répondent en < 140 ms, la plupart
  < 70 ms. Frappe : 24 ms par touche, en mode texte comme en mode math (MathLive).
- **Chargement à froid** : console utilisable après 3,0-3,7 s (4G, ×4/×6), 0,9 s sur réseau
  rapide ; 199 fichiers JS, 1,7 Mo compressés (5,3 Mo décodés). À chaud : 0,3-0,7 s.
- **Le graphe avec 10 courbes (×6) — le vrai point lent :**
  - molette : **860 ms de gel pour 5 crans** (~150 ms par cran) ;
  - glisser : 173 ms au lâcher ; bouton zoom : 200 ms ; retour sur la vue Graphe : 144 ms ;
  - chaque fonction ajoutée coûte un peu plus (55 → 84 ms de la 2e à la 10e).
- **Cause (profil)** : à chaque changement de fenêtre, analyse de chaque fonction (points
  critiques, `solve` exact, racines — `analyzeAllFunctions`, ~280 ms sur 5 crans) et
  intersections de toutes les paires (`findAllIntersections`, 45 paires, ~290 ms).
  1. `handleWheel` (`GraphSVG.svelte:393`) ne pose pas `isInteracting` : le glisser saute ces
     calculs pendant le geste, la molette les refait à **chaque cran**.
  2. Les intersections sont calculées **deux fois** : `IntersectionPoints.svelte:71` et
     `CurveHover.svelte:131`, sans cache (l'analyse, elle, a `analyzeCached` : partagée entre
     `AsymptoteLines`, `SpecialPoints`, `CurveHover`).
- **À proposer à David** : (a) molette = interaction, calculs une fois ~150 ms après le dernier
  cran ; (b) intersections calculées une fois (cache comme `analyzeCached`) ; (c) chargement à
  froid, chantier plus gros (découpage du JS de l'atelier).
- Vu en passant : message d'erreur `g9(x)=…` en mode texte avec du LaTeX brut
  (« utilise \cdot (x\cdot 9) »).

## PR 4 — molette et intersections (#2540, mergée le 2026-11-11)

- David a suivi les recommandations (a) et (b) ; (c) reste à proposer.
- (a) `GraphSVG.svelte` : la molette pose `isInteracting`, retombé 150 ms après le dernier cran
  (`WHEEL_END_DELAY`) ; un glisser en cours garde la main ; un démontage pendant la molette clôt
  le geste (trouvé par la revue : le magasin survit au graphe).
- (b) `intersections.ts` : cache par paire d'expressions (WeakMap ×2) puis par fenêtre, vidé au-delà
  de 200 fenêtres par paire ; restriction après le cache.
- Profil (dev, ×6, 10 courbes) : 5 crans de molette 659 → 145 ms ; intersections au glisser 47 → 28 ms.
- Tests : `GraphSVGWheel.svelte.test.ts` en minuteurs simulés (en temps réel : 1 échec sur 4 sur
  machine chargée) ; `unmount()` doit être attendu (`lint:fast` au pre-push).
- Revue, non traité : zoom clavier (`KeyboardHandler.svelte`) et boutons (`ViewportControls`)
  recalculent tout à chaque appui ; pas de test `bindParameters` du cache.

## PR 6 — zoom au clavier et aux boutons en geste bref (2026-11-11)

- Suite de la revue de #2540 : boutons « Zoom avant/arrière » (`ViewportControls`), touches
  `+ = -` et flèches (`KeyboardHandler`) recalculaient tout à chaque appui.
- Le minuteur de la molette passe dans le magasin : `briefGesture()` (150 ms,
  `BRIEF_GESTURE_DELAY`), `endBriefGesture()` au démontage ; `setInteracting` tient le glisser
  (`held`), qu'un geste bref ne clôt pas. Réinitialiser (maison, Échap) et `0` restent un seul calcul.
- Tests : `grapheur-geste-bref.svelte.test.ts` (magasin), `zoom-clavier-boutons.svelte.test.ts`
  (6 tests, rouges sans le changement) ; les 4 tests de la molette inchangés et verts.

## Piste 4 (c) — chargement à froid de l'atelier : mesure du 2026-11-11 (rien de modifié)

`ANALYZE=1 pnpm build` sur `main`, graphe des imports statiques du manifeste (nœud 273 =
`/atelier`) ; tailles gzip -9 des fichiers.

- Commun (entrée + layout racine) : 69 fichiers, 0,16 Mo. **Propre à l'atelier : 120 fichiers,
  1,36 Mo** (total 1,53 Mo).
- Répartition par source (gzip module par module, donc surestimée — à lire en proportions) :
  MathLive ~250 Ko ; `lib/atelier` ~240 ; `components/markdown` ~180 et `ubumark` (parser, utils,
  generators) ~265 — graphiques stat, tableaux de variations, simulations ; mathAST ~600 en tout
  (cli, normal, integration, solve, parser, limits, pedagogical-*…) ; bits-ui ~75 ; geometry-core
  ~80 ; **grapheur ~50 seulement**.
- ⇒ découper « par vue » (grapheur, figures) ne gagne que ~0,1-0,15 Mo. Les vrais postes :
  ubumark/markdown (commandes de stats, variations, simulations), MathLive (inutile en mode
  texte ?), les modules lourds de mathAST attachés à des commandes précises.

## Piste 4 (c) — exploration du chargement à la demande (2026-11-11, rien de modifié)

Méthode : graphe des imports statiques depuis `routes/(public)/atelier/+page.svelte` (hors
`import type`) ; on simule « ce fichier devient `import()` » et on compte ce qui sort, en tailles
**réelles après tree-shaking** lues dans `stats.html` du build `ANALYZE=1` du matin (somme par
module = 2 346 Ko, ramenée aux 1 424 Ko réels de l'atelier). Scripts jetables dans le scratchpad.

- **Les barils ne sont pas élagués.** `GeometryCanvas.svelte:7` importe `parseMarkdown` depuis
  `$lib/ubumark` (index) : l'atelier embarque les générateurs Typst (`typst-generator` 16 Ko,
  `stat-chart-typst`, `courbe-typst`…), l'importeur LaTeX, `uqr` (QR code). Même chose côté
  `components/markdown/index.ts` (via `GeneratedStepsCorrection`) : `dompurify`, `ImageDisplay` →
  `exercises/types`. Et `chalk` (couleurs de terminal, 3 Ko) via `cli/commands/eval.command.ts`.
- **Gains mesurés** (Ko compressés retirés du chargement initial, sur 1 424) :
  | Changement                                                                                                    | Gain                       |
  | ------------------------------------------------------------------------------------------------------------- | -------------------------- |
  | `GeometryCanvas` → `ubumark/parser/markdown-parser` direct                                                    | ~49                        |
  | `GeneratedStepsCorrection` à la demande (`CalculView.svelte:744`, déjà dans un `{#if}` : les étapes dépliées) | ~108                       |
  | les deux                                                                                                      | ~164                       |
  | + `solve-steps`, `integrate-steps`, `limit` (`calcul.ts`) à la demande                                        | ~217                       |
  | MathLive hors du chargement initial                                                                           | ~146                       |
  | `VariationTable`, `StatChart`, `derive-/variations-/simplify-/factor-steps` seuls                             | < 20 chacun : ne vaut rien |
- **MathLive** : pas seulement le champ de saisie. `convertLatexToMarkup` affiche **chaque**
  formule (6 composants : `CalculView`, `ValueCard`, `FunctionCard`, `FormulaText`, `DataView`,
  `ObjectProperties`). Mode de saisie par défaut = `text` (`input-mode.ts:29`). Le sortir du
  chargement initial = charger MathLive juste après le premier affichage et faire attendre
  l'affichage des formules : refonte de ces 6 composants, PR plus grosse.
- **Silhouette** : la page ne rend rien côté serveur (`opened` n'est posé qu'après
  `openLink(…)`, asynchrone, dans un `$effect`) → écran vide jusqu'à la fin du JS. Une silhouette
  (onglets, barre de saisie inerte) rassure sans rendre la console utilisable plus tôt.
- Ordre de grandeur : 1,7 Mo → 3,0-3,7 s en 4G ×4/×6 ; −160 à −220 Ko ≈ −0,3 à −0,5 s.
- **Options proposées à David** : A = étapes à la demande + import ciblé du parseur (~164 Ko,
  petite PR, `CalculView` + `GeometryCanvas`) ; B = A + commandes à étapes lourdes (~217 Ko, il
  faut rendre `calcul.ts` asynchrone sur ces commandes) ; C = MathLive (~146 Ko, refonte de 6
  composants) ; D = silhouette (perçu seulement). `chalk` : à sortir du code client dans tous
  les cas (3 Ko, mais du code de terminal dans le navigateur).

## Piste 4 (c) — phase 0 validée et PR 7 (2026-11-11)

David : « la solution la plus propre même s'il y a plus de travail » → 4 volets, B et C écartés.
Comportements validés tels que proposés (volet 1 : rendre les barils élagables ; volet 2 :
« Chargement des étapes… », échec → message + « Réessayer » ; volet 3 : couleurs au seul REPL du
terminal ; volet 4 : silhouette inerte).

- **Volet 1, cause** : les barils n'y sont pour rien en soi. Rolldown garde un module entier dès
  qu'une constante de niveau module est construite par un appel (`P.add(…)`, `createRule`,
  `new Set`) : il ne prouve pas l'absence d'effet. Banc : `parseMarkdown` seul = 1 843 Ko non
  minifiés (220 modules), par `$lib/ubumark` = 2 318 Ko ; tout déclaré sans effet → 1 229 / 1 174.
- **Remède** : `treeshake.moduleSideEffects` du build client (`scripts/side-effect-modules.ts`) :
  `.ts` de `src/lib` sans effet sauf 22 modules qui agissent au chargement (enregistrements,
  `z.config`, imports nus de CSS, workers). Garde = test serveur qui relit `src/lib`.
- ⚠️ Premier essai : `utils/mathlive-styles.ts` (rien qu'un `import 'mathlive/static.css'`) élagué
  → polices de MathLive en 404. Vu au banc Playwright, pas par les tests. La détection compte
  depuis les imports nus (+7 modules).
- **Vérifié** : build complet avant / après, 334 routes ; 29 commandes de console identiques à la
  référence (16 « Comment ? » dépliés) ; 63 pages publiques sans erreur, mêmes textes (3 écarts =
  contenu tiré au hasard) ; CSS identique (689 842 / 689 843 octets, 75 `@font-face`).
- **Volet 2** : `StepsOnDemand.svelte` + `lazyLoader` ; 9 fichiers de tests préchargent dans un
  `beforeAll`. Atelier 1 409 → 1 308 Ko.
- **Revue** (code-reviewer) : 0 bloquant ; 2 mineurs corrigés — la garde lit aussi les imports nus
  des `.svelte` et des routes ; `loaded` réactif (`lazy-loader.svelte.ts`) : un « Réessayer »
  réussi rétablit toutes les lignes en échec. Rolldown vérifié : un module déclaré sans effet
  dont un export est utilisé GARDE ses instructions à effet ; seul un module atteint sans export
  utilisé (import nu, import nommé inutilisé) disparaît.
- **CI** : bloquée un temps par 2 tests d'intégration `palotin-boucle` rouges sur `main` depuis
  #2544 (réparés par la session palotins, #2546) ; puis la garde des imports nus dépassait 5 s en
  CI → tri par regex avant l'AST (161 ms) et délai de 30 s. Mergée le 2026-11-11.

## Piste 4 (c) — volet 3 : `chalk` hors du code client (PR 8, 2026-11-11)

- **Remède** : palette `mathAST/cli/core/terminal-colors.ts` (`colors.bold`, `colors.boldRed`…),
  texte brut par défaut ; `cli.ts` et `startRepl()` y branchent `chalk` (`useChalkColors()`,
  `cli/terminal-palette.ts`). Les 21 commandes et `output-formatter.ts` n'importent plus `chalk`.
- **Piège vu** : `colorFn.bold(…)` (chaîne de styles chalk) dans `eval.command.ts` levait une
  exception une fois `colorFn` devenu une palette → `.évaluer x>2 en x=3` refusé. Attrapé par
  `evaluer-formule.test.ts` et le typecheck ; remplacé par `boldGreen` / `boldRed`.
- **Garde** : `cli/__tests__/core/terminal-colors.test.ts` — `chalk` importé par les seuls `cli.ts`,
  `repl.ts`, `terminal-palette.ts` (rouge vérifié en remettant l'ancien `hash.command.ts`) ; aucune
  séquence ANSI dans ce que reçoit l'atelier.
- **Vérifié** : 9 750 tests serveur (cli, atelier, variations, garde des effets de bord) + test
  client `render-ansi` verts ; `pnpm math repl` colore toujours (`FORCE_COLOR=1`) ; build : plus
  de `chalk` dans `.svelte-kit/output/client` (`FORCE_COLOR`/`supportsColor` absents).
- `atelier/render.ts` retire toujours les séquences ANSI, par prudence (commentaire mis à jour).
- **Revue** (code-reviewer) : 0 bloquant ; pris : garde d'import sur tout `src` et toute mention
  de `'chalk'` (sous-chemins, `require`), 10 commandes au test ANSI, test du branchement chalk
  (rouge vérifié en câblant `boldGreen` sur `chalk.green`) ; laissé : double appel de
  `useChalkColors()` (`startRepl` est aussi exporté par l'index de `cli`).

## Piste 4 (c) — volet 4 : silhouette de l'atelier (#2553, mergée le 2026-11-11)

- **Remède** : `AtelierSilhouette.svelte`, dans le `{:else}` de `routes/(public)/atelier/+page.svelte`
  (rendu tant que `opened` est nul : au serveur, puis jusqu'à `openLink(…)`). « Mes objets »,
  barre d'outils en blocs, onglets en texte, « Chargement de l'atelier… » (`role="status"`),
  `<h1>` sr-only ; « Mes objets », la barre et les onglets `inert`, aucun bouton ni champ.
- **Test** : `silhouette-serveur.test.ts`, rendu serveur de la page (`svelte/server`, `page` de
  `$app/state` simulée) ; 3/3 rouges sans la silhouette, verts avec.
- **Mesuré au banc Playwright** (JS coupé contre JS actif, 1280×800 et 390×844) : en-tête, barre
  (49 px), onglets (44 px), pastilles (28 px) aux mêmes positions. Pièges : `ObjectPanel` met son
  titre dans un `<header>` (styles globaux des `header`, `strong` à 16 px) → même élément ; sur
  téléphone, pas de bouton « replier » quand l'atelier est vide (en-tête de 33 px).
- **Revue** (code-reviewer) : 0 bloquant ; pris : `aria-busy` retiré (il pouvait taire le titre),
  test qui situe chaque `inert` (contre-épreuve : scène inerte → rouge), titre en constante ;
  JS qui ne charge pas → la silhouette reste : limite écrite dans la doc. CI verte, mergée.
- **Défaut relevé (existant, non corrigé)** : à 1280×800, l'atelier chargé déborde de sa grille
  (panneau et zone 777 px pour 736) ; la 2e rangée « + Point / + Courbe » est sous l'écran.

## Piste 5 — « Mon cours », #1788 (phase 0, 2026-11-11)

Relevé (code + prod en lecture seule) puis décisions de David :

- **Point 2** (objectif réinséré en double) : sans objet depuis l'ADR 0029 (lien vivant, plus de
  versions ni de recopie) → à fermer dans #1788.
- **Point 5** (pas de `UNIQUE (chapter_id)` sur `chapter_template_instantiations`) : toujours vrai ;
  `adoptChapterContent` vérifie puis insère (deux appels simultanés passent). Prod : 2 rattachements,
  0 chapitre en double. **Décidé : index UNIQUE (chapter_id)** — PR A, additive, personne ne gagne
  d'accès.
- **Point 3** (double clic « publier une fiche ») : **laissé** (David : point 5 seulement).
- **Point 4** (`students_can_leave`, DELETE sur `class_members`, toujours en prod, aucun usage dans
  `src`) : **décidé : la retirer** — PR B. Question en miroir : les élèves ne pourront plus se
  retirer seuls d'une classe par l'API ; aucun écran ne le permet. DROP POLICY : `db:migrate`
  seulement après accord explicite de David.
- **Point 1** (fiche visible à trois endroits) : **plus tard**, reste dans #1788.

## PR 5 — `students_can_leave` retirée (#2541, mergée le 2026-11-11)

- **Correction du relevé** : le point 5 de #1788 était **déjà tenu** — index
  `unique_chapter_instantiation` (`CREATE UNIQUE INDEX`, vérifié en prod), gardé par
  `chapter-template-instantiation-unique.test.ts`. Pas de PR A.
- Migration `20261111081528_retrait_students_can_leave.sql` ; test
  `eleve-ne-quitte-pas-seul-sa-classe.test.ts` **rouge sans la migration** (l'élève effaçait sa
  ligne), vert avec ; contre-épreuve professeur. 10 fichiers d'intégration voisins : 168 verts.
- `security-auditor` : aucun finding bloquant (suppression de compte et cascades en service-role,
  aucun DELETE de `class_members` dans `src`). `code-reviewer` : rien de bloquant.
- Appliquée en **local** seulement (psql sous verrou). Prod : en attente de l'accord de David.
