# 0044 — Versions d'un exercice : un historique, la fiche choisit la sienne

- **Statut** : acceptée — phase 0 du chantier `versions-exercices` (journal
  [`docs/archive/wip/versions-exercices-progress.md`](../archive/wip/versions-exercices-progress.md))
- **Date** : 2026-11-25 · **Décidée par** : David (« je suis tes recommandations »)
- Complète l'[ADR 0023](0023-copie-d-une-fiche-niveau-de-guidage-par-affectation.md) (niveau de
  guidage choisi à l'affectation), qui reste valable dans chaque version.

## Contexte

Une fiche ne contient pas ses exercices : `worksheet_exercises.exercise_id` pointe vers l'exercice,
et la copie de l'élève est recalculée à chaque ouverture (ADR 0023). Modifier un exercice le modifie
donc dans **toutes** les fiches qui l'utilisent, distribuées comprises. Dupliquer une fiche ne
duplique pas ses exercices. Mesuré en prod le 2026-11-25 : 50 fiches, 424 exercices en fiche, dont
**64 partagés par 2 ou 3 fiches** ; 12 affectations.

Or David retouche ses exercices après les avoir testés en classe : il veut garder l'ancienne
rédaction là où elle sert, et proposer la nouvelle.

## Décision

1. **Un exercice a des versions successives** (1, 2, 3…), un **historique**. Chaque version est un
   exercice complet comme aujourd'hui : ses niveaux de guidage, énoncé, correction, réponses,
   valeurs communes, fonctions de l'exercice. Une version porte une **note** facultative (« v2 :
   question b) reformulée après le test en 2de 3 »).
2. **« Nouvelle version »** recopie la dernière version ; on modifie la copie, l'ancienne reste
   intacte.
3. **Une version reste modifiable sur place** (coquille) ; seule une vraie retouche passe par
   « Nouvelle version ». Pas de version figée.
4. **Commun à toutes les versions** (fiche d'identité, sur l'exercice) : titre, notion, catégorie,
   source, niveaux scolaires, étiquettes, « public », adresse publique (slug), points du programme.
   **Propre à chaque version** : le contenu (point 1).
5. **La fiche précise la version** de chaque exercice importé. L'import prend la **dernière**
   version par défaut, un menu en choisit une autre. Créer une version ne change **aucune** fiche.
6. Dans la fiche, un exercice qui n'est pas à sa dernière version l'affiche (« v2 · une version plus
   récente existe (v3) ») avec un bouton pour y passer : **direct** sur une fiche sans affectation,
   **avec confirmation** si elle est distribuée (« N affectations en cours : les élèves verront la
   nouvelle rédaction »).
7. **Hors fiche** (page publique, exercice affecté sans fiche, liste du prof) : **toujours la
   dernière version**.
8. **Une version utilisée par une fiche ne se supprime pas** ; le refus nomme les fiches.
9. **Reprise** : chaque exercice existant devient sa version 1 ; chaque ligne de fiche pointe vers
   cette version 1. Rien ne change à l'écran.
10. Le **niveau de guidage** reste choisi à l'affectation (ADR 0023), **dans la version** de la
    fiche.
11. **Rangement (David, 2026-11-25 : « quelque chose de propre », option A)** : l'exercice ne garde
    que sa fiche d'identité ; **toutes** les versions, la dernière comprise, sont dans une table des
    versions (numéro, note, contenu : `variations`, `shared`, `generic_functions`). La dernière =
    le plus grand numéro (aucun pointeur à tenir). Une ligne de fiche pointe vers **une version**,
    et la base refuse de supprimer une version pointée (point 8 tenu par la base). Une seule
    fonction lit le contenu d'une version. L'ancien format `variables` (0 exercice en prod) n'est
    pas repris.
12. **Livraison** : PR 1 = la bascule (table, reprise en v1, toutes les lectures et écritures du
    contenu par les versions, rien ne change à l'écran) ; PR 2 = l'éditeur ; PR 3 = la fiche ;
    PR 4 = effacement des anciennes colonnes de contenu, **destructif**, après le `deploy:prod` du
    code qui ne les lit plus et avec le go de David.

## Conséquences

- « Version » prend un sens précis (CONTEXT.md) : ≠ **variation** (modèle de question, tirée),
  ≠ **instance** (tirage de valeurs), ≠ **niveau de guidage** (choisi à l'affectation). La
  définition du niveau de guidage, qui disait « version d'un exercice », est réécrite.
- ⚠️ Le mot traîne déjà ailleurs, dans d'autres sens : `worksheets.version` (toujours 1, jamais
  incrémenté), `worksheet_instances.variant_version` (table vide, sans écrivain, ADR 0023),
  `VARIANT_MODES` / `n_versions` (réglage mort, ADR 0023). Ne pas les confondre. Le signalement
  d'erreur (`worksheet_error_reports`) enregistre le niveau de guidage (`variation_index`) et la
  graine de la copie : il devra enregistrer aussi la version d'exercice.
- Le reste de ce qui pointe vers un exercice (maîtrise de l'élève, vues, favoris, jetons de
  partage, étiquettes, chapitres, points du programme) reste attaché à l'**exercice**, pas à une
  version.
- Migration : une table des versions et une version par ligne de fiche. Accès (David, 2026-11-25) :
  une version se lit exactement quand son exercice se lit, s'écrit quand il s'écrit ; personne ne
  gagne de lecture.

## Écarté

- **Versions côte à côte pour des situations différentes** (« classe entière » / « soutien ») :
  David veut un historique ; la différenciation passe par les niveaux de guidage et des fiches
  distinctes.
- **Version figée dès qu'une fiche l'utilise** : chaque coquille créerait une version.
- **Une version = un exercice séparé relié à son origine** : la fiche d'identité serait recopiée et
  divergerait (titre, notion, étiquettes).
- **Les fiches suivent toujours la dernière version** : c'est le problème d'aujourd'hui.
- **La dernière version reste dans l'exercice, les anciennes en archives** (option B) : moins de
  code à toucher, mais une version change de place quand elle cesse d'être la dernière.
