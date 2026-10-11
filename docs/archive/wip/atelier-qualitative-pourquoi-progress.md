# Q92 — une liste mélangée dit pourquoi elle est qualitative

Branche `fix/atelier-qualitative-pourquoi` (2026-10-02), suite de #661.

- Une entrée qui se lit comme un nombre (`readListValue`) n'est jamais un mot : `1e3` vaut 1000,
  `0x10` vaut 16 (comme en v1) ; `Infinity`, `1e400`, `2x`, `pi` restent des mots.
- Liste qui mélange nombres et mots : `qualitativeBecause` = 1re entrée-mot ; aperçu de la vue
  Données « liste qualitative, à cause de « 2x » ».
- Revue : rien de bloquant ; une liste refusée (> 200 entrées) garde ses modalités ; cas limites figés.
