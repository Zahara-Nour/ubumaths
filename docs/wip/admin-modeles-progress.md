---
status: en cours
---

# Admin des modèles de questions — UX de publication et de recherche

## Reprendre ici

_Mis à jour le 2026-11-09, PR 2 en cours._

- **État** : PR 2 ouverte (branche `fix/admin-modeles-liste`) : (d) cause trouvée — la garde
  `dashboard/admin/+layout.server.ts` renvoyait vers l'élévation avec le chemin seul, les filtres
  de l'adresse perdus au retour (David = compte professeur élevé) ; (c) recherche par titre (ILIKE)
  ou début d'identifiant (≥ 8 caractères hexadécimaux, choix de David, plage d'UUID), champ réactivé ·
  **Prochaine action** : revue (code-reviewer + security-auditor : redirection d'élévation),
  CI, merge ; puis `deploy:prod` sur demande de David et ligne 22 d'`outils-manquants.md` en « Livré » ·
  **En attente de David** : rien · **Pièges en cours** : finding 6 de #2489 toujours laissé ·
  **Worktree / branche** : `../ubumaths-wt-admin-modeles`, `fix/admin-modeles-liste`.

## Origine (2026-11-08, session `automatismes-1spe`)

Mettre à jour `7f82d15a` (publié) a demandé cinq allers-retours. David : « l'UX pour faire ça est nulle »,
« l'UX ne va pas du tout ». Défauts relevés : `docs/wip/outils-manquants.md` n° 22, points (a) à (e).

## Phase 0 — comportements validés

### PR 1 : page d'édition d'un modèle (points a, b, e)

- **Modèle publié** : boutons « Renoncer », **« Enregistrer »** (reste publié, contrôle complet) et
  **« Repasser en brouillon »** (même confirmation que la liste : « Ce modèle ne sera plus proposé aux
  élèves… »).
- **Modèle en brouillon** : « Renoncer », « Enregistrer brouillon », « Publier » (inchangé).
- **« Publier » ne refuse plus à tort** : le contrôle client « réponse manquante » est retiré ; le serveur
  juge (même `checkTemplate` que la liste et `create-questions.ts`) et ses raisons s'affichent dans
  l'encadré « Erreurs à corriger ». Une version sans aucune réponse reste refusée, par le serveur.
- Tests : publier un modèle à réponses dans le texte passe ; repasser en brouillon change le statut et
  l'affiche ; « Enregistrer » d'un modèle publié le garde publié ; version sans réponse refusée avec la
  raison du serveur.

### PR 2 : retrouver un modèle dans la liste (points c, d)

- Recherche par **titre** (et par début d'id), sur le titre directement, sans attendre l'index plein texte.
- Les filtres de l'adresse (`?grades=…&minLevel=…`) appliqués à l'ouverture : chercher d'abord pourquoi la
  page les ignore (vu le 2026-11-08 : 11 modèles attendus en base, 42 pages affichées).

Après les deux : `deploy:prod` sur demande de David ; passer la ligne 22 d'`outils-manquants.md` en « Livré ».

## Journal

### PR 1 (2026-11-08)

- `QuestionTemplateForm` : boutons selon `status` ; « Repasser en brouillon » envoie la version en
  cours avec `status: draft` en `silent` (on reste sur la page) et reprend l'instantané « non
  sauvegardé » ; refus → statut remis. Contrôle client « réponse manquante » retiré (`isValid` et
  `getVariationErrors`). Prop `serverErrors` passée par `[id]/edit` et `create`.
- Le serveur refuse déjà une version sans réponse (`fill_in_blanks requires blanks[]`) : le test
  ajouté est une garde, vert dès l'écriture. Les 7 tests du formulaire, rouges avant.
- `QuestionTemplateForm-publication-refusee` : « publication acceptée » clique maintenant
  « Enregistrer » (le modèle publié n'a plus « Enregistrer brouillon »).

### PR 2 (2026-11-09)

- (d) Le serveur filtre bien : en prod, `grades && {1_SPE}` et `level = 6` donnent 11 publiés sur 2095
  (2095 / 50 = les 42 pages vues). La requête du 2026-11-08 est donc arrivée sans paramètres : la garde
  de la section admin envoie un professeur non élevé vers `/dashboard/elevate?redirect=<chemin>`, sans
  `url.search`. Corrigé (`url.pathname + url.search`) ; `safeElevationRedirect` juge la section sur le
  chemin, plus sur la chaîne entière (`/dashboard/admin?x=1` retombait sur l'accueil).
- (c) `search` : Zod (trim, 100 caractères au plus, sinon 400). Terme hexadécimal de 8 caractères au
  moins → `or(title.ilike…, and(id.gte…, id.lte…))` ; sinon `ilike('title', …)` avec `%`, `_`, `\`
  échappés. Syntaxe vérifiée contre le PostgREST local. Appliquée aux deux onglets et aux identifiants
  de « Tout cocher (filtrés) ».
- Revues (code-reviewer, security-auditor) : rien de bloquant. Pris : seuil de l'identifiant porté de 4
  à 8 caractères (David : « 2024 » ou « face » ramenaient des modèles sans rapport, cochés par « Tout
  cocher ») ; tirets acceptés seulement à leur place d'UUID ; `*` (joker de PostgREST) changé en `_` ;
  `safeElevationRedirect` refuse les caractères de contrôle (`.\t.` devenait `..`, défaut antérieur à la PR).
