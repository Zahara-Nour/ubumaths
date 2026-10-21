# Renvois de numérotation (2026-10-18)

La numérotation des questions repasse en `1) a) i)` (PR #1468, #1470). Or 42 exercices écrits entre le 2026-09-25 et le 2026-10-16, quand le rendu était `a) 1) i)`, renvoient à leurs questions dans l'ancien ordre : « question b) 2) », « question c) ». Après la mise en prod de #1468, ces renvois seraient faux.

`propositions.json` est une copie figée :

- les 126 phrases à réécrire, en français et en anglais, avec leur forme avant et après (« b) 2) » → « 2) b) », « question c) » → « question 3) ») ;
- l'heure `updated_at` de chaque exercice au moment de la lecture en prod, le 2026-10-18.

Les propositions ont été vérifiées contre la structure de chaque énoncé. David a validé les 42 exercices le 2026-10-18, sans commentaire, sur la page à cocher https://claude.ai/artifact/8wJZC5fjmrbMvNQbQCuj8j.

Application : `scripts/fix-renvois-numerotation.ts` (simulation par défaut, `--publier` pour écrire). Elle se lance juste avant le `deploy:prod` qui livre #1468 : tant que la prod affiche `a) 1)`, les anciens renvois y restent justes.

Ce dossier n'est pas un lot de corrections de modèles de questions : il est exclu de `lots-ci.test.ts`.
