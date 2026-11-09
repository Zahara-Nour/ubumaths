# amelioration — pistes d'amélioration du site

## Reprendre ici

_Mis à jour le 2026-11-09, PR 1 ouverte._

- **État** : PR 1 (Web Vitals d'onglet caché écartés) en cours · **Prochaine action** : merger la PR 1 · **En attente de David** : vérifier que « Fluid compute » est activé (Vercel → Settings → Functions) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-amelioration`, `fix/amelioration-web-vitals`

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

1. **PR 1** : écarter FCP/LCP mesurés après le passage en arrière-plan.
2. **Fluid compute** sur Vercel (réglage du tableau de bord, David).
3. **Alléger le démarrage du serveur** : build fraîche (`pnpm build`), mesurer ce que chargent
   `hooks.server.ts` et ses dix handles, ne charger les gros modules qu'à la demande.
4. Ping planifié à 7 h 30 en semaine : dernier recours (masque le symptôme).
