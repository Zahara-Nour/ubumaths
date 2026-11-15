# Présentation pour les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-15, phase 0 (aucune PR)._

- **État** : phase 0, revue de `/parents` point par point (9 points, ci-dessous). Point 1 tranché.
- **Prochaine action** : point 2 (Qui est derrière ?).
- **En attente de David** : point 2.
- **Pièges en cours** : ne promettre que ce que prouve `docs/systeme/carte-des-fonctionnalites.md` ; argent : jamais « gratuit » seul ni « pour toujours ».
- **Worktree / branche** : aucun encore (doc sur `main`) ; le code ira dans `views.ts` (`PARENT_VIEW`).

## Cadre

- Contenu de la page : `src/lib/kingdom-tour/views.ts` (`PARENT_VIEW`), faits de `PARENT_FACTS` dans `src/lib/kingdom-tour/tour.ts`.
- Décisions antérieures : `docs/wip/roue-des-publics-progress.md` (2026-10-11), invariants dans `docs/systeme/carte-des-fonctionnalites.md` § La roue des publics.
- On réfléchit d'abord au parent ; élèves et professeurs plus tard.

## Décisions de David

### 2026-11-15

- **Deux publics de parents, visés tous les deux** : (A) le parent d'un élève de ses classes ; (B) le parent qui découvre (cours particuliers, future offre payante).
- **Méthode** : les 9 questions du parent, une par une ; pour chacune, ce qu'il faut enlever, préciser, modifier, ajouter.
- **Point 1, titre** : « Des maths sérieuses, dans un monde fantaisiste » (« absurde » est trop fort).
- **Point 1, chapô** : « Votre enfant s'entraîne, se trompe, comprend pourquoi, et recommence. Du CM1 à la Terminale, selon les programmes de l'Éducation nationale. » Ton d'une phrase sur l'enfant, pas une liste (« les deux autres sont des listes illisibles »). Plus de mot « cours » : la question tombe.

## Les 9 questions du parent

1. Qu'est-ce que c'est, en une phrase ? — ✅ tranché.
2. Qui est derrière ?
3. À qui mon enfant peut-il parler ? (bloc absent aujourd'hui)
4. Et l'IA ? (ni nom, ni courriel, ni identifiant envoyés : `docs/systeme/tuteur-ia.md`)
5. Ses données ?
6. Est-ce que ça l'aide vraiment ?
7. Les jeux et les gidouilles ne vont-ils pas le distraire ? (bloc absent)
8. Comment le suivre ? (lien du cours public absent)
9. Comment l'inscrire, combien ça coûte ? (`/auth/register/parent` absent de la page)

## Propositions en attente

(aucune)
