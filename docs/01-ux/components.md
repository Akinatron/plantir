# Inventario de componentes — Plantir

> **Estado:** v1 (Fase 1, contrato de props, no implementación).
> **Convención:** todo componente se nombra en `PascalCase`, vive en `src/components/<Nombre>/<Nombre>.tsx`, expone tipos desde `<Nombre>.types.ts`, y nunca recibe `className` raw (queda encapsulado). Los screens consumen `<Componente variant="…" />`, no `<View className="bg-primary-500 p-4 rounded-md" />`.
> **Tipos compartidos** (ej. `Money`, `TripState`) se importan de `src/types/` (ver `docs/01-architecture/`).
> **Accesibilidad:** todos los componentes exponen y propagan `accessibilityLabel`, `accessibilityHint`, `testID`. Roles y states se setean por defecto y son configurables.

---

## 0. Convenciones de props

- `variant` y `size` se prefieren sobre `style` libre. Estilos custom se接受n sólo vía prop `style` de escape (no por defecto).
- Iconos opcionales se pasan como `ReactNode` (Lucide), no como string. Así el tree-shaking funciona.
- Componentes con `onPress` **requieren** `accessibilityLabel` (warning de TS, lint rule).
- Estados visuales que afectan accesibilidad (`disabled`, `loading`, `selected`, `expanded`) exponen prop booleana y se propagan a `accessibilityState`.
- Tamaños: `xs | sm | md | lg | xl` cuando hay más de 2 dimensiones, o `sm | md | lg` cuando son 3.

---

## 1. Primitives

### 1.1 `Button`

```ts
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;                     // texto visible y a11y label por defecto
  onPress: () => void;
  variant?: ButtonVariant;           // default 'primary'
  size?: ButtonSize;                 // default 'md'
  leftIcon?: ReactNode;              // Lucide icon
  rightIcon?: ReactNode;
  loading?: boolean;                 // muestra Spinner interno, deshabilita onPress
  disabled?: boolean;
  fullWidth?: boolean;               // ocupa el ancho del contenedor
  haptic?: 'light' | 'medium' | 'none'; // default 'light'
  accessibilityLabel?: string;       // si difiere de label
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;                 // escape hatch
}
```

**Notas:** height por tamaño: sm 36, md 44, lg 52 (todos ≥44dp de touch target). En sm el padding interno crece invisiblemente para mantener 44dp. loading reemplaza label por Spinner + `accessibilityLabel="Cargando"` + `busy=true`.

---

### 1.2 `IconButton`

```ts
interface IconButtonProps {
  icon: ReactNode;                   // Lucide, 20dp por defecto
  onPress: () => void;
  accessibilityLabel: string;        // OBLIGATORIO
  variant?: 'ghost' | 'filled' | 'subtle';  // default 'ghost'
  size?: 'sm' | 'md';                // sm = 32dp visual + hitSlop, md = 44dp
  disabled?: boolean;
  badge?: number | string;           // contador en esquina (ej. notificaciones)
  haptic?: 'light' | 'medium' | 'none';
  testID?: string;
}
```

---

### 1.3 `Text`

```ts
type TextVariant =
  | 'display' | 'h1' | 'h2' | 'h3'
  | 'body-lg' | 'body' | 'body-sm'
  | 'caption' | 'overline'
  | 'mono-lg' | 'mono';

type TextTone =
  | 'default' | 'muted' | 'subtle' | 'inverse'
  | 'primary' | 'success' | 'warning' | 'danger';

interface TextProps {
  children: ReactNode;
  variant?: TextVariant;             // default 'body'
  tone?: TextTone;                   // default 'default'
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;    // default 1.3 (en 'mono' cifras 1.0)
  accessibilityRole?: 'text' | 'header' | 'summary';
  testID?: string;
  style?: TextStyle;
}
```

---

### 1.4 `Heading`

Wrapper sobre `Text` con `accessibilityRole="header"` por defecto. Usar en títulos de pantalla y de sección.

```ts
interface HeadingProps extends Omit<TextProps, 'variant' | 'accessibilityRole'> {
  level?: 1 | 2 | 3;                 // mapea a h1/h2/h3
}
```

---

### 1.5 `Input`

```ts
type InputType = 'text' | 'email' | 'password' | 'url' | 'numeric' | 'tel';

interface InputProps {
  value: string;
  onChangeText: (v: string) => void;
  label?: string;                    // si se omite, no se renderiza label visual
  placeholder?: string;
  type?: InputType;                  // default 'text'
  helperText?: string;
  errorText?: string;                // si presente, cambia a estado danger
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  rightAddon?: ReactNode;            // ej. botón "Ver" en password
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;                // muestra asterisco y propaga a a11y
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;             // hint del sistema
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  maxLength?: number;
  testID?: string;
  accessibilityLabel?: string;       // si difiere de label
}
```

---

### 1.6 `Textarea`

```ts
interface TextareaProps {
  value: string;
  onChangeText: (v: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  minHeight?: number;                // default 96
  maxLength?: number;                // muestra contador live si >0
  showCharacterCount?: boolean;
  disabled?: boolean;
  testID?: string;
}
```

---

### 1.7 `Select` (picker nativo)

Wrapper sobre el modal picker del sistema. En iOS usa `ActionSheet`, en Android `Modal` con lista.

```ts
interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps<T extends string> {
  value: T | null;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  testID?: string;
}
```

---

### 1.8 `Checkbox`, `Radio`, `Switch`

```ts
interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;                   // visual danger sin errorText
  testID?: string;
}

interface RadioProps<T extends string> {
  value: T;
  selected: boolean;
  onSelect: (v: T) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  testID?: string;
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  testID?: string;
}
```

---

### 1.9 `Avatar`

```ts
interface AvatarProps {
  source?: { uri: string } | null;   // null = fallback a iniciales
  name: string;                      // usado para iniciales y a11y
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // 20, 28, 36, 48, 64
  colorSeed?: string;                // para color de fondo determinista
  badge?: 'online' | 'offline' | 'paid' | 'owes';
  testID?: string;
}
```

---

### 1.10 `AvatarStack`

```ts
interface AvatarStackProps {
  users: { id: string; name: string; source?: { uri: string } | null }[];
  maxVisible?: number;               // default 4
  size?: AvatarProps['size'];        // default 'sm'
  onPress?: () => void;              // abrir sheet con la lista completa
  testID?: string;
}
```

---

### 1.11 `Badge`

```ts
type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeVariant = 'solid' | 'subtle' | 'outline';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;                  // default 'neutral'
  variant?: BadgeVariant;            // default 'subtle'
  leftIcon?: ReactNode;
  size?: 'sm' | 'md';                // default 'sm'
  testID?: string;
}
```

---

### 1.12 `Chip`

Pill accionable. Para filtros y selección múltiple.

```ts
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;             // muestra X a la derecha
  leftIcon?: ReactNode;
  disabled?: boolean;
  testID?: string;
}
```

---

### 1.13 `Divider`

```ts
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';   // default 'horizontal'
  inset?: number;                  // padding lateral en dp
  label?: string;                  // divider con texto centrado
  testID?: string;
}
```

---

### 1.14 `Spinner`, `Skeleton`

```ts
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';        // 16, 24, 32
  tone?: 'primary' | 'inverse';
  accessibilityLabel?: string;      // default 'Cargando'
}

interface SkeletonProps {
  width?: number | `${string}%`;
  height?: number;
  radius?: 'sm' | 'md' | 'full';
  testID?: string;
}
```

---

## 2. Containers

### 2.1 `Screen`

Wrapper raíz de toda pantalla. Maneja safe-area, status bar, keyboard avoiding, fondo base.

```ts
interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;                 // envuelve en ScrollView
  refreshControl?: {                // pull-to-refresh
    refreshing: boolean;
    onRefresh: () => void;
  };
  keyboardAvoiding?: boolean;       // default true si hay Input
  edges?: ('top' | 'bottom')[];     // default ['top','bottom']
  background?: 'base' | 'raised';
  testID?: string;
}
```

---

### 2.2 `Card`

```ts
type CardVariant = 'raised' | 'flat' | 'outlined';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;            // default 'raised'
  onPress?: () => void;             // convierte en Pressable
  padding?: 'none' | 'sm' | 'md' | 'lg';  // default 'md'
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}
```

---

### 2.3 `BottomSheet`

```ts
interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;                   // header con handle
  snapPoints?: number[];            // porcentajes; default [60, 90]
  initialSnap?: number;             // índice, default 0
  dismissible?: boolean;            // default true
  testID?: string;
}
```

---

### 2.4 `Dialog`

```ts
interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;                 // ej. icono de alerta
  actions: DialogAction[];          // máximo 3, primary siempre última
  dismissible?: boolean;            // default true para no-danger, false para danger
  testID?: string;
}
```

---

### 2.5 `Toast`

```ts
type ToastTone = 'success' | 'info' | 'warning' | 'danger';

interface ToastProps {
  open: boolean;
  message: string;
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
  duration?: number;                // ms, default 4000
  testID?: string;
}
```

Se controla vía store global (Zustand) y un `<ToastHost />` montado en root layout.

---

### 2.6 `Tabs`

```ts
interface TabItem {
  key: string;
  label: string;
  badge?: number | string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  variant?: 'underline' | 'pill';   // default 'underline'
  scrollable?: boolean;
  testID?: string;
}
```

---

## 3. Navigation

### 3.1 `AppHeader`

```ts
interface AppHeaderProps {
  title?: string;                   // si vacío, oculta título (logo en su lugar)
  subtitle?: string;
  back?: { onPress: () => void; accessibilityLabel?: string };
  leading?: ReactNode;              // ej. avatar en home
  trailing?: ReactNode;             // IconButtons o acciones
  sticky?: boolean;                 // default true
  transparent?: boolean;
  testID?: string;
}
```

---

### 3.2 `ProgressStepper` (trip dashboard stepper)

Componente estrella. Visualiza el estado del viaje en una línea de tiempo con los 9 estados del briefing.

```ts
type TripState =
  | 'group_created'
  | 'voting_dates'
  | 'date_decided'
  | 'voting_place'
  | 'place_decided'
  | 'planning'
  | 'on_trip'
  | 'settling_expenses'
  | 'closed';

interface ProgressStepperProps {
  state: TripState;
  compact?: boolean;                // false = horizontal scroll, true = collapsed chip
  onStepPress?: (state: TripState) => void;  // tap en paso completado para revisitar
  testID?: string;
}
```

**Comportamiento:**
- Pasos completados: check icon verde, línea conectora primary.
- Paso actual: dot pulsante primary con label visible.
- Pasos futuros: dot neutro, label muted.
- Modo `compact`: una sola pill en header ("Votando fechas · 3/9") que al tap abre un `BottomSheet` con la lista completa de los 9 pasos.
- `accessibilityRole="tablist"`, cada paso `tab`, paso actual `selected=true`. Hint: "Paso 3 de 9: fecha decidida".

---

### 3.3 `ProgressBar` (genérica)

```ts
interface ProgressBarProps {
  value: number;                    // 0..1
  label?: string;                   // ej. "3 de 5 han votado"
  tone?: 'primary' | 'success' | 'warning';
  size?: 'sm' | 'md';
  testID?: string;
}
```

---

## 4. Specialized

### 4.1 `AvailabilityHeatmap`

Grilla de filas (miembros) × columnas (fechas candidatas). Cada celda es tappeable con 3 estados: yes / if-need-be / no.

```ts
type AvailabilityValue = 'yes' | 'maybe' | 'no';

interface AvailabilityHeatmapProps {
  dates: string[];                  // ISO YYYY-MM-DD, mínimo 2
  members: { id: string; name: string }[];
  votes: Record<string, Record<string, AvailabilityValue>>;  // memberId → dateIso → value
  currentUserId: string;
  onChangeCell: (date: string, value: AvailabilityValue) => void;
  highlightBest?: boolean;          // resalta columna con más "yes" y empates
  testID?: string;
}
```

**Celdas:**
- 44x44dp touch target mínimo.
- Color: green success / warning / danger surface.
- `accessibilityRole="adjustable"`, `accessibilityValue` con `text="Sí, 3 de 5"`, `accessibilityActions` increment/decrement/cycle.
- Cabecera de columna: día y número ("Vie 12"). Cabecera de fila: avatar + nombre truncado.
- Sticky first column (nombre de miembro) al hacer scroll horizontal.
- Pinch-to-zoom no soportado; las columnas se ajustan al ancho disponible con scroll horizontal.

---

### 4.2 `ProposalCard`

Card de propuesta de destino en el destination poll.

```ts
interface ProposalCardProps {
  proposal: {
    id: string;
    title: string;
    coverUrl?: string;
    summary?: string;
    proposedBy: { id: string; name: string };
    votesCount: number;
    userHasVoted: boolean;
    estimatedCost?: Money;
    topPros?: string[];              // máximo 3
    topCons?: string[];
  };
  rank?: number;                    // posición si estamos en results
  onPress: () => void;              // abrir detalle
  onVote: () => void;
  onUnvote: () => void;
  testID?: string;
}
```

---

### 4.3 `VoteBar`

Barra horizontal con conteo segmentado por tipo de voto (yes / maybe / no).

```ts
interface VoteBarProps {
  yes: number;
  maybe: number;
  no: number;
  total?: number;                   // si se omite, suma yes+maybe+no
  showLabels?: boolean;             // default true
  testID?: string;
}
```

**Visual:** segmentos proporcionales, color success / warning / danger. En mobile, los segmentos menores al 8% se colapsan y se muestran como tick al final. a11y: `accessibilityValue={{ text: "3 sí, 2 tal vez, 1 no de 6" }}`.

---

### 4.4 `ExpenseRow`

```ts
interface ExpenseRowProps {
  expense: {
    id: string;
    title: string;
    amount: Money;
    paidBy: { id: string; name: string };
    date: string;                   // ISO
    category?: ExpenseCategory;
    splitMode: 'equal' | 'shares' | 'manual' | 'exclude';
  };
  currentUserOwesShare?: Money;     // si >0, badge "Te toca"
  onPress: () => void;
  testID?: string;
}
```

---

### 4.5 `BalanceBar`

```ts
interface BalanceBarProps {
  net: Money;                       // positivo = te deben, negativo = debes
  showLabel?: boolean;              // default true
  size?: 'sm' | 'md';
  testID?: string;
}
```

**Visual:** barra horizontal con centro en 0. Positivo a la derecha (success), negativo a la izquierda (danger). Texto en `text-mono` siempre.

---

### 4.6 `SettlementCard`

```ts
interface SettlementCardProps {
  settlement: {
    id: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    amount: Money;
  };
  onMarkPaid: () => void;           // acción primaria
  onRemind?: () => void;            // acción secundaria
  testID?: string;
}
```

---

### 4.7 `MemberRow`

```ts
interface MemberRowProps {
  member: {
    id: string;
    name: string;
    source?: { uri: string } | null;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'pending' | 'removed';
    netBalance?: Money;
  };
  onPress?: () => void;             // abre perfil o detalle
  trailing?: ReactNode;             // menú contextual o switch
  testID?: string;
}
```

---

### 4.8 `EmptyState`

```ts
interface EmptyStateProps {
  illustration?: ReactNode;         // SVG o imagen, no obligatorio
  title: string;                    // ej. "Aún no hay fechas propuestas"
  description?: string;             // 1-2 líneas, tuteo
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  testID?: string;
}
```

---

### 4.9 `ErrorState`

```ts
interface ErrorStateProps {
  title?: string;                   // default "Algo ha ido mal"
  description?: string;             // específico del error si se conoce
  onRetry?: () => void;
  onReport?: () => void;            // abre mail/Sentry
  illustration?: ReactNode;
  testID?: string;
}
```

---

### 4.10 `LoadingState`

Wrapper que centra `Spinner` o `Skeleton`s. Casi nunca se usa solo; los screens lo componen inline.

```ts
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton-list' | 'skeleton-card';
  count?: number;                   // para skeleton-*
  label?: string;                   // a11y
  testID?: string;
}
```

---

### 4.11 `FormField`

Compone `Label` + `Input`/`Textarea`/`Select` + `HelperText` + `ErrorText`. Es la unidad básica de formulario.

```ts
interface FormFieldProps {
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  children: ReactNode;              // Input, Textarea, Select, etc.
  htmlFor?: string;                 // id del input para a11y
}
```

---

### 4.12 `Money`

Renderiza una cantidad formateada con la moneda del viaje/usuario.

```ts
interface MoneyProps {
  amount: number;                   // en céntimos
  currency: string;                 // 'EUR' default
  showSign?: boolean;               // +, -
  tone?: TextTone;                  // se combina con showSign
  size?: 'sm' | 'md' | 'lg' | 'display';
  testID?: string;
}
```

**Reglas:** usa `Intl.NumberFormat` con `locale='es-ES'`, `style='currency'`. Cifras siempre con 2 decimales. a11y: lee "45 euros con 00 céntimos" si la pantalla del usuario tiene `accessibilityScreenReader=true`.

---

### 4.13 `DateRangeBadge`

```ts
interface DateRangeBadgeProps {
  start: string;                    // ISO
  end: string;                      // ISO
  variant?: 'compact' | 'expanded'; // compact = "12-15 jun", expanded = "12-15 jun · 3 noches"
  testID?: string;
}
```

---

### 4.14 `CountdownChip`

```ts
interface CountdownChipProps {
  deadline: string;                 // ISO
  tone?: 'primary' | 'warning' | 'danger';
  testID?: string;
}
```

Muestra "Cierra en 2d 5h" o "Caducado" si pasó. Refresh cada minuto. Tap → acción contextual (ej. extender deadline, no acción si ya caducó).

---

### 4.15 `CategoryIcon`

```ts
type ExpenseCategory =
  | 'lodging' | 'food' | 'transport' | 'activities' | 'shopping' | 'other';

interface CategoryIconProps {
  category: ExpenseCategory;
  size?: number;                    // default 20
  tone?: 'primary' | 'neutral';
  testID?: string;
}
```

---

## 5. Patrones compuestos (no son componentes, son recetas)

Estos no son exportables, son acuerdos de composición documentados para que el code review los valide:

- **Header de pantalla:** `<Screen>` → `<AppHeader title=…>` → contenido.
- **Pull-to-refresh:** combinar `Screen refreshControl` con estado de TanStack Query.
- **Lista con empty/loading:** `<Screen>` → `{isLoading ? <SkeletonList count=4 /> : data.length === 0 ? <EmptyState … /> : <FlatList … />}`. Nunca mostrar el `EmptyState` si la query está loading.
- **Wizards (date poll, crear gasto):** `<Screen>` → header con `X` de cerrar + step indicator `2/4` → contenido → footer fijo con `Button` primario + `Button` secundario (Back) en la zona safe-area.
- **Money flow:** cualquier número monetario pasa por `<Money>`. Prohibido `Text` con `€{n}` en screens.

---

## 6. Versionado

Cualquier cambio de prop (renombrar, hacer opcional→requerido, cambiar tipo) requiere:
1. Entrada en `CHANGELOG.md` del design system.
2. Migración de todos los call sites en el mismo PR.
3. Si el cambio rompe, bump mayor de la versión interna del design system; los screens importan `from '@/components'` (no versión).
