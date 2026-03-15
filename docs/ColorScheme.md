# Promise — Brand Color System

## 1. Overview

This document defines the **official color system** for the **Promise** brand. Promise is an AI company focused on delivering **enterprise-grade intelligent solutions**, therefore the visual identity must communicate:

* **Technological sophistication**
* **Reliability and trust**
* **Premium positioning**
* **Clarity and intelligence**

The palette combines **deep warm reds** with **gold accents** and **soft light tones**, creating a balance between **authority, innovation, and accessibility**.

This document is structured so it can be easily interpreted by **design systems, UI frameworks, and LLM-based content generators**.

---

# 2. Core Brand Palette

| Role           | Color          | Hex       |
| -------------- | -------------- | --------- |
| Primary Dark   | Deep Ember     | `#240200` |
| Secondary Dark | Burgundy Core  | `#52060B` |
| Accent Mid     | Carmine Bridge | `#8B2E34` |
| Primary Accent | Signal Gold    | `#FEB800` |
| Primary Light  | Soft Ivory     | `#FFEFEB` |

### Palette Philosophy

The palette follows a **dark → warm → light hierarchy**:

```
#240200 → #52060B → #8B2E34 → #FEB800 → #FFEFEB
```

This progression allows the system to work naturally in **both light and dark interfaces** while preserving brand consistency.

---

# 3. Color Meaning and Brand Semantics

### Deep Ember — `#240200`

Primary dark color.

Represents:

* intelligence
* stability
* decision making
* authority

Usage:

* dark backgrounds
* typography on light themes
* high contrast UI elements

---

### Burgundy Core — `#52060B`

Secondary dark color used for **depth and hierarchy**.

Represents:

* enterprise reliability
* structured systems
* engineering rigor

Usage:

* dark surfaces
* secondary backgrounds
* cards in dark themes
* separators

---

### Carmine Bridge — `#8B2E34`

A **transitional brand color** connecting dark tones with accent colors.

Represents:

* innovation
* energy
* transformation

Usage:

* hover states
* highlights
* secondary accents
* gradient transitions

This color exists primarily to prevent the palette from feeling **too binary (dark vs light)**.

---

### Signal Gold — `#FEB800`

Primary accent color.

Represents:

* insight
* value
* successful outcomes
* intelligence emerging from data

Usage:

* buttons
* calls to action
* important highlights
* interactive elements

This is the **most attention-grabbing color in the system**.

---

### Soft Ivory — `#FFEFEB`

Primary light color.

Represents:

* clarity
* transparency
* accessibility
* cognitive simplicity

Usage:

* light backgrounds
* text in dark mode
* UI surfaces

This tone is intentionally **slightly warm**, maintaining harmony with the red spectrum.

---

# 4. Light Mode System

### Background

```
#FFEFEB
```

### Primary Text

```
#240200
```

### Secondary Text

```
#52060B
```

### Interactive Elements

Primary buttons:

```
#FEB800
```

Hover state:

```
#8B2E34
```

### Surfaces

Cards / Panels:

```
#FFF6F3
```

Dividers:

```
#F3D5CF
```

### Light Mode Design Goals

* minimal cognitive load
* warm technological aesthetic
* strong readability
* premium feel

---

# 5. Dark Mode System

### Background

```
#240200
```

### Secondary Background

```
#52060B
```

### Primary Text

```
#FFEFEB
```

### Secondary Text

```
#F7CFC6
```

### Interactive Elements

Primary buttons:

```
#FEB800
```

Hover / Active:

```
#8B2E34
```

### Surfaces

Cards / panels:

```
#3A0508
```

Dividers:

```
#6B1A20
```

### Dark Mode Design Goals

* maintain elegance
* preserve warmth
* avoid cold "cyberpunk" aesthetics common in AI brands
* ensure readability

---

# 6. Brand Gradients

Gradients are recommended in **marketing pages, hero sections, and AI visualizations**.

They reinforce the feeling of **flow, transformation, and intelligence emergence**.

---

## Primary Brand Gradient

```
linear-gradient(
  135deg,
  #52060B,
  #8B2E34,
  #FEB800
)
```

Purpose:

* landing pages
* hero sections
* AI agent visuals
* brand backgrounds

This gradient visually represents:

```
structure → intelligence → insight
```

---

## Dark Intelligence Gradient

```
linear-gradient(
  135deg,
  #240200,
  #52060B,
  #8B2E34
)
```

Purpose:

* dark backgrounds
* dashboards
* product UIs

Creates depth without relying on pure black.

---

## Signal Gradient

```
linear-gradient(
  135deg,
  #8B2E34,
  #FEB800
)
```

Purpose:

* interactive elements
* emphasis highlights
* marketing banners

Communicates **activation and value**.

---

# 7. Usage Guidelines for LLM-Generated Design

When generating UI or brand assets using LLM systems, follow these principles:

### Color Hierarchy

1. Background should always be **Deep Ember or Soft Ivory**
2. Primary actions must use **Signal Gold**
3. Transitional states should use **Carmine Bridge**
4. Surfaces should derive from **Burgundy Core variants**

---

### Accent Ratio

Recommended UI balance:

```
70% background
20% surfaces
8% typography
2% accent color
```

This prevents the **gold accent from losing impact**.

---

### Do Not

Avoid:

* introducing cold blues
* using pure black `#000000`
* overusing the gold accent
* flattening the palette into monotone reds

---

# 8. Visual Identity Summary

The Promise brand palette expresses:

**Authority** through deep reds
**Intelligence** through structured tonal hierarchy
**Value** through gold highlights
**Clarity** through warm light backgrounds

The result is a **distinctive AI identity** that feels:

* premium
* trustworthy
* technologically sophisticated
* visually memorable

---

**End of Document**
