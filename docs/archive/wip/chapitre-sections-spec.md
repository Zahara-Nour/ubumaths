---
title: Sections d'un chapitre « Mon cours » — spécification (Phase 0)
date: 2026-09-14
status: validée le 2026-09-14 — livraison 1 (base de données) en cours
scope: class_chapters + les 5 tables de contenu, éditeur prof, vue élève, modèles
---

# Sections d'un chapitre

## La demande

> « Dans un chapitre de "Mon cours", je veux qu'il y ait ces sections :
> Préparation, Le cours, Les exercices, Méthodes, Résumé, Bilan. Les ressources
> seront placées dans ces sections. »

## Ce qui change, en une phrase

L'axe de rangement passe du **type de ressource** au **moment du cours**.

Aujourd'hui : cinq onglets (objectifs, quiz, exercices, fiches, documents), et
chaque contenu porte un `display_order` au sein de son type. Aucune notion de
section nulle part.

Demain : six sections ordonnées, et dans chacune les ressources **de tous
types** côte à côte.

## Décisions déjà prises par David (2026-09-14) — ⛔ ne pas re-litiger

| Question                             | Décision                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| Sections figées ou par chapitre      | **Modifiables chapitre par chapitre**, initialisées avec les six |
| Sections vs onglets par type         | **Elles remplacent les onglets**, côté prof ET côté élève        |
| Quels contenus reçoivent une section | **Les cinq types, sans exception**                               |

## Modèle de données proposé

### Nouvelle table `chapter_sections`

| Colonne                     | Rôle                                    |
| --------------------------- | --------------------------------------- |
| `id`                        | clé                                     |
| `chapter_id`                | → `class_chapters`, `on delete cascade` |
| `title`                     | texte libre (« Préparation »…)          |
| `display_order`             | ordre d'affichage dans le chapitre      |
| `created_at` / `updated_at` | audit                                   |

### Colonne `section_id` sur les cinq tables de contenu

`chapter_documents` · `chapter_exercises` · `chapter_checklist_items` ·
`chapter_quiz_questions` · `chapter_worksheets`

`section_id uuid null references chapter_sections(id) on delete set null`.

⚠️ **Jamais `on delete cascade`** : supprimer une section effacerait les
ressources qu'elle contient. `set null` les renvoie dans « Non classé » (voir
cas limite 2).

### Les six sections par défaut, posées par TRIGGER

Un trigger `after insert on class_chapters` sème les six sections. **Pas dans le
code applicatif** : un chapitre naît par au moins deux chemins (création
manuelle, instanciation d'un modèle), et une initialisation que chaque chemin
doit penser à faire finit par manquer là où on l'oublie.

## Comportements attendus

### Cas nominaux

1. **Créer un chapitre** → il a les six sections, dans l'ordre, vides.
2. **Ajouter une ressource** → le professeur choisit sa section ; elle s'affiche
   dedans, à la suite des autres, quel que soit son type.
3. **Réordonner** → le professeur change l'ordre des sections, et l'ordre des
   ressources à l'intérieur d'une section.
4. **Renommer / ajouter / supprimer une section** → propre à ce chapitre, sans
   effet sur les autres.
5. **Vue élève** → les sections dans l'ordre du professeur ; dans chacune, les
   ressources **publiées** uniquement, tous types mélangés.
6. **Déplacer une ressource** d'une section à l'autre → un seul geste, sans
   perdre sa publication ni sa distribution.

### Cas limites

1. **Section vide côté élève** → la section n'est **pas affichée**. Un titre
   suivi de rien ressemble à une panne, et « Bilan » vide en début de chapitre
   annonce un contenu qui n'existe pas encore.
2. **Section supprimée alors qu'elle contient des ressources** → les ressources
   ne sont **pas supprimées** : elles passent en « Non classé », une zone
   affichée en fin de chapitre côté professeur, **masquée côté élève**.
   → ❓ **À valider par David** (voir Questions ouvertes).
3. **Contenu existant** (le document déjà en production) → `section_id = null`,
   donc « Non classé ». Rien ne disparaît, rien ne bouge tout seul.
4. **Chapitre sans aucune section** (les six supprimées) → tout est « Non
   classé » ; la vue élève retombe sur une liste simple.
5. **Ordre à l'intérieur d'une section** → les cinq types vivent dans cinq
   tables ; leur `display_order` actuel est **par type**. Il faut un ordre qui
   traverse les tables → nouvelle colonne `section_order int null`, propre à la
   section. `display_order` n'est pas détourné : changer le sens d'une colonne
   existante est le genre de piège qui ne se voit qu'en production.

### Cas d'erreur

1. **Section d'un autre chapitre** → l'API refuse (400) ; une ressource ne peut
   pointer que vers une section de SON chapitre. À garder en **contrainte**, pas
   seulement en validation applicative.
2. **Titre de section vide** → refusé (Zod, `.min(1)`).
3. **Élève qui tente de lire les sections d'un chapitre qui n'est pas le sien**
   → RLS, mêmes gardes que le chapitre (`is_class_student`, désormais filtré sur
   `status = 'active'`).

## Ce que ça touche

| Zone                                            | Ampleur                              |
| ----------------------------------------------- | ------------------------------------ |
| Migration (table + 5 colonnes + trigger + RLS)  | moyenne, **additive**                |
| Éditeur professeur (`[chapterId]/+page.svelte`) | **refonte** des 5 onglets            |
| Vue élève (`student/cours/[chapterId]`)         | **refonte**                          |
| Modèles de chapitre (`content_snapshot`)        | ⚠️ le plus délicat — voir ci-dessous |
| Tests d'intégration (RLS + trigger)             | obligatoires                         |

### ⚠️ Le point dur : les modèles de chapitre

`content_snapshot` couvre les cinq types. Si les sections sont **propres à
chaque chapitre**, alors un modèle doit emporter **ses sections** et le
rattachement de chaque ressource — sinon instancier un modèle produirait un
chapitre dont tout le contenu atterrit en « Non classé », ce qui viderait la
fonctionnalité de son intérêt.

Concrètement : `extractContentSnapshotFromChapter`,
`applyContentSnapshotToChapter` et `computeDiff` doivent tous les trois
apprendre les sections. Et `computeDiff` doit savoir reconnaître une section
**renommée** plutôt que d'annoncer « une supprimée, une ajoutée » — le même
défaut qui avait été corrigé sur les objectifs.

## Points relevés par l'audit — connus, non traités

1. **Le titre d'une section est visible dès que le chapitre l'est.** Les
   contenus attendent leur `published_at` ; le **plan** du chapitre, non — c'est
   la conséquence directe de « pas de date de publication par section ».
   ⚠️ **Conséquence pratique pour David** : nommer une section « Contrôle
   vendredi » ou « Remédiation groupe B » la publie aussitôt à toute la classe.
   À la livraison 2, filtrer **côté serveur** (et pas seulement dans le
   composant) les sections sans contenu publié.
2. **Une section VIDE peut être déplacée vers un autre chapitre.** La policy
   professeur ne vérifie pas que `chapter_id` reste le même. Sans conséquence en
   mono-professeur — il n'y a pas de frontière à franchir — mais un `update` mal
   filtré pourrait réattribuer des sections. Fermable par un trigger
   `before update`, laissé ouvert en connaissance de cause.
3. **Instancier un modèle ne range rien.** `applyContentSnapshotToChapter` ne
   renseigne pas `section_id` : un chapitre issu d'un modèle affichera six
   sections vides et tout son contenu en « Non classé ». C'est cohérent avec le
   caractère additif de la livraison 1 — et c'est **le cœur de la livraison 2**.

## Questions ouvertes — tranchées le 2026-09-14

1. **Supprimer une section non vide** → les ressources passent en « Non classé »,
   et **« Non classé » est AFFICHÉ à l'élève**, sans titre, en fin de chapitre.
   ⚠️ Correction de la première version de cette spec, qui le masquait : ainsi,
   supprimer une section pour la renommer aurait fait disparaître des ressources
   de la vue élève sans un mot. Aucune règle bloquante n'est donc nécessaire.
2. **Pas de date de publication par section.** Le besoin (« j'ouvre Méthodes
   d'un coup ») est une **action groupée**, pas un état : un bouton « tout
   publier dans cette section » pose `published_at` sur chaque ressource. Zéro
   nouveau concept, zéro nouvelle surface RLS, et pas deux dates qui peuvent se
   contredire.
3. **Les six titres et leur ordre sont ceux de la demande.** Question peu
   coûteuse : les sections étant modifiables par chapitre, cette liste n'est
   qu'un **défaut**, pas un engagement.

## Livraison 1 — ce qui est fait

| Élément                                                                  | État            |
| ------------------------------------------------------------------------ | --------------- |
| Table `chapter_sections` + `section_id`/`section_order` sur les 5 tables | ✅              |
| Clé étrangère **composite**, `on delete set null (section_id)`           | ✅              |
| Trigger des six sections par défaut                                      | ✅              |
| RLS (admin / professeur / élève) + `revoke ... from anon`                | ✅              |
| Trigger `updated_at`                                                     | ✅              |
| `tests/integration/chapter-sections.test.ts` — 14 cas, **vus rouges**    | ✅              |
| Schémas Zod (`validation/chapter-sections.ts`)                           | ✅              |
| Routes API + éditeur professeur                                          | ⏳ livraison 1b |
| Vue élève + modèles                                                      | ⏳ livraison 2  |
