# Flujos de pantalla — Plantir

> **Estado:** v1 (Fase 1).
> **Convención:** cada pantalla documenta propósito, componentes del inventario que usa, los **4 estados** (loading/empty/error/success) o se justifica por qué alguno no aplica, microcopy exacta y transiciones. Diagramas ASCII cuando aportan.
> **Microcopy:** tuteo, directo, cálido, sin marketing. Sin "vive la experiencia", sin "tu próxima aventura", sin "no te pierdas".
> **Mobile-first real:** todo lo descrito cabe en 320-430dp de ancho, scroll vertical, zonas de pulgar consideradas.

## Índice de flujos
1. [Auth](#1-auth)
2. [Trips home](#2-trips-home)
3. [Crear viaje](#3-crear-viaje)
4. [Trip dashboard](#4-trip-dashboard)
5. [Invitar miembros](#5-invitar-miembros)
6. [Date poll](#6-date-poll)
7. [Destination poll](#7-destination-poll)
8. [Expenses](#8-expenses)
9. [Profile](#9-profile)
10. [Notifications](#10-notifications)

---

## 1. Auth

### 1.0 Diagrama general

```
[Welcome]
   │ tap "Entrar"
   ▼
[Login] ─── tap "¿No tienes cuenta?" ──▶ [Signup]
   │                                        │
   │ submit OK                              │ submit OK
   ▼                                        ▼
[Supabase callback / verificación] ◀───────┘
   │
   ├── email verificado ──▶ [Trips home]
   └── email NO verificado ──▶ [Verifica tu correo] ── reenviar ─▶ (mismo)
```

### 1.1 Welcome

- **Propósito:** aterrizar al usuario, ofrecer las 2 acciones de entrada (login o signup), mostrar valor sin enrollarse.
- **Componentes:** `Screen`, `Heading`, `Text`, `Button`, `Divider` (con label "o"), `Image` (logo + ilustración).
- **Estados:**
  - **loading:** no aplica (la pantalla se renderiza desde assets locales).
  - **empty:** estado por defecto, siempre success.
  - **error:** no aplica aquí; errores se manejan en Login/Signup.
  - **success:** estado por defecto.
- **Microcopy:**
  - Título: "**Planifica viajes con tu grupo, sin caos.**"
  - Subtítulo: "Crea el grupo, elegid fecha y sitio, y divide los gastos. Sin 15 chats de WhatsApp."
  - Botón primary: "Entrar"
  - Botón secondary: "Crear cuenta"
  - Footer legal: "Al continuar aceptas los Términos y la Política de privacidad."
- **Transiciones:**
  - "Entrar" → push `Login`.
  - "Crear cuenta" → push `Signup`.
  - Tap en logo (futuro v2) → home si ya hay sesión.

### 1.2 Login

- **Propósito:** autenticación con email + contraseña.
- **Componentes:** `Screen`, `AppHeader` (con back), `FormField` × 2 (email, password), `Button` (primary), `Button` (ghost — "¿Olvidaste la contraseña?"), `Toast` (errores).
- **Estados:**
  - **loading:** deshabilitar inputs + botón + mostrar `Spinner` dentro del botón.
  - **empty:** no aplica; los campos son requeridos.
  - **error:**
    - Credenciales inválidas → toast `danger` "Email o contraseña incorrectos." (no decir cuál falló por seguridad).
    - Sin red → `ErrorState` inline con "Sin conexión. Comprueba tu red y vuelve a intentarlo." + botón "Reintentar".
  - **success:** submit OK → reemplazar pantalla por `callback` o push directo a Trips home.
- **Microcopy:**
  - Título: "**Hola de nuevo**"
  - Email: label "Email", placeholder "tu@email.com", keyboardType email, autoComplete email.
  - Password: label "Contraseña", placeholder "Mínimo 8 caracteres", secureTextEntry, rightAddon "Ver/Ocultar".
  - Link: "¿Olvidaste la contraseña?"
  - Botón primary: "Entrar"
  - Link inferior: "¿No tienes cuenta? Crea una"
- **Transiciones:**
  - Submit OK → push `TripsHome`, eliminar stack de auth (`router.dismissAll`).
  - "¿Olvidaste la contraseña?" → push `ForgotPassword`.
  - Link signup → replace a `Signup`.

### 1.3 Signup

- **Propósito:** alta con email + contraseña + nombre.
- **Componentes:** `Screen`, `AppHeader` (back), `FormField` × 3 (nombre, email, password), `Button` primary, `Toast`.
- **Estados:**
  - **loading:** igual que login.
  - **empty:** no aplica.
  - **error:**
    - Email ya en uso → toast `danger` "Ya hay una cuenta con ese email. ¿Quieres entrar?"
    - Password <8 → `errorText` en `FormField` "Mínimo 8 caracteres."
    - Sin red → `ErrorState` inline.
  - **success:** mostrar pantalla intermedia `Verifica tu correo` (siguiente).
- **Microcopy:**
  - Título: "**Crea tu cuenta**"
  - Subtítulo: "Tardarás 30 segundos."
  - Nombre: label "Tu nombre", placeholder "¿Cómo te llamamos?", autoCapitalize words.
  - Email/contraseña como en login.
  - Botón: "Crear cuenta"
  - Link: "¿Ya tienes cuenta? Entra"
- **Transiciones:**
  - Submit OK → push `Verifica tu correo` (sin back).
  - Tap link → replace a `Login`.

### 1.4 Verifica tu correo (callback intermedio)

- **Propósito:** pantalla de espera mientras el usuario abre el email y hace tap en el enlace de verificación. No es un loader bloqueante: el usuario puede cerrar la app.
- **Componentes:** `Screen`, `Heading`, `Text`, `Button` (secondary "Reenviar email"), `Button` (ghost "Cambiar email").
- **Estados:**
  - **loading:** durante el reenvío.
  - **empty:** estado inicial, success.
  - **error:** reenvío falla → toast "No hemos podido reenviar. Intenta en un minuto."
  - **success:** success por defecto. Si vuelve a la app con sesión ya verificada (deep link), reemplazar por `TripsHome`.
- **Microcopy:**
  - Título: "**Revisa tu correo**"
  - Subtítulo: "Te hemos enviado un enlace a {email}. Toca en el enlace para entrar." (sustituir {email}).
  - Botón secondary: "Reenviar email"
  - Botón ghost: "Cambiar email"
- **Transiciones:**
  - Deep link `plantir://auth/callback?verified=true` (gestionado por Expo Router) → replace a `TripsHome`.
  - "Reenviar email" → recarga estado con cooldown 60s (botón disabled con countdown).
  - "Cambiar email" → replace a `Signup`.

---

## 2. Trips home

### 2.0 Diagrama

```
[Trips home]
   │ FAB "+"
   ▼
[Crear viaje] ── OK ──▶ [Trip dashboard] (nuevo)
   │ tap tarjeta
   ▼
[Trip dashboard]
   │
   │ tab "Notifs"  ──▶  [Notifications]
   │ tap avatar    ──▶  [Profile]
```

### 2.1 Trips home (lista de viajes)

- **Propósito:** punto de entrada tras login. Lista los viajes del usuario (en distintos estados) con CTA prominente para crear.
- **Componentes:** `Screen` (scroll), `AppHeader` (logo + avatar), `Tabs` (Todos / Activos / Pasados), `Card` (viaje), `AvatarStack`, `Badge` (estado del viaje), `EmptyState`, `ErrorState`, `LoadingState` (skeleton-card × 3), `FAB` (crear viaje).
- **Estados:**
  - **loading:** `LoadingState variant="skeleton-card" count=3`.
  - **empty:** el usuario no tiene viajes → `EmptyState` con ilustración, "Aún no has creado ningún viaje", "Empieza por aquí: crea un viaje, invita a tu grupo y elegid fecha." + botón primary "Crear mi primer viaje" + secondary "Explorar ideas" (futuro v2).
  - **error:** red/caída → `ErrorState` con "No hemos podido cargar tus viajes." + botón "Reintentar".
  - **success:** lista de `Card`s ordenada por `updatedAt desc`. Cada card muestra nombre, `DateRangeBadge` (si tiene fechas decididas), `AvatarStack` de miembros, `Badge` con estado del viaje.
- **Microcopy:**
  - Título header: oculto (logo).
  - Tabs: "Todos", "Activos", "Pasados".
  - Tap card → push Trip dashboard.
  - FAB: aria-label "Crear viaje nuevo".
- **Transiciones:**
  - Tap card → push `Trip dashboard`.
  - Tap FAB → push `Crear viaje`.
  - Pull-to-refresh → revalida query.
  - Tap avatar → push `Profile`.

### 2.2 Wireframe ASCII (Trips home)

```
┌─────────────────────────────┐
│ ☰ (logo)            (avatar)│ ← AppHeader
├─────────────────────────────┤
│ [Todos] [Activos] [Pasados] │ ← Tabs
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Cádiz · 12-15 jun       │ │ ← Card
│ │ (●●●●) 4 de 6   [Planning]│ │
│ │                         │ │
│ │ 3 gastos · 245,80 €     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Pirineos · 3-5 feb      │ │
│ │ (●●●) 3 de 5   [Votando] │ │
│ └─────────────────────────┘ │
│                             │
│         (scroll)            │
│                             │
│                       (+)   │ ← FAB
└─────────────────────────────┘
```

---

## 3. Crear viaje

### 3.0 Diagrama

```
[Crear viaje]  ── OK ──▶  [Trip dashboard] (estado group_created)
```

### 3.1 Crear viaje

- **Propósito:** wizard de 2 pasos para crear un viaje. Mínimo viable: nombre + (opcional) descripción. Invitar se hace desde el dashboard.
- **Componentes:** `Screen`, `AppHeader` (X de cerrar, descartar → confirm), `Stepper` (1/2, 2/2), `FormField` (nombre), `Textarea` (descripción), `Button` (primary "Crear"), `Button` (ghost "Atrás"), `Dialog` (descartar cambios).
- **Estados:**
  - **loading:** durante submit.
  - **empty:** nombre vacío al pulsar Crear → `errorText` "Ponle un nombre al viaje." (no bloquea con toast).
  - **error:** red/caída → `ErrorState` inline con "No hemos podido crear el viaje. Tus datos están aquí, prueba otra vez." + "Reintentar".
  - **success:** crear OK → replace a `Trip dashboard` con el nuevo viaje y estado `group_created`.
- **Microcopy:**
  - Título paso 1: "**Dale un nombre al viaje**"
  - Helper nombre: "Lo verá todo el grupo. Puedes cambiarlo luego."
  - Placeholder nombre: "Ej. Escapada a Cádiz"
  - Título paso 2: "**Cuéntanos un poco más (opcional)**"
  - Helper descripción: "Una línea sobre el plan, el ambiente, lo que os apetece…"
  - Placeholder descripción: "Ej. 3 días de playa, casa rural, sin coche."
  - Botón Crear: "Crear viaje"
- **Transiciones:**
  - X cerrar con datos → `Dialog` "¿Salir? El viaje no se guardará." → acciones "Seguir editando" / "Salir".
  - "Atrás" paso 2 → paso 1.
  - "Crear" OK → replace a `Trip dashboard` (estado `group_created`).

---

## 4. Trip dashboard

### 4.0 Propósito

La pantalla más crítica. Ancla del viaje. Muestra: nombre, miembros, estado actual (con stepper de 9 pasos), y la acción prioritaria del momento.

### 4.1 Trip dashboard

- **Componentes:** `Screen` (scroll), `AppHeader` (back a Trips home, kebab → sheet con editar/eliminar), `ProgressStepper` (sticky), `Card` "Próximo paso" (acción contextual), `AvatarStack` (miembros), `Button` primary contextual, `Tabs` (Resumen / Fechas / Sitio / Gastos), contenido por tab.
- **Estados (comunes a los 4 tabs):**
  - **loading:** `LoadingState skeleton-card count=2` mientras carga `trip + members + state`.
  - **empty:** depende del tab (ver 4.2-4.5).
  - **error:** `ErrorState` con reintentar; o toast si es una mutación.
  - **success:** render del contenido del tab + "Próximo paso" siempre visible en resumen.
- **Microcopy (resumen):**
  - "Próximo paso": "{acción}", ej. "**Invita a tu grupo**" / "**Votad las fechas**" / "**Elegid el destino**" / "**Apuntad los primeros gastos**".
  - Helper: 1 línea que explica el por qué.
  - Miembros: header "Gente en el viaje" + avatar stack + texto "X de Y han confirmado" o similar.
- **Transiciones:**
  - Tap "Próximo paso" → push a la pantalla del flujo correspondiente.
  - Tap stepper paso completado → push a esa pantalla en modo read-only.
  - Tap tab → scroll al top, swap contenido.
  - Kebab → bottom sheet con "Editar nombre", "Copiar link de invitación", "Salir del viaje" (con Dialog de confirmación).

### 4.2 Tab Resumen

- **Contenido:** Card "Próximo paso" + card "Miembros" + card "Estado del viaje" (resumen del stepper expandido) + card "Resumen económico" (si hay gastos).
- **Estados:**
  - **empty:** viaje recién creado, sin miembros ni gastos → "Próximo paso" prominent; resto de cards colapsadas con "Sin miembros todavía" / "Sin gastos".
  - **error:** idem dashboard.
  - **success:** todo renderizado.

### 4.3 Tab Fechas

- **Contenido:** estado del date poll (no iniciado, en curso, cerrado) + CTA. Si está en curso: preview de los 3 mejores días; si cerrado: `DateRangeBadge` grande.
- **Estados:**
  - **empty:** `EmptyState` "Aún no habéis propuesto fechas" + "Proponer fechas" → wizard de date poll setup.
  - **error:** al cargar votos.
  - **success:** lista de fechas con conteo y `VoteBar`.

### 4.4 Tab Sitio

- **Contenido:** estado del destination poll + preview.
- **Estados:**
  - **empty:** `EmptyState` "Sin destino todavía" + "Proponer destinos" → wizard.
  - **error:** al cargar propuestas/votos.
  - **success:** `ProposalCard`s ordenadas por votos, top 3 destacadas.

### 4.5 Tab Gastos

- **Contenido:** resumen rápido (total, mi balance) + lista de gastos.
- **Estados:**
  - **empty:** `EmptyState` "Sin gastos todavía" + "Añadir gasto".
  - **error:** al cargar.
  - **success:** `ExpenseRow`s, FAB "Añadir gasto".

### 4.6 Wireframe ASCII — Trip dashboard (estado `voting_dates`)

```
┌──────────────────────────────────────┐
│ ← Cádiz            ⋯                 │ ← AppHeader (back, kebab)
├──────────────────────────────────────┤
│ ●─●─●─○─○─○─○─○─○ Votando fechas     │ ← ProgressStepper (sticky)
│                                 3/9  │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ PRÓXIMO PASO                   │  │ ← Card "Próximo paso"
│  │                                │  │
│  │ Votad las fechas 📅            │  │
│  │                                │  │
│  │ 3 de 5 han votado.             │  │
│  │ Quedan 2 días para cerrar.     │  │
│  │                                │  │
│  │ [ Votar mis fechas ]           │  │ ← Button primary
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ GENTE EN EL VIAJE   (●●●●●) 5  │  │ ← Miembros
│  │ Pablo, María, Javi, Lu, Cris   │  │
│  │ [ Invitar más ]                │  │ ← Button secondary
│  └────────────────────────────────┘  │
│                                      │
│ [ Resumen | Fechas | Sitio | Gastos ]│ ← Tabs (Resumen activo)
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Top fechas                     │  │
│  │ 12-14 jun   ████████  3 sí     │  │
│  │ 19-21 jun   ██████    2 sí     │  │
│  │ 26-28 jun   ████      1 sí     │  │
│  └────────────────────────────────┘  │
│                                      │
│ (scroll)                             │
└──────────────────────────────────────┘
```

### 4.7 Wireframe ASCII — ProgressStepper expandido (compact=false)

```
1 ●─── 2 ●─── 3 ◉─── 4 ○─── 5 ○─── 6 ○─── 7 ○─── 8 ○─── 9 ○
  ✓       ✓     »                   
Grupo  Fechas  Decidiendo  Votando  Decidido  ...     Cerrado
        fechas   fecha     sitio    sitio
```

Leyenda: ● completado, ◉ actual, ○ futuro. Conector primario entre puntos. Step actual con label en negrita y dot pulsante.

---

## 5. Invitar miembros

### 5.0 Diagrama

```
[Trip dashboard / tab Resumen] ── tap "Invitar" ──▶ [Invitar]
   │
   └── share link ──▶ [Share sheet del sistema]
```

### 5.1 Invitar miembros

- **Propósito:** añadir gente al viaje. El método principal es **link de invitación** (deep link). Email/SMS/WhatsApp son canales de transporte, no se almacenan.
- **Componentes:** `Screen`, `AppHeader` (back), `Heading`, `Text`, `Card` con link copiable + QR (futuro v1), `Button` primary "Compartir link", `Button` secondary "Copiar link", `List` de miembros pendientes con `MemberRow`, `Dialog` (eliminar pendiente).
- **Estados:**
  - **loading:** mientras carga lista de miembros.
  - **empty:** no hay miembros invitados aún → la pantalla se centra en el CTA "Compartir link".
  - **error:** fallo al generar link → `ErrorState` con "No hemos podido generar el link. Reintenta." + botón reintentar.
  - **success:** link generado + lista de miembros. Si ya hay miembros, el link se muestra más compacto y la lista pesa más.
- **Microcopy:**
  - Título: "**Invita a tu grupo**"
  - Subtítulo: "Comparte este link. Al tocarlo, se unen al viaje sin registrarse antes."
  - Link preview: `plantir://join/{tripId}/{token}` (texto monoespaciado).
  - Botón primary: "Compartir link"
  - Botón secondary: "Copiar link"
  - Miembros: header "Ya dentro (X)" / "Pendientes (Y)" / "Acción necesaria (Z)" con `MemberRow` por cada uno.
  - Pendiente · acción: subheader "Han abierto el link pero no han entrado" con CTA "Reenviar".
  - Eliminar pendiente → `Dialog` "¿Eliminar la invitación de {nombre}? Si aún no se había unido, ya no podrá." → "Cancelar" / "Eliminar".
- **Transiciones:**
  - "Compartir link" → abre el sheet nativo de iOS/Android con texto prearmado ("¡Únete al viaje {nombre} en Plantir! {link}").
  - "Copiar link" → toast success "Link copiado".
  - Back → Trip dashboard.

---

## 6. Date poll

### 6.0 Diagrama

```
[Trip dashboard] ── "Votad las fechas" ──▶ [Date poll setup] ── "Crear" ──▶ [Date poll vote]
                                                                                  │
                                                                       "Ver resultados" ──▶ [Date poll results]
                                                                                  │
                                                                       "Cerrar votación" (admin) ──▶ [Date decided]
```

### 6.1 Date poll setup (crear)

- **Propósito:** definir las fechas candidatas (no más de 12 para que quepan en la heatmap). Wizard de 2 pasos: rango + días específicos.
- **Componentes:** `Screen`, `AppHeader` (X), `Stepper` (1/2, 2/2), `Card` selector de rango (`DateRangePicker` componente de sistema), `Calendar` (días específicos tappables), `FormField` nota opcional, `Button` primary "Crear votación", `CountdownChip` para el deadline (default 7 días, configurable), `Select` (deadline).
- **Estados:**
  - **loading:** submit.
  - **empty:** sin fechas marcadas → botón Crear disabled con helper "Marca al menos 2 fechas".
  - **error:** red → `ErrorState` con reintentar; rango inválido → `errorText` en `FormField`.
  - **success:** push a `Date poll vote`.
- **Microcopy:**
  - Título paso 1: "**Elige un rango**" (subtítulo: "Te mostraremos fines de semana y puentes del rango.")
  - Título paso 2: "**Marca las fechas que os pueden ir**"
  - Helper: "Toca para marcar. Mantén para ver el día completo."
  - Deadline: label "¿Cuándo cerramos la votación?" + options "En 3 días" / "En 7 días" / "En 14 días" / "Personalizado".
  - Botón: "Crear votación".
- **Transiciones:**
  - X cerrar con cambios → `Dialog` descartar.
  - "Crear" OK → replace a `Date poll vote` con toast "Votación creada. Tus compañeros tienen N días para votar."

### 6.2 Date poll vote

- **Propósito:** que el usuario marque sus disponibilidades. La heatmap es la pieza central.
- **Componentes:** `Screen`, `AppHeader` (back → dashboard, kebab → "Ver resultados" / admin: "Cerrar votación"), `Heading` con título del poll + `CountdownChip`, `ProgressBar` ("3 de 5 han votado"), `AvailabilityHeatmap`, `Button` primary "Guardar mis votos" (sticky footer), `Toast` (guardado).
- **Estados:**
  - **loading:** carga inicial de heatmap → `Skeleton` con forma de heatmap.
  - **empty:** no aplica; siempre hay candidatos.
  - **error:** al guardar → toast "No hemos podido guardar. Toca Reintentar." + botón "Reintentar" en footer; votos previos preservados.
  - **success:** heatmap renderizada con votos actuales del usuario. Botón "Guardar" deshabilitado si no hay cambios.
- **Microcopy:**
  - Título: "**¿Cuándo podéis?**"
  - Subtítulo: "Toca cada día: verde sí, ámbar tal vez, rojo no."
  - Leyenda inline: 3 puntos con colores + "Sí / Tal vez / No".
  - Botón: "Guardar mis votos".
  - Toast éxito: "Tus votos están guardados."
- **Transiciones:**
  - "Guardar" → toast + deshabilitar botón hasta nuevo cambio.
  - "Ver resultados" → push `Date poll results`.
  - "Cerrar votación" (admin) → confirm Dialog → si OK, push `Date decided` (modal sobre el dashboard con la fecha ganadora).

### 6.3 Date poll results

- **Propósito:** ver el ranking de fechas y confirmar (admin) o esperar la decisión.
- **Componentes:** `Screen`, `AppHeader` (back a vote), `Heading`, `ProgressBar` global, `Card` × N con fecha + `VoteBar` (yes/maybe/no) + "Mejor para X personas", `Button` primary (admin) "Cerrar con esta fecha" (en la mejor), `Button` secondary "Cerrar y elegir manualmente" (admin), `Badge` "Empate" si aplica.
- **Estados:**
  - **loading:** skeleton list.
  - **empty:** no aplica.
  - **error:** `ErrorState` con reintentar.
  - **success:** lista ordenada por yes desc, luego maybe desc. Top 3 destacadas. Empate visible.
- **Microcopy:**
  - Título: "**Resultados de las fechas**"
  - Helper: "3 de 5 han votado. La mejor opción es **12-14 jun** (3 sí, 1 tal vez, 1 no)."
  - Si admin: "Elige la fecha. Tus compañeros serán notificados."
  - Si no admin: "El organizador cerrará la votación cuando todos hayan votado."
  - Botón admin: "Cerrar con esta fecha".
  - Empate: badge "Empate" + helper "Hay 2 fechas con el mismo apoyo. Elige una o espera."
- **Transiciones:**
  - "Cerrar con esta fecha" → confirm Dialog "Cerrar el 12-14 jun. ¿Seguro?" → OK → toast "Fecha decidida. Avisaremos al grupo." → push dashboard (estado `date_decided`).
  - "Cerrar y elegir manualmente" → date picker → mismo flow.

---

## 7. Destination poll

### 7.0 Diagrama

```
[Trip dashboard] ── "Elegid el sitio" ──▶ [Destination poll setup] (opcional) ──▶ [Destination poll: propuestas]
                                                                                              │
                                                                              tap "+" ──▶ [Crear propuesta]
                                                                                              │
                                                                                  tap card ──▶ [Detalle propuesta]
                                                                                              │
                                                                              "Ver resultados" ──▶ [Results]
                                                                                              │
                                                                              admin "Cerrar" ──▶ [Place decided]
```

### 7.1 Destination poll setup (opcional)

Sólo se muestra si el admin quiere configurar reglas (presupuesto tope, número de propuestas permitidas, deadline). Por defecto, el poll se abre sin setup.

- **Componentes:** `Screen`, `AppHeader` (X), `FormField` (presupuesto tope, opcional), `Select` (¿cuántas propuestas puede hacer cada uno? 1 / 2 / 3), `Select` (deadline), `Button` "Crear votación".
- **Estados:** loading / empty (sin campos requeridos) / error / success (push a Propuestas).
- **Microcopy:** "**Configura la votación**" / "Sin presupuesto máximo se vota a ojo." / Botón "Crear votación".

### 7.2 Destination poll: propuestas (lista)

- **Propósito:** ver y votar las propuestas de destino. Cualquier miembro puede añadir.
- **Componentes:** `Screen`, `AppHeader` (back), `Heading` (título del poll) + `CountdownChip`, `Tabs` (Propuestas / Resultados), `ProposalCard` × N, `Button` primary "Proponer destino" (sticky footer en vacío) o FAB, `EmptyState`.
- **Estados:**
  - **loading:** skeleton-card × 3.
  - **empty:** `EmptyState` "Nadie ha propuesto un destino todavía" + "Sé el primero: propone un sitio" + botón "Proponer destino".
  - **error:** `ErrorState` reintentar.
  - **success:** lista de `ProposalCard`s. Las ya votadas por el usuario muestran badge "✓ Tu voto" y el icono de voto activo.
- **Microcopy:**
  - Título: "**¿A dónde vamos?**"
  - Subtítulo: "Vota los sitios que te apetecen. Puedes cambiar tu voto."
  - Card propuesta: nombre + "Propuesto por {nombre}" + `VoteBar` + botón contextual "Votar" / "Quitar mi voto".
  - Botón "Proponer destino".
- **Transiciones:**
  - Tap card → push `Detalle propuesta`.
  - Tap "Votar" / "Quitar voto" → mutación + toast.
  - "Proponer destino" → push `Crear propuesta`.
  - Tab Resultados → `Results`.

### 7.3 Crear propuesta

- **Propósito:** añadir una propuesta de destino con información útil para decidir.
- **Componentes:** `Screen`, `AppHeader` (X), `FormField` (título), `Textarea` (descripción), `FormField` (URL imagen de referencia, opcional), `FormField` (costo estimado, opcional), `Chip` (tags, ej. "playa", "montaña", "tren"), `Button` "Proponer".
- **Estados:** loading / empty (sin título) / error / success (replace a `Propuestas` con toast "Propuesta añadida").
- **Microcopy:**
  - Título: "**Proponer un destino**"
  - Helper título: "Nombre del sitio, casa, pueblo…"
  - Helper descripción: "¿Qué tiene de especial? ¿Por qué te apetece?"
  - Helper URL: "Pega un link a una foto o a Airbnb."
  - Botón: "Proponer destino".
- **Transiciones:**
  - Submit OK → replace a Propuestas, toast "Propuesta añadida. Tus compañeros pueden votar."

### 7.4 Detalle propuesta

- **Propósito:** ver toda la info de una propuesta y votar/quitar voto.
- **Componentes:** `Screen`, `AppHeader` (back), `Image` (cover), `Heading` (título), `Text` (descripción), `AvatarStack` (quién ha votado), `VoteBar` detallada, `Button` primary contextual, `Card` "Pros" (futuro) / "Contras" (futuro), `Card` "Costo estimado" si existe.
- **Estados:** loading (skeleton) / empty (no aplica) / error (reintentar) / success.
- **Microcopy:**
  - Header: "Propuesto por {nombre} · hace {tiempo}".
  - Botón contextual: "Votar este destino" / "Quitar mi voto" / "Ya lo has votado".
  - Sin votos aún: "Sé el primero en votar".
- **Transiciones:**
  - "Votar" / "Quitar voto" → mutación + cambio de botón.
  - Back → Propuestas.

### 7.5 Destination poll results

- **Propósito:** ranking final. Admin cierra.
- **Componentes:** `Screen`, `AppHeader` (back), `Heading`, `ProposalCard` con `rank`, `VoteBar` por cada uno, `Button` primary admin "Cerrar con este destino" (en el top), `Button` secondary admin "Cerrar y elegir manualmente", `Badge` "Empate".
- **Estados:** loading / empty (no aplica si hay propuestas) / error / success.
- **Microcopy:**
  - Título: "**Resultados del destino**"
  - Helper: "{N} de {M} han votado. Gana **{destino}** con {k} votos."
  - Botón admin: "Cerrar con este destino".
  - No admin: "El organizador cerrará la votación."
- **Transiciones:** admin "Cerrar" → confirm Dialog → OK → push dashboard (estado `place_decided`).

---

## 8. Expenses

### 8.0 Diagrama

```
[Trip dashboard / tab Gastos] ── "Añadir" ──▶ [Crear gasto] ── OK ──▶ [Lista de gastos] (toast)
                                       │ tap row ──▶ [Detalle gasto]
                                       │ tab "Balances" ──▶ [Balances]
                                       │ tab "Saldos" ──▶ [Settlements]
```

### 8.1 Lista de gastos

- **Propósito:** ver todos los gastos del viaje, con badges que indican a quién le toca pagar y cuánto.
- **Componentes:** `Screen` (sin header porque es un tab del dashboard, sólo un sub-header con título "Gastos" y total), `Tabs` sub-nivel (Gastos / Balances / Saldos), `ExpenseRow` × N agrupados por día o semana, `FAB` "Añadir gasto", `EmptyState`, `LoadingState` skeleton-row.
- **Estados:**
  - **loading:** skeleton-row × 6.
  - **empty:** `EmptyState` "Sin gastos todavía" + "Cuando pagues algo, apúntalo aquí" + botón primary "Añadir primer gasto".
  - **error:** `ErrorState` reintentar.
  - **success:** lista agrupada con total arriba ("Total: 245,80 €" + "Tu balance: -32,50 €").
- **Microcopy:**
  - Sub-header: "Total del viaje: 245,80 €" / "Te toca pagar: 32,50 €" (en `text-mono`).
  - `ExpenseRow`: "{Título} · {cantidad}" + "Pagó {nombre}" + si aplica "Te toca {X}".
- **Transiciones:**
  - Tap row → push `Detalle gasto`.
  - FAB → push `Crear gasto`.

### 8.2 Crear gasto

- **Propósito:** wizard de 3 pasos: qué + cuánto, quién paga, cómo se reparte.
- **Componentes:** `Screen`, `AppHeader` (X), `Stepper` (1/3, 2/3, 3/3), paso 1: `FormField` título, `FormField` cantidad, `Select` categoría, `Select` fecha, paso 2: `Radio` (quién pagó, por defecto el usuario actual), paso 3: tabs "Igual / Por partes / Manual / Excluir" con previews, `Button` "Guardar gasto".
- **Estados:** loading (submit) / empty (título o cantidad vacíos → `errorText`) / error (red → `ErrorState`, validación de suma manual → `errorText` "Las partes suman X, el gasto es Y") / success (replace a `Lista de gastos`, toast "Gasto guardado").
- **Microcopy:**
  - Paso 1 título: "**¿Qué habéis pagado?**"
  - Paso 1 helper: "Pon el total, sin prorratear."
  - Paso 2 título: "**¿Quién ha pagado?**"
  - Paso 3 título: "**¿Cómo lo repartimos?**"
  - Tabs reparto: "Igual" / "Por partes" / "Manual" / "Excluir".
  - Helper excluir: "Marca a quién NO le toca."
  - Helper partes: "Asigna a cada uno el peso que le corresponde. Nosotros calculamos el %."
  - Botón: "Guardar gasto".
- **Transiciones:**
  - X cerrar con datos → `Dialog` descartar.
  - Submit OK → replace a Lista + toast.

### 8.3 Detalle gasto

- **Propósito:** ver el desglose, editar, eliminar.
- **Componentes:** `Screen`, `AppHeader` (back, kebab con Editar/Eliminar), `Heading` (título), `Card` (cantidad, pagador, fecha, categoría), `Card` (reparto: lista de miembros con su parte en `text-mono`), `Card` (gastos relacionados, v1), `Dialog` eliminar.
- **Estados:** loading (skeleton) / empty (no aplica) / error (reintentar) / success.
- **Microcopy:**
  - Header: kebab → "Editar gasto" / "Eliminar gasto" / "Cancelar".
  - Eliminar → Dialog "¿Eliminar este gasto? Se recalcularán los balances." → "Cancelar" / "Eliminar".
  - Si no puedes editar: "Sólo {pagador} y los admins pueden editar este gasto."
- **Transiciones:**
  - Editar → push `Crear gasto` en modo edición (mismo screen, prop `expenseId`).
  - Eliminar → mutación + toast + pop.

### 8.4 Balances

- **Propósito:** ver cuánto debe/paga cada uno con el grupo. No genera acción.
- **Componentes:** `Screen` (sub-header "Balances"), `BalanceBar` por miembro, `Heading` "Resumen" con total, `Card` leyenda ("Verde = te deben. Rojo = debes."), `EmptyState`, `LoadingState` skeleton-row.
- **Estados:**
  - **loading:** skeleton.
  - **empty:** `EmptyState` "Sin gastos, sin balances" + "Apunta algún gasto para ver los balances.".
  - **error:** `ErrorState`.
  - **success:** lista de miembros ordenada por "más en contra" primero. Tu fila destacada con borde primary.
- **Microcopy:**
  - Tu fila: "**Tú**" + `BalanceBar` + cifra en `text-mono` con signo.
  - Si neto = 0: badge "Al día" en success.
- **Transiciones:**
  - Tap miembro → sheet con detalle de gastos compartidos con esa persona (futuro v1).
  - Tab "Saldos" → Settlements.

### 8.5 Settlements (cierre de cuentas)

- **Propósito:** lista mínima de pagos entre personas para que todos queden a 0. No transfiere dinero, sólo sugiere.
- **Componentes:** `Screen`, `Heading` "Saldos" + helper, `SettlementCard` × N, `EmptyState`, `Button` primary "Marcar como pagado" (en cada card).
- **Estados:**
  - **loading:** skeleton.
  - **empty:** `EmptyState` "No hay cuentas pendientes" + "Todo el grupo está al día. ¡A disfrutar!".
  - **error:** `ErrorState`.
  - **success:** lista ordenada por monto desc.
- **Microcopy:**
  - Helper: "Estos son los pagos que dejan a todos en cero. {k} transacciones en total."
  - `SettlementCard`: "{deudor} le paga a {acreedor} **{cantidad}**" + botones "Marcar pagado" / "Recordar" (futuro v1).
  - "Marcar pagado" → confirm Dialog "¿Confirmas que {deudor} ya pagó?" → OK → mutación + toast "Marcado como pagado. Balances actualizados." + re-fetch.
- **Transiciones:**
  - Back / tab → Lista.
  - "Marcar pagado" → actualiza in-place con animación (reordering).

---

## 9. Profile

### 9.1 Profile (propio)

- **Propósito:** ver y editar datos personales, preferencias, salir.
- **Componentes:** `Screen`, `AppHeader` (back), `Avatar` grande, `Heading` nombre, `Text` email, `Card` con `FormField`s (nombre, email — editar email requiere re-verificación), `Switch` × 2 (notificaciones push, modo oscuro), `Card` "Zona peligrosa" con `Button` "Cerrar sesión" (variant danger).
- **Estados:** loading (fetch user) / empty (no aplica) / error (reintentar) / success.
- **Microcopy:**
  - Título: "**Tu perfil**"
  - Helper nombre: "Lo verá el grupo en tus votos y gastos."
  - Helper email: "Si lo cambias, te enviaremos un enlace al nuevo correo."
  - Notificaciones: "Recibe avisos de votos, gastos y cierres."
  - Modo oscuro: "Sigue el ajuste del sistema" + 3 opciones (sistema / claro / oscuro) — v1, MVP es switch binario.
  - "Cerrar sesión" → Dialog "¿Cerrar sesión?" → "Cancelar" / "Cerrar".
- **Transiciones:**
  - Guardar nombre → toast "Cambios guardados".
  - Cambiar email → push pantalla intermedia de "Te hemos enviado un correo al nuevo email" (mismo patrón que signup).
  - "Cerrar sesión" OK → replace a `Welcome`.

### 9.2 Profile (de otro miembro, dentro de un viaje)

- **Propósito:** ver datos básicos de un compañero y su balance en ese viaje.
- **Componentes:** `Screen`, `AppHeader` (back), `Avatar`, `Heading` nombre, `Card` "En este viaje" con `BalanceBar` y cifra, `Text` "Se unió el {fecha}".
- **Estados:** loading / empty (no aplica) / error / success.
- **Microcopy:** "Aún no tiene gastos registrados en este viaje." (si `netBalance == 0` y no hay gastos).
- **Transiciones:** back → donde estuvieras (lista de miembros, dashboard, balances).

---

## 10. Notifications

### 10.1 Notifications (centro)

- **Propósito:** ver todas las notificaciones del usuario, agrupadas por viaje.
- **Componentes:** `Screen`, `AppHeader` (back, "Marcar todo leído" trailing), `Tabs` (Todas / No leídas), `Card` agrupada por viaje con lista de items, cada item: icono + texto + timestamp + dot no-leída, `EmptyState`, `LoadingState` skeleton.
- **Estados:**
  - **loading:** skeleton list.
  - **empty:** `EmptyState` "Sin notificaciones" + "Te avisaremos cuando alguien vote, pague o proponga algo." + ilustración suave.
  - **error:** `ErrorState` reintentar.
  - **success:** lista agrupada (orden: más reciente primero).
- **Microcopy por tipo de notificación:**
  - Voto en date poll: "**{nombre}** ha votado en las fechas de **{viaje}**."
  - Voto en destino: "**{nombre}** ha votado **{destino}** en **{viaje}**."
  - Fecha decidida: "¡Fecha decidida! **{viaje}** será del **{rango}**."
  - Destino decidido: "¡Destino decidido! **{viaje}** va a **{sitio}**."
  - Nuevo gasto: "**{nombre}** ha añadido un gasto de **{cantidad}** en **{viaje}**."
  - Settlement: "**{nombre}** ha marcado como pagado **{cantidad}** en **{viaje}**."
  - Invitación: "Te han invitado a **{viaje}**."
  - Acción necesaria: "En **{viaje}** te falta votar / pagar / confirmar."
- **Transiciones:**
  - Tap notif contextual → push al sitio (dashboard del viaje, lista de gastos, etc.).
  - "Marcar todo leído" → mutación + actualiza in-place.

### 10.2 Toast efímero (no es pantalla)

Notificaciones push (OS-level) se gestionan en background. Dentro de la app, los `Toast` dan feedback inmediato de acciones. El `ToastHost` vive en root layout. Tipos:
- success: verde, "✓ " + mensaje.
- info: azul.
- warning: ámbar.
- danger: rojo, persistente hasta acción o descarte (max 8s).
- Con acción: ej. "Gasto borrado. **Deshacer**" durante 5s.

---

## 11. Convenciones transversales

- **Pull-to-refresh** en Trips home, Trip dashboard tabs, Notifications, Date poll results, Destination poll results, Balances, Settlements, Lista de gastos.
- **Empty states** siempre con 1 acción primary clara. Nunca dejar al usuario sin salida.
- **Error states** siempre con "Reintentar" + opcional "Reportar".
- **Toasts** para feedback de mutaciones exitosas; nunca para errores bloqueantes (esos son `ErrorState` o `Dialog`).
- **Loading >300ms** debe mostrar `Skeleton` específico, no `Spinner` genérico.
- **Confirmaciones destructivas** (eliminar gasto, salir del viaje, cerrar votación, descartar formulario con datos) **siempre** vía `Dialog` con acción de peligro variant danger.
- **Haptics** en: votar, cerrar votación, marcar pagado, eliminar, crear viaje, abrir mapa de votación, tap en stepper.
- **Safe-area**: `Screen` aplica padding bottom a `space-12` (48dp) + safe-area del sistema.
