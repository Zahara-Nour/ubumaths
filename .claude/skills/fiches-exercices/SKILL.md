---
name: fiches-exercices
description: Créer les fiches d'exercices d'un thème pour un niveau (entraînement technique + applications, en sections). Utiliser dès qu'on demande une fiche d'exercices, une fiche technique, une fiche d'applications, ou qu'on veut couvrir un thème pour un niveau (1re spé, Terminale complémentaires, etc.). Exige le grade et le thème avant tout travail ; vérifie d'abord si les fiches existent déjà.
---

# Fiches d'exercices

Démarche complète : [docs/pratiques/fiches-exercices.md](../../../docs/pratiques/fiches-exercices.md).
Ce skill en est le déroulé ; le document fait foi pour chaque étape et pour les pièges.

Une fiche se fabrique hors de l'application : fichiers `.md` (ubumark), vérifiés, puis écrits en base
par un script gardé. Un thème pour un niveau = **deux fiches** : **Entraînement technique** et
**Applications**, chacune en **sections**.

## 0. Ce qu'il faut avant de commencer

**Grade et thème, obligatoirement.** Si l'un manque, demander avant tout le reste (question à David,
une seule fois, les deux ensemble) :
- **Grade** : un code de `GRADE_CODES` (`src/lib/types/grades.ts`), par exemple `1_SPE`, `T_SPE`,
  `T_COMP`, `T_EXP`, `2`.
- **Thème** : le nom du thème tel qu'il figure en base (`topic`), par exemple « Variables aléatoires ».

Ne jamais deviner le grade d'après le thème : une même notion peut exister en 1re spé et en
Terminale complémentaires, avec un programme et des attendus différents.

## 1. Vérifier d'abord si les fiches existent

Avant de rédiger quoi que ce soit, interroger la **base de production en lecture seule** (MCP
Supabase `execute_sql`, uniquement des `select`) :

```sql
-- Fiches déjà créées pour ce niveau, sur ce thème
select id, title, grades, status from worksheets
where grades && array['<GRADE>']::text[]
  and title ilike '%<mot-clé du thème>%';

-- Exercices déjà rattachés au thème et au niveau
select id, title, topic, category from exercises
where '<GRADE>' = any(grades) and topic ilike '%<thème>%'
order by category, title;
```

(Vérifier le nom exact de la colonne `grades` et de `topic` sur la table concernée avant la requête.)

Cas :
- **Les deux fiches existent** (technique et applications) : **arrêt**. Dire ce qui existe (id, titre,
  nombre d'exercices et de sections) et demander ce qu'on veut : compléter, refondre, ou ne rien faire.
  Ne rien écrire en base.
- **Une seule existe** : signaler laquelle manque, proposer de créer celle-là seulement.
- **Aucune** : continuer. Consigner l'inventaire (exercices existants à réutiliser plutôt que
  dupliquer, § 2.1 du document).

## 2. Démarche

Suivre `docs/pratiques/fiches-exercices.md` dans l'ordre :

1. **Cadrer** sur le programme du niveau et du thème (contenus, capacités, hors programme).
2. **Écrire `CONVENTIONS.md`** du thème (§ 2.2), à partir de la dernière version existante.
3. **Faire rédiger** les deux fiches, par des sous-agents (§ 2.3), **un par fiche**, avec un brief qui
   fixe les mathématiques exercice par exercice. Ils rendent `assert_all.py` qui passe et
   `pnpm check:ubumark` à 0 problème. Relire leurs écarts au plan.
4. **Vérifier le rendu** (`pnpm fiche:verifier`) puis **relire les pages** (§ 2.4) : les détecteurs ne
   voient pas les défauts de sens.
5. **Simuler l'écriture en base** (§ 2.5) : `pnpm tsx scripts/create-<thème>-1spe.ts` (sans
   `--publier`). Montrer la simulation à David.
6. **Publier** seulement après son accord explicite : `--publier` écrit en production.
7. **Vérifier ce qui est en base** (§ 2.6).

## 3. Modèle et délégation

Règles détaillées dans la section 0 du document. Résumé :

- **Session principale : Opus**, sans bascule de modèle en cours de chantier.
- **Rédaction, vérifications mathématiques, relecture des PDF, générateur** : **Opus**, en sous-agent
  avec un brief précis, ou en session principale.
- **Copie du script, simulation, publication, régénération, compilation** : **Sonnet**, en sous-agent
  avec un brief court. Ne jamais utiliser `fork` pour ces tâches.
- Une décision de contenu mathématique n'est jamais déléguée à un modèle plus petit.

## 4. Garde-fous

- Base lue = **production** : lecture seule dans tous les cas, à l'étape 1 comme à la vérification.
- Toute écriture passe par le script gardé (`create-*-1spe.ts`). Pas de `insert` à la main.
- `--publier` : accord explicite de David, à chaque fois.
- Le script de création part en **branche + PR** ; un commit uniquement de documentation peut aller
  directement sur `main`, après le test `git diff --cached --name-only | grep -v -E '^docs/|\.md$'`.
- Pas de ligne `Claude-Session:` ni de lien `claude.ai` dans les commits, selon le `CLAUDE.md` du projet.
- Le skill ne lance aucune commande qui perd du travail (reset, rebase interactif, `branch -D`…).

## 5. Ce qu'on rend à la fin

- Les deux fiches (ids en base), leur nombre d'exercices et de sections.
- Les écarts restants (exercices à reprendre, cas limites, points du référentiel non rattachés).
- Une ligne par étape de la démarche faite, et celles qui restent.
