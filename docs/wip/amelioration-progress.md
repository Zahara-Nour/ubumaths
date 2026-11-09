# amelioration — pistes d'amélioration du site

## Reprendre ici

_Mis à jour le 2026-11-09, après le `deploy:prod` 0.80.0 (livre #2512 et #2515)._

- **État** : #2512 et #2515 en prod (0.80.0, 16 h 53). Une mesure à 17 h 36 : `/auth/login` 1,71 s au 1er appel (avant : 2,4 s), puis 0,12 s ; un seul échantillon, froid non garanti · **Prochaine action** : mesurer un vrai réveil (tôt le matin, avant 7 h, `curl` sur `https://www.chiph.re/auth/login` PUIS `/dashboard` dans des appels séparés) et relire le TTFB p75 de `/auth/login` dans les web vitals après quelques jours ; puis décider du point 4 (ping) · **En attente de David** : rien · **Pièges en cours** : `chiph.re` répond 308 vers `www.chiph.re` (mesurer `www`) ; commitlint refuse un corps de commit à lignes > 100 caractères ; `docs:check-a-jour` ne voit que les fichiers COMMITÉS · **Worktree / branche** : aucun

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
2. **Fluid compute** sur Vercel : activé (David, 2026-11-09). Sur Hobby, le préchauffage garanti
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
