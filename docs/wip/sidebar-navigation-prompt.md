# Prompt pour nouvelle session - Sidebar Navigation Redesign

Copier-coller ce prompt pour demarrer une nouvelle session Claude Code :

---

## Prompt

```
Je veux repenser la navigation sidebar du dashboard UbuMaths.

## Contexte

Le dashboard a une sidebar "rail" (icones + labels) qui contient trop de liens pour certains roles :
- Student : 7-8 liens (OK)
- Teacher : 16 liens (PROBLEME - depasse le viewport)
- Admin : 11 liens (limite)

Actuellement, j'ai implemente un double scroll (sidebar scrolle independamment du contenu), mais ce n'est pas une bonne UX.

## Document d'analyse

Lis d'abord le document d'analyse complet :
docs/wip/sidebar-navigation-redesign.md

## Ce que je veux

1. Discuter des differentes approches (accordeon, menu overflow, reorganisation...)
2. Choisir la meilleure approche pour UbuMaths
3. Implementer la solution choisie

## Contraintes

- L'app est une app educative pour eleves francophones
- Stack : Svelte 5 (runes), Tailwind CSS 4, Shadcn-svelte
- La sidebar doit rester accessible et intuitive
- La navigation mobile (MobileNavDrawer) doit etre coherente

## Questions a considerer

1. Faut-il grouper les liens par categorie (accordeon) ?
2. Faut-il cacher certains liens dans un menu "Plus" ?
3. Faut-il repenser completement l'architecture de navigation ?
4. Comment gerer la coherence avec la navigation mobile ?

Commence par lire le document d'analyse puis propose-moi un plan d'action.
```

---

## Fichiers a lire en priorite

1. `docs/wip/sidebar-navigation-redesign.md` - Analyse complete du probleme
2. `src/routes/(protected)/dashboard/+layout.svelte` - Layout avec sidebar (lignes 136-223 pour liens, 677-710 pour rendu)
3. `src/lib/components/navigation/MobileNavDrawer.svelte` - Navigation mobile

## Approches recommandees

| Horizon     | Approche      | Description                          |
| ----------- | ------------- | ------------------------------------ |
| Court terme | Menu overflow | 8-10 liens visibles + bouton "Plus"  |
| Moyen terme | Accordeon     | 4-5 groupes logiques depliables      |
| Long terme  | Audit UX      | Simplifier/reorganiser la navigation |
