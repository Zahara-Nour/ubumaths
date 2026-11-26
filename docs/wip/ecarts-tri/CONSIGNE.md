# Tri des 225 points de la recollecte : consigne commune des agents

Chantier `ecarts-a-trier`, étape 3 (2026-11-24). Dépôt : `/Users/david/Coding/js/ubumaths` (branche `main`, partagée).

## But

La [recollecte](../../archive/wip/ecarts-a-trier-recollecte.md) (section A, lignes 15 à 260) liste 225 points relevés dans les docs système, **jamais vérifiés dans le code**. Pour chaque point de ton lot, dire s'il est **encore vrai aujourd'hui dans le code**, avec une preuve qu'on peut rejouer.

## Méthode, par point

1. Lire le passage de la doc source (`docs/systeme/<doc>:<ligne>`, quelques lignes autour) pour comprendre le point exact.
2. Vérifier **dans le code** (Read / Grep ; une sonde ciblée si le point est un comportement). Ne jamais conclure d'après la doc seule.
3. Vérifier qu'il n'est pas déjà dans `docs/ecarts/registre.md` (ligne ouverte ou barrée) : sinon verdict `DOUBLON <id>`.
4. Verdict :
   - `VRAI` : le défaut existe encore, je l'ai vu (fichier:ligne, ou sortie de la sonde).
   - `CORRIGÉ` : le code ne le fait plus (fichier:ligne qui le montre) → la doc est périmée sur ce point.
   - `FAUX` : la doc ou la recollecte décrit mal le code (dire ce qui est vrai).
   - `PAS UN ÉCART` : limite voulue, mise en garde d'usage, idée d'évolution.
   - `NON VÉRIFIÉ` : demande la prod, un navigateur, un appareil (dire quoi exactement).
5. Pour un `VRAI` : proposer la ligne du registre.
   - **Constat** : une phrase, ce que voit l'élève ou le prof (pas de nom de colonne si on peut l'éviter), sans le caractère `·`.
   - **Preuve** rejouable, rouge tant que l'écart est vrai, verte quand il a disparu. Au choix :
     - `commande` : une commande `sh` lancée à la racine, qui sort en **0 quand l'écart a disparu**. ⚠️ Une négation affirme d'abord que le fichier existe : `test -f src/x.ts && ! grep -q "motif" src/x.ts`. **La lancer** et noter son code de sortie (attendu : non nul aujourd'hui).
     - `test à écrire` : décrire en une ligne le test qui affirmerait le comportement attendu (ne pas l'écrire).
     - `à la main` : décision de produit, papier, contenu en prod.
   - **Lettre** : garder celle de la recollecte, ou la corriger en le disant (V bug visible · L bug latent · M code mort · C commentaire périmé · D décision produit · T RGPD/sécurité).
6. Un point `[D]` (décision de produit) : vérifier que l'état décrit est vrai, puis écrire **la question à poser à David en mots simples, avec un exemple concret**, et les 2 ou 3 réponses possibles.

## Interdits

- **Aucune modification** de code, de doc ou du registre. **Aucun commit, aucun `git add`.** Le seul fichier que tu écris est ton fichier de résultat.
- Pas de `pnpm check`, `build`, `lint`, `dev`, `db:*`, `test:integration`, ni `pnpm math`. Pas d'accès à la prod. Un test ciblé (`pnpm test:server <chemin>`) ou une sonde vitest jetable dans ton dossier temporaire sont permis, **un seul process à la fois**.
- Données fictives seulement dans ce que tu écris (aucun prénom, adresse, identifiant réel).
- Ne pas chercher d'autres défauts que ceux du lot (un défaut voisin vu en passant : une ligne dans « Vu en passant », pas plus de 5).

## Résultat

Écrire `docs/wip/ecarts-tri/<lot>.md` (nom donné dans ton brief), en français, sans préambule :

```markdown
# Lot <lot> : N points

| verdict | nombre |
| ------- | -----: |

## Points

### <doc>:<ligne> [lettre] — VERDICT

- **Point** : (repris de la recollecte, raccourci)
- **Vu** : `src/…:ligne` + ce que dit le code (ou la sortie de la sonde)
- **Registre** (si VRAI) : lettre · domaine · constat · preuve (avec le code de sortie relevé)
- **Question à David** (si D)

## Vu en passant
```

Un point = un bloc ; un point de la recollecte qui en contient plusieurs (« a ; b ; c ») est découpé en `a`, `b`, `c` avec un verdict chacun. Ta réponse finale à la session : le tableau des verdicts et les 5 points les plus graves, en 15 lignes au plus.
