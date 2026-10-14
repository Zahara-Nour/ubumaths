# Refonte des modèles de chapitre — journal

> Décision : [ADR 0029](../adr/0029-le-modele-possede-son-contenu-le-chapitre-le-relie.md)
> (2026-10-14). Doc de la zone : [cours-et-chapitres.md](../systeme/cours-et-chapitres.md) (écart 9).
> État : **phase 0, en attente de validation de David.** Rien n'est codé.

## Point de départ (mesuré le 2026-10-14)

- Modèle « Le modèle quadratique – les fonctions polynômes du second degré » : brouillon, 4 documents
  (PDF téléversés), tiré du chapitre de 1SPE du 2026-09-13 (`1c997492…`), dont les 4 documents sont
  **publiés** — des élèves y ont accès et doivent le garder.
- Chapitre créé le 2026-10-14 en 1SPE 2 (`91d9d152…`) : 4 documents non publiés, en faux liens
  Google Drive `storage://…` — inutilisables.
- La règle de stockage élève du bucket `chapter-documents` n'existe qu'en production (aucune
  migration) et ne teste pas `published_at`.

## Phase 0 — comportements attendus (à valider)

« Élément » = section, document, objectif, fiche, série ou exercice.

### Le modèle

1. **Nominal** — sur la page du modèle, le prof édite le plan avec l'éditeur du chapitre : créer,
   renommer, réordonner des sections ; téléverser un PDF ou ajouter un lien Drive ; ajouter un
   objectif ; rattacher une fiche, une série, un exercice. Aucun bouton de publication, aucun élève.
2. **Nominal** — un PDF téléversé dans le modèle est stocké chez le modèle, pas dans un chapitre.
3. **Limite** — un modèle en brouillon s'édite mais ne peut pas servir à créer un chapitre
   (comportement actuel, gardé).
4. **Erreur** — un fichier de plus de 25 Mo est refusé, comme pour un chapitre.

### Le chapitre lié

5. **Nominal** — créer un chapitre depuis un modèle publié : le chapitre affiche tout le contenu du
   modèle, **rien n'est publié**, aucun fichier n'est copié.
6. **Nominal** — le prof publie, range (section, ordre) et masque chaque élément du modèle **pour
   son chapitre seulement** ; l'autre classe liée au même modèle n'est pas touchée.
7. **Nominal** — le prof ajoute au chapitre ses propres éléments ; ils sont stockés dans le chapitre
   et n'apparaissent ni dans le modèle ni dans les autres classes.
8. **Nominal** — on corrige un document du modèle (nouveau PDF, nouveau titre) : chaque chapitre lié
   affiche la correction aussitôt, avec sa publication inchangée.
9. **Nominal** — on ajoute un élément au modèle : il apparaît dans chaque chapitre lié, non publié.
10. **Limite** — on retire du modèle un document publié dans la classe A et non publié dans la
    classe B : les élèves de A le gardent ; il disparaît de B.
11. **Limite** — un élève qui rejoint la classe après la publication voit les éléments publiés
    (accès hérité de la classe, ADR 0005).

### Accès

12. **Nominal** — un élève lit un fichier du modèle si, et seulement si, un chapitre visible de sa
    classe le relie et l'a publié (`published_at <= now()`). Même règle par le lien de consultation.
13. **Erreur** — élève d'une autre classe, élève hors classe, anonyme sans lien, date de publication
    future, élément masqué : refus. Un élève ne lit jamais le modèle lui-même.
14. **Erreur** — un élève qui devine l'identifiant d'un fichier de modèle relié par une autre classe
    seulement : refus.

### Rompre le lien

15. **Nominal** — détacher un chapitre : ses éléments reliés sont copiés chez lui (fichiers compris),
    avec leur publication, leur section et leur ordre ; ses élèves ne perdent rien.
16. **Erreur** — supprimer un modèle encore relié : refusé, avec le message « archivez-le » ;
    archivé, il ne crée plus de chapitre mais reste servi aux chapitres liés.
17. **Nominal** — supprimer un modèle relié à aucun chapitre : modèle et fichiers supprimés.

### Reprise de l'existant (sans maintenance)

18. Les 4 PDF du chapitre d'origine sont **copiés** chez le modèle ; le chapitre d'origine devient un
    chapitre lié dont les 4 documents restent publiés aux mêmes dates. Les anciens fichiers et lignes
    ne sont supprimés qu'après déploiement et vérification avec David.
19. Le chapitre de 1SPE 2 est relié aux 4 documents du modèle, non publiés ; ses faux liens
    `storage://` disparaissent.

## Questions encore ouvertes (tour 2)

❓ **Q1 — Le mot.** Le glossaire dit « instanciation » pour un chapitre créé depuis un modèle. Avec
le lien, faut-il l'appeler **chapitre lié** (et bannir « instanciation » dans l'interface) ?
➡️ Oui : « chapitre lié » dit ce que la chose est désormais ; « instanciation » reste le nom de table.

❓ **Q2 — Retoucher un élément du modèle depuis un chapitre** (corriger le texte d'un objectif pour
une seule classe) ?
➡️ Non : on le masque et on ajoute son propre élément. Sinon le lien n'est plus un lien, et l'écart
« objectif retouché, objectif doublé » revient.

❓ **Q3 — Sections.** Un chapitre lié peut-il ajouter ses propres sections, et réordonner celles du
modèle pour sa classe ?
➡️ Oui aux deux : l'ordre est propre à chaque chapitre (point 6) ; ses sections propres s'ajoutent
au plan du modèle.

❓ **Q4 — Masquer ≠ ne pas publier ?** Un élément non publié reste visible du prof dans le plan ; un
élément masqué disparaît aussi du plan du prof (« pas cette année »), et revient d'un clic.
➡️ Garder les deux : le plan du prof reste lisible quand un modèle est riche.

## Découpage prévu

1. Phase 0 (ce document) — validation de David.
2. Base : tables du lien, propriété du contenu par le modèle, règle de stockage versionnée.
   Question d'accès (point 12) posée, tests d'intégration rouges sans la migration, `security-auditor`.
3. Reprise des données (points 18-19), copie seulement.
4. Éditeur partagé (`ChapterSectionsEditor`, `DocumentUpload` paramétrés par leur propriétaire) ;
   page d'édition du modèle ; chapitre lié.
5. Nettoyage (destructif, arrêt et inventaire des usages) : versions, snapshots, migration/fusion,
   API sans appelant, composants morts, anciens fichiers.
