# Fiche d'exercices : une seule liste « Corvées » organisée en sections

Worktree `../ubumaths-wt-fiche-sections`, branche `feat/fiche-liste-unique-sections`.

## Pourquoi

L'onglet Corvées de l'édition d'une fiche avait deux blocs : la carte « Sections »
(`SectionManager.svelte` : créer, renommer, instructions, réordonner, supprimer) et la
liste des corvées (`ExerciseList.svelte`, déjà groupée par section). Les sections
apparaissaient deux fois, et l'on ne faisait pas la même chose aux deux endroits.
Aucune ADR ne justifiait la séparation : héritage (nov. 2025).

## Spécification (proposée le 2026-10-16, David : « je suis tes recos »)

1. Un seul bloc : la fiche telle qu'imprimée — sections dans l'ordre (titre,
   instructions, nombre de corvées), puis « Sans section ».
2. Boutons « Ajouter des corvées » et « Ajouter une section » côte à côte, en tête du bloc.
3. La carte « Sections » disparaît.
4. Ajouter une section : formulaire (titre obligatoire, instructions facultatives) en bas
   des sections, avant « Sans section ».
5. Modifier une section : crayon sur l'en-tête → édition en place (titre, instructions,
   champs anglais si la fiche est anglaise).
6. Déplacer une section : en la saisissant hors de ses corvées (en-tête, marges), corvées comprises.
7. Déplacer une corvée : comme avant, dans sa section ou dans une autre.
8. Corvées ajoutées → « Sans section » (inchangé).
9. Aucune section : pas d'en-tête « Sans section ».
10. Section vide : en-tête visible + zone « Déposer ici ».
11. « Sans section » vide avec des sections : reste visible comme zone de dépose.
12. « Sans section » ne se déplace, ne se renomme ni ne se supprime ; toujours dernier.
13. Fiche publiée/archivée : même liste en lecture seule, instructions des sections visibles.
14. Supprimer une section : confirmation « Les N corvées de cette section passeront dans
    "Sans section" » ; aucune corvée supprimée.
15. Déplacement refusé par le serveur → retour à l'état d'avant + message.
16. Titre vide : non validable.
17. Aucun changement d'API, de base, de PDF : chantier d'interface seul.

Choix suivant les recommandations de Claude, acceptés par David le 2026-10-16 :
glisser-déposer par `svelte-dnd-action` (comme `ChapterSectionsEditor`) ; corvées
ajoutées dans « Sans section » ; sections déplacées par la poignée seulement (pas de
flèches ↑↓).

## Journal

- 2026-10-16 : worktree, lecture du code, spécification ci-dessus.
- 2026-10-16 : `worksheet-outline.ts` (+18 tests), `ExerciseList.svelte` réécrit (+11 tests
  composant, dnd rejoué), `SectionManager.svelte` supprimé, page branchée (snippet `actions`),
  `docs/systeme/fiches-et-pdf.md` à jour. `check:incremental` 0 erreur, `lint:fast` propre.
  Écarts assumés : tout l'en-tête de section sert de poignée (pas l'icône seule : poignée
  dédiée difficile avec des zones imbriquées) ; corvées d'une section supprimée gardent leur
  `position` (comme l'API). Essai du geste réel à la souris : à faire par David (vérification
  manuelle).
- 2026-10-16 : revue `code-reviewer` (aucun bloquant). Corrigés : zone quittée renumérotée
  (comme l'ancienne liste), `aria-label` des éléments déplaçables, `saveEdit` lit la section
  avant l'appel, commentaires en français. Trouvé hors diff et corrigé : supprimer une section
  échouait (23505) dès que « Sans section » avait déjà les mêmes rangs — l'API range désormais
  les corvées après les hors-section (test `tests/integration/worksheet-section-delete.test.ts`,
  rouge avant le correctif : 500).
