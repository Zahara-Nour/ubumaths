# amelioration — pistes d'amélioration du site

## Reprendre ici

_Mis à jour le 2026-11-10, après les mesures de réveil en prod._

- **État** : #2512 et #2515 en prod (0.80.0). Réveil mesuré le 2026-11-10 à 12 h 04 (aucune visite depuis des heures) : `/auth/login` 0,73 s au 1er appel au lieu de 2,4 s, puis 0,1 s · **Prochaine action** : choisir la piste suivante (§ « Pistes proposées au départ » : Mon cours recommandé) ; dans quelques jours, relire le TTFB p75 de `/auth/login` dans les web vitals (2,4 s avant) ; puis décider du point 4 (ping) · **En attente de David** : rien · **Pièges en cours** : `chiph.re` répond 308 vers `www.chiph.re` (mesurer `www`) ; Fluid compute était activé AVANT les mesures de référence ; commitlint refuse un corps de commit à lignes > 100 caractères · **Worktree / branche** : aucun

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
