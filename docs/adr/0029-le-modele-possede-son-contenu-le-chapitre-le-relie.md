# 0029 — Le modèle de chapitre possède son contenu ; le chapitre lié le relie

- **Statut** : acceptée — livrée le 2026-10-14 (v0.33.0) et nettoyée le 2026-10-15 (v0.35.0, ancien système supprimé)
- **Date** : 2026-10-14 · **Décidée par** : David

## Contexte

Un modèle de chapitre était une **photo figée** d'un chapitre (`content_snapshot`), versionnée ;
instancier copiait la photo dans un chapitre neuf. Mesuré le 2026-10-14, à la première instanciation
réelle d'un modèle portant des PDF :

- les fichiers téléversés n'appartenaient qu'au chapitre d'origine (`chapters/<id>/…` du bucket
  `chapter-documents`) ; le modèle n'en gardait qu'une adresse `storage://…`, recopiée dans le chapitre
  neuf comme un faux lien Google Drive — **4 documents sur 4 inutilisables** ;
- supprimer un document du chapitre d'origine supprime son fichier : le modèle et tous ses chapitres
  l'auraient perdu ;
- un modèle ne se modifiait qu'en modifiant un chapitre de classe, puis « Mettre à jour depuis un
  chapitre » : un geste que personne n'avait choisi (bouche-trou du 2026-09-14, la question « éditer
  un modèle directement ? » n'avait jamais été posée).

## Décision

**Le modèle possède son contenu** — plan en sections, documents (fichiers stockés chez lui), objectifs,
fiches, séries, exercices — et **s'édite sur sa propre page**, avec le même éditeur que le chapitre.
**Un chapitre lié ne copie rien** : il relie le contenu du modèle, et peut avoir **son propre contenu
en plus**, stocké chez lui.

| Sujet                              | Décision                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Corriger un élément du modèle      | Effet **immédiat** dans tous les chapitres liés                                                                            |
| Ajouter un élément au modèle       | Apparaît dans les chapitres liés **non publié** (préparé, jamais donné)                                                    |
| Retirer un élément du modèle       | **Reste** dans les chapitres où il était publié ; disparaît de ceux où il ne l'était pas                                   |
| Publication, section, ordre        | **Propres à chaque chapitre** ; un chapitre peut **masquer** un élément du modèle sans le supprimer                        |
| Versions du modèle                 | **Supprimées** : le lien est vivant, il n'y a plus rien à migrer                                                           |
| Détacher un chapitre               | Le contenu relié est **copié** dans le chapitre, qui devient autonome                                                      |
| Supprimer un modèle encore relié   | **Refusé** : on l'archive (plus d'instanciation, contenu toujours servi aux chapitres liés)                                |
| Accès élève à un élément du modèle | Seulement si un chapitre **de sa classe** le relie **et** l'a publié (`published_at <= now()`) ; idem lien de consultation |
| Éditeur                            | **Un seul**, partagé chapitre / modèle ; ce qui est propre à la classe (publication, élèves) n'apparaît que côté chapitre  |
| Migration en production            | **Sans maintenance** : on copie, on bascule, on vérifie, et on ne supprime l'ancien qu'après le déploiement                |

Ce que lit un élève ne change pas : exactement ce que son chapitre a publié. Personne ne gagne d'accès.

## Écarté

- **Copier les fichiers à chaque instanciation** : chaque chapitre autonome, mais une correction se
  refait dans chaque classe, et le modèle reste dépendant du chapitre d'origine.
- **Le modèle garde ses copies, chaque instanciation recopie** : règle l'autonomie du modèle, pas la
  correction unique ; David veut un lien, pas une copie.
- **Garder les versions et la migration proposée chapitre par chapitre** : sans objet avec un lien
  vivant, et source des écarts connus (objectif retouché doublé, fusion additive).
- **Supprimer un modèle relié en copiant tout dans ses chapitres** : plus risqué que l'archivage pour
  le même résultat côté élève.
- **Modifier un modèle seulement depuis un chapitre** (fonctionnement du 2026-09-14) : voir Contexte.
- **Un éditeur propre au modèle** (`TemplateEditor`, jamais terminé) : il dupliquerait l'éditeur de
  chapitre.

## Conséquences

- Remplace la ligne « Modèles de chapitre » de l'[ADR 0005](0005-publication-par-element-acces-herite-de-la-classe.md)
  (« la mise à jour n'efface rien ») ; la publication par élément et l'accès hérité de la classe
  restent la règle, appliqués au lien.
- Remplace « supprimer un modèle ne touche à rien d'autre » (journal du 2026-09-14) : un modèle relié
  ne se supprime plus.
- Les fichiers d'un modèle vivent dans le bucket `chapter-documents` sous un préfixe propre au modèle ;
  la règle de stockage élève, qui n'existait qu'en production et sans migration, est réécrite et
  testée.
- `content_snapshot`, `chapter_template_versions`, la migration et la fusion de snapshots disparaissent
  (après déploiement, migration destructive à part).
- Les documents existants (chapitre d'origine, chapitre créé le 2026-10-14) sont repris sans que les
  élèves perdent l'accès à ce qui est publié.
