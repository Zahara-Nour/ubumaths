# Chantier `course-recommencer` — « Recommencer » de la Course aux nombres

## Reprendre ici

_Mis à jour le 2026-11-20, ouverture._

- **État** : PR #2929 ouverte ; revue faite (écouteur de défilement retiré au démontage).
- **Prochaine action** : CI verte → merge → archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-course-recommencer` · `fix/course-recommencer`.

---

## Décision de David (2026-11-20)

Relevé pendant `memes-nombres` (#2922) : la Course aux nombres affichait « Recommencer avec de nouvelles questions » mais redonnait les mêmes. Choix B (sur ma recommandation) : la Course tire de nouvelles questions comme les autres formes ; avec un lien « Mêmes nombres pour tous », les mêmes, et le bouton le dit.

## Historique

- 2026-11-20 : `TestCourse` reçoit `onRestart` (la page tire, `{#key}` remonte le composant, chrono à neuf) et `sameQuestions` ; tests de rendu dans `memes-nombres.svelte.test.ts` (rouges puis verts).
- 2026-11-20 : revue `code-reviewer` : écouteur `scroll` de `TestCourse` jamais retiré, désormais remonté à chaque Recommencer → `$effect` avec retrait.
