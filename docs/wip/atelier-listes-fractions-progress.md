# Fractions dans les listes de l'atelier (Q45)

Branche `feat/atelier-listes-fractions`. Décision Q45 (2026-10-02).

- `readListValue` (`atelier/parse.ts`) : un nombre à la française OU une fraction d'entiers (`1/6`,
  `-3/4`) ; `1/0`, `1,5/2`, `1/2/3` restent écartés (comptés « ignorés »). `readNumber`, utilisé
  ailleurs (`calcul.ts`), est inchangé.
- Conséquence voulue : un dé en sixièmes + « Loi avec probabilités M » donne E = 7/2, V = 35/12.
- Diagramme en bâtons : une valeur qui est une fraction simple sans décimal exact s'écrit en
  fraction (`1/3`), les autres comme avant ; effectifs jamais arrondis ; les indicateurs relisent
  les fractions (moyenne exacte).
- ⚠️ Revue : la 1re version ARRONDISSAIT à 2 décimales → 0,331 et 0,334 confondus (« catégorie
  déjà donnée », régression sur des listes décimales qui marchaient) et moyenne calculée sur
  0,33. Remplacé par la fraction exacte.
- Non traité, à trancher : `1/2,3/4` est écarté sans le message « sépare par des
  points-virgules » (étendre la détection donnerait un faux positif sur `1,5/2`) ; `+1/6`, `−1/6`
  (signe typographique) écartés ; « Loi » refuse un dénominateur > 10 000.
