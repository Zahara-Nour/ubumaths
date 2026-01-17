# Sidebar Navigation Redesign - Analysis Document

> **Status**: En attente de decision
> **Date**: 2026-01-17
> **Contexte**: Le dashboard a trop de liens de navigation pour tenir dans le viewport

---

## Probleme identifie

La sidebar du dashboard (rail navigation avec icones + labels) contient trop d'elements pour certains roles, notamment **Teacher avec 16 liens**. Cela cause :

1. **Scroll necessaire** dans la sidebar (UX sous-optimale avec double scroll)
2. **Liens non visibles** sans scroller
3. **Confusion utilisateur** sur quelle zone scrolle

### Donnees actuelles

| Role        | Nombre de liens | Hauteur estimee\* |
| ----------- | --------------- | ----------------- |
| Student     | 7-8             | ~500px            |
| **Teacher** | **16**          | **~1100px**       |
| Admin       | 11              | ~750px            |

\*Avec ~70px par element (icone 24px + label 16px + padding py-3 24px + gap 4px)

**Viewport disponible** : `100vh - 73px (header)` ≈ **850px** sur ecran 1080p

### Structure actuelle des liens (Teacher)

```
1. Dashboard        (commun)
2. Amis             (social)
3. Chat             (social)
4. Classes          (pedagogie)
5. Cours            (pedagogie)
6. Templates        (pedagogie)
7. Students         (gestion)
8. Enigmes          (pedagogie)
9. Exercices        (pedagogie)
10. Worksheets      (pedagogie)
11. Rewards         (gamification)
12. VIP Cards       (gamification)
13. Marche          (gamification)
14. Google Classroom (integration)
15. Avertissements  (gestion)
16. Moderation      (gestion)
17. Signalements    (gestion)
+ NotificationDropdown
```

---

## Approches analysees

### 1. Double scroll (implementation actuelle)

Sidebar et contenu scrollent independamment.

| Avantages                   | Inconvenients             |
| --------------------------- | ------------------------- |
| Simple a implementer        | Deroutant : ou scroller ? |
| Sidebar toujours accessible | Scroll "piege" au survol  |
|                             | Pas de feedback visuel    |

**Verdict** : Acceptable en dernier recours, UX sous-optimale.

---

### 2. Scroll global unique

Sidebar et contenu scrollent ensemble (comme site web classique).

| Avantages            | Inconvenients               |
| -------------------- | --------------------------- |
| Comportement naturel | Sidebar disparait au scroll |
| Pas de confusion     | Perte de reperes navigation |

**Verdict** : Inadapte pour dashboard avec navigation frequente.

---

### 3. Reduire la taille des elements

Diminuer padding/gap pour que tout tienne (cible: 50px/element).

| Avantages                 | Inconvenients          |
| ------------------------- | ---------------------- |
| Pas de changement d'archi | Elements trop petits   |
| Tout visible              | Touch targets < 44px   |
|                           | Ne scale pas si +liens |

**Verdict** : Compromis limite, atteint ses limites avec 16+ liens.

---

### 4. Grouper par categories (accordeon)

Regrouper les liens logiquement avec sections depliables.

```
Main     : Dashboard, Amis, Chat
Pedagogie: Classes, Cours, Exercices, Worksheets, Templates, Enigmes
Gamif.   : Rewards, VIP Cards, Marche
Gestion  : Students, Warnings, Moderation, Signalements, Google
```

| Avantages            | Inconvenients             |
| -------------------- | ------------------------- |
| Organisation logique | 2 clics pour acceder      |
| Reduit bruit visuel  | Complexite implementation |
| Scalable             | Etat ouvert/ferme a gerer |

**Verdict** : Excellente solution. Utilise par Notion, Figma.

---

### 5. Sidebar collapsible (rail <-> etendue)

Sidebar minimisee par defaut (icones seules), s'etend au survol/clic.

| Avantages              | Inconvenients               |
| ---------------------- | --------------------------- |
| Gain espace horizontal | Labels caches par defaut    |
| Pattern moderne        | Memorisation icones requise |
|                        | Ne resout pas hauteur       |

**Verdict** : Bon si icones reconnaissables, mais ne resout pas le probleme principal.

---

### 6. Menu overflow ("Plus...")

Afficher N premiers liens + bouton "Plus" ouvrant dropdown.

| Avantages                   | Inconvenients                  |
| --------------------------- | ------------------------------ |
| Liens principaux visibles   | Liens caches moins accessibles |
| Sidebar tient dans viewport | Choix arbitraire visible/cache |
| Simple a implementer        |                                |

**Verdict** : Bon compromis pragmatique.

---

### 7. Repenser l'architecture

Reduire le nombre de liens en reorganisant :

- Fusionner Templates + Worksheets ?
- Section "Gamification" unique ?
- Section "Administration" ?
- Page "Parametres" pour liens rares ?

**Verdict** : Meilleure solution long-terme, demande reflexion produit.

---

## Recommandations

| Horizon     | Approche                                | Effort |
| ----------- | --------------------------------------- | ------ |
| Court terme | **Menu overflow** (8-10 liens + "Plus") | Faible |
| Moyen terme | **Accordeon** (4-5 groupes logiques)    | Moyen  |
| Long terme  | **Audit UX** simplification navigation  | Eleve  |

### Groupement suggere pour accordeon

```typescript
const navGroups = {
	main: ['Dashboard', 'Amis', 'Chat'],
	pedagogie: ['Classes', 'Cours', 'Exercices', 'Worksheets', 'Templates', 'Enigmes'],
	gamification: ['Rewards', 'VIP Cards', 'Marche'],
	gestion: ['Students', 'Avertissements', 'Moderation', 'Signalements', 'Google Classroom']
};
```

---

## Fichiers concernes

- `src/routes/(protected)/dashboard/+layout.svelte` - Layout dashboard avec sidebar
  - Lignes 136-223 : Definition des liens par role (`getNavLinks`)
  - Lignes 677-710 : Rendu de la sidebar
- `src/lib/components/navigation/MobileNavDrawer.svelte` - Navigation mobile (a synchroniser)

---

## Questions ouvertes

1. Quels liens sont les plus utilises par les teachers ? (analytics)
2. Y a-t-il des liens qui pourraient etre supprimes ou fusionnes ?
3. La navigation mobile doit-elle suivre la meme structure ?
4. Faut-il persister l'etat ouvert/ferme des groupes accordeon ?

---

## Historique des modifications recentes

- `5b36e528` - fix(ui): remove flex from card root to prevent content clipping
- `999ca4f9` - fix(layout): prevent nested scroll containers on dashboard routes
- `f9025b03` - fix(dashboard): add scroll to sidebar when content exceeds viewport

Le fix actuel (double scroll) fonctionne mais n'est pas la solution UX optimale.
