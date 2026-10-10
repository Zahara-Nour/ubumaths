# Progression élève — fusion « Mes objectifs » + « Mes compétences math »

**Branche** : `feat/progression-eleve` (worktree `ubumaths-wt-progression-eleve`)
**Base** : `0c99c3b1a`
**Statut** : Phase 1 — implémentation (spec validée par David le 2026-09-15)
**Décidé par David le 2026-09-15** : approche B (fusionner).

---

## Pourquoi

David, connecté en élève : « j'ai deux tuiles "Mes objectifs" et "Mes
compétences Maths", j'ai l'impression que ça fait doublon ».

Ce n'est pas un doublon conceptuel — deux axes orthogonaux (ce que je sais
faire / comment je fais des maths). C'en est un à l'écran : même carte, même
grille 2 colonnes, mêmes trois compteurs avec **les mêmes icônes et les mêmes
couleurs**, même barre empilée, **aucune glose**, et deux entrées de menu
adjacentes.

### Le défaut de fond (mesuré)

`dashboard/+page.server.ts:290-313` **ré-implémente**, en divergeant, ce que
`student/objectifs/+page.server.ts` calcule déjà. Deux implémentations du même
calcul : c'est la source des défauts 1 et 2 ci-dessous. La fusion force à
extraire ce calcul dans **un seul module serveur**, ce qui les tue
structurellement.

### État de la production au 2026-09-15 (MCP read-only)

| Table                                          | Lignes           |
| ---------------------------------------------- | ---------------- |
| `curriculum_themes` / `objectives` / `points`  | 18 / 48 / 453    |
| `math_competences`                             | 6                |
| `student_point_state`                          | **0**            |
| `evaluation_tasks`, `student_competence_level` | **0**            |
| `question_template_points`                     | **0**            |
| `question_templates`                           | 2 (**0** publié) |

Les deux axes sont vides pour les 81 élèves, et celui des objectifs est bloqué
**en amont** : aucun template publié → aucun tag → aucune acquisition possible.

Répartition des niveaux : 6ᵉ 37 · 1_GEN 19 · T_SPE 17 · 2ᵈᵉ 4 · 1_SPE 1 ·
sans niveau 3. Or `curriculum_themes` ne couvre que `6`, `2`, `1_SPE` →
**39 élèves sur 81 n'ont aucun référentiel**.

---

## Les 5 défauts à corriger

| #   | Défaut                                                                                                                                                        | Où                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | La tuile n'agrège que les objectifs **à échelle** (`rang`). Aucun point de prod n'a de `rang` → elle affichera **toujours 0**, même quand la page dira 20/20. | `dashboard/+page.server.ts:296-313`                          |
| 2   | `TOTAL_OBJECTIVES_6E = 18` codé en dur. Réel : 20 en 6ᵉ, 14 en 2ᵈᵉ et 1_SPE, **0** pour 39 élèves.                                                            | `dashboard/+page.server.ts:306`                              |
| 3   | « famille B » — jargon interne — montré à l'élève.                                                                                                            | `StudentDashboard.svelte:171`, `competences/+page.svelte:53` |
| 4   | « Programme 6ème » codé en dur alors que le serveur filtre sur `profile.grade`.                                                                               | `objectifs/+page.svelte:76`                                  |
| 5   | « Mes compétences **math** » (tuile + nav) vs « Mes compétences **mathématiques** » (h1 + title).                                                             | `dashboard-nav.ts:87`, `StudentDashboard.svelte:166`         |

---

## Cible

```
src/lib/server/progression/student-progression.ts   ← NOUVEAU, source unique
        ├── getObjectivesProgression(supabase, userId, grade)
        └── getCompetencesProgression(supabase, userId)
                        ↓ consommé par ↓
  dashboard/+page.server.ts        student/progression/+page.server.ts
   (tuile unique)                   (page à 2 onglets)

student/progression/           ← NOUVEAU : 2 onglets
student/objectifs/             → redirection vers /progression?onglet=objectifs
student/competences/           → redirection vers /progression?onglet=competences
student/objectifs/[id]/        ← INCHANGÉ (URL préservée)
student/competences/[code]/    ← INCHANGÉ (URL préservée)
```

Les deux routes de détail ne bougent pas : le lien profond de
`revisions/decks/programme/+page.svelte:145` vers `/objectifs/{objectiveId}`
survit, ainsi que les favoris. Leur bouton « retour » pointera vers l'onglet
d'origine.

---

## Comportements attendus (tests d'abord)

### A. Agrégation des objectifs — corrige les défauts 1 et 2

1. **Nominal, objectif SANS échelle, complet** — 3 points sur 3 acquis →
   compté **« atteint »**. _Aujourd'hui la tuile le compte « non commencé »._
2. **Nominal, objectif SANS échelle, partiel** — 1 sur 3 → **« en cours »**.
3. **Nominal, objectif AVEC échelle** — rang max acquis 4 → « maîtrisé » ;
   3 → « atteint » ; 1 ou 2 → « en cours ».
4. **Limite, objectif vide** — tous les points archivés → « non commencé »,
   et **aucune division par zéro** dans la barre.
5. **Le total vient du référentiel du niveau**, jamais d'une constante :
   6ᵉ → 20, 2ᵈᵉ → 14.

### B. Élève sans référentiel — les 39

6. **Limite, niveau non couvert** (`T_SPE`, `1_GEN`) → total 0, et l'UI ne
   montre **ni barre de progression ni « 0/0 »**. ⚠️ _Dépend de la décision 2._
7. **Limite, `grade` NULL** → même comportement que 6.

### C. Compétences mathématiques

8. **Nominal** — les 6 compétences, niveaux lus dans `student_competence_level`.
9. **Limite, aucune tâche** — état « pas encore évalué », **sans jamais écrire
   « famille B »** (défaut 3).

### D. Page fusionnée

10. `/dashboard/student/progression` rend deux onglets. Onglet par défaut :
    celui qui a des données ; si aucun n'en a, « Ce que je sais faire ».
11. `?onglet=competences` ouvre directement le bon onglet.
12. `/objectifs` et `/competences` **redirigent** vers l'onglet correspondant.
13. `/objectifs/[id]` et `/competences/[code]` répondent aux **mêmes URL**
    qu'avant ; leur bouton retour vise l'onglet d'origine.

### E. Tuile du dashboard

14. **Tuile unique**, alimentée par le même module que la page → un test
    vérifie que **les chiffres de la tuile et ceux de la page sont égaux**
    (c'est ce test qui empêche les défauts 1 et 2 de revenir).
15. Si les **deux** axes sont vides → la tuile **ne s'affiche pas** (le
    dashboard se recentre sur l'inbox du travail à faire).

### F. Libellés

16. **Aucun texte visible par l'élève** ne contient « famille A » ni
    « famille B » (défaut 3) — test de garde sur les fichiers `.svelte`.
17. Le niveau affiché est **celui de l'élève**, plus « Programme 6ème » en
    dur (défaut 4).
18. Un seul libellé pour la famille B partout (défaut 5).

---

## Décisions tranchées par David (2026-09-15)

### 1. Nom de la page fusionnée → « **Ma progression** »

Troisième mot visible par l'élève, assumé. À ajouter au vocabulaire figé
(`feedback_pedagogical-terminology`), à côté de « Mes objectifs » et « Mes
compétences mathématiques », qui restent les noms des deux **axes**.

| Surface            | Libellé                     |
| ------------------ | --------------------------- |
| Entrée de menu     | Ma progression              |
| Titre de page      | Ma progression              |
| Onglet 1           | Ce que je sais faire        |
| Onglet 2           | Ma façon de faire des maths |
| Tuile du dashboard | Ma progression              |

### 2. Les 39 élèves sans référentiel → **message franc**

L'onglet « Ce que je sais faire » **existe** pour eux et dit que le programme
de leur niveau n'est pas encore disponible. Pas de disparition silencieuse :
l'élève doit comprendre que ça viendra, pas croire à une panne.

Concerne `1_GEN` (19), `T_SPE` (17) et `grade` NULL (3) — aucun
`curriculum_themes` pour ces niveaux.

---

## Definition of Done

- [ ] Tests d'abord, vus **rouges**, puis verts
- [ ] `svelte-autofixer` sur chaque `.svelte` modifié
- [ ] `pnpm check:incremental` = 0 erreur ⚠️ un seul à la fois sur la machine
- [ ] `pnpm lint:fast` + `pnpm exec eslint` sur les `.svelte` refondus
- [ ] `code-reviewer`
- [ ] Redirections vérifiées : `/objectifs`, `/competences`, et le lien profond
      depuis `revisions/decks/programme`
- [ ] Aucune migration (ce chantier ne touche pas au schéma)
