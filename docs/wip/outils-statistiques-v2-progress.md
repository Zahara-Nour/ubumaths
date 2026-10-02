# Chantier : outils statistiques v2

Suite du chantier v1 (`outils-statistiques-progress.md`, #595→#612). Démarré le 2026-10-02.

## Existant vérifié dans le code (2026-10-02)

- Hasard reproductible : `src/lib/utils/random.ts` (`createRandomSource(seed)`, mulberry32 ;
  `Math.random` sans graine), utilisé par les générateurs de questions → à réutiliser.
- Listes de l'atelier : nombres seulement (`readListValue`) ; un mot est compté « ignoré ».
- Programmes : simulation en 6e (rang 4, fréquence vs probabilité), 2de `2-179` (loi des grands
  nombres), 1re spé `1SPE-170`→`173` (simuler une VA, N échantillons de taille n, écart à
  l'espérance ≤ 2σ/√n) ; 2de `2-169` (comparer deux séries) ; 2de `2-174`/`2-175` [SF+]
  (filtres ET/OU/NON, tableau croisé depuis le fichier des individus). Boîte à moustaches : absente.
  Loi binomiale : Terminale, absente du dépôt.

## Décisions de David

Manche 1 (2026-10-02) — toutes les recommandations suivies :

67. **Périmètre, dans l'ordre** : (1) simulation ; (2) listes qualitatives dans l'atelier, filtres,
    tableau croisé depuis les individus ; (3) série brute dans les blocs (`données:`) ; (4) comparer
    deux séries. **Pas** de binomiale, **pas** de boîte à moustaches ; catégories numériques sur une
    vraie échelle : plus tard.
68. **Simulation dans l'atelier, sans Python** (Python = v3 de l'atelier) : « Simuler n tirages »
    (liste réutilisable), « Fréquence selon n » (loi des grands nombres), en 1re spé « N échantillons
    de taille n ». Bloc pour les fiches ensuite.
69. **Simulation dans une fiche : figée par une graine** (`graine: 42`), même résultat écran / PDF.
70. **Tirage reproductible** (générateur à graine) : partagé par URL, testable au chiffre près.
71. **Pas de nouvel objet** : une liste accepte aussi des mots et devient qualitative (effectifs,
    barres, tableau croisé ; pas de moyenne).
