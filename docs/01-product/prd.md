# PRD — Plantir

> Producto: Plantir (app móvil iOS + Android).
> Fase: 1 — Producto.
> Estado: borrador v1.0 para validación de Fase 1.
> Audiencia: `ux-designer`, `mobile-architect`, `supabase-backend`, `qa-engineer`, `verifier`.
> Idioma: español. Decisiones en formato Decisión / Razón / Alternativas / Riesgo / Mitigación.
> Convenciones comunes: ver `docs/00-briefing.md`. Stack confirmado: React Native + Expo + TypeScript strict + Supabase.

---

## Índice

1. [Visión del producto](#1-visión-del-producto)
2. [Usuarios objetivo](#2-usuarios-objetivo)
3. [Modelo de dominio](#3-modelo-de-dominio)
4. [Features priorizadas — épicas y user stories](#4-features-priorizadas--épicas-y-user-stories)
5. [MVP / v1 / v2 — alcance explícito](#5-mvp--v1--v2--alcance-explícito)
6. [Criterios de aceptación por feature del MVP](#6-criterios-de-aceptación-por-feature-del-mvp)
7. [Riesgos del producto y mitigación](#7-riesgos-del-producto-y-mitigación)
8. [Definition of Done por feature](#8-definition-of-done-por-feature)
9. [Suposiciones explícitas](#9-suposiciones-explícitas)

---

## 1. Visión del producto

### 1.1 Problema

Coordinar un viaje en grupo (amigos, familia, compañeros) hoy es un *Frankenstein de herramientas*:

- **WhatsApp** para mensajes y debates asíncronos → ruido, mensajes perdidos, decisiones enterradas en scroll.
- **Doodle / Google Forms / mensaje en grupo** para votar fechas → 1 voto por persona fuera de la app, sin contexto, sin recordatorio.
- **Airbnb / Booking / mensaje informal** para decidir sitio → sin comparación estructurada, sin propuesta agregada.
- **Tricount / Splitwise / Excel** para gastos → otra app, otra cuenta, balances duplicados, fricción al pedir que paguen.
- **Google Docs / Notas** para tareas (aeropuerto, coche, comida) → todos editan, nadie es responsable.

Resultado: 2-4 horas de organización por viaje, discusiones, pagos que nadie cierra, sensación de que el grupo "no se entera".

### 1.2 Propuesta de valor

> **Plantir centraliza todo el ciclo de vida de un viaje en grupo en una sola app**: crear el grupo, encontrar la mejor fecha, elegir el sitio, organizar el viaje y dividir los gastos.

**Promesa medible (claim MVP):** un grupo de 5-10 amigos puede pasar de "no tenemos plan" a "tenemos fecha, sitio y todos saben cuánto deben" en menos de 30 minutos, dentro de la app, sin abrir WhatsApp, Doodle, Excel ni Tricount.

### 1.3 Decisiones de posicionamiento

- **Decisión:** Plantir es una app **móvil-first** (iOS + Android), sin web app en MVP.
  - **Razón:** el 80% del target (18-35) abre el móvil primero, el uso es fragmentado (votan una fecha desde el bus, registran un gasto al volver de cenar). Web agrega superficie sin uso claro en MVP.
  - **Alternativas:** (a) PWA responsive, (b) web-first desktop, (c) solo iOS, (d) solo Android.
  - **Riesgo:** algunos organizadores usan desktop para configurar; perderemos ese momento.
  - **Mitigación:** deep links desde WhatsApp/SMS funcionan igual en desktop (la webapp es v2).

- **Decisión:** **una sola app para todos los roles** del grupo (organizador y participante usan la misma app).
  - **Razón:** no hay asimetría real de uso; todos votan, todos pagan. Un "modo organizador" separado duplica UI.
  - **Alternativas:** dos apps (organizador + participante), roles con UI radicalmente distinta.
  - **Riesgo:** un participante novel se siente abrumado.
  - **Mitigación:** onboarding contextual por estado del viaje (ver §1.5); el dashboard del viaje prioriza la siguiente acción del usuario.

- **Decisión:** **moneda única por viaje** en MVP, sin conversión.
  - **Razón:** simplifica cálculo de balances y elimina ambigüedad. El 80% de viajes del target son domésticos o intra-zona euro.
  - **Alternativas:** multi-moneda desde MVP, multi-moneda diferida.
  - **Riesgo:** un viaje mixto EUR/USD/PEN queda fuera de MVP.
  - **Mitigación:** guardar el campo `currency` desde el día 1; v1 lo ampliará sin migración de datos (ver §3.4).

- **Decisión:** **comunicación del grupo sigue en WhatsApp**. Plantir **no** integra chat.
  - **Razón:** no podemos ganarle a WhatsApp. Cualquier chat que hagamos será ignorado y vamos a duplicar contexto.
  - **Alternativas:** chat in-app, hybrid (notificaciones espejo).
  - **Riesgo:** las decisiones "sociales" (cambio de planes, drama) no se registran.
  - **Mitigación:** historial de decisiones en el viaje (quién votó qué, quién eligió qué) cubre el 80% de la trazabilidad necesaria.

- **Decisión:** **no integramos reservas** (vuelos, hoteles, Airbnb).
  - **Razón:** el target no nos pide esto. Si lo hiciéramos, seríamos un metabuscador mediocre con 5% de comisión.
  - **Alternativas:** deep links a Airbnb/Booking, metabuscador propio.
  - **Riesgo:** el usuario se frustra por tener que saltar a otra web.
  - **Mitigación:** campo libre "URL reserva" en cada propuesta de destino (v1) y en gastos (v1).

### 1.4 Métricas de éxito (North Star + secundarias)

**North Star Metric (NSM):** **Pagos liquidados por usuario activo mensual** (`settled_payments_per_MAU`). Un pago "liquidado" es aquel en el que el deudor marca como pagado (v1) **o** en el que el balance del deudor llega a 0 al cerrar el viaje (proxy MVP).

> La NSM refleja el dolor #1 que resolvemos: "nadie paga nunca". Si sube, vamos bien.

**Métricas de adquisición / activación (mes 1-3 post-lanzamiento):**

| Métrica | Definición | Target mes 3 |
|---|---|---|
| Descargas | installs en iOS + Android | 5.000 |
| Signups | cuentas creadas verificadas | 3.000 |
| Activación (D7) | % signups que crean al menos 1 viaje con ≥ 3 miembros en 7 días | ≥ 40% |
| Primer viaje completado | viajes que llegan a `closed` | 1.000 |
| Net Promoter Score (NPS) | encuesta in-app post-`closed` | ≥ 40 |

**Métricas de engagement / retención (mes 1-6):**

| Métrica | Definición | Target mes 6 |
|---|---|---|
| WAU / MAU | weekly actives / monthly actives | ≥ 0.45 |
| Retention D30 | % signups activos en día 30 | ≥ 25% |
| Trips / MAU / mes | viajes nuevos por usuario activo al mes | ≥ 0.8 |
| Miembros / viaje (mediana) | cuántos amigos invita de media un organizador | ≥ 5 |
| Tasa de votación | % miembros que votan en cada poll | ≥ 75% |
| Gastos registrados / viaje (mediana) | cuántos gastos introduce el grupo | ≥ 6 |

**Métricas de calidad del producto:**

| Métrica | Definición | Target |
|---|---|---|
| Crash-free sessions | % sesiones sin crash (Sentry) | ≥ 99.5% |
| p95 latencia "load trip" | tiempo desde abrir la app al trip dashboard listo | < 1.5 s en 4G |
| Error rate en Edge Functions | errores 5xx / total invocaciones | < 0.5% |
| Discrepancia de balances | % de viajes donde `sum(member_balances) ≠ 0` | 0% (invariante testeado) |

**Métricas anti-grieta (lo que NO perseguimos):**

- **Tiempo en app** — si subiera mucho, sería porque la app es frustrante.
- **Notificaciones per capita** — no somos una app de mensajería.
- **DAU/MAU > 0.6** — no aplica (uso es esporádico: organizar 1 viaje cada 1-3 meses).

---

## 2. Usuarios objetivo

### 2.1 Personas (target MVP)

#### Persona 1 — **Lucía, "la organizadora"** (rol primario)

- **Edad:** 27.
- **Ocupación:** project manager junior, sueldo medio, vive en Madrid con dos compañeras de piso.
- **Contexto:** un grupo de 7 amigos de la uni (uno en Berlín, otro en Buenos Aires) quiere hacer un puente de diciembre en algún sitio de montaña. Lucía es quien siempre acaba organizando porque "se le da bien".
- **Dolores concretos:**
  1. Mandar un Doodle y que 3 de 7 voten a la primera, el resto 4 días después.
  2. Coordinar 7 agendas laborales distintas (uno está de ERTE, otra de guardia médica).
  3. Al final, nadie sabe cuánto debe a quién.
  4. Si alguien cancela, el balance se rompe y rehacerlo a mano da pereza.
- **Meta JTBD:** *"Cuando planeo un viaje con amigos, quiero encontrar fecha y sitio rápido y no acabar yo pagándolo todo, para que el grupo quede sin que se enfaden conmigo."*
- **Canales:** Instagram, TikTok, grupos de WhatsApp. Descubre apps por reels y por recomendación de amigas.
- **Dispositivo:** iPhone 13. No usa Android. Tolerancia a bugs baja; si una app le falla 2 veces, la desinstala.
- **Lo que pagaría:** probablemente no. Pero sí recomendaría si le resuelve el drama del cobro.

#### Persona 2 — **Marcos, "el cuñado"** (rol primario, perfil pasivo)

- **Edad:** 32.
- **Ocupación:** ingeniero, pareja con hija de 1 año, planifica 2-3 escapadas al año con su grupo de la infancia.
- **Contexto:** es el que más paga del grupo (sueldo más alto) y al final siempre sale perdiendo porque nadie le devuelve.
- **Dolores concretos:**
  1. No querer ser el "cobrador del grupo".
  2. Olvidar qué pagó cada uno en la cena del sábado.
  3. Querer un registro simple ("te debo 23,50 € del taxi del sábado") sin tener que abrir otra app.
- **Meta JTBD:** *"Cuando vuelvo de un viaje, quiero ver al céntimo quién me debe qué y poder mandárselo sin ser el típico pesado, para que la amistad sobreviva al dinero."*
- **Dispositivo:** Android (Xiaomi). Sensible al consumo de batería y al spam de notificaciones.
- **Lo que pagaría:** función de "marcar como pagado" si la app lo justifica (v1).

#### Persona 3 — **Sara, "la invitada"** (rol secundario)

- **Edad:** 22.
- **Ocupación:** estudiante Erasmus en Lisboa, sale con 2-3 grupos (uni, deporte, piso).
- **Contexto:** entra a Plantir porque Lucía la invita. No crea viajes.
- **Dolores concretos:**
  1. No saber en qué estado está la planificación (¿votamos ya? ¿hay sitio?).
  2. Que le pidan instalar una app nueva solo para un viaje.
  3. Que la app le pida permisos raros o le haga login con tarjeta de crédito.
- **Meta JTBD:** *"Cuando me invitan a un viaje, quiero ver al instante qué se ha decidido y qué me toca votar o pagar, para no tener que leer 50 mensajes de WhatsApp."*
- **Dispositivo:** ambos, según el día.
- **Lo que pagaría:** nada. Si la app le molesta, no la abre y vota por WhatsApp.

### 2.2 Anti-personas (NO construimos para ellas en MVP)

| Anti-persona | Por qué NO |
|---|---|
| **Equipo de trabajo / empresa** (viajes de negocios) | Requieren aprobación de gastos, integración con contabilidad, multi-empresa. Mercado distinto. Mercado es v3+ (no en roadmap actual). |
| **Familia nuclear** (padres + 1-2 hijos) | El grupo es demasiado pequeño (2-3 personas activas), los problemas son de calendario escolar y no de coordinación social. Tricount cubre ese caso. |
| **Grupo de 50+ personas** (eventos grandes, bodas) | Requiere sub-grupos, RSVP, catering. No es un "viaje". Mercado distinto. |
| **Backpacker en solitario** | Una persona no necesita votar ni dividir. No es nuestro usuario. |
| **Persona sin smartphone o con smartphone viejo** (Android < 8) | Imposible soportar el stack RN/Expo actual. Asumimos iOS 15+ y Android 9+ como baseline (ver §9). |
| **Usuario que rechaza compartir datos** (no loguearse, no aceptar link de invitación) | El producto requiere identidad y colaboración. Sin identidad no hay balances personales. |

### 2.3 Jobs-to-be-done canónicos (resumen)

1. **Crear un viaje desde cero** (Lucía).
2. **Invitar al grupo por un canal que ya usan** (Lucía → WhatsApp).
3. **Encontrar la fecha en que más gente puede** (todos).
4. **Decidir el sitio** con propuestas de todos (todos).
5. **Llevar la lista de quién paga qué** (Marcos).
6. **Cerrar las cuentas al final** (Marcos y Lucía).
7. **Ver de un vistazo el estado del viaje** (Sara).

---

## 3. Modelo de dominio

> Diagrama y contrato preciso están delegados a `mobile-architect` (`src/types/index.ts`). Esta sección define las entidades en lenguaje de producto y sus relaciones.

### 3.1 Entidades principales

#### `User`
- **Representa:** una persona con cuenta en Plantir.
- **Atributos esenciales:** `id` (uuid), `email` (único), `display_name`, `avatar_url` (opcional), `created_at`.
- **Identidad:** gestionada por Supabase Auth (email + password en MVP; magic link y OAuth son v1).

#### `Trip`
- **Representa:** un viaje planificado por un grupo.
- **Atributos esenciales:** `id`, `name` (≤ 80 chars), `description` (≤ 500 chars), `currency` (ISO-4217, e.g. `EUR`), `status` (enum 9 estados, ver §1.5), `created_by` (user_id), `created_at`, `decided_date` (date o null), `decided_destination` (DestinationProposal o null), `closed_at` (timestamp o null).
- **Invariantes:**
  - `currency` se fija en la creación y **no cambia** en MVP.
  - `decided_date` solo puede pasar de `null` a una fecha una vez.
  - `closed_at` solo se setea si `status = closed` y balances están a 0.

#### `TripMember`
- **Representa:** la membresía de un usuario en un viaje.
- **Atributos esenciales:** `trip_id`, `user_id`, `role` (enum: `owner` | `member`), `joined_at`, `nickname_in_trip` (opcional, e.g. "Lucía del Barça").
- **Invariantes:**
  - Cada `Trip` tiene **exactamente 1** `owner`.
  - Un usuario no puede ser miembro dos veces del mismo viaje.
  - El `owner` no puede salir del viaje sin transferir el rol (v1) o cerrarlo (MVP: solo cerrarlo).

#### `TripInvite`
- **Representa:** un link compartible para unirse a un viaje.
- **Atributos esenciales:** `id`, `trip_id`, `token` (random ≥ 128 bits), `created_by`, `created_at`, `expires_at`, `max_uses` (default: 50), `uses` (contador), `revoked` (bool).
- **Invariantes:**
  - Un `token` es único.
  - Al aceptar, si el usuario ya tiene cuenta → se crea `TripMember`. Si no → se le pide signup y luego se crea `TripMember`.
  - Link expira a los **14 días** desde creación (ver §4 E3).
  - `uses < max_uses` y `revoked = false` y `expires_at > now()` para ser válido.

#### `DatePoll`
- **Representa:** la encuesta de fechas de un viaje. **Una por viaje**, creada al pasar a estado `voting_dates`.
- **Atributos esenciales:** `id`, `trip_id`, `created_at`, `closed_at` (null hasta que el owner cierra el poll).

#### `DateOption`
- **Representa:** una fecha concreta (sin hora) propuesta como opción en el poll.
- **Atributos esenciales:** `id`, `poll_id`, `date` (date, no datetime), `note` (opcional, e.g. "puente diciembre"), `created_by`.

#### `DateVote`
- **Representa:** el voto de un miembro sobre una `DateOption`.
- **Atributos esenciales:** `id`, `option_id`, `user_id`, `availability` (enum: `yes` | `no` | `maybe`).
- **Invariantes:** un usuario tiene exactamente un voto por `DateOption`. Puede cambiar su voto (upsert).

#### `DestinationProposal`
- **Representa:** un destino propuesto por cualquier miembro.
- **Atributos esenciales:** `id`, `trip_id`, `title` (≤ 80 chars), `description` (≤ 500), `url` (opcional, link a Airbnb/Booking), `image_url` (opcional, subido en v1), `created_by`, `created_at`.
- **Invariantes en MVP:** un miembro puede proponer **hasta 5** destinos por viaje. Tras decidir destino, no se aceptan más propuestas.

#### `DestinationVote`
- **Representa:** un voto (positivos y negativos, tipo "pulgar arriba/abajo") sobre una `DestinationProposal`.
- **Atributos esenciales:** `id`, `proposal_id`, `user_id`, `value` (enum: `up` | `down`).
- **Invariantes:** un usuario tiene un voto por propuesta. Upsert permitido.

#### `Expense`
- **Representa:** un gasto del viaje.
- **Atributos esenciales:** `id`, `trip_id`, `title` (≤ 80), `amount_cents` (integer, **siempre ≥ 0**), `currency` (debe coincidir con `Trip.currency`), `paid_by_user_id`, `occurred_on` (date), `category` (enum, ver §3.2), `created_by`, `created_at`, `note` (opcional).
- **Invariantes:**
  - `amount_cents` es `integer` en Postgres. Nunca `float`. (Decisión ya del briefing.)
  - `currency` se valida contra `Trip.currency` antes de insertar.

#### `ExpenseSplit`
- **Representa:** cómo se reparte un `Expense` entre miembros.
- **Atributos esenciales:** `expense_id`, `user_id`, `share_cents` (integer), `included` (bool).
- **Invariantes en MVP:** `sum(share_cents de splits con included = true) == amount_cents`. Test invariante. Split igual (`include_all_except`) se calcula en cliente y se persiste; el cliente **no puede** persistir splits cuya suma no cuadre (RLS + check constraint).

#### `Settlement`
- **Representa:** una sugerencia de pago entre dos miembros (deudor → acreedor) calculada por el algoritmo de minimización de flujos.
- **Atributos esenciales:** `id`, `trip_id`, `from_user_id`, `to_user_id`, `amount_cents`, `generated_at`.
- **Invariantes en MVP:** son **sugerencias** (no se ejecuta ningún pago real). Se recalculan en cada lectura del dashboard. No se persisten en MVP (regeneración determinista). En v1 se marcan como `confirmed`.

### 3.2 Enums y valores

- **Trip status** (estados del viaje, tomados del briefing):
  `group_created | voting_dates | date_decided | voting_place | place_decided | planning | on_trip | settling_expenses | closed`
- **Role:** `owner | member`
- **Availability:** `yes | no | maybe`
- **DestinationVote.value:** `up | down`
- **ExpenseCategory** (MVP, lista cerrada):
  `accommodation | transport | food | activities | shopping | other`
  *Justificación:* mantener lista corta para no obligar al usuario a clasificar. 6 categorías cubren el 95% de gastos en viajes cortos del target.

### 3.3 Diagrama textual de relaciones

```
User ──< TripMember >── Trip ──< TripInvite
                          │
                          ├──< DatePoll ──< DateOption ──< DateVote
                          │
                          ├──< DestinationProposal ──< DestinationVote
                          │
                          ├──< Expense ──< ExpenseSplit
                          │
                          └──  (Settlement: derivado, no persistido MVP)
```

- Un `User` participa en N `Trip` a través de `TripMember`.
- Un `Trip` tiene 1 `DatePoll` (o ninguno si está en `group_created`).
- Un `Trip` tiene N `DestinationProposal` (de 0 hasta N×5).
- Un `Trip` tiene N `Expense`, cada uno con 1..N `ExpenseSplit`.
- `Settlement` es derivado, no relacional en MVP.

### 3.4 Decisión de esquema que condiciona v1+ (anticipada)

- **Decisión:** todos los `amount_cents`, `share_cents` y `Settlement.amount_cents` son **`bigint` en Postgres** (no `integer`), por seguridad futura con multi-moneda.
  - **Razón:** un viaje en yenes con 100 cenas de 8 000 ¥ cada una son 800 000 ¥ = 800 000 céntimos; cabe en `integer`, pero al añadir conversión o redondeos, `bigint` elimina riesgo de overflow.
  - **Alternativas:** `integer` (más simple, ahorra 4 bytes por fila), `numeric(20,2)`.
  - **Riesgo:** ligero coste de almacenamiento y ancho de banda.
  - **Mitigación:** en MVP, con 1.000 viajes y 100 gastos/viaje, son 100.000 filas. Insignificante.

---

## 4. Features priorizadas — épicas y user stories

> Convención: cada épica tiene un ID (`E<n>`), una lista de user stories con criterios Given/When/Then. Las features cortadas a v1/v2 aparecen explícitamente con `**Out of MVP**` y razón.

### Épica E1 — Autenticación y cuenta

> **Out of MVP:** magic link por email, OAuth con Google/Apple, recovery de contraseña avanzado, 2FA, cambio de email. Razón: en MVP, email + password es suficiente para validar la propuesta de valor; OAuth reduce fricción de signup pero no es crítico para el flujo end-to-end; se prioriza en v1 por coste/beneficio de conversión.

#### US-1.1 — Signup con email y contraseña
**Como** nueva usuaria (Sara)
**Quiero** registrarme con mi email y una contraseña
**Para** poder recibir la invitación de Lucía y unirme al viaje.

**Criterios de aceptación:**
- **Given** que estoy en la pantalla `/welcome` y pulso "Crear cuenta"
- **When** introduzco un email válido, una contraseña ≥ 8 caracteres con al menos 1 número, y acepto términos
- **Then** se crea una cuenta en Supabase Auth, recibo un email de verificación, y al verificar entro al `TripsHome` (estado vacío).

- **Given** que introduzco un email ya registrado
- **When** pulso "Crear cuenta"
- **Then** veo un error legible: "Este email ya está registrado. ¿Quieres iniciar sesión?" con CTA a login.

- **Given** que la contraseña no cumple requisitos
- **When** pulso "Crear cuenta"
- **Then** veo inline los requisitos no cumplidos (no modal).

#### US-1.2 — Login
**Como** usuario registrado (Lucía)
**Quiero** iniciar sesión con email y contraseña
**Para** acceder a mis viajes.

**Criterios de aceptación:**
- **Given** que introduzco credenciales correctas
- **When** pulso "Iniciar sesión"
- **Then** se establece la sesión Supabase y entro a `TripsHome`.
- **Given** que introduzco credenciales incorrectas
- **When** pulso "Iniciar sesión"
- **Then** veo "Email o contraseña incorrectos" (sin distinguir cuál para evitar enumeration).
- **Given** que ya estoy logueado y abro la app
- **When** la app arranca
- **Then** la sesión persistida en `SecureStore` me lleva directo a `TripsHome` sin pasar por login.

#### US-1.3 — Logout
**Criterios:**
- **Given** que estoy en cualquier pantalla autenticada
- **When** voy a Perfil → "Cerrar sesión"
- **Then** se elimina la sesión de `SecureStore` y vuelvo a `/welcome`.

#### US-1.4 — Edición de perfil básico
- **Given** que estoy en `/profile`
- **When** cambio `display_name` o subo un `avatar_url` (URL externa en MVP; subida real en v1)
- **Then** los cambios se persisten y se reflejan en todas las listas de miembros.

> **Out of MVP:** subida de avatar desde cámara/galería. Razón: requiere permisos, storage y pipeline de imágenes; no es crítico para validar el flujo.

---

### Épica E2 — Viajes: crear, ver, editar, cerrar

#### US-2.1 — Crear viaje
**Como** Lucía
**Quiero** crear un viaje nuevo con nombre, descripción, moneda y foto de cover (URL)
**Para** empezar a organizar.

**Criterios:**
- **Given** que estoy en `TripsHome` y pulso "+"
- **When** introduzco nombre (1-80 chars), descripción opcional (≤ 500), selecciono moneda de la lista (default: detectada por locale del dispositivo), y opcionalmente pego una URL de cover
- **And** pulso "Crear"
- **Then** se crea el `Trip` con `status = group_created`, yo soy `owner`, y entro al `TripDashboard`.

- **Given** que el nombre está vacío o > 80 chars
- **When** pulso "Crear"
- **Then** veo error inline.

- **Given** que la moneda no es ISO-4217 válida
- **When** pulso "Crear"
- **Then** veo "Moneda no soportada" (Zod validation).

#### US-2.2 — Listar mis viajes (`TripsHome`)
- **Given** que estoy autenticado
- **When** abro la app
- **Then** veo la lista de viajes donde soy `TripMember`, ordenados por próxima fecha decidida ascendente, y luego por `created_at` desc. Cada tarjeta muestra: nombre, foto (si tiene), estado actual, próxima fecha (si decidida), y un badge con el número de miembros.

- **Given** que nunca he creado ni me han invitado a un viaje
- **When** abro `TripsHome`
- **Then** veo `EmptyState` con copy "Crea tu primer viaje o espera a que te inviten" + CTA "+ Nuevo viaje".

#### US-2.3 — Editar nombre, descripción, cover del viaje
- **Given** que soy `owner` del viaje
- **When** voy a `TripDashboard` → ⚙️ → "Editar viaje"
- **Then** puedo cambiar nombre, descripción, cover.
- **And** el cambio se refleja en la tarjeta de `TripsHome` de todos los miembros en < 5 s (vía Realtime o pull-to-refresh).

> **Out of MVP:** cambiar `currency` una vez creado. Razón: complica balances históricos. Decisión fija en MVP, ampliable en v1 con migration.

#### US-2.4 — Cerrar viaje
- **Given** que soy `owner` y el viaje está en `settling_expenses` o `planning`
- **When** voy a ⚙️ → "Cerrar viaje"
- **Then** veo confirmación "Cerrar el viaje archivará los datos. ¿Continuar?"
- **And** al confirmar, `status = closed` y `closed_at = now()`. El viaje se mueve a una sección "Archivados" en `TripsHome` (filtrable).

> **Out of MVP:** reabrir viaje cerrado. Razón: balances re-cálculo es complejo; el owner puede pedir a soporte si ocurre.

---

### Épica E3 — Miembros e invitaciones

> **Out of MVP:** invitación por QR, invitación por contacto, importar de WhatsApp. Razón: el link copiable cubre el caso de uso; las otras formas son aceleradores de growth que v1 puede justificar con datos.

#### US-3.1 — Generar link de invitación
**Como** Lucía (owner)
**Quiero** generar un link compartible del viaje
**Para** enviárselo a mis amigos por WhatsApp.

**Criterios:**
- **Given** que soy `owner` y estoy en `TripDashboard`
- **When** pulso "Invitar" → "Generar link"
- **Then** se crea un `TripInvite` con `token` de 128 bits, `expires_at = now() + 14d`, `max_uses = 50`.
- **And** se muestra el link con CTA "Copiar" y "Compartir" (Share API nativa).

- **Given** que ya hay un link activo
- **When** entro a "Invitar"
- **Then** veo el link activo con su `expires_at` y `uses/max_uses`, y opción de "Revocar y generar nuevo".

- **Given** que un miembro NO es `owner`
- **When** entra a "Invitar"
- **Then** no ve la opción de generar (RLS lo bloquea).

#### US-3.2 — Aceptar invitación
**Como** Sara (nueva o registrada)
**Quiero** abrir un link de invitación y unirme al viaje
**Para** votar fechas y ver el plan.

**Criterios:**
- **Given** que abro un link `https://plantir.app/invite/<token>` y NO estoy logueado
- **When** la app carga
- **Then** veo `/welcome?next=/invite/<token>`, y tras signup/login me lleva de vuelta a la pantalla de aceptación.

- **Given** que estoy logueado y abro el link
- **When** la app valida el token
- **Then** si es válido y no estoy ya en el viaje, se crea `TripMember` y entro al `TripDashboard` con un toast "Te has unido a <nombre del viaje>".
- **And** si el link está expirado, revocado o agotado, veo `ErrorState` con copy claro y CTA "Pedir nuevo link al organizador".

- **Given** que ya soy miembro
- **When** abro el link de mi propio viaje
- **Then** voy directo al `TripDashboard` (idempotente).

- **Given** que pulso "Cancelar" en la pantalla de aceptación
- **When** confirmo
- **Then** no se crea membresía y vuelvo a `TripsHome` (o `/welcome` si no estoy logueado).

#### US-3.3 — Ver lista de miembros
- **Given** que soy miembro del viaje
- **When** entro a "Miembros" desde el `TripDashboard`
- **Then** veo avatar, nombre, rol (`owner` con badge), y fecha de unión de cada uno, ordenados por `joined_at` ascendente.

#### US-3.4 — Salir del viaje
- **Given** que soy `member` (no `owner`)
- **When** voy a Miembros → ⋮ → "Salir del viaje"
- **Then** veo confirmación y al confirmar se elimina mi `TripMember`. Si tenía gastos pagados o splits, **se preservan** con mi `user_id` para no romper balances históricos (decisión explícita).

> **Out of MVP:** owner puede transferir ownership. Razón: estado "huérfano" del viaje es raro en MVP; soporte puede hacerlo por SQL. v1 lo expone en UI.

---

### Épica E4 — Date poll (votar fechas y elegir)

> **Out of MVP:** importación desde Google Calendar / iCal. Razón: requiere OAuth por usuario y parsing de eventos; v1 si hay demanda.

#### US-4.1 — Abrir date poll
- **Given** que soy `owner` y el viaje está en `group_created`
- **When** desde el `TripDashboard` pulso "Empezar a votar fechas"
- **Then** el viaje pasa a `voting_dates`, se crea un `DatePoll`, y entro a la pantalla `DatePollSetup` (solo owner, una vez) o `DatePollResults` (todos).

> **Out of MVP:** saltarse el estado `group_created` (empezar sin grupo creado). Razón: el modelo requiere `DatePoll.trip_id` y la transición vacía no aporta valor.

#### US-4.2 — Owner propone opciones de fecha
- **Given** que soy `owner` y estoy en `DatePollSetup`
- **When** añado fechas (date picker, seleccionable en un rango de [hoy, hoy + 18 meses]) y opcionalmente notas
- **And** pulso "Listo"
- **Then** se crean las `DateOption` y todos los miembros ven `DatePollResults` con CTA "Votar".

- **Given** que propongo 0 opciones
- **When** pulso "Listo"
- **Then** veo error "Añade al menos una fecha".

- **Given** que una fecha es anterior a hoy
- **When** la añado
- **Then** el date picker no me deja (constraint UI).

- **Límite MVP:** máx 30 opciones por poll (UX y performance).

#### US-4.3 — Miembros votan
**Como** Sara (miembro)
**Quiero** votar `yes` / `no` / `maybe` en cada opción
**Para** que el sistema encuentre la mejor fecha.

**Criterios:**
- **Given** que soy miembro y estoy en `DatePollResults`
- **When** para cada `DateOption` pulso uno de los 3 botones (`yes` / `no` / `maybe`)
- **Then** mi voto se persiste (upsert) y el botón seleccionado se resalta.
- **And** veo en tiempo real (Realtime) los recuentos: `5 sí / 1 no / 1 quizá`.
- **And** un heatmap (matriz fechas × miembros con iconos) muestra la disponibilidad agregada, ordenado por "suma de yes" desc.

- **Given** que no he votado
- **When** entro a `DatePollResults`
- **Then** veo CTA destacado "Tu voto: 0/12" y el heatmap con mis filas atenuadas.

#### US-4.4 — Owner cierra el poll y elige fecha
- **Given** que soy `owner` y todos (o la mayoría) han votado
- **When** pulso "Cerrar y elegir fecha"
- **Then** veo un modal con el ranking de fechas (suma de `yes` desc, desempate por `maybe` desc).
- **And** selecciono una fecha (puede no ser la más votada, es decisión del owner).
- **Then** se setea `Trip.decided_date`, el viaje pasa a `date_decided`, y se cierra el `DatePoll` (no se aceptan más votos).
- **And** se notifica a todos los miembros (in-app + email resumen).

> **Out of MVP:** algoritmo automático de elección sin intervención del owner ("el grupo decide por mayoría"). Razón: en grupos pequeños, el dueño suele tener la última palabra por contexto (presupuesto, disponibilidad que no está en el poll). v1 si vemos fricción.

---

### Épica E5 — Destination poll (votar destinos y elegir)

> **Out of MVP:** mapa con marcadores, autocomplete de Google Places, integración con Airbnb/Booking. Razón: costoso de implementar y validar; v1 lo justifica si la fricción de "pegar URL" duele.

#### US-5.1 — Pasar a `voting_place`
- **Given** que el viaje está en `date_decided`
- **When** el owner (o el último en votar la fecha) entra al dashboard
- **Then** ve CTA "Empezar a votar destino" → viaje pasa a `voting_place`.

#### US-5.2 — Cualquier miembro propone destinos
- **Given** que soy miembro y el viaje está en `voting_place`
- **When** voy a "Destinos" → "+ Proponer"
- **And** introduzco título (1-80), descripción (≤ 500), URL opcional
- **Then** se crea `DestinationProposal` y aparece en la lista.

- **Given** que ya he propuesto 5 destinos
- **When** pulso "+ Proponer"
- **Then** veo "Has alcanzado el máximo de 5 propuestas. Espera a que se elija destino o revisa las existentes." (límite por miembro, no por viaje).

#### US-5.3 — Votar destinos
- **Given** que soy miembro
- **When** en `Destinations` pulso 👍 o 👎 en una propuesta
- **Then** mi voto se persiste y el contador se actualiza en tiempo real (Realtime).
- **And** las propuestas se ordenan por `(up - down)` desc, con empates por `created_at` asc.

#### US-5.4 — Owner elige destino
- **Given** que soy `owner`
- **When** pulso "Elegir destino" y selecciono uno del ranking
- **Then** se setea `Trip.decided_destination = proposal_id`, viaje pasa a `place_decided`, y el destino se muestra en el `TripDashboard` con su título, descripción, URL y autor.

- **And** ya no se aceptan más propuestas.

> **Out of MVP:** "veto" de un miembro (un voto negativo de alguien del grupo bloquea la propuesta). Razón: introduce gobernanza compleja y bloquea al owner. No encaja con "owner decide".

---

### Épica E6 — Gastos

> **Out of MVP:** recibos/fotos, splits por porcentaje, splits exactos por importes fijos, multi-pagador, gastos recurrentes, income/refunds, categorías custom, OCR de tickets. Razón: complican UX y modelo de datos; el 80% de gastos en viajes cortos son "1 pagador, split igual entre todos menos 1-2 excluidos".

#### US-6.1 — Registrar gasto (split igual, sin excluir)
**Como** Marcos
**Quiero** registrar un gasto que he pagado yo, dividido entre todos
**Para** que conste en los balances.

**Criterios:**
- **Given** que el viaje está en `planning` o `on_trip` o `settling_expenses` y soy miembro
- **When** voy a "Gastos" → "+ Añadir gasto" e introduzco:
  - título (1-80)
  - monto en formato `0,00` (el cliente convierte a `cents` con regla banker's rounding)
  - fecha del gasto (date, default hoy)
  - categoría (dropdown)
  - nota opcional
  - pagador: seleccionado por defecto el usuario actual
- **And** pulso "Guardar"
- **Then** se crea `Expense` + N `ExpenseSplit` con `share_cents = amount_cents / N` y el remanente (1 céntimo) se asigna al primer miembro alfabéticamente para que `sum(splits) == amount_cents` exactos.
- **And** la lista de gastos se actualiza.

> **Out of MVP:** moneda del gasto distinta a `Trip.currency`. Razón: complica balances sin demandarlo. El dropdown de moneda en US-2.1 fija la moneda del viaje.

#### US-6.2 — Excluir miembros de un gasto
**Como** Marcos
**Quiero** dividir una cena entre todos menos los 2 que no vinieron
**Para** que el balance sea justo.

- **Given** que estoy añadiendo un gasto
- **When** marco/desmarco miembros en "Para quién es"
- **Then** los `ExpenseSplit` se recalculan en cliente: `share_cents = amount_cents / included_count` con el mismo reparto de remanente.
- **And** la suma de splits cuadra con el monto (test invariante).

#### US-6.3 — Ver lista de gastos
- **Given** que soy miembro
- **When** entro a "Gastos"
- **Then** veo lista cronológica inversa (más reciente arriba) con: título, monto, pagador (avatar+nombre), fecha, categoría (icono).
- **And** filtro opcional por pagador y por categoría.
- **And** tap en un gasto abre `ExpenseDetail`.

> **Out of MVP:** búsqueda full-text. Razón: la lista suele ser < 50 gastos/viaje; scroll + filtro es suficiente.

#### US-6.4 — Editar / borrar gasto
- **Given** que soy el `created_by` del gasto o soy `owner` del viaje
- **When** en `ExpenseDetail` pulso "Editar" o "Borrar"
- **Then** puedo modificar o borrar (con confirmación si hay balances derivados).
- **And** al borrar, se eliminan los `ExpenseSplit` asociados en cascada.

> **Out of MVP:** historial de cambios de un gasto. Razón: complica schema y no es crítico en MVP. Los balances se recalculan al vuelo.

---

### Épica E7 — Balances y settlements

> **Out of MVP:** multi-moneda con conversión, integración de pagos reales (Bizum, Stripe, etc.), recordatorios automáticos. Razón: requiere partners externos y regulatorio. v1 (Bizum en España) si vemos demanda.

#### US-7.1 — Ver mi balance
**Como** Marcos
**Quiero** ver "me deben X / debo Y" en el viaje
**Para** saber dónde estoy.

**Criterios:**
- **Given** que soy miembro y el viaje tiene ≥ 1 gasto
- **When** entro a "Balances"
- **Then** veo mi balance neto (`pagado_por_mí - mi_cuota_de_todos_los_gastos`) y, debajo, la lista de "me deben" y "debo" con nombre y monto.
- **And** el balance se calcula en cliente a partir de `Expense` + `ExpenseSplit` (no hay tabla `Balance` persistida; se recalcula on-the-fly).

#### US-7.2 — Ver balances de todos los miembros
- **Given** que soy miembro
- **When** en "Balances" → "Ver todos"
- **Then** veo tabla con columnas: miembro | pagado | cuota | neto.
- **And** la fila total cierra en 0 (test invariante: `sum(neto) = 0`).

#### US-7.3 — Ver settlements (sugerencias de pago)
**Criterios:**
- **Given** que el viaje tiene balances no nulos
- **When** entro a "Settlements"
- **Then** veo la lista mínima de pagos que, si se realizaran, dejarían todos a 0. Algoritmo: **greedy min cash flow** (ver §6.7).
- **And** cada settlement muestra: `A → B: 23,50 €`.
- **And** toco un settlement y me abre opciones para compartir por WhatsApp o copiar como texto.

> **Out of MVP:** marcar settlement como "pagado" (v1). En MVP, el botón es solo "compartir el texto".

---

### Épica E8 — Estados del viaje (state machine)

> Esta épica no es una feature visible, sino la lógica que orquesta E2-E7. Se documenta aquí para que `ux-designer` y `mobile-architect` la implementen.

#### US-8.1 — Transiciones de estado

**Decisión:** el cambio de estado es **manualmente iniciado por el owner** excepto las transiciones automáticas que se enumeran.

**Transiciones MVP permitidas:**

| Desde | Hacia | Trigger | Quién |
|---|---|---|---|
| `group_created` | `voting_dates` | owner pulsa "Empezar a votar fechas" (US-4.1) | owner |
| `voting_dates` | `date_decided` | owner elige fecha (US-4.4) | owner |
| `date_decided` | `voting_place` | cualquier miembro pulsa "Empezar a votar destino" (US-5.1) | owner o member |
| `voting_place` | `place_decided` | owner elige destino (US-5.4) | owner |
| `place_decided` | `planning` | automático (inmediato) | sistema |
| `planning` | `on_trip` | owner pulsa "Empezar viaje" en la fecha decidida o después | owner |
| `on_trip` | `settling_expenses` | owner pulsa "Cerrar y liquidar" | owner |
| `settling_expenses` | `closed` | owner cierra (US-2.4) y balances = 0 | owner |

- **Given** un estado actual, las transiciones que no están en la tabla son **inválidas** y devuelven 409 en backend + UI bloquea el botón.
- **El `TripDashboard` muestra un `ProgressStepper` con los 9 estados**, marcando el actual. Los estados pasados se ven check, el futuro atenuado.

> **Out of MVP:** transiciones automáticas por fecha (e.g. `on_trip` se setea el día `decided_date`). Razón: ambiguo (¿a qué hora?), requeriría timezone handling complejo y notificaciones programadas. v1 si la fricción es real.

---

## 5. MVP / v1 / v2 — alcance explícito

### 5.1 Resumen ejecutivo

| Fase | Épicas incluidas | Épicas NO incluidas (out) |
|---|---|---|
| **MVP** | E1, E2, E3, E4, E5, E6, E7, E8 | (todas las de v1/v2 listadas a continuación) |
| **v1** | + Tareas (T), Comentarios, Historial de decisiones, Confirmación de pagos, Splits avanzados (porcentaje/exacto), Reembolsos (income), Recibos (fotos), Push, Export PDF/CSV, Magic link / OAuth, Subida de avatar, Transferir ownership, Multi-pagador en expense, "Marcar settlement como pagado" | — |
| **v2** | + Multi-moneda con conversión, AI summaries, Calendar integration, Common pot, Pagos reales (Bizum, Stripe), Mapa, Itinerario completo, Trip templates, Web mode | — |

### 5.2 Features del MVP — tabla compacta

| Feature | Épica | US principales | Estado |
|---|---|---|---|
| Signup email + password | E1 | US-1.1 | IN |
| Login + sesión persistida | E1 | US-1.2 | IN |
| Logout | E1 | US-1.3 | IN |
| Edición perfil básico (display_name, avatar URL) | E1 | US-1.4 | IN |
| Crear viaje (nombre, descripción, moneda, cover URL) | E2 | US-2.1 | IN |
| Listar mis viajes | E2 | US-2.2 | IN |
| Editar viaje (nombre, descripción, cover) | E2 | US-2.3 | IN |
| Cerrar viaje | E2 | US-2.4 | IN |
| Generar link de invitación (14d, 50 usos) | E3 | US-3.1 | IN |
| Aceptar link de invitación (con o sin login) | E3 | US-3.2 | IN |
| Ver lista de miembros | E3 | US-3.3 | IN |
| Salir del viaje | E3 | US-3.4 | IN |
| Abrir date poll | E4 | US-4.1 | IN |
| Owner propone opciones de fecha | E4 | US-4.2 | IN |
| Miembros votan (yes/no/maybe) | E4 | US-4.3 | IN |
| Owner cierra poll y elige fecha | E4 | US-4.4 | IN |
| Pasar a voting_place | E5 | US-5.1 | IN |
| Miembros proponen destinos (≤5 c/u) | E5 | US-5.2 | IN |
| Miembros votan destinos (👍/👎) | E5 | US-5.3 | IN |
| Owner elige destino | E5 | US-5.4 | IN |
| Registrar gasto (split igual, excluir miembros) | E6 | US-6.1, US-6.2 | IN |
| Ver lista de gastos (filtros pagador/categoría) | E6 | US-6.3 | IN |
| Editar/borrar gasto | E6 | US-6.4 | IN |
| Ver mi balance | E7 | US-7.1 | IN |
| Ver balances de todos | E7 | US-7.2 | IN |
| Ver settlements (greedy min cash flow) | E7 | US-7.3 | IN |
| TripDashboard con stepper de 9 estados | E8 | US-8.1 | IN |
| State machine de transiciones | E8 | US-8.1 | IN |
| RLS (Supabase) | transversal | — | IN |
| Algoritmos testeados (date poll, balances, settlements) | transversal | — | IN |
| Deep links para invitaciones | transversal | — | IN |
| Realtime (votos y balances) | transversal | — | IN |

### 5.3 Features explícitamente **out of MVP** con razón

| Feature | Razón del corte |
|---|---|
| **Magic link** en auth | Email+password es suficiente para validar; v1 lo añade para reducir fricción de signup. |
| **OAuth con Google / Apple** | Reduce fricción, pero requiere configuración por plataforma y revisión de App Store. v1. |
| **Recuperación de contraseña** | El flujo MVP cubre "crear cuenta nueva" si se olvidan. v1 lo implementa con token de reset. |
| **2FA** | El target no lo demanda; v2 si la app maneja dinero real. |
| **Subida de avatar desde cámara/galería** | Requiere permisos, Supabase Storage, pipeline de imágenes. La URL externa en MVP es un placeholder. |
| **Cambiar `currency` del viaje** | Complica balances históricos; un viaje con 3 gastos en EUR y luego un cambio a USD requeriría conversion rule. Decisión: 1 viaje = 1 moneda, fijada en creación. |
| **Reabrir viaje cerrado** | Re-cálculo de balances con datos posiblemente borrados. v1. |
| **Transferir ownership** | Caso raro en MVP. Soporte puede hacerlo vía SQL. v1. |
| **Importación de Calendar (Google/iCal)** | OAuth por usuario y parsing de eventos. v1 si hay demanda. |
| **Algoritmo automático de elección de fecha/destino** | El owner tiene contexto que el algoritmo no. v1 si medimos fricción. |
| **Mapa con marcadores** | Costoso. v2. |
| **Autocomplete de lugares (Google Places)** | Costoso. v2. |
| **Integración Airbnb/Booking** | Metabuscador mediocre. v2 si partners están abiertos. |
| **Veto de un miembro** | Introduce gobernanza compleja. No encaja con "owner decide". |
| **Recibos / fotos de gastos** | Requiere Storage + permisos. v1. |
| **Splits por porcentaje** | El 90% de los casos son split igual o excluir. v1. |
| **Splits exactos por importes (cada uno paga X,00 €)** | Mismo motivo. v1. |
| **Multi-pagador en un gasto** | Complica cálculo y UX; v1 con UI de "pago conjunto". |
| **Gastos recurrentes** | Caso raro (alquiler mensual). v2. |
| **Income / refunds** | Flujo de signo negativo. v1. |
| **Categorías custom** | 6 categorías hardcoded en MVP; v1 si lo piden. |
| **Búsqueda full-text en gastos** | Lista < 50 ítems en MVP. |
| **Historial de cambios de un gasto** | Complica schema. v1. |
| **Multi-moneda con conversión** | Requiere FX provider, redondeos, fechas de cambio. v2. |
| **Pagos reales (Bizum, Stripe)** | Requiere partners, KYC, fees. v2. |
| **Recordatorios automáticos de deuda** | v1 (con push). |
| **Common pot (bote común)** | Caso de uso distinto; v2. |
| **Itinerario completo (días, actividades)** | El target ya lo cubre con Notas o Google Maps. v2 si vemos demanda. |
| **Trip templates** | v2 (caso de uso power-user). |
| **Web mode (PWA)** | v2. |
| **Chat in-app** | Decisión explícita: WhatsApp manda. v2+ si vemos grieta. |
| **Tareas pre-viaje** ("reservar coche", "comprar snacks") | v1 (lista compartida con responsables). |
| **Comentarios en propuestas de destino** | v1. |
| **Export PDF/CSV** | v1. |
| **Push notifications** | v1. |
| **Notificaciones in-app persistentes** (bandeja) | v1. |
| **Marcar settlement como "pagado"** | v1 (con confirmación de ambas partes). |
| **Historial de decisiones** (timeline de "quién votó qué / quién eligió qué / cuándo") | v1: añade vista de auditoría útil para grupos que忘记 lo que pasó, pero no es crítico para el flujo MVP. |
| **AI summaries** (resumen del viaje generado por LLM al cerrar) | v2: requiere integración con proveedor LLM, coste por uso, y no es core del problema. |
| **Calendar integration** (sincronizar fechas decididas con Google/Apple Calendar) | v2: requiere OAuth por usuario, deep handling de timezones, y el target ya tiene el viaje en su calendar mental. |

### 5.4 Decisiones de corte (resumen)

- **Decisión:** cortar todo lo que **no es necesario para el flujo end-to-end**: crear viaje → invitar → votar fechas → elegir fecha → votar sitio → elegir sitio → gastos → balances → settlements.
  - **Razón:** el briefing lo exige. Cargar el MVP mata la velocidad de validación.
  - **Alternativas:** MVP "amplio" con tareas y comentarios desde día 1.
  - **Riesgo:** usuarios power piden features que hemos recortado.
  - **Mitigación:** backlog vivo en v1 con priorización por RICE post-lanzamiento.

- **Decisión:** **no** hacer `web mode` ni `PWA` en MVP.
  - **Razón:** el target vive en móvil; web añade 30-40% de esfuerzo de QA (Safari desktop, Chrome, Firefox, responsive).
  - **Riesgo:** usuario desktop frustrado al no tener link directo.
  - **Mitigación:** las invitaciones por link funcionan desde WhatsApp web → deep link → app store si no la tiene.

---

## 6. Criterios de aceptación por feature del MVP

> **Regla:** cada criterio es **observable y binario** (pass/fail). Nada de "funciona bien", "se ve bonito", "es intuitivo". Los criterios subjetivos se trasladan a tests de UX con `qa-engineer` (heurísticas y tests con usuarios) — no en este PRD.

### 6.1 E1 — Auth

- **AC-1.1.1** Signup: dado un email nuevo no registrado y contraseña válida, el endpoint `POST /auth/v1/signup` devuelve 200 con `user.id` y envía email de verificación.
- **AC-1.1.2** Signup con email duplicado: devuelve 400 con `msg = "User already registered"`.
- **AC-1.1.3** Contraseña < 8 chars o sin número: el cliente bloquea el submit con mensaje inline antes de llamar a Supabase.
- **AC-1.2.1** Login correcto: 200 + sesión persistida en `expo-secure-store` con key `plantir.session`.
- **AC-1.2.2** Login incorrecto: 400 con mensaje genérico (no expone si el email existe).
- **AC-1.2.3** App arrancada con sesión válida: el usuario llega a `TripsHome` en < 1.5 s p95 (cold start con sesión).
- **AC-1.2.4** Token expirado (> 1 h de inactividad): la app intenta refresh silencioso; si falla, redirige a `/welcome?next=<ruta>`.
- **AC-1.3.1** Logout elimina `plantir.session` de `SecureStore` y `supabase.auth.signOut()` se invoca.
- **AC-1.4.1** Cambio de `display_name` se refleja en el header del `TripDashboard` y en la lista de miembros en < 2 s (vía Realtime).
- **AC-1.4.2** Avatar por URL: la app intenta cargar la URL con `Image`; si falla, muestra iniciales sobre color de fondo determinístico (hash del user_id).

### 6.2 E2 — Viajes

- **AC-2.1.1** Crear viaje con nombre "Esquiada 2026", moneda `EUR`, descripción vacía: el `Trip` se crea con `status = group_created`, `created_by = user.id`, y el `TripMember` del owner se crea automáticamente.
- **AC-2.1.2** Nombre > 80 chars: el cliente trunca o muestra error (decisión: error inline con contador restante).
- **AC-2.1.3** Moneda no en lista ISO-4217 cerrada (la lista MVP contiene `EUR, USD, GBP, MXN, ARS, COP, CLP, PEN, BRL, JPY, CHF, CAD`): el cliente bloquea el submit.
- **AC-2.1.4** Crear viaje devuelve 201 con `trip.id` y el cliente navega a `TripDashboard` con transición animada < 300 ms.
- **AC-2.2.1** `TripsHome` lista todos los `Trip` donde el usuario es `TripMember` (RLS lo garantiza), ordenados por `decided_date` asc (null al final), luego `created_at` desc.
- **AC-2.2.2** Si `trips.length === 0` y `loading === false`: se renderiza `EmptyState` con copy y CTA.
- **AC-2.3.1** Solo `owner` ve el botón "Editar viaje". `member` recibe 403 si intenta por API directa.
- **AC-2.3.2** Editar cover URL: la imagen se precachea con `expo-image` para evitar flash.
- **AC-2.4.1** Cerrar viaje requiere confirmación modal con texto "Cerrar el viaje archivará los datos. ¿Continuar?".
- **AC-2.4.2** Tras cerrar, el viaje aparece en `TripsHome` bajo filtro "Archivados" (default: oculto) y `status = closed`, `closed_at = now()`.
- **AC-2.4.3** Backend rechaza cerrar si balances ≠ 0 con 409 `code = "non_zero_balances"`. El cliente muestra "Hay balances pendientes. Liquídalos antes de cerrar.".

### 6.3 E3 — Miembros

- **AC-3.1.1** Generar link: `POST /rest/v1/trip_invites` (vía Edge Function) crea el registro con `token` de 32 bytes random (`crypto.getRandomValues`), `expires_at = now() + 14d`, `max_uses = 50`.
- **AC-3.1.2** El token es **URL-safe** y se hashea antes de almacenar (columna `token_hash`); el valor en claro se devuelve **una sola vez** al owner.
- **AC-3.1.3** Link activo visible para owner: muestra `expires_at` en formato `DD MMM YYYY` y `uses/max_uses`.
- **AC-3.1.4** Revocar link: `revoked = true` y deja de aceptar aceptaciones; intento de uso devuelve 410.
- **AC-3.2.1** Deep link `https://plantir.app/invite/<token>` abre la app vía `Linking` (iOS Universal Links + Android App Links); si la app no está instalada → Store.
- **AC-3.2.2** Aceptar link válido: crea `TripMember` y notifica in-app con toast. Si el usuario ya es miembro, no duplica (idempotente vía `unique(trip_id, user_id)`).
- **AC-3.2.3** Link expirado / revocado / agotado: pantalla de error con copy + CTA "Pedir nuevo link al organizador" (deep link a WhatsApp del owner si tenemos el teléfono, v1).
- **AC-3.2.4** Link usado por usuario no logueado: redirige a `/welcome?next=/invite/<token>` y, tras signup, completa el join sin pedir el link de nuevo (token guardado en `AsyncStorage` durante ≤ 1 h).
- **AC-3.3.1** Lista de miembros muestra `display_name` + `avatar_url` actualizados (no cache > 5 min).
- **AC-3.4.1** Salir del viaje elimina `TripMember`; los `Expense` pagados por el usuario **se preservan** (ver `user_id` queda pero el `display_name` se mantiene histórico).

### 6.4 E4 — Date poll

- **AC-4.1.1** Abrir poll: `Trip.status` pasa de `group_created` a `voting_dates` y se crea `DatePoll` (1 por `Trip`, constraint `unique(trip_id)`).
- **AC-4.1.2** Botón visible solo para `owner`; si el owner ya pulsó, no aparece más.
- **AC-4.2.1** Owner añade fechas en rango [hoy, hoy + 18 meses]: el date picker lo impide (constraint UI). Backend rechaza fechas fuera de rango con 400.
- **AC-4.2.2** Owner añade > 30 opciones: error "Máximo 30 opciones".
- **AC-4.2.3** Owner añade 0 opciones: botón "Listo" deshabilitado.
- **AC-4.3.1** Votar `yes` / `no` / `maybe`: persiste vía upsert en `DateVote`. Cambio de voto = mismo upsert.
- **AC-4.3.2** Heatmap: matriz `DateOption × User` con celda de 3 colores (`yes` verde, `maybe` ámbar, `no` rojo, sin voto gris). Orden de filas = `sum_yes desc`. Orden de columnas = `date asc`.
- **AC-4.3.3** Realtime: el cambio de voto de otro miembro se refleja en mi UI en < 2 s.
- **AC-4.4.1** Owner ve el ranking con `sum_yes desc, sum_maybe desc, date asc`.
- **AC-4.4.2** Owner elige una fecha: `Trip.decided_date = selected`, `Trip.status = date_decided`, `DatePoll.closed_at = now()`. Las inserciones posteriores en `DateVote` devuelven 410.
- **AC-4.4.3** Email resumen enviado a todos los miembros (vía Edge Function) con la fecha y próximos pasos.

### 6.5 E5 — Destination poll

- **AC-5.1.1** Botón "Empezar a votar destino" visible para cualquier miembro cuando `status = date_decided`.
- **AC-5.2.1** Proponer destino: `title` 1-80, `description` ≤ 500, `url` opcional (validada con regex `^https?://`). Si `url` no es válida, error inline.
- **AC-5.2.2** Límite de 5 propuestas por miembro: al crear la 6ª, error 400 `code = "max_proposals_reached"`.
- **AC-5.3.1** Voto 👍 / 👎: upsert en `DestinationVote`. El ranking `(up - down) desc, created_at asc` se actualiza en cliente.
- **AC-5.3.2** Realtime: votos de otros se reflejan en < 2 s.
- **AC-5.4.1** Owner elige destino: `Trip.decided_destination_id = proposal_id`, `Trip.status = place_decided`, propuestas cerradas (no se aceptan más).
- **AC-5.4.2** El destino elegido se muestra en el header del `TripDashboard` con título, descripción, URL (tappable) y autor (`created_by`).

### 6.6 E6 — Gastos

- **AC-6.1.1** Añadir gasto: input en formato `0,00` o `0.00`, el cliente convierte a `cents` con `Math.round(amount * 100)` (validado contra string parseado). Error si el parse falla.
- **AC-6.1.2** `amount_cents > 0` siempre (no se permiten gastos de 0 € en MVP).
- **AC-6.1.3** Splits iguales: con N miembros incluidos, `share_cents = floor(amount_cents / N)`. El remanente (`amount_cents - sum(shares)`) se reparte +1 céntimo a los primeros K miembros por orden alfabético de `display_name`, donde `K = amount_cents - N*floor(amount_cents/N)`.
- **AC-6.1.4** Test invariante: `sum(ExpenseSplit.share_cents where included) == Expense.amount_cents` para cada `Expense`. Cobertura: 100% de gastos creados.
- **AC-6.2.1** Excluir miembros: el cliente recalcula shares localmente antes de persistir.
- **AC-6.2.2** Mínimo 1 miembro incluido (el cliente bloquea si se queda vacío).
- **AC-6.3.1** Lista de gastos: orden `occurred_on desc, created_at desc`. Cada row muestra: título, monto formateado, avatar del pagador, fecha corta, icono de categoría.
- **AC-6.3.2** Filtro por pagador: la lista se filtra server-side (RLS-safe). Filtro por categoría: idem.
- **AC-6.3.3** Empty state: si no hay gastos, copy "Aún no hay gastos. Añade el primero." + CTA.
- **AC-6.4.1** Editar gasto: solo permitido a `created_by` o `owner` del viaje (validado en backend).
- **AC-6.4.2** Borrar gasto: confirmación "¿Borrar este gasto? Se actualizarán los balances."; al confirmar, cascade delete de `ExpenseSplit`.

### 6.7 E7 — Balances y settlements

- **AC-7.1.1** Mi balance: `balance = sum(paid_by_me) - sum(my_share_in_all_expenses)`. Cálculo en cliente.
- **AC-7.1.2** Formato: "Te deben 145,67 €" (positivo, verde) o "Debes 23,50 €" (negativo, rojo) o "Estás en paz" (cero).
- **AC-7.2.1** Tabla de balances: columnas `miembro | pagado | cuota | neto`, orden `neto desc` (más acreedor arriba). Total al pie = 0 (test invariante).
- **AC-7.3.1** Algoritmo **greedy min cash flow**:
  1. Calcular `net[i] = paid[i] - owed[i]` para cada miembro.
  2. Separar en deudores (`net < 0`) y acreedores (`net > 0`).
  3. Mientras haya ambos no vacíos: tomar el deudor con mayor deuda y el acreedor con mayor crédito; crear settlement `deudor → acreedor : min(|net_deudor|, net_acreedor)`; actualizar ambos.
  4. Terminar cuando todos los `net = 0`.
- **AC-7.3.2** Test: en un viaje de 4 personas con gastos que dan balances `(+100, +50, -80, -70)`, el algoritmo produce exactamente 2 settlements: `C → A: 80, D → A: 20, D → B: 50` (o equivalente mínimo). Cobertura: 100% de combinaciones 2-10 miembros con 1-50 gastos (test de propiedad con fast-check o similar).
- **AC-7.3.3** El número de settlements es **≤ N-1** donde N = número de miembros con balance no cero (propiedad teórica del greedy).
- **AC-7.3.4** Tap en un settlement → bottom sheet con "Copiar como texto" (formato: "A → B: 23,50 €") y "Compartir por WhatsApp" (deep link `whatsapp://send?text=...`).

### 6.8 E8 — State machine

- **AC-8.1.1** `TripDashboard` muestra un `ProgressStepper` con los 9 estados, marcando el actual con color de marca y los pasados con check.
- **AC-8.1.2** Cualquier transición no listada en §4 US-8.1 devuelve 409 con `code = "invalid_state_transition"`.
- **AC-8.1.3** El cliente oculta los CTAs de transición si la transición no está permitida (no muestra botones que devuelvan 409).

### 6.9 Criterios transversales

- **AC-X.1 RLS:** cada tabla tiene RLS que garantiza que un usuario solo lee/escribe filas de viajes donde es `TripMember`. Test: 1 query de prueba por tabla con un usuario sin membresía esperando 0 filas.
- **AC-X.2 Realtime:** las tablas `DateVote`, `DestinationVote`, `Expense`, `ExpenseSplit`, `TripMember` tienen suscripciones Realtime activas en el cliente para los viajes visibles. Latencia objetivo: < 2 s.
- **AC-X.3 Algoritmos puros:** `datePoll`, `destinationsRanking`, `expenseSplitsEqual`, `balances`, `settlements` viven en `src/lib/algorithms/*` como funciones puras, sin I/O. Tests unitarios con cobertura ≥ 90%.
- **AC-X.4 Performance:** el `TripDashboard` carga completamente en p95 < 1.5 s en 4G, con hasta 30 miembros, 30 gastos y 50 votos por poll.
- **AC-X.5 Errores:** cualquier fallo de red muestra `ErrorState` con botón "Reintentar". No se silencian errores.
- **AC-X.6 Accesibilidad:** todos los botones tienen `accessibilityLabel`, contraste AA, touch targets ≥ 44pt (delegado a `ux-designer` validar pixel a pixel).

---

## 7. Riesgos del producto y mitigación

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Adopción baja del link de invitación**: los amigos no se instalan la app solo por una invitación. | Alta | Alto | Deep link abre la app aunque no la tengan (Store). Hacer el signup en < 60 s. Email+password rápido. Onboarding de 1 pantalla tras signup. |
| R2 | **Grupos se quedan en `voting_dates` sin elegir fecha**: el owner procrastina. | Alta | Medio | Email recordatorio a los 3 días sin acción. Notificación in-app a los 7 días. v1: push reminders. |
| R3 | **Balances mal calculados por bugs en el algoritmo de splits**: el invariante `sum(splits) == amount` falla. | Media | Crítico (pierde confianza) | Test invariante en CI obligatorio (AC-6.1.4). Tests de propiedad con fast-check. Sentry alerting si el check falla en runtime. |
| R4 | **El algoritmo de settlements no es óptimo y los usuarios se quejan de "pagos innecesarios"**. | Media | Medio | Greedy min cash flow es el estándar (Splitwise, Tricount). Documentar en help-center. Ofrecer siempre el detalle "X te debe 23,50 €" para que se entienda. |
| R5 | **Privacidad / RLS mal configurado**: un usuario ve gastos de otro viaje. | Baja | Crítico (legal) | Checklist obligatorio de RLS por tabla en CI. Tests adversariales con usuarios cruzados. Auditoría manual pre-lanzamiento. |
| R6 | **Spam / abuso de links de invitación**: alguien genera links y los comparte en grupos ajenos. | Media | Medio | `max_uses = 50` y expiración 14 días. v1: reportar link. v2: rate limit por user. |
| R7 | **Usuarios abandonan por fricción de signup**: la app pide email + contraseña y eso ya es mucho. | Alta | Alto | **Decisión:** en MVP no hay atajo. **Mitigación:** UI pulida, signup en 3 campos (email, password, display_name). v1: magic link + OAuth. |
| R8 | **Grupos grandes (15-20 personas) hacen el date poll inmanejable** (> 30 opciones × 20 miembros = 600 celdas). | Baja | Medio | Límite MVP: 30 opciones. v1: vista "summary" con top-5 fechas en lugar de heatmap completo. |
| R9 | **El owner cierra el viaje con balances sin saldar** → los miembros pierden visibilidad de deudas. | Media | Medio | AC-2.4.3: backend rechaza cerrar con balances ≠ 0. UI ofrece "marcar como acuerdo verbal" (v1) sin cerrar. |
| R10 | **Currency / i18n**: viajeros en zona euro con "," decimal se confunden con "." anglosajón. | Alta | Bajo | El cliente muestra SIEMPRE el formato local del usuario (`Intl.NumberFormat` con su locale). Backend siempre `cents` (integer). |
| R11 | **Cambio de fecha/hora del dispositivo engaña al poll**: usuario cambia reloj y vota en el pasado. | Baja | Bajo | Backend usa `now()` del servidor, no del cliente. UI muestra timestamps en zona del servidor. |
| R12 | **Pérdida de la sesión de Supabase** en el momento crítico (mitad de un poll). | Baja | Alto | Token refresh silencioso (AC-1.2.4). Si falla, el cliente guarda el estado del formulario en `AsyncStorage` y lo restaura tras re-login. |
| R13 | **El target instala la app por curiosidad, no crea viaje, no invita a nadie** → baja activación. | Alta | Alto | `TripsHome` con empty state claro + CTA. Onboarding primer-arranque con 2 pantallas: "Crea un viaje" y "Recibe una invitación". v1: emails drip post-signup. |
| R14 | **Dependencia de WhatsApp para la comunicación**: si el target migra a otra app, perdemos el canal. | Baja | Medio | El link es universal; no asumimos cliente específico. Funciona en SMS, email, Telegram. |
| R15 | **Cambios en pricing de Supabase / App Store** que afecten unit economics. | Baja | Medio | Monitorizar métricas. Plan B: migrar a backend propio. Documentar arquitectura para portabilidad (ver §3.4). |
| R16 | **Falsa sensación de "viaje cerrado"** porque el owner no sabe que la app calcula balances. | Media | Medio | Onboarding post-cierre explica "El balance de Marcos es +145 €, ahora puede pediros el pago". |

---

## 8. Definition of Done por feature

> Una feature está **hecha** cuando cumple los 4 niveles. Esto lo verifican `qa-engineer` y `verifier` por separado.

### DoD nivel 1 — Producto (este PRD)

- [ ] Existe épica + US + criterios de aceptación en `docs/01-product/prd.md` (este doc).
- [ ] La feature está marcada como `IN` en §5.2.
- [ ] Si está cortada, aparece en §5.3 con razón.

### DoD nivel 2 — UX

- [ ] Existe el flujo pantalla por pantalla en `docs/01-ux/flows.md` con los 4 estados (loading / empty / error / success) o justificación explícita.
- [ ] Existe inventario de componentes nuevos en `docs/01-ux/components.md` con props TS.
- [ ] Microcopy revisada por `ux-designer` (tuteo, cálido, directo, sin marketing vacío).
- [ ] Accesibilidad: touch targets ≥ 44pt, contraste AA, `accessibilityLabel` en cada control.

### DoD nivel 3 — Arquitectura + Implementación

- [ ] Contratos TS en `src/types/index.ts` (o equivalente) para todas las entidades que toca la feature.
- [ ] Algoritmos puros en `src/lib/algorithms/*` sin I/O, con tests unitarios ≥ 90% cobertura.
- [ ] Servicio en `src/services/<feature>Service.ts` con funciones tipadas que llaman a Supabase o Edge Functions.
- [ ] RLS definida y probada con tests adversariales.
- [ ] Realtime subscrito si aplica (lista en AC-X.2).
- [ ] Manejo de errores tipado (`Result<T, AppError>` o equivalente; ver decisión de `mobile-architect`).
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] `eslint .` pasa sin warnings.

### DoD nivel 4 — QA + Lanzamiento

- [ ] Tests E2E (Maestro) cubren el happy path de la feature.
- [ ] Test del invariante crítico (cuando aplique) en CI.
- [ ] Sentry configurado para capturar errores de la feature.
- [ ] Crash-free sessions ≥ 99.5% en staging.
- [ ] Telemetry: la feature emite eventos `feature_used`, `feature_completed`, `feature_failed` con propiedades mínimas (ver §1.4).
- [ ] Documentación in-app (tooltips o pantalla de ayuda) revisada.
- [ ] Code review aprobado por al menos 1 reviewer distinto del autor.
- [ ] Merge a `main` con CI verde.

---

## 9. Suposiciones explícitas

> Esta sección es **crítica**: cualquier supuesto no listado aquí y que resulte falso en validación es un riesgo de producto que el equipo debe aceptar o renegociar.

### 9.1 Sobre los usuarios

- **A1.** El target principal (Lucía, 27, Madrid) tiene iPhone con iOS 15+ o Android 9+. Asumimos que cubren el 95% del target. Excluimos iOS 12-14 y Android 7-8 a propósito (ver §2.2).
- **A2.** El grupo promedio tiene **5-8 personas** y la cola larga es hasta **15 personas** (límite duro de miembros: ver A3). Grupos de > 15 son raros en el target.
- **A3.** El **número máximo de miembros por viaje en MVP es 15**. Más allá: RLS y Realtime escalan pero el UI de voting y balances se vuelve ilegible. v1 lo reconsidera con datos.
- **A4.** El target está dispuesto a instalar una app nueva para un viaje si el organizador insiste. Si no es así, no hay producto.
- **A5.** El target prefiere una sola app con todo a varias apps especializadas (Tricount + Doodle + Excel). Asumimos que la promesa "una app" es吸引力.
- **A6.** Los usuarios hablan español como L1 o L2 funcional. No hay i18n en MVP (todos los textos son ES). v1: EN, v2: PT, FR.

### 9.2 Sobre el comportamiento

- **A7.** El **rol de "owner" se mantiene durante todo el viaje**. No hay co-organizadores en MVP. (Transferir ownership es v1.)
- **A8.** Los miembros del grupo **ya se conocen** (no es un marketplace de陌生人). Esto relaja KYC y reputación.
- **A9.** El "social" del grupo (chismes, drama) ocurre en WhatsApp. No intentamos replicarlo.
- **A10.** El **promedio de gastos por viaje es 6-15** (basado en estudios de Tricount para grupos de 5-10). Lista de gastos < 50 cubre el 95% de casos.
- **A11.** El owner decide, los miembros votan. La gobernanza es jerárquica, no democrática.
- **A12.** El usuario **siempre va a querer cerrar el viaje manualmente**. No automatizamos el cierre por fecha porque el viaje "termina" cuando el owner lo decide.

### 9.3 Sobre el producto

- **A13.** El **idioma de la app es español** en MVP. No hay i18n. v1 añade EN.
- **A14.** La **moneda es fija por viaje**. Una viaje no cambia de moneda.
- **A15.** **No integramos chat in-app** ni notificaciones espejo de WhatsApp. La comunicación del grupo queda fuera de la app.
- **A16.** **No integramos reservas** (vuelos, hoteles, coches). El campo `url` en `DestinationProposal` es un deep link manual.
- **A17.** El algoritmo de elección de fecha/destino es **manual** (owner elige), no automático. Esto es coherente con la jerarquía de A11.
- **A18.** **Una sola foto de cover por viaje** vía URL externa. Sin storage propio en MVP.
- **A19.** **Sin onboarding largo**. Primera apertura: 1 pantalla "Crea un viaje o espera una invitación" + CTA.
- **A20.** **Sin analytics third-party** en MVP (sin Mixpanel, Amplitude, etc.) más allá de Sentry para errores. Privacidad: no se comparten datos con terceros en MVP. v1: revisar.

### 9.4 Sobre el stack

- **A21.** Supabase Free Tier aguanta los primeros 5.000 usuarios activos (límites: 500 MB DB, 1 GB Storage, 2 GB bandwidth). Asumimos que no llegamos al límite en mes 3. Si llegamos, upgrade a Pro ($25/mes) es trivial.
- **A22.** Expo (managed workflow) es suficiente para MVP. No necesitamos bare workflow.
- **A23.** React Native 0.73+ con Hermes es estable para iOS + Android. No hay issues conocidos con nuestras dependencias (RHF, Zod, TanStack Query, Zustand, date-fns, Supabase JS).
- **A24.** **Zod 3.x** es compatible con `react-hook-form` vía `@hookform/resolvers/zod`.
- **A25.** La **realtime de Supabase** escala al nº esperado de miembros (≤ 15) y gastos (≤ 50) por viaje sin tuning.

### 9.5 Sobre el mercado

- **A26.** El target no está satisfecho con las alternativas (Tricount + Doodle + WhatsApp) — **hay hueco**. Esto se valida con el primer lanzamiento.
- **A27.** No competimos con **Splitwise** (es para roommates recurrentes) ni con **Wanderlog** (es para viajes individuales). Somos el "Tricount + Doodle" especializado en viajes de grupo.
- **A28.** No hay **App Store policy** que prohíba links a Airbnb/Booking u otros externos. Esto se re-verifica antes de submit.

### 9.6 Suposiciones **explícitamente falsas o débiles** (que requieren validación)

- **A29 (débil):** los usuarios votan dentro de la app. **Riesgo:** votan por WhatsApp y el owner decide "a ojo". **Mitigación:** v1 tiene un fallback "el owner registra el resultado del WhatsApp".
- **A30 (débil):** los grupos ya creados en WhatsApp migran fácilmente a Plantir. **Riesgo:** fricción de adopción alta. **Mitigación:** email drip post-signup explicando el flujo.
- **A31 (débil):** 5.000 descargas en mes 3 es alcanzable. **Riesgo:** organic growth es lento. **Mitigación:** canal de growth (TikTok, IG) en mes 2.

---

## Anexo A — Glosario

| Término | Definición |
|---|---|
| **Trip** | Viaje. Unidad de organización de un grupo. |
| **TripMember** | Membresía de un usuario en un viaje. |
| **TripInvite** | Link de invitación. |
| **DatePoll** | Encuesta de fechas de un viaje. |
| **DateOption** | Una fecha concreta dentro de un `DatePoll`. |
| **DateVote** | Voto de un miembro sobre una `DateOption` (yes/no/maybe). |
| **DestinationProposal** | Destino propuesto por un miembro. |
| **DestinationVote** | Voto 👍/👎 sobre una `DestinationProposal`. |
| **Expense** | Gasto. |
| **ExpenseSplit** | Reparto de un `Expense` entre miembros. |
| **Settlement** | Sugerencia de pago entre dos miembros para saldar balances. |
| **Balance** | `pagado_por_mí - mi_cuota_de_todos_los_gastos`. |
| **Owner** | Miembro del viaje con permisos de administración. |
| **Member** | Miembro del viaje sin permisos de owner. |
| **RLS** | Row Level Security (Supabase/Postgres). |
| **MVP** | Minimum Viable Product. |
| **AC** | Acceptance Criteria (criterio de aceptación). |
| **US** | User Story. |

---

## Anexo B — Cambios respecto a versiones anteriores

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-06-01 | Versión inicial para Fase 1. |

---

**Fin del PRD v1.0.**
