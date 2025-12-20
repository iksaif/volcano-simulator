# Moteur Physique par Automate Cellulaire

Le moteur cellulaire simule la physique en traitant la grille comme un automate cellulaire où chaque cellule se met à jour en fonction de son matériau et de ses voisins.

## Fonctionnement

Le moteur s'exécute en phases à chaque image :

```
┌─────────────────────────────────────────────────┐
│  Cycle de Mise à Jour d'Image                   │
├─────────────────────────────────────────────────┤
│  Phase 0 : Réinitialisation des flags           │
│            ↓                                     │
│  Phase 1 : Mouvement des matériaux (bas en haut)│
│            ↓                                     │
│  Phase 2 : Diffusion thermique                  │
│            ↓                                     │
│  Phase 3 : Transitions d'état                   │
│            ↓                                     │
│  Phase 4 : Calcul de pression                   │
│            ↓                                     │
│  Phase 5 : Comportements spéciaux               │
└─────────────────────────────────────────────────┘
```

## Phase 1 : Mouvement des Matériaux 🔄

Les matériaux se déplacent selon leur état physique :

- **Solides** : Tombent verticalement, peuvent déplacer liquides/gaz, forment des ponts stables quand froids
- **Liquides** : Tombent vers le bas, s'étalent en diagonale, s'écoulent horizontalement au repos (taux dépend de la viscosité)
- **Gaz** : Se comportent actuellement comme les liquides

Le mouvement utilise un ordre aléatoire pour éviter les blocages.

**Déplacement basé sur la densité** : Les matériaux plus denses coulent et poussent les plus légers vers le haut. Chaque matériau a une densité de base modifiée par la température (l'expansion thermique rend les matériaux chauds plus légers).

**Viscosité** (échelle 0-255) : Contrôle le taux d'écoulement. Plus de viscosité = écoulement plus lent.

## Phase 2 : Diffusion Thermique 🌡️

La chaleur circule entre cellules voisines selon la différence de température :

```
flux_chaleur = k × (T_voisin - T_cellule) × dt
```

Où `k` est la conductivité thermique du matériau (facilité de circulation de la chaleur). Les matériaux ont différentes valeurs de conductivité.

```
    20°C                22°C
     ↑                   ↑
20°C→100°C→20°C  →  22°C→94°C→22°C
     ↓                   ↓
    20°C                22°C
```

## Phase 3 : Transitions d'État ♨️

Les matériaux changent d'état à des températures spécifiques :

- **Fusion** : Glace → Eau (0°C), Roche → Lave (1200°C)
- **Solidification** : Eau → Glace (0°C), Lave → Roche (<1000°C)
- **Ébullition** : Eau → Vapeur (100°C), expansion ×4 (simule l'expansion de volume)
- **Condensation** : Vapeur → Eau (<100°C), probabiliste pour éviter la condensation instantanée

## Phase 4 : Calcul de Pression ⚖️

La pression s'accumule depuis le poids des matériaux au-dessus. Les matériaux lourds créent une haute pression en dessous.

```
    💨   P=0         (l'air est léger)
    🌊   P=1000      (l'eau ajoute du poids)
    🪨   P=5700      (la roche est lourde !)
```

**Effets** :
- Une pression élevée peut faire s'effondrer les ponts
- Force du pont = `densité × (1 + facteur_refroidissement) × supports`

## Phase 5 : Comportements Spéciaux 🌱

Logique spécifique aux matériaux :

- **Croissance de l'herbe** : Se propage vers la roche/cendre voisine avec faible probabilité, nécessite une température modérée

## Fichiers Clés

### MaterialRules.ts
Distribue les mises à jour aux comportements spécifiques des matériaux.

### behaviors/
- **GenericBehaviors.ts** : Mouvement des solides, liquides, gaz
- **VaporBehavior.ts** : Logique spécifique à la vapeur
- **PhysicsUtils.ts** : Utilitaires partagés (tryMove, vérifications de densité)

### ThermalDiffusion.ts
Transfert de chaleur entre cellules.

### StateTransitions.ts
Changements de phase (fusion, ébullition, etc.)

### PressureComputation.ts
Calcule la pression depuis le poids au-dessus.

### GrassGrowth.ts
Comportement de propagation organique.

## Conseils pour Ajouter des Fonctionnalités

### Ajouter un Nouveau Matériau

1. Ajouter à `MaterialType` dans `src/core/Types.ts`
2. Enregistrer dans `MaterialRegistry.init()` avec les propriétés
3. (Optionnel) Ajouter un comportement personnalisé dans `behaviors/`

### Ajouter un Comportement Personnalisé

Créer un nouveau fichier dans `behaviors/` :

```typescript
export function updateMyMaterial(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  // Votre logique personnalisée ici
  // Utiliser tryMove() pour déplacer la cellule
  // Utiliser grid.get/set pour lire/modifier les voisins
}
```

Enregistrer dans `MaterialRules.init()` :
```typescript
MaterialRules.register(MaterialType.MyMaterial, updateMyMaterial);
```

### Débogage

Activer les superpositions :
- Appuyer sur **T** pour la température
- Appuyer sur **P** pour la pression
- Appuyer sur **V** pour la vélocité

Surveiller :
- Téléportation de particules (mauvais ordre d'itération)
- Disparition de matériaux (vérifier les transitions de phase)
- Problèmes de performance (réduire la taille de la grille)

## Problèmes Connus

- ⚡ Pas de pression dynamique de vélocité encore
- 🔄 Masse pas parfaitement conservée dans les changements de phase
- 🎲 Les solides ne tournent pas

## Voir Aussi

- **[🧪 Référence des Matériaux](../../../docs/Materials.fr.md)** - Propriétés détaillées et transitions de phase pour tous les matériaux
- **[README Principal](../../../README.md)** - Contrôles, fonctionnalités et feuille de route
- **[Guide de Développement](../../../README.dev.md)** - Architecture et contribution
