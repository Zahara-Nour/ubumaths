# 0034 — Solides : trois blocs, un nœud, une scène cavalière

- **Statut** : acceptée — mise en œuvre terminée le 2026-11-01 (chantier solides, #2003→#2046 ; journal
  archivé : `docs/archive/wip/solides-progress.md`)
- **Date** : 2026-10-30 · **Décidée par** : David (« je te suis » aux questions Q1, Q2 et Q5 de la phase 0,
  qui portaient chacune une recommandation)

## Contexte

Aucun bloc ubumark ne dessine l'espace. Le CP (#1777) dessine ses solides à la main dans un ` ```figure `
(coordonnées calculées par le générateur, ellipses en lignes brisées, tirets faits main). Du CM1 à la 3e,
33 points du programme (assemblages de cubes, perspective cavalière, patrons, sections) attendent un
outil ; `questions-4` avait demandé « un seul bloc solides » couvrant la 6e et la 4e.

## Décision

1. **Trois mots de clôture** — ` ```cubes ` (assemblage de cubes, grille des hauteurs), ` ```solide `
   (cube, pavé, prisme droit, cylindre, pyramide, cône, boule ; sections) et ` ```patron ` — parce que
   leurs clés n'ont presque rien en commun : un seul mot obligerait l'auteur à une clé `genre:` et
   mélangerait des réglages sans rapport.
2. **Un seul nœud** `espace` à genres (`kind: 'cubes' | 'solide' | 'patron'`), comme les diagrammes
   statistiques partagent `stat-chart` : un parseur, un composant, un générateur PDF aiguillés par genre.
3. **Une seule perspective : la cavalière** (fuyantes à 45°, réduction 1/2, celle du CP), assemblages de
   cubes compris. La scène (`utils/espace-scene.ts`) est un calcul pur partagé par l'écran et le PDF.
4. Ordre de livraison : cubes (affichage, puis gestes), solides, patrons (affichage, puis gestes),
   sections.

## Écarté

- **Perspective isométrique pour les assemblages** (papier pointé des manuels de 6e) : deux conventions
  dans l'appli ; en cavalière, la face avant est un vrai carré et la vue de face se lit directement.
- **Un seul mot ` ```solides ` avec `genre:`** : une clé de plus à écrire, des réglages mêlés.
- **Trois nœuds indépendants** : trois aiguillages dans le parseur, l'écran et le PDF pour une même
  projection.
