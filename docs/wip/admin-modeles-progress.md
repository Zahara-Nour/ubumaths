---
status: en cours
---

# Admin des modèles de questions — UX de publication et de recherche

## Reprendre ici

_Mis à jour le 2026-11-08, PR 1 codée (branche `fix/admin-modeles-edition`), avant ouverture de la PR._

- **État** : PR 1 codée et testée (7 tests navigateur `QuestionTemplateForm-statut`, garde serveur
  « version sans réponse » dans `put-publication-check`), doc `questions.md` § 8 à jour · **Prochaine
  action** : ouvrir la PR 1, revue `code-reviewer` (Sonnet), merger ; puis PR 2 (liste) · **En attente
  de David** : rien · **Pièges en cours** : la liste (`dashboard/admin/questions/+page.svelte`) a un
  onglet « Brouillons » par défaut, « Publiés » à côté ; le serveur filtre déjà
  `?grades=&minLevel=&maxLevel=` (`+page.server.ts`) · **Worktree / branche** :
  `../ubumaths-wt-admin-modeles`, `fix/admin-modeles-edition` (PR 1).

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
