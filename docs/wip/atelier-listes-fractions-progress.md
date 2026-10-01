# Fractions dans les listes de l'atelier (Q45)

Branche `feat/atelier-listes-fractions`. Décision Q45 (2026-10-02).

- `readListValue` (`atelier/parse.ts`) : un nombre à la française OU une fraction d'entiers (`1/6`,
  `-3/4`) ; `1/0`, `1,5/2`, `1/2/3` restent écartés (comptés « ignorés »). `readNumber`, utilisé
  ailleurs (`calcul.ts`), est inchangé.
- Conséquence voulue : un dé en sixièmes + « Loi avec probabilités M » donne E = 7/2, V = 35/12.
- Diagramme en bâtons : libellés arrondis à 2 décimales (`1/3` → « 0,33 »).
