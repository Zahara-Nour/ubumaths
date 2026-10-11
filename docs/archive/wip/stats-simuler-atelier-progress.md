# v2 lot 1, PR (b) — `.simuler` dans l'atelier

Branche `feat/stats-simuler-atelier`. Décisions Q72-Q79 (`outils-statistiques-v2-progress.md`).

- `.simuler L M n` (commande servie par l'atelier, avant `substituteNames`) : n tirages, graine
  neuve affichée (`CalcSession.seed` injectable), effectifs dans une NOUVELLE liste (`nextName`).
- `lawFractions` (simulate.ts) partagé avec l'action « Loi » (mêmes messages).
- Action « Simuler avec probabilités M » sur la carte des valeurs : prépare `.simuler L M 100`.
- Q78 : plafond de 10 boutons par carte ; `.fréquence` et `.échantillons` resteront des commandes
  (proposées par le résultat de `.simuler`, PR (c)).
- Q79 : garde du catalogue avec décor déclaré (`exampleSetup`) ; « crée un objet » réservé à ces cas.
- Revue : n en chiffres seulement (`1 000` accepté ; `0x10`, `1e3`, `1,000` refusés) ; valeurs et
  probabilités affichées telles que tapées ; « 100 000 tirages », « 1 tirage ».
