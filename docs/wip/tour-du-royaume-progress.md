# Le Tour du Royaume — journal

> Branche `feat/tour-du-royaume`, worktree `../ubumaths-wt-royaume`. Démarré le 2026-10-11.

## Demande (David, 2026-10-11)

Une page de présentation qui donne envie de parcourir Chiphre : appuyée sur le lore, qui met en
avant les fonctionnalités et les points forts, moderne, responsive, dynamique. **Pas** l'accueil :
une page à part, facile à atteindre depuis l'accueil (épuré le 2026-10-06, il ne change que d'un
lien).

## Décisions de David (2026-10-11)

1. Nom : **le Tour du Royaume**, route `/royaume`.
2. Public : les élèves en « tu », un encart « Pour les parents » en « vous » qui renvoie au manifeste.
3. Accès depuis l'accueil : un lien visible sous le titre **et** Père Ubu cliquable mènent à la
   visite (Ubu ne mène plus à `/dashboard/chat` : écart V15).
4. Doc : carte des fonctionnalités + « lore en vitrine » + écarts versés sur `main` avant le code
   (`73f9b0e02`).

## Choix par défaut (annoncés, non contestés)

- Aucune dépendance nouvelle ; animations en CSS + `IntersectionObserver` ; contenu rendu côté
  serveur et lisible sans JavaScript ; `prefers-reduced-motion` respecté.
- Aucun chiffre en dur. Pas de nom de lieu du Compendium que l'interface n'emploie pas.
- Démo « la forme compte » sur le cas réel #553 (factoriser x² − 14x + 49), verdicts vérifiés par
  test contre le vrai correcteur.

## Phase 0 — comportements (présentés le 2026-10-11)

- Nominal : un seul h1 ; les six Provinces et leur devise ; chaque lien mène à une page publique
  existante, non exclue par robots.txt ; la dépêche est un article paru ; l'accueil mène à la visite.
- Limites : sans article paru (ou Shtam illisible) la section disparaît ; reduced motion → tout
  visible ; démo César : accents et ponctuation.
- Garde du lore : ni « Mathres », ni mots bannis du Compendium § IX ; rien d'« avec compte »
  présenté comme « sans compte ».
- Sitemap : `/royaume` y figure.

## Avancement

- [x] Doc versée sur `main` (`73f9b0e02`)
- [x] Contenu (`src/lib/kingdom-tour/`) + tests
- [x] Page `/royaume` + composants + tests
- [x] Accueil : lien + Père Ubu (dessin extrait dans `PereUbuFigure`)
- [x] Sitemap, CONTEXT.md, carte des fonctionnalités, écarts (V15 corrigé)
- [ ] Revue (`code-reviewer`, accessibilité), check, lint, PR

## Pièges rencontrés

- Le Prettier du dépôt (plugin Svelte 3.3.3) ne savait pas écrire `{@attach}` : actions `use:`. Levé le 2026-10-12 (plugin Svelte 4.1.1).
- `app.css` impose `1rem !important` à tout ce que contient un `<header>` : pas de `<header>`.
- Spirale : réglage cherché par calcul (1,5 tour, rayon 160, fin au centre) pour qu'aucun nom ne
  chevauche une étape ou le Trône ; vérifié sur captures, clair/sombre, téléphone/ordinateur.
- Accueil rattaché à la carte des fonctionnalités (retiré des `trous`) plutôt que d'écrire la doc de
  toute la zone « coquille de l'app » pour un lien.
