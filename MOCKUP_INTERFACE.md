# 🎨 Mockup Visuel : Interface d'Assignation de Scripts

## Vue de l'Onglet Scripts (Avant la Fonctionnalité)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  ENTREPRISE: Studio Savora                                                ║
║  studiosavora.com · skincare                                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ◈ PROFIL  │  ▦ PACKAGES (3)  │  ✓ SCRIPTS (8)  │  ◎ MODÈLES (2)       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  SCRIPTS (8)                                    [✦ GÉNÉRER POUR CE CLIENT]║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ ❤️  ÉMOTIONNEL                                                      │ ║
║  │     "J'ai toujours eu du mal avec ma peau grasse..."    [GÉNÉRÉ]    │ ║
║  │                                                         [▼ Statut]   │ ║
║  │                                                         [✏ ÉDITER]   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 🎯  PROBLÈME/SOL.                                                   │ ║
║  │     "Tu en as marre de ta peau qui brille toute la journée ?..."    │ ║
║  │                                                         [VALIDÉ]     │ ║
║  │                                                         [▼ Statut]   │ ║
║  │                                                         [✏ ÉDITER]   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Vue de l'Onglet Scripts (Après la Fonctionnalité) ✨

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  ENTREPRISE: Studio Savora                                                ║
║  studiosavora.com · skincare                                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ◈ PROFIL  │  ▦ PACKAGES (3)  │  ✓ SCRIPTS (8)  │  ◎ MODÈLES (2)       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  SCRIPTS (8)                                    [✦ GÉNÉRER POUR CE CLIENT]║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ ❤️  ÉMOTIONNEL                                                      │ ║
║  │     "J'ai toujours eu du mal avec ma peau grasse..."    [GÉNÉRÉ]    │ ║
║  │                                                         [▼ Statut]   │ ║
║  │                                                         [✏ ÉDITER]   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 🎯  PROBLÈME/SOL.                             [VALIDÉ]              │ ║
║  │     📦 Pack Juin 2025                         [▼ Statut]            │ ║
║  │                                                [✏ ÉDITER]            │ ║
║  │     "Tu en as marre de ta peau qui brille toute la journée ?..."    │ ║
║  │  ─────────────────────────────────────────────────────────────────  │ ║
║  │  CHANGER DE PACKAGE:  [▼ Pack Juin 2025 (UGC)    ▼]  [✕]          │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 🔥  CURIOSITÉ                                                       │ ║
║  │     "Et si je te disais qu'il existe une routine..."  [VALIDÉ]      │ ║
║  │                                                         [▼ Statut]   │ ║
║  │                                                         [✏ ÉDITER]   │ ║
║  │  ─────────────────────────────────────────────────────────────────  │ ║
║  │  AJOUTER À UN PACKAGE:  [▼ — Sélectionner un package — ▼]         │ ║
║  │                         ├─ Pack Juin 2025 (UGC)                     │ ║
║  │                         ├─ Pack Juillet 2025 (MICRO-TROTTOIR)       │ ║
║  │                         └─ Pack Test (FACE CAM)                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Détails des États Visuels

### État 1 : Script Non Validé
```
┌───────────────────────────────────────────────────────┐
│ ❤️  ÉMOTIONNEL                        [GÉNÉRÉ]       │
│     "Hook: J'ai toujours..."          [▼ Statut]     │
│                                        [✏ ÉDITER]     │
└───────────────────────────────────────────────────────┘
```
❌ **Pas de section d'assignation** (script pas encore validé)

---

### État 2 : Script Validé SANS Package
```
┌───────────────────────────────────────────────────────────────┐
│ 🎯  PROBLÈME/SOL.                              [VALIDÉ]       │
│     "Hook: Tu en as marre..."                  [▼ Statut]     │
│                                                 [✏ ÉDITER]     │
│  ─────────────────────────────────────────────────────────    │
│  AJOUTER À UN PACKAGE:  [▼ Sélectionner...  ▼]               │
└───────────────────────────────────────────────────────────────┘
```
✅ **Section d'assignation visible** avec dropdown

---

### État 3 : Utilisateur Sélectionne un Package
```
┌───────────────────────────────────────────────────────────────┐
│ 🎯  PROBLÈME/SOL.                              [VALIDÉ]       │
│     "Hook: Tu en as marre..."                  [▼ Statut]     │
│                                                 [✏ ÉDITER]     │
│  ─────────────────────────────────────────────────────────    │
│  AJOUTER À UN PACKAGE:  [▼ Pack Juin 2025 ▼]  [✓ ASSIGNER]  │
└───────────────────────────────────────────────────────────────┘
```
✅ **Bouton ASSIGNER apparaît** (couleur lime/vert)

---

### État 4 : Script AVEC Package Assigné
```
┌───────────────────────────────────────────────────────────────┐
│ 🎯  PROBLÈME/SOL.                              [VALIDÉ]       │
│     📦 Pack Juin 2025                          [▼ Statut]     │
│                                                 [✏ ÉDITER]     │
│     "Hook: Tu en as marre..."                                 │
│  ─────────────────────────────────────────────────────────    │
│  CHANGER DE PACKAGE:  [▼ Pack Juin 2025 ▼]    [✕]           │
└───────────────────────────────────────────────────────────────┘
```
✅ **Badge 📦 visible** en haut  
✅ **Label change** : "CHANGER DE PACKAGE"  
✅ **Bouton [✕]** pour retirer du package

---

### État 5 : Changement de Package en Cours
```
┌───────────────────────────────────────────────────────────────┐
│ 🎯  PROBLÈME/SOL.                              [VALIDÉ]       │
│     📦 Pack Juin 2025                          [▼ Statut]     │
│                                                 [✏ ÉDITER]     │
│     "Hook: Tu en as marre..."                                 │
│  ─────────────────────────────────────────────────────────    │
│  CHANGER DE PACKAGE:  [▼ Pack Juillet 2025 ▼] [✓ ASSIGNER] [✕]│
└───────────────────────────────────────────────────────────────┘
```
✅ **Nouvelle sélection différente** → Bouton ASSIGNER réapparaît

---

## Palette de Couleurs

```
┌─────────────────────────────────────────────┐
│  COULEURS UTILISÉES                         │
├─────────────────────────────────────────────┤
│                                             │
│  🟢 Lime (#lime)        - Validé, Actions  │
│  🟤 Olive (#olive)      - Texte principal   │
│  🟡 Cream (#cream)      - Fond             │
│  🔵 Lime-dark           - Package badge     │
│  🟠 Orange              - En production     │
│  🔴 Red tones           - Retirer package   │
│                                             │
└─────────────────────────────────────────────┘
```

## Typographie

```
POLICE:           font-display (déjà utilisée dans l'app)
TAILLES:
  - Labels:       text-[9px] uppercase tracking-widest
  - Contenu:      text-xs
  - Badges:       text-[9px]
  - Boutons:      text-[9px] uppercase tracking-widest
```

## Interactions

```
╔═══════════════════════════════════════════════════════════╗
║  COMPORTEMENTS INTERACTIFS                                ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ▶ Survol dropdown        → border-olive/30              ║
║  ▶ Survol bouton ASSIGNER → bg-lime/25                   ║
║  ▶ Survol bouton ✕        → text-red-500 border-red-300 ║
║  ▶ Clic ASSIGNER          → Appel API + Update UI        ║
║  ▶ Clic ✕                 → packageId = null + Update UI ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

**Cohérence Design** : Tous les éléments suivent le design system existant de l'application ✨
