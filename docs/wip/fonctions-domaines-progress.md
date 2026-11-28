# Chantier `fonctions-domaines` — `f(x) = x pour x > 2` dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la PR._

- **État** : code, tests (unitaires + `e2e/verifs/atelier-intervalle-pour.spec.ts`, 5 navigateurs) et doc (`docs/systeme/atelier.md`) faits ; revue `code-reviewer` en cours.
- **Prochaine action** : PR, CI, merge ; puis archiver ce journal (la doc durable est dans `docs/systeme/atelier.md`).
- **En attente de David** : rien.
- **Pièges en cours** : dans la carte, MathLive colle « pour » comme « sur » (`xpour2<x<4` affiché en italique tant que le champ n'est pas relu) — comportement d'avant, non traité.
- **Worktree / branche** : `../ubumaths-wt-fonctions-domaines` · `feat/fonctions-domaines`.

## Demande

« pour les fonctions je voudrais pouvoir utiliser aussi une syntaxe comme f(x)=x pour x>2 ou
f(x)=x pour 2<x<4 » (David, 2026-11-28).

## Phase 0 (validée par David le 2026-11-28)

- **Nominal** : `f(x) = x pour x > 2` vaut `f(x) = x sur ]2;+∞[` ; `pour 2 < x < 4`, `pour 2 ≤ x < 4`,
  `pour x ≠ 0`, `pour x < 0 ou x > 1` : tout ce que `avec` lit déjà (`parseStudentDomain`). Carte
  comprise.
- **Refus** (mêmes messages que « sur ») : ensemble vide, un point, hors du domaine ; une autre
  lettre que celle de la fonction.
- **Inchangé** : « pour » ne coupe que devant une condition (`a = 3 pour 4` entier).
- **Q1 tranchée** (réponse de David) : la carte réaffiche **ce qui a été tapé** (`x pour x > 2`) ;
  les propriétés et la liste disent l'ensemble.
- **Q2 tranchée** (réponse de David) : une seconde formule (`x pour x > 2, x² pour x ≤ 2`) est
  **refusée**, la place reste libre pour les fonctions par morceaux.

## Ce qui est fait

- `interval.ts` : « pour » coupé devant une comparaison (`intervalWord`), `isConditionWritten` /
  `intervalKeyword` (l'écriture dit le mot), `UNREADABLE_CONDITION`, `ONE_FORMULA`, « ou »/« et »
  de MathLive relus (`domainText`), condition texte → LaTeX pour le champ (`conditionLatex`).
- `mathfield.ts` : le champ écrit `\text{ pour }` devant une condition.
- `natural-input.ts` + `NaturalField.svelte` : « pour » devient un mot après le `=` d'une
  fonction, « ou »/« et » seulement après lui (`f(t) = et` reste e·t).
- Tests : `intervalle-pour.test.ts` (32), `natural-input.test.ts` (+3) ; vérif à l'écran
  `atelier-intervalle-pour.spec.ts`, verte sur les 5 navigateurs de `test:verifs:tout`.
