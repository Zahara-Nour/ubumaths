# Chantier `modele-sections-defaut` — journal

## Reprendre ici

_Mis à jour le 2026-11-23, après #3055._

- **État** : chantier clos, #3055 mergée, journal archivé · **Prochaine action** : aucune · **En attente de David** : mise en prod (`pnpm deploy:prod`) quand il le voudra ; dire s'il faut aussi poser les six sections sur les modèles existants qui n'en ont pas · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Demande (2026-11-23)

Un modèle de chapitre créé de zéro (page « Nouveau modèle ») démarrait **sans aucune section**,
alors qu'un chapitre de classe créé à la main reçoit six sections par défaut (Préparation, Le
cours, Les exercices, Méthodes, Résumé, Bilan). David : le sens naturel est de créer d'abord un
modèle, avec des sections par défaut modifiables ; un chapitre créé depuis le modèle reçoit ses
sections et peut en ajouter de propres.

## Comportements validés

| Ce qu'on crée                | Avant              | Après                         |
| ---------------------------- | ------------------ | ----------------------------- |
| Chapitre de classe à la main | les six            | les six (inchangé)            |
| Modèle de zéro               | aucune             | **les six**                   |
| Modèle depuis un chapitre    | celles du chapitre | celles du chapitre (inchangé) |
| Chapitre depuis un modèle    | celles du modèle   | celles du modèle (inchangé)   |

Modèles existants sans section : **non touchés** (question posée à David, restée sans réponse :
le choix qui ne change rien a été pris).

## Fait

- `DEFAULT_SECTION_TITLES` (`src/lib/server/chapter-sections.ts`), miroir du déclencheur
  `seed_default_chapter_sections` ; `createChapterTemplate` pose les six sections. Sections en
  échec → modèle gardé, erreur journalisée.
- Test d'intégration `tests/integration/modele-sections-par-defaut.test.ts` (vu rouge avant le
  code) : six titres = ceux du déclencheur ; modèle de zéro → six sections ; modèle depuis un
  chapitre → sections du chapitre seulement. Tests unitaires de `createChapterTemplate` adaptés.
- Vu à l'écran : modèle créé par le vrai formulaire (WebKit, compte prof local), la page du
  modèle affiche les six sections dans l'ordre.
- Doc : `docs/systeme/cours-et-chapitres.md` § Modèles de chapitre.
