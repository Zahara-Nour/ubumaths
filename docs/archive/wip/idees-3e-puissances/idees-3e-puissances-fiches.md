# Fiches de phase 0 : puissances de 3e (2026-11-25)

Chantier [`idees-3e-puissances`](idees-3e-puissances-progress.md) · [relevé](idees-3e-puissances-releve.md).
Pour chaque idée : ma recommandation, son point (un seul, ADR 0020), ses variations, ses plages, sa
forme de réponse et le passage « chez eux → chez nous ». Chaque variation aura ses `testSpecs`,
trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

Bornes : 3-004 (a⁻ⁿ = 1/aⁿ, a⁰ = 1), 3-005 et 3-052 (aᵐ × aⁿ, aᵐ / aⁿ, m et n relatifs) ; (aᵐ)ⁿ
n'est pas citée en 3e. 4-015 pour la 4e (exposant positif).

**Question d'accès** : personne ne gagne d'accès. Les migrations rangent deux modèles neufs (nœud et
point) et ajoutent des variations à quatre modèles publiés.

## F1. Calculer a⁻ⁿ et a⁰ (3C10-1) : 2 variations de 15368b02 (3-004)

- **Chez eux → chez nous** : même idée, une saisie. 15368b02 fait écrire 1/aⁿ sans jamais le
  calculer ; aucun modèle de 3e ne demande a⁰.
- **V2** : « Calcule. Donne le résultat sous la forme d'une fraction, sans puissance. » a⁻ⁿ, a de 2 à
  10, n de 2 à 4, aⁿ ≤ 1 000 → 1/aⁿ calculé. Forme imposée : 1/2³ est refusé (pas de puissance).
- **V3** : « Calcule. » a⁰ et (−a)⁰, a de 2 à 15 → 1.
- **Erreurs prévues** : V2 : −aⁿ (−8 pour 2⁻³), −a × n (−6), 1/(a × n) (1/6). V3 : 0, a, −1 pour (−a)⁰.
- **Coup de pouce** : « a⁻ⁿ est l'inverse de aⁿ. » (V2) ; « aⁿ / aⁿ = aⁿ⁻ⁿ : que vaut ce quotient ? » (V3)

## F2. Écrire 1/(a × a × a) sous la forme d'une puissance (3C10-3) : 1 variation de 15368b02 (3-004)

- **Chez eux → chez nous** : même forme. En 3e, seul le sens a⁻ⁿ → 1/aⁿ existe (15368b02 v1).
- **V4** : « Écris sous la forme d'une seule puissance. » 1/(a × … × a), a de 2 à 9, n de 2 à 5 → a⁻ⁿ.
  Forme imposée : une puissance (1/aⁿ refusé).
- **Erreurs prévues** : aⁿ (signe oublié), (−a)ⁿ, 1/aⁿ (pas une seule puissance).
- **Coup de pouce** : « Compte les facteurs du dénominateur, puis pense à l'inverse. »

## F3. Base négative dans un produit ou un quotient (3C10-2) : 1 variation de bb9cff7b (3-005) et 1 de 18761148 (3-052)

- **Chez eux → chez nous** : même forme qu'aujourd'hui : la base est écrite, l'élève tape
  l'exposant ((−3)^?). Nos modèles de 3e n'ont jamais de base négative.
- **bb9cff7b V2** : (−a)ᵇ × (−a)ᶜ, a de 2 à 9, b et c de ±2 à ±6, b + c ∉ {0, 1}.
- **18761148 V2** : (−a)ᵇ / (−a)ᶜ, mêmes plages, b − c ∉ {0, 1}.
- **Erreurs prévues** : produit : b × c, b − c, −(b + c). Quotient : b + c, c − b, b / c quand il
  tombe juste.
- **Coup de pouce** : « La base est la même, (−a) : compte les facteurs. »
- **Laissé** : aⁿ / bⁿ et (aᵐ)ⁿ, que le programme de 3e ne cite pas (73514cdb en 2de, cf4468c3 sans
  point).

## F4. Signe devant la base : (−3)⁴ et −3⁴ (3C10-3) : 2 variations de 3fe98dd9 (4e, 4-015)

- **Chez eux → chez nous** : l'idée vient de leur 3e, mais elle relève de la 4e (exposant positif) :
  elle va à 3fe98dd9 « Traduire une puissance en produit », qui n'a que la lettre a.
- **V7** : « Écris avec des × et sans puissance. » (−a)ⁿ, a de 2 à 9, n de 2 à 5 → (−a) × … × (−a).
- **V8** : même consigne, −aⁿ → −a × a × … × a.
- **Erreurs prévues** : V7 : −a × a × … × a, a × … × a (le bon nombre si n est pair, voir Q1),
  (−a) × n. V8 : (−a) × … × (−a), a × … × a, −a × n.
- **Coup de pouce** : « Les parenthèses disent ce qui est élevé à la puissance. »

## F5. Lire une puissance (3C10-4) : nouveau modèle de 4e (4-015), 2 variations

- **Chez eux → chez nous** : leurs étiquettes à glisser deviennent notre bloc ```trous (texte à
  trous avec étiquettes et intrus). Leurs options base négative et exposant négatif ne sont pas
  reprises : « moins sept exposant quatre » se dit aussi bien pour (−7)⁴ que pour −7⁴.
- **V1** : « 7⁵ se lit : [sept] exposant [cinq]. » Étiquettes : deux à neuf ; base et exposant
  différents, de 2 à 9.
- **V2** : « 7² se lit : sept au [carré]. » et « 7³ … au [cube] ». Étiquettes : carré, cube, double,
  triple.
- **Erreurs prévues** : base et exposant échangés (V1) ; double au lieu de carré, triple au lieu de
  cube (V2).
- **Coup de pouce** : « On lit d'abord la base (le grand nombre), puis l'exposant (le petit nombre en
  haut). »
- Rangement : nœud « définition » (4e), comme d9f2003b et 3fe98dd9.

## F6. Bases cachées (3C10-5) : nouveau modèle de 3e (3-052), 4 variations

- **Chez eux → chez nous** : saisie de l'exposant, la base écrite (5^?). fa0dd978 (2de) cache
  la base par une puissance de puissance (8ᵐ), que la 3e ne cite pas : ici, la base cachée est un
  carré écrit en nombre (25 = 5²), qu'on remplace par 5 × 5. Leurs formes avec 25ᵐ, 125ᵐ ne sont pas
  reprises.
- **V1** : aⁿ × A / (aᵐ × aᵖ), A = a² écrit en nombre.
- **V2** : a × aⁿ / (A × A).
- **V3** : base négative : (−a)ⁿ × A / (−a)ᵐ, A = a² = (−a)².
- **V4** : exposants négatifs : a⁻ⁿ × A / aᵐ.
- **Plages** : a ∈ {2, 3, 5, 7} (pas 4 ni 6 : 16 = 2⁴ = 4²), exposants de 2 à 7, résultat ≠ 0 et ≠ 1.
- **Erreurs prévues** : A compté comme a¹ (exposant trop petit de 1), A oublié (de 2), signe de la
  soustraction inversé.
- **Coup de pouce** : « Écris A comme une puissance de a. »
- Rangement : nœud « quotient de puissances » (3e).

## F7. Ce que je ne reprends pas

- aⁿ / bⁿ = (a/b)ⁿ et (aᵐ)ⁿ (3C10-2, 3C10-5) : pas cités en 3e ; déjà en 2de (73514cdb v4,
  a1ae1558) et cf4468c3 (3e, sans point).
- aⁿ × bⁿ (3C10-2) : déjà en 4e (2e9b26b0).
- Valeur entière de aⁿ (3C10-1, exposant positif) : 4e, aucun modèle ne la demande. **Idée en attente**
  pour une session de 4e.

## Questions

- **Q1 (F4 V7)** : pour (−3)⁴, l'élève écrit 3 × 3 × 3 × 3, qui a la même valeur. Ma recommandation :
  refuser, avec le message « Même valeur, mais la base est −3 : écris les facteurs (−3). » (chez eux :
  accepté avec un message).
- **Q2 (F5)** : un modèle de lecture, de faible portée. Le faire quand même ? Ma recommandation : oui,
  il est court, et la confusion base / exposant est fréquente.
