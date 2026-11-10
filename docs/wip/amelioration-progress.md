# amelioration — pistes d'amélioration du site

## Reprendre ici

_Mis à jour le 2026-11-10, après #2534._

- **État** : #2512, #2515, #2532, #2534 mergées (0.81.0 publiée depuis) ; PR 5 codée sur `feat/amelioration-consigne-serie`, tests verts · **Prochaine action** : PR 5 → revue, PR, CI, merge · **En attente de David** : retirer `created_by` de la liste publique ? · **Pièges en cours** : `chiph.re` répond 308 vers `www.chiph.re` ; ne pas lire `error_logs` sans séparer avant/après un déploiement · **Worktree / branche** : `../ubumaths-wt-amelioration`, `feat/amelioration-consigne-serie`

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
