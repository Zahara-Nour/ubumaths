# Fermeture des blocs spéciaux (Q66)

Branche `fix/ubumark-blocs-non-fermes-suite`. Décision Q66 (2026-10-02).

- Règle Q47 étendue à ``variation / probtree / trig / line (`specialBlockEnd`, unclosed-block.ts) :
un `` lointain ne ferme le bloc que si aucune ligne de texte ne les sépare après une ligne vide ;
  sinon bloc non fermé, arrêté à sa première ligne vide (Q63).
- Revue : une ligne FAUTIVE d'un bloc fermé (`preset quarters`) faisait avaler la suite en code →
  clé connue en tête (`BLOCK_KEYS` de chaque parseur), chiffre ou `$` = ligne du bloc ; dans le doute,
  fermé (comme avant).
- Point 2 (paragraphe perdu après un ```courbe non fermé) : plus reproductible depuis #635/#639,
  figé par un test.
- Mesure prod : 485 contenus réels (bruts et instanciés), 0 AST changé, 0 boucle.
- Hors champ (préexistant, aussi sur main) : dans un item de liste, ces 4 blocs gardent l'ancienne
  lecture (Q52 ne couvrait que courbe / figure / statistiques).
