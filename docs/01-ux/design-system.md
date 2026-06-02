# Design System — Plantir

> **Estado:** v1 (Fase 1, base para Fase 3 de implementación).
> **Scope:** tokens, tipografía, color, spacing, radius, shadow, motion y accesibilidad. La decisión de UI lib está justificada al final en formato D/R/A/R/M.
> **Compatibilidad:** iOS + Android (React Native + Expo). Mobile-first siempre.

---

## 1. Principios del sistema visual

1. **Claro antes que bonito.** Una pantalla de gastos o de balances nunca puede ser ambigua. Legibilidad y jerarquía ganan a decoración.
2. **Una mano, un pulgar.** Todo lo accionable a ≤8dp del borde inferior safe-area. Acciones primarias en la zona de alcance (bottom 40% de la pantalla).
3. **Estado del viaje siempre visible.** El usuario nunca debe preguntarse "en qué fase estamos". El stepper es el ancla visual del trip dashboard.
4. **Reduce fricción, no impone pasos.** Wizards de 3-5 pasos con `Skip` y `Back` claros. Microcopy de avance ("Vamos", "Listo") en lugar de CTA rígidos.
5. **Dinero sin sorpresas.** Tipografía monoespaciada para cifras. Céntimos visibles. El símbolo de moneda aparece siempre pegado al número (`45,00 €`, no `€45`).

---

## 2. Tokens

> Los tokens son **variables**, nunca valores sueltos. Se exponen en TypeScript (`src/theme/tokens.ts`), en CSS para NativeWind (`tailwind.config.js` → `theme.extend.colors`) y en formato JSON para inspección.
> Todos los tokens se nombran semánticamente, no por valor (`color.primary.500`, no `color.blue.500`).

### 2.1 Color

#### Paleta primary (Sunset Coral)
Energía social, calidez, "amigos reuniéndose". Evita el naranja chillón infantil.

| Token | Valor | Uso |
|---|---|---|
| `--color-primary-50` | `#FFF4F0` | Fondo de chips, hover/pressed de primary claro |
| `--color-primary-100` | `#FFE0D2` | Fondo de banners informativos suaves |
| `--color-primary-200` | `#FFC2A6` | Borde de inputs en focus |
| `--color-primary-400` | `#FF8862` | Hover de botón primary en web/tablet |
| `--color-primary-500` | `#F2602D` | **Default primary** (CTAs principales, links, iconos activos) |
| `--color-primary-600` | `#D9481C` | Pressed de primary |
| `--color-primary-700` | `#A5370F` | Texto sobre fondo claro cuando necesita énfasis |

#### Paleta secondary (Trail Teal)
Frescura, "outdoor", equilibrio con el coral. Usado para estados secundarios, badges de progreso, gráficos.

| Token | Valor | Uso |
|---|---|---|
| `--color-secondary-50` | `#EEFBF7` | Fondo de chips de éxito/info |
| `--color-secondary-300` | `#7DDBC5` | Iconos secundarios, gráficos |
| `--color-secondary-500` | `#0EAA8A` | **Default secondary** (badges, acentos fríos) |
| `--color-secondary-700` | `#06604D` | Texto sobre fondo claro cuando necesita contraste |

#### Paleta accent (Sun Yellow)
Toques alegres, no cromáticamente invasivo. Reservado a highlights y stickers.

| Token | Valor | Uso |
|---|---|---|
| `--color-accent-300` | `#FFD15C` | Highlights decorativos |
| `--color-accent-500` | `#F5B700` | Stickers de invitación, badges "Nuevo" |

#### Neutrals (warm gray)
Nunca gris puro. El matiz cálido casa con la marca y mejora contraste percibido.

| Token | Valor | Uso |
|---|---|---|
| `--color-neutral-0` | `#FFFFFF` | Fondo de cards en light mode |
| `--color-neutral-50` | `#FAF7F4` | Fondo base light mode |
| `--color-neutral-100` | `#F2EDE7` | Fondo de inputs, divisores suaves |
| `--color-neutral-200` | `#E3DCD2` | Bordes, separadores |
| `--color-neutral-400` | `#A99E91` | Placeholders, iconos deshabilitados |
| `--color-neutral-600` | `#6B6258` | Texto secundario |
| `--color-neutral-800` | `#332E27` | Texto principal light mode |
| `--color-neutral-900` | `#1F1B16` | Cabeceras, texto de alto contraste |
| `--color-neutral-950` | `#0F0D0A` | Fondo base dark mode |

#### Semantic
| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-success` | `#1A8F5C` | `#3FBF85` | Pago confirmado, viaje creado OK |
| `--color-warning` | `#C77A02` | `#E69A2B` | Saldo pendiente, fecha a punto de caducar |
| `--color-danger` | `#C53030` | `#F26A6A` | Errores, saldos en contra, validación fallida |
| `--color-info` | `#1F6FEB` | `#5C9CF2` | Notificaciones informativas, banners neutrales |

#### Semantic surface
| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-surface-base` | `neutral-50` | `neutral-950` | Fondo de pantalla |
| `--color-surface-raised` | `neutral-0` | `neutral-900` | Cards, modales, sheets |
| `--color-surface-sunken` | `neutral-100` | `#0A0806` | Inputs, huecos |
| `--color-overlay` | `rgba(31,27,22,0.45)` | `rgba(0,0,0,0.6)` | Backdrop de modales |

#### Dark mode
Mismas paletas primary/secondary/accent, **mismos hues**; sólo cambian neutrales y surfaces. Activado por `prefers-color-scheme` o por toggle manual en Profile (persistido en SecureStore).

#### Contraste verificado (AA mínimo WCAG 2.1)
| Combinación | Ratio | Nivel |
|---|---|---|
| `neutral-800` sobre `neutral-50` | 13.4:1 | AAA |
| `neutral-600` sobre `neutral-50` | 6.8:1 | AA |
| `primary-500` sobre `neutral-50` | 4.7:1 | AA (texto ≥14pt) |
| `primary-700` sobre `neutral-50` | 6.5:1 | AA |
| `success` sobre `neutral-0` | 4.6:1 | AA |
| `danger` sobre `neutral-0` | 5.1:1 | AA |
| Texto en dark mode (`neutral-50` sobre `neutral-950`) | 14.8:1 | AAA |

> Cualquier par de texto/icono contra un fondo debe pasar ≥4.5:1 (texto) o ≥3:1 (iconos/gráficos). Lint custom bloquea valores fuera de la paleta en commits.

### 2.2 Tipografía

**Familia:** `Inter` (variable, self-hosted, no Google Fonts en runtime). Soporta latin extendido.
- Por qué Inter: open source, excelente legibilidad móvil a tamaños pequeños, variable font con axis de peso.
- Fallback system: `-apple-system, "Segoe UI", Roboto, sans-serif`.

**Escala (mobile-first, baseline 4pt):**

| Token | Tamaño / line-height | Peso | Uso |
|---|---|---|---|
| `text-display` | 32/38 | 700 | Hero del onboarding, números grandes de balance |
| `text-h1` | 24/30 | 700 | Título de pantalla |
| `text-h2` | 20/26 | 600 | Sección de dashboard, título de card |
| `text-h3` | 18/24 | 600 | Subtítulos, nombre de propuesta en header |
| `text-body-lg` | 16/24 | 400 | Párrafos destacados, descripciones de planes |
| `text-body` | 15/22 | 400 | Cuerpo por defecto |
| `text-body-sm` | 14/20 | 400 | Metadatos, helper text |
| `text-caption` | 12/16 | 500 | Timestamps, leyenda de gráfico |
| `text-overline` | 11/14 | 600 uppercase +0.8 tracking | Etiquetas ("PRESUPUESTO", "TOTAL") |
| `text-mono-lg` | 28/32 | 600 JetBrains Mono | Cifras grandes en balances |
| `text-mono` | 15/22 | 500 JetBrains Mono | Cifras en filas de gastos |

**Reglas:**
- Tamaño mínimo de cuerpo: **15pt**. Pie de foto, captions: 12pt aceptable pero **negrita** o sobre fondo con contraste reforzado.
- JetBrains Mono **sólo** para cifras de dinero y código de invitación. Nunca para texto corrido.
- Line-height ratio: 1.4-1.5 para cuerpo, 1.15-1.2 para display.
- Máximo 60 caracteres por línea en párrafos largos (en mobile real, eso son 2-3 líneas).

### 2.3 Spacing

Escala 4pt. **Todo** margen, padding y gap sale de estos tokens.

| Token | Valor | Uso típico |
|---|---|---|
| `space-0` | 0 | — |
| `space-1` | 4 | Hairline gap, padding interno de chips |
| `space-2` | 8 | Gap entre elementos emparentados (icono + label) |
| `space-3` | 12 | Padding horizontal de card |
| `space-4` | 16 | **Default de padding lateral** y gap de items en lista |
| `space-5` | 20 | Padding vertical de sección |
| `space-6` | 24 | Separación entre secciones |
| `space-8` | 32 | Padding top de pantalla (debajo de status bar) |
| `space-10` | 40 | Margen de hero, separación entre hero y CTA |
| `space-12` | 48 | Bottom safe-area buffer |
| `space-16` | 64 | Sólo para hero de onboarding |

**Reglas de composición:**
- Padding lateral mínimo de pantalla: `space-4` (16dp). En iPhone SE (320pt) nunca inferior a 12dp.
- Gap entre cards: `space-3` o `space-4`.
- Gap entre secciones: `space-6` mínimo.
- Una pantalla vertical con scroll nunca debe sumar más de 80dp de padding superior antes del primer contenido visible.

### 2.4 Radius

| Token | Valor | Uso |
|---|---|---|
| `radius-xs` | 4 | Chips pequeños, badges |
| `radius-sm` | 8 | Inputs, botones secundarios |
| `radius-md` | 12 | **Default** de card y botón primary |
| `radius-lg` | 16 | Bottom sheet, modal pequeño |
| `radius-xl` | 24 | Hero card, illustration container |
| `radius-full` | 9999 | Avatares, pills, FAB |

### 2.5 Shadow

Sombras suaves, **cálidas** (tinte marrón, no gris puro). Sólo en iOS. En Android usar `elevation` correspondiente.

| Token | iOS shadow | Android elevation | Uso |
|---|---|---|---|
| `shadow-xs` | 0 1 2 rgba(31,27,22,0.06) | 1 | Hairline de cards levantadas |
| `shadow-sm` | 0 2 6 rgba(31,27,22,0.08) | 3 | Card en scroll, FAB en reposo |
| `shadow-md` | 0 6 14 rgba(31,27,22,0.10) | 6 | Bottom sheet, modal |
| `shadow-lg` | 0 12 28 rgba(31,27,22,0.14) | 12 | Dialog de confirmación crítica |

**Regla:** máximo 2 niveles de sombra por pantalla. Una card flotando sobre otra, no una pirámide.

### 2.6 Motion

| Token | Duración | Easing | Uso |
|---|---|---|---|
| `motion-instant` | 0ms | — | Pressed state, micro-feedback |
| `motion-fast` | 120ms | `ease-out` (cubic-bezier(0.2, 0, 0, 1)) | Cambio de icono, toggle |
| `motion-base` | 220ms | `ease-out` | Entrada de card, hover de botón |
| `motion-slow` | 320ms | `ease-in-out` | Bottom sheet, modal, transición de wizard |
| `motion-emphasis` | 480ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Confetti al cerrar balance, success screen |

**Reglas:**
- Toda animación **>200ms** debe respetar `prefers-reduced-motion: reduce` (cae a 0ms o a fade de 80ms).
- Skeleton screens para cualquier carga >300ms.
- Nunca animar width/height de layout; usar `transform` y `opacity`.
- Haptic feedback (`Haptics.impactAsync`) en acciones irreversibles (borrar gasto, abandonar viaje, confirmar pago).

### 2.7 Iconografía

- Set: **Lucide** (open source, tree-shakeable, peso similar a Feather pero con mejor cobertura).
- Tamaño por defecto: 20dp (touch target 44dp lo envuelve).
- Tamaño grande (hero empty state): 48dp.
- Grosor: 1.75pt (consistente en todo el set).
- Iconos que comunican estado (check, alerta) **nunca** solos: siempre con label o tooltip.

### 2.8 Z-index y capas

| Capa | z-index | Contenido |
|---|---|---|
| `z-base` | 0 | Contenido de pantalla |
| `z-sticky` | 10 | Stepper del trip dashboard, header pegajoso |
| `z-fab` | 20 | FAB de crear gasto |
| `z-sheet` | 30 | Bottom sheet |
| `z-modal` | 40 | Modal/dialog |
| `z-toast` | 50 | Toasts, snackbars |
| `z-tooltip` | 60 | Tooltips sobre iconos |

---

## 3. Accesibilidad

### 3.1 Contraste
- Texto normal: **AA ≥ 4.5:1**.
- Texto grande (≥18pt o 14pt bold): **AA ≥ 3:1**.
- Iconos y elementos gráficos significativos: **≥ 3:1** contra su fondo.
- Verificación automática en CI con `axe-core` sobre RN Testing Library.

### 3.2 Touch targets
- **Mínimo 44x44 dp** en iOS y Android. Esto NO es opcional.
- Cuando el icono visual es <44dp, se envuelve en un `Pressable` con `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` o se usa un padding interno para alcanzar 44dp.
- Spacing entre targets adyacentes: **mínimo 8dp** (mejor 12dp) para evitar toques erróneos.

### 3.3 Screen readers
- Todo `Pressable`/`TouchableOpacity` interactivo debe tener `accessibilityLabel` (en español, descriptivo, no "botón" genérico).
- `accessibilityRole` correcto: `button`, `link`, `header`, `tab`, `tablist`, `progressbar`, `switch`, `adjustable`, `text`, `summary`.
- `accessibilityState` para disabled/selected/expanded/busy.
- Decorar con `accessibilityHint` sólo cuando el label no basta (1 línea máx).
- Grupos lógicos: `accessibilityRole="summary"` en cards de gasto; `accessibilityRole="header"` en stepper; `accessibilityRole="adjustable"` en heatmap con `accessibilityActions` increment/decrement.
- Para imágenes decorativas: `accessibilityElementsHidden` + `importantForAccessibility="no"`.
- Loading: `accessibilityLiveRegion="polite"` en región que cambia; `busy={true}` en `Pressable` que dispara fetch.
- Idioma del screen reader: atributo raíz `lang="es"` en `<Text>` cuando el contenido esté en español (default de la app).

### 3.4 Tipografía accesible
- `allowFontScaling: true` por defecto (respeta la preferencia del sistema). En cifras de dinero se permite pero se trunca con `maxFontSizeMultiplier={1.3}` para no romper layouts.
- Texto crítico (cifras grandes de balance) puede fijar tamaño para que la captura de pantalla / evidencia de pago sea fiable.

### 3.5 Foco y navegación por teclado/switch
- En Android, soporte de `accessibilityFocus` al cambiar de pantalla.
- Soporte de switch control: orden de tabulación coherente con el orden visual.
- En wizard, foco inicial siempre en el primer input; `returnKeyType="next"`/`"done"` correctos.

### 3.6 Reducción de movimiento
- Hook `useReducedMotion()` (Expo) → si activo, desactiva transiciones, mantiene sólo fades de 80ms y haptics.

### 3.7 Color no es el único canal
- Errores de validación: icono + texto + color (no sólo color).
- Estado de "ya votaste" en propuestas: badge "✓ Tu voto" + check icon + texto, no sólo color de fondo.
- Gráficos de balances: además del color, usar icono de flecha (▲/▼) o signo (+/-).

---

## 4. Decisión de UI lib

**Decisión:** **NativeWind v4** + `tailwind-rn` (preset) + componentes propios atómicos sobre `Pressable`/`View`/`Text` de RN.

**Formato D/R/A/R/M:**

### Decisión
Usar **NativeWind v4** como librería de UI / estilado.

### Razón
1. **Utility-first y tematizable.** Los tokens (color, spacing, radius) viven en `tailwind.config.js` y se exponen como clases (`bg-primary-500`, `p-4`, `rounded-md`). Una única fuente de verdad para design system y código, sin sincronizar archivos `colors.ts` y `theme.js`.
2. **Tokens como variables reales.** `theme.extend.colors.primary.500 = '#F2602D'` se traduce a `var(--color-primary-500)` en CSS generado. Permite dark mode y tematización dinámica por viaje (color de acento por viaje) sin re-render del árbol.
3. **Coste runtime bajo.** NativeWind v4 usa un compilador que genera `StyleSheet` plano en build; en runtime no hay diff ni procesamiento de strings. Bundle similar a RN con StyleSheet.
4. **DX coherente con web moderno.** El equipo (fase 3) viene de Next/Tailwind. Curva de aprendizaje mínima.
5. **Componentes headless sobre RN primitivos.** `Pressable` y `View` son ya de por sí accesibles; envolverlos en componentes propios (`<Button>`, `<Card>`) evita opiniones visuales de terceros que tengamos luego que deshacer.
6. **Soporte oficial de Expo + new architecture.** NativeWind v4 está mantenido y testeado contra Expo SDK recientes y Fabric/TurboModules.
7. **No impone marca visual.** A diferencia de React Native Paper (Material Design) o Tamagui (su propia capa de "stacks" y "sheets"), NativeWind no trae opinión estética. Eso casa con "amigable moderno, social, no infantil" — la marca la definimos nosotros.

### Alternativas consideradas
- **React Native Paper:** muy maduro, trae Button/Card/Dialog/Snackbar listos. Encaja en MVP rápido. **Descartado** porque Material Design 3 choca con nuestra dirección de marca (botones con "elevación 1" y "tonal surfaces" no son "viaje con amigos") y porque tematizarlo a fondo requiere overrides constantes del theme de MD3. Riesgo: rehacer la capa de estilo en v1.
- **Tamagui:** excelente performance (compilador optimizador), universal web+RN, sistema de tokens potente. **Descartado** porque (a) añade una segunda capa conceptual (tokens → themes → styled components) que para un MVP mobile-first es overkill, (b) su set de componentes tiene opiniones que igualmente vamos a rehacer, (c) curva de aprendizaje superior para el equipo.

### Riesgo
- **R1.** NativeWind es joven (v4 estable pero comunidad aún creciendo). Bugs en edge cases de animaciones o de temas dinámicos por viaje.
- **R2.** Migración de v3 a v4 ya pasó; si sale v5 con breaking changes, deberemos migrar.
- **R3.** Si en el futuro necesitamos web mode real (v2), NativeWind nos cubre sin migración. Si no, no hay pérdida.
- **R4.** Riesgo de "spaguetti de clases" si no se disciplina con `@apply` y componentes. Hay que escribir la guía de estilo en `components.md` y aplicarla en code review.

### Mitigación
- **M1 (R1).** Encapsular NativeWind en componentes (`<Button variant="primary">`), nunca usar `className` raw en screens. Cualquier `className` en screen pasa a ser un componente nuevo en el inventario.
- **M2 (R2).** Pin exacto de versión en `package.json` (`"nativewind": "4.x.y"`), renovatebot vigilando releases, PR de upgrade en sprint dedicado.
- **M3 (R3).** Cubierto: NativeWind sirve RN y web Expo.
- **M4 (R4).** ESLint rule custom que prohíba `className` con más de 6 utilidades en `app/` (forzar extracción a componente). Code review checklist incluye "¿hay componente equivalente?".
- **M5.** Smoke test E2E con Detox renderizando las 3 pantallas más críticas en cada release para detectar regresiones visuales temprano.

---

## 5. Estructura de archivos de tema

```
src/
  theme/
    tokens.ts        # Todos los tokens como TS, fuente de verdad
    colors.ts        # Re-export para NativeWind
    typography.ts    # Escala + helpers
    spacing.ts
    radius.ts
    motion.ts
  theme/index.ts     # Barrel
tailwind.config.js   # Consume tokens.ts vía plugin
```

`tokens.ts` se importa desde NativeWind config y desde cualquier helper JS. **Prohibido** hardcodear hex, dp o ms en componentes.
