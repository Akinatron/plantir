# Checklist manual pre-release — Plantir

> **Documento:** `docs/02-qa/manual-checklist.md`
> **Fase:** 2 — Datos, Algoritmos y QA.
> **Uso:** ejecutable por un humano (o un script con Maestro) en cada release candidate. Marca cada ítem con `[x]` solo si pasa. Si un ítem falla, abrir un bug con severidad y bloquear el release.
> **Severidad:** 🔴 blocker / critical · 🟠 major · 🟡 minor · 🔵 info.
> **Dispositivos mínimos:** iPhone SE (pantalla pequeña, 4.7"), Pixel 4a (Android), iPad mini (tablet, opcional). Ver §0.
> **Versiones:** iOS 15+ y Android 9+ (línea base del PRD §2.2 / §9.1). Se documenta si algún ítem es solo iOS o solo Android.
> **Entorno:** build apuntando a Supabase **staging** con seed de datos limpios (ver §15.0).
> **Idioma:** español. Toda la UI debe ser en español (ver A13 del PRD).

---

## Índice

- [0. Setup y prerrequisitos](#0-setup-y-prerrequisitos)
- [1. Auth (E1)](#1-auth-e1)
- [2. Crear viaje (E2)](#2-crear-viaje-e2)
- [3. Invitar miembros (E3)](#3-invitar-miembros-e3)
- [4. Votar fechas (E4)](#4-votar-fechas-e4)
- [5. Elegir fecha (E4)](#5-elegir-fecha-e4)
- [6. Votar sitio (E5)](#6-votar-sitio-e5)
- [7. Elegir sitio (E5)](#7-elegir-sitio-e5)
- [8. Añadir gasto (E6)](#8-añadir-gasto-e6)
- [9. Ver balances (E7)](#9-ver-balances-e7)
- [10. Ver settlements (E7)](#10-ver-settlements-e7)
- [11. Marcar pago (v1, no MVP)](#11-marcar-pago-v1-no-mvp)
- [12. Edge cases](#12-edge-cases)
- [13. Seguridad](#13-seguridad)
- [14. Accesibilidad](#14-accesibilidad)
- [15. Performance](#15-performance)
- [16. Telemetría y errores](#16-telemetría-y-errores)
- [17. Cierre del checklist](#17-cierre-del-checklist)

---

## 0. Setup y prerrequisitos

Antes de empezar, verificar:

- [ ] 🔴 Build firmado apunta a Supabase **staging** (no producción). `EXPO_PUBLIC_SUPABASE_URL` contiene `staging`.
- [ ] 🔴 Seed de staging aplicado: 0 usuarios, 0 viajes, 0 gastos, 0 invites. `select count(*) from auth.users` devuelve 0; idem en `trips`, `expenses`, `trip_invites`.
- [ ] 🔴 Devices disponibles y cargados > 80 %: iPhone SE (iOS 15+), Pixel 4a (Android 9+), iPad mini (opcional, iPadOS 15+).
- [ ] 🔴 Versión de la app instalada coincide con el build (`eas build --version`).
- [ ] 🟠 Conectividad: 4G simulado en device (no Wi-Fi de oficina). El test de performance usa 4G.
- [ ] 🟠 Sentry del proyecto accesible: `sentry.io/organizations/plantir/issues/`.
- [ ] 🟠 Logout previo de cualquier cuenta en el device.
- [ ] 🟠 Tabla `bugs_release_1.0.0` creada en el tracker (Linear / Jira / GitHub Projects) con plantilla `{ sev, screen, steps, expected, actual, device }`.
- [ ] 🔵 Dos cuentas de test pre-creadas: `qa-owner@plantir.test` y `qa-member@plantir.test` (ver §15.0 para credenciales en vault).
- [ ] 🔵 Carpeta de screenshots: `qa-screenshots/release-1.0.0/<feature>/<caso>.png`.

---

## 1. Auth (E1)

> Ejecutar: en iPhone SE y Pixel 4a. Una vez por device.

- [ ] 🔴 **AC-1.1.1** Como nuevo usuario en `/welcome`, pulso "Crear cuenta", introduzco `qa-new-<timestamp>@plantir.test` + contraseña `Test1234`, display_name "QA Nuevo", verifico copy legal, pulso "Crear cuenta" → veo pantalla "Verifica tu correo" en < 5 s.
- [ ] 🔴 **AC-1.1.2** Repetir el signup con el mismo email → veo error legible "Este email ya está registrado. ¿Quieres iniciar sesión?" con CTA a login. No distingo si el email existe antes del signup (no enumeration), pero el error post-intento sí.
- [ ] 🔴 **AC-1.1.3** Contraseña `Test12` (7 chars) → el cliente bloquea el submit con `errorText` inline "Mínimo 8 caracteres y al menos 1 número". Nunca llega a la red.
- [ ] 🔴 **AC-1.2.1** Logout, vuelvo a `/welcome`, pulso "Entrar", introduzco credenciales correctas de `qa-owner@plantir.test` → llego a `TripsHome` en < 1.5 s p95 (medir con `performance.now()` desde tap hasta render de la lista).
- [ ] 🔴 **AC-1.2.2** Login con `qa-owner@plantir.test` + contraseña incorrecta → toast "Email o contraseña incorrectos." El mensaje NO distingue email vs password.
- [ ] 🔴 **AC-1.2.3** App cerrada (kill completo), reopen → llego a `TripsHome` directo, sin pasar por `/welcome`. La sesión persistida en SecureStore funciona.
- [ ] 🔴 **AC-1.2.4** Invalido manualmente la sesión en el dashboard de Supabase (`select pg_terminate_backend(pid) from pg_stat_activity where usename = current_user`), hago una acción en la app → la app intenta refresh silencioso. Si falla, redirige a `/welcome?next=<ruta-original>` y restaura el draft del form.
- [ ] 🔴 **AC-1.3.1** En cualquier pantalla autenticada, voy a Perfil → "Cerrar sesión" → vuelvo a `/welcome` y la próxima vez que abro la app NO estoy logueado.
- [ ] 🟠 Cambio `display_name` a "QA Owner Editado" en `/profile` → el cambio se refleja en el header del `TripsHome` en < 2 s (Realtime).
- [ ] 🟠 Avatar con URL rota (`https://invalid.example/404.png`) → muestra iniciales "QO" sobre color determinístico (hash del user_id).
- [ ] 🟠 Botón "Ver" del campo contraseña en login funciona (toggle visible/oculto).
- [ ] 🟠 `autoComplete="email"` y `autoComplete="password"` en campos (verificar con autofill del sistema iOS/Android).
- [ ] 🔵 El endpoint de Supabase Auth NO está expuesto a internet más allá de `*.supabase.co`.

---

## 2. Crear viaje (E2)

> Ejecutar: con sesión de `qa-owner@plantir.test` en iPhone SE y Pixel 4a.

- [ ] 🔴 **AC-2.1.1** En `TripsHome` pulso "+" → introduzco nombre "QA Viaje Smoke", descripción vacía, moneda EUR (default), cover URL omitida → pulso "Crear" → entra al `TripDashboard` en < 1.5 s con `status = group_created` visible en el `ProgressStepper`.
- [ ] 🔴 **AC-2.1.2** Nombre con 81 chars → veo error inline con contador "1 carácter de más". No se crea el viaje.
- [ ] 🔴 **AC-2.1.3** Moneda `XYZ` (no en lista cerrada) → la lista no la muestra (selector no la permite).
- [ ] 🔴 **AC-2.1.4** Tras crear, el owner aparece automáticamente en la lista de miembros con badge "Organizador".
- [ ] 🟠 Descripción con 501 chars → error inline con contador. ≤ 500 chars → ok.
- [ ] 🟠 Cover URL con imagen rota → fallback a color base del `Card` (no crash).
- [ ] 🟠 **AC-2.2.2** `TripsHome` vacío (sin viajes) → `EmptyState` con copy "Crea tu primer viaje o espera a que te inviten" + CTA "+ Nuevo viaje".
- [ ] 🟠 **AC-2.2.1** Tras crear 3 viajes, vuelvo a `TripsHome` → veo los 3 ordenados por próxima fecha decidida (null al final), luego `created_at desc`.
- [ ] 🟠 **AC-2.3.1** Como `qa-member@plantir.test` (no owner) no veo el icono ⚙️ → "Editar viaje" en el dashboard. Si intento por API directa (DevTools / Postman), recibo 403.
- [ ] 🟠 Editar nombre del viaje a "QA Viaje Smoke Editado" → el cambio se refleja en `TripsHome` de los otros miembros en < 5 s (Realtime o pull-to-refresh).
- [ ] 🔵 Cambio de moneda está BLOQUEADO en la UI (deshabilitado, con tooltip "Fija en creación"). La API directa también rechaza 409.

---

## 3. Invitar miembros (E3)

> Ejecutar: con sesión de `qa-owner@plantir.test` en el viaje "QA Viaje Smoke" en iPhone SE.

- [ ] 🔴 **AC-3.1.1** Pulso "Invitar" → "Generar link" → veo el link con formato `https://app.plantir.app/invite/<token>` y CTAs "Copiar" y "Compartir".
- [ ] 🔴 **AC-3.1.2** El token tiene ≥ 32 caracteres (≥ 128 bits) y NO contiene el email del invitado. Verifico en DevTools/Network que el response del endpoint NO loguea el token en claro en consola.
- [ ] 🔴 **AC-3.1.3** Link activo muestra `expira el DD MMM YYYY` y `0/50 usos`.
- [ ] 🔴 **AC-3.1.4** Pulso "Revocar" → `revoked = true`. Intento usar el link desde otro device (sin haberlo recargado): da error con copy "Este enlace ya no está disponible".
- [ ] 🟠 Genero 51 aceptaciones con cuentas dummy (script) → la 51ª da 410 `code = max_uses_reached`.
- [ ] 🟠 Genero link, espero 14 días (o modifico `expires_at` en DB) → al usarlo, error con copy "Este enlace ha caducado. Pide al organizador uno nuevo."
- [ ] 🔴 **AC-3.2.1** Con `qa-member@plantir.test` logueada en Pixel 4a, abro `https://app.plantir.app/invite/<token>` desde Safari/Chrome → la app abre (Universal Link / App Link), me lleva al dashboard con toast "Te has unido a QA Viaje Smoke".
- [ ] 🔴 **AC-3.2.2** Aceptar el mismo link 2 veces con el mismo user → idempotente: solo 1 `TripMember`. No error, no duplicado.
- [ ] 🔴 **AC-3.2.3** Link revocado / expirado / agotado → `ErrorState` con copy + CTA "Pedir nuevo link al organizador".
- [ ] 🔴 **AC-3.2.4** Sin sesión, abro el link → `/welcome?next=/invite/<token>`. Tras signup/login, completa el join sin pedir el link de nuevo (token en `AsyncStorage` ≤ 1 h).
- [ ] 🟠 **AC-3.3.1** La lista de miembros muestra 2 personas (`qa-owner` y `qa-member`) con avatar o iniciales, badge "Organizador" en el owner, ordenadas por `joined_at asc`.
- [ ] 🟠 **AC-3.4.1** Como `qa-member`, voy a Miembros → ⋮ → "Salir del viaje" → confirmación → mi `TripMember` desaparece. Los gastos que yo pagué SIGUEN mostrándose con mi nombre histórico en el balance de los demás (verifico en pantalla de balances).

---

## 4. Votar fechas (E4)

> Ejecutar: viaje en `voting_dates` con 5 miembros fake creados por script (3 además de owner+member). En iPhone SE y Pixel 4a en paralelo para probar Realtime.

- [ ] 🔴 **AC-4.1.1** Como owner, en un viaje en `group_created`, pulso "Empezar a votar fechas" → estado pasa a `voting_dates`, se crea 1 `DatePoll` y entro a `DatePollResults`.
- [ ] 🔴 **AC-4.1.2** El botón "Empezar a votar fechas" no aparece para `member` (RLS o UI).
- [ ] 🔴 **AC-4.2.1** Como owner en `DatePollSetup`, pulso "Añadir fecha", selecciono una fecha de hace 30 días → el date picker no me deja (constraint UI).
- [ ] 🔴 **AC-4.2.1b** (Backend) Modifico el payload manualmente (DevTools) y envío una fecha de hace 30 días → el backend responde 400 con copy "Las fechas deben estar entre hoy y hoy + 18 meses".
- [ ] 🔴 **AC-4.2.2** Añado 31 opciones → error "Máximo 30 opciones".
- [ ] 🟠 **AC-4.2.3** 0 opciones → botón "Listo" deshabilitado.
- [ ] 🟠 Añado 5 fechas entre hoy y hoy + 6 meses, cada una con nota opcional. Pulso "Listo" → todos los miembros ven `DatePollResults` con CTA "Votar".
- [ ] 🔴 **AC-4.3.1** Como `qa-member`, voto `yes` en fecha 1, `maybe` en fecha 2, `no` en fecha 3 → los botones se resaltan y los contadores `5 sí / 1 no / 1 quizá` se actualizan en mi UI.
- [ ] 🔴 **AC-4.3.2** El heatmap muestra matriz `DateOption × User` con celdas verde/ámbar/rojo/gris. Filas ordenadas por `sum_yes desc`.
- [ ] 🔴 **AC-4.3.3** **Realtime**: con owner en iPhone y member en Pixel, el member vota `yes` en fecha 1 → el heatmap del owner refleja el cambio en < 2 s sin pull-to-refresh.
- [ ] 🔴 **AC-4.4.1** Como owner, veo el ranking de fechas por `sum_yes desc, sum_maybe desc, date asc`. Modal "Cerrar y elegir fecha" muestra el orden.
- [ ] 🟠 Sin haber votado nadie, owner cierra → puede elegir igualmente; aparece warning "Ninguna fecha tiene mayoría".
- [ ] 🔵 Voto duplicado (mismo user + misma fecha): el segundo voto es upsert, no se crea un row adicional. Verifico en DB: `select count(*) from date_availability_votes where user_id = ... and day = ...` devuelve 1.

---

## 5. Elegir fecha (E4)

> Ejecutar: continuación del flujo anterior. Una vez por device.

- [ ] 🔴 **AC-4.4.2** Como owner, selecciono fecha "1" en el modal "Cerrar y elegir fecha" → el viaje pasa a `date_decided`, `decided_date = fecha1`, el `DatePoll.closed_at = now()`. Intento votar como member después → error 410 "El poll está cerrado".
- [ ] 🔴 El `TripDashboard` muestra el `ProgressStepper` con el paso 3 de 9 marcado, fechas pasadas con check, futuro atenuado.
- [ ] 🟠 **AC-4.4.3** Email resumen llega a las 5 bandejas de entrada (verificar con `mailhog`/Mailtrap en staging; en prod, Mailgun).
- [ ] 🟠 El `DateRangeBadge` del dashboard muestra "12-15 jun · 3 noches" en formato compacto.
- [ ] 🟠 Cambio de dispositivo en mitad del setup (kill app, reopen) → el draft del form se restaura.

---

## 6. Votar sitio (E5)

> Ejecutar: viaje en `date_decided`.

- [ ] 🔴 **AC-5.1.1** Cualquier miembro ve el CTA "Empezar a votar destino" cuando `status = date_decided`. Pulsar → `status = voting_place`.
- [ ] 🔴 **AC-5.2.1** Como `qa-member`, voy a "Destinos" → "+ Proponer" → introduzco título "Casa rural Sierra", descripción "3 habitaciones", URL `https://www.airbnb.es/rooms/123` → se crea la `DestinationProposal` y aparece en la lista.
- [ ] 🔴 **AC-5.2.1b** URL `javascript:alert(1)` → error inline "URL no válida".
- [ ] 🔴 **AC-5.2.2** Propongo 6 destinos con el mismo user → la 6ª da error "Has alcanzado el máximo de 5 propuestas. Espera a que se elija destino o revisa las existentes."
- [ ] 🟠 El límite es por miembro, no por viaje: otro miembro puede proponer sin problema.
- [ ] 🔴 **AC-5.3.1** Voto 👍 y 👎 en distintas propuestas → upsert; el ranking `(up - down) desc, created_at asc` se actualiza en mi UI.
- [ ] 🔴 **AC-5.3.2** **Realtime**: votos de otros miembros en < 2 s.
- [ ] 🟠 Voto duplicado (mismo user + misma propuesta): no se duplica el row en DB.
- [ ] 🟠 El destino con más 👍 aparece el primero con un badge de rank #1.

---

## 7. Elegir sitio (E5)

> Ejecutar: continuación.

- [ ] 🔴 **AC-5.4.1** Como owner, pulso "Elegir destino" y selecciono "Casa rural Sierra" → `Trip.decided_destination_id` se setea, `status = place_decided`, no se aceptan más propuestas (botón "+ Proponer" desaparece).
- [ ] 🔴 **AC-5.4.2** El destino elegido aparece en el header del `TripDashboard` con título, descripción, URL tappable (abre en navegador del sistema) y autor ("Propuesto por QA Member").
- [ ] 🟠 El `ProgressStepper` avanza a paso 5 de 9 con check visual.
- [ ] 🟠 `place_decided → planning` es automático e inmediato (no requiere acción).
- [ ] 🔵 Voto anónimo (v1): el destino no expone quién votó (en MVP los miembros ven avatares; verificar que el ordenamiento NO filtra identidad por error en el payload).

---

## 8. Añadir gasto (E6)

> Ejecutar: viaje en `planning` con 5 miembros.

- [ ] 🔴 **AC-6.1.1** Como `qa-member`, voy a "Gastos" → "+ Añadir gasto", introduzco título "Cena del sábado", monto `45,67` (con coma decimal), fecha (default hoy), categoría "Comida", pagador: `qa-member` (yo) por defecto. Pulso "Guardar" → el gasto aparece en la lista con formato `45,67 €`.
- [ ] 🔴 **AC-6.1.3** Tras crear el gasto, abro el detalle y verifico los splits: con 5 miembros y `amount_cents = 4567`, cada split debe ser `913` céntimos, y los 2 céntimos de remanente (`4567 - 5*913 = 2`) se asignan a los 2 primeros miembros por orden alfabético de `display_name`. **Assert:** `sum(share_cents where included) == 4567` exacto.
- [ ] 🔴 **AC-6.1.2** Intento guardar un gasto de `0,00` → error inline "El importe debe ser mayor que 0".
- [ ] 🔴 **AC-6.2.1** Añado un gasto "Taxi aeropuerto" de `60,00`, excluyo a 2 miembros (los que no vinieron al aeropuerto) → splits recalculados: 3 incluidos, `60,00 / 3 = 20,00` cada uno, sin remanente.
- [ ] 🔴 **AC-6.2.2** Excluyo a todos los miembros → error "Debe haber al menos un miembro incluido".
- [ ] 🟠 **AC-6.1.4** Test invariante con script SQL: `select sum(share_cents) from expense_splits where expense_id in (select id from expenses) group by expense_id having sum(share_cents) != (select amount_cents from expenses where id = expense_id)` → 0 filas.
- [ ] 🟠 **AC-6.1.4 (propiedad)** Ejecuto `npx jest src/lib/algorithms/expenses.test.ts --testNamePattern=Property` → pasan 1 000+ iteraciones.
- [ ] 🟠 **AC-6.3.1** Lista de gastos ordenada por `occurred_on desc, created_at desc`. Filtro por pagador y por categoría funcionan server-side.
- [ ] 🟠 **AC-6.4.1** Como `qa-member` (no creator, no owner) no veo "Editar" / "Borrar". Intento por API directa → 403.
- [ ] 🔴 **AC-6.4.2** Como creator, pulso "Borrar" → confirmación "Borrar este gasto? Se actualizarán los balances." → al confirmar, cascade delete de `ExpenseSplit`. Los balances de los demás miembros cambian en tiempo real.
- [ ] 🟠 Múltiples payers (v1, no MVP): en MVP el dropdown de pagador solo permite 1 persona.
- [ ] 🟠 Categoría "Other" como default si no se selecciona otra.
- [ ] 🟠 `Intl.NumberFormat` con locale `es-ES` y currency `EUR` → `45,67 €` (no `45.67 EUR`, no `€45.67`).
- [ ] 🔵 Currency distinta a la del viaje (ej. `USD` en un viaje `EUR`) → el cliente no la permite en el dropdown. Por API directa, 400.

---

## 9. Ver balances (E7)

> Ejecutar: tras añadir 3 gastos como en el briefing AC-7.3.2.

- [ ] 🔴 **AC-7.1.1** Mi balance se muestra como "Te deben 145,67 €" (positivo, verde) o "Debes 23,50 €" (negativo, rojo) o "Estás en paz" (cero). Verificar el color del texto.
- [ ] 🔴 **AC-7.1.2** Debajo del neto, lista "Te deben" y "Debes" con nombre + monto de cada uno.
- [ ] 🔴 **AC-7.2.1** Tabla "Ver todos" muestra columnas `miembro | pagado | cuota | neto`, ordenada por `neto desc` (más acreedor arriba). **Assert:** el total al pie cierra exactamente en `0,00 €`.
- [ ] 🟠 Verifico con script: `select sum(net) from compute_balances(<trip_id>)` → 0.
- [ ] 🟠 Tras añadir un nuevo gasto, el balance se actualiza en < 2 s vía Realtime (sin pull-to-refresh).
- [ ] 🟠 Member que ha salido del viaje (`left_at != null`) sigue apareciendo en el balance de los demás (decisión explícita del PRD).
- [ ] 🔵 El cálculo NO se persiste en una tabla `Balance`; se recalcula on-the-fly en cliente. Verifico en DB que NO existe tabla `balances` (solo `expenses` + `expense_splits`).

---

## 10. Ver settlements (E7)

> Ejecutar: tras los 3 gastos del briefing AC-7.3.2, balances = (+100, +50, -80, -70).

- [ ] 🔴 **AC-7.3.1** Lista de settlements en formato `A → B: 23,50 €` usando el algoritmo greedy min cash flow.
- [ ] 🔴 **AC-7.3.2 (caso del briefing)** Produce exactamente 2 settlements: `C → A: 80,00 €, D → A: 20,00 €, D → B: 50,00 €` (o equivalente óptimo). **Assert:** tras aplicar mentalmente los pagos, todos los balances quedan a 0.
- [ ] 🔴 **AC-7.3.3** El número de settlements es ≤ N-1 (en este caso N=4 con balances no cero, así que ≤ 3).
- [ ] 🔴 Pulso un settlement → bottom sheet con "Copiar como texto" (formato exacto: "Marcos → Lucía: 80,00 €") y "Compartir por WhatsApp" (deep link `whatsapp://send?text=...`).
- [ ] 🟠 La lista se reordena en tiempo real al añadir un nuevo gasto.
- [ ] 🟠 `npx jest src/lib/algorithms/expenses.test.ts --testNamePattern=settle` → 1 000+ iteraciones pasan.
- [ ] 🟠 El algoritmo produce el **mínimo** de pagos: comparar con brute force para N ≤ 6 que el resultado coincide con la solución óptima.
- [ ] 🟠 `sum(amount_cents de settlements) == sum(amount_cents de expenses pagados) - sum(amount_cents de expenses donde el pagador es el deudor final)`. Invariante algebraico que se mantiene.

---

## 11. Marcar pago (v1, no MVP)

> Esta sección está en el checklist para documentar que **no aplica en MVP**. En v1 se reactiva.

- [ ] 🔵 El botón "Marcar como pagado" NO existe en MVP. Verificar ausencia.
- [ ] 🔵 El estado `confirmed` en `Settlement` NO se usa en MVP. Verificar en DB que ningún row tiene `status = confirmed`.
- [ ] 🔵 El flujo de confirmación por ambas partes es v1.

---

## 12. Edge cases

> Ejecutar: una vez por device, en orden.

- [ ] 🟠 **Cold start offline** (avión): la app abre al `TripsHome` cacheado (TanStack Query + persistor MMKV). Las queries fallan silenciosamente y se reintentan al volver online. El usuario ve los datos viejos con un banner "Sin conexión".
- [ ] 🟠 **Network lento (3G)**: añadir un gasto tarda < 3 s con optimistic update (UI actualiza antes del server).
- [ ] 🔴 **Race condition: dos miembros editan el mismo expense simultáneamente**: la última escritura gana; ambos ven el resultado final consistente tras < 2 s.
- [ ] 🔴 **Token expirado a mitad de un flujo**: añado un gasto con sesión a punto de expirar → la app intenta refresh silencioso; si falla, persiste el draft del form en `AsyncStorage` y redirige a `/welcome?next=/trips/<id>/expenses/new`. Tras re-login, restaura el draft.
- [ ] 🔴 **Cerrar viaje con balances ≠ 0**: como owner, en un viaje con balances pendientes, pulso "Cerrar viaje" → error 409 con copy "Hay balances pendientes. Liquídalos antes de cerrar."
- [ ] 🔴 **Cerrar viaje con balances = 0**: como owner, liquido todos los balances (sandbox: pongo todos a 0 via SQL), pulso "Cerrar viaje" → confirmación modal "Cerrar el viaje archivará los datos. ¿Continuar?" → al confirmar, viaje a "Archivados", `status = closed`, `closed_at = now()`.
- [ ] 🟠 **Travel al futuro del dispositivo**: cambio la fecha del device a 1 año después, voto en una fecha → el backend ignora la fecha del cliente y usa `now()` del servidor. El voto se registra con la fecha del servidor.
- [ ] 🟠 **DST**: en la semana del cambio de hora (último domingo de marzo / octubre en ES), un gasto creado a las 02:30 → la fecha se guarda en UTC y se muestra correctamente en el dashboard.
- [ ] 🟠 **Año bisiesto**: 29 de febrero de 2028 → la app maneja correctamente (date picker permite seleccionar, store lo guarda).
- [ ] 🟠 **Multi-currency placeholder v2**: en MVP solo EUR; el campo `currency` existe en la tabla pero el UI no permite cambiarlo.
- [ ] 🟠 **Avatar con URL vacía** (`""`) → fallback a iniciales, no crash.
- [ ] 🟠 **Display name con emojis** (ej. "Sara 🌸") → se guarda y se renderiza correctamente.
- [ ] 🟠 **Display name con 81 chars** → el cliente trunca o muestra error (verificar UX concreta).
- [ ] 🟠 **15 miembros en el trip** (límite MVP según A3 del PRD): el `AvatarStack` muestra "+11" o similar y el heatmap del poll sigue siendo usable.
- [ ] 🔴 **16º miembro intenta unirse** (vía link) → el server rechaza con 400 `code = trip_full`. La UI lo muestra con copy claro.
- [ ] 🔴 **Soft delete bypass**: un member con `left_at != null` NO puede volver a votar en polls cerrados; NO aparece como "activo" en la lista de miembros; sus expenses históricos siguen mostrándose con su nombre. Verifico todos los flujos.

---

## 13. Seguridad

> Ejecutar: en device físico (no simulador) con build de staging. Items derivados del `security-audit.md`.

### 13.1 RLS adversarial (validación manual)

- [ ] 🔴 **IDOR trip**: como `qa-other@plantir.test` (sin membresía en "QA Viaje Smoke"), intento `GET /rest/v1/trips?id=eq.<smoke-id>` desde el cliente logueado como `qa-other` → recibo 0 filas (RLS).
- [ ] 🔴 **IDOR expense**: como `qa-other`, intento `GET /rest/v1/expenses?trip_id=eq.<smoke-id>` → 0 filas.
- [ ] 🔴 **IDOR invite**: como `qa-other`, intento `GET /rest/v1/trip_invites?trip_id=eq.<smoke-id>` → 0 filas (no veo invites ajenas).
- [ ] 🔴 **Mass assignment expense**: como `qa-member`, intento crear un expense con `created_by = "otro-user-id"` en el payload → el servidor ignora `created_by` y lo sustituye por `auth.uid()`. Verifico en DB que `created_by == auth.uid()`.
- [ ] 🔴 **Privilege escalation**: como `qa-member` (no organizer), intento `UPDATE trips set state = 'closed' where id = <smoke-id>` desde el cliente → 403 o 0 filas afectadas.
- [ ] 🔴 **Privilege escalation 2**: como `qa-member`, intento `UPDATE trip_members set role = 'organizer' where user_id = auth.uid() and trip_id = <smoke-id>` → 0 filas afectadas.
- [ ] 🔴 **Cerrar poll ajeno**: como `qa-member`, intento `UPDATE date_polls set status = 'closed' where trip_id = <smoke-id>` → 0 filas afectadas.
- [ ] 🔴 **Modificar `created_by` de un expense propio**: como `qa-member` que creó un expense, intento `UPDATE expenses set created_by = 'otro-user' where id = <expense-id>` → 0 filas (campo inmutable).
- [ ] 🔴 **Borrar expense ajeno**: como `qa-member`, intento `DELETE from expenses where id = <expense-de-otro>` → 0 filas.

### 13.2 Tokens y secrets

- [ ] 🔴 `.env.example` SOLO tiene placeholders (`EXPO_PUBLIC_SUPABASE_URL=` y `EXPO_PUBLIC_SUPABASE_ANON_KEY=` vacíos). Verifico con `git ls-files | grep -E '^\.env$'` → 0 archivos.
- [ ] 🔴 `git log --all -p | grep -E 'supabase.*service_role|sk_[a-z]+_'` → 0 resultados. Ningún `service_role` key commiteado.
- [ ] 🔴 `supabase functions` no usan el rol `service_role` en cliente; solo en Edge Functions que lo necesitan. Verifico con `grep -r "service_role" src/` → 0 hits.
- [ ] 🟠 Los tokens de invitación se hashean antes de almacenar. Verifico en DB: `select token from trip_invites` → vacío (solo `token_hash`).

### 13.3 Almacenamiento seguro

- [ ] 🟠 Sesión Supabase en `expo-secure-store` (Keychain iOS, Keystore Android). Verifico con Frida o `idevicebackup` que NO está en `AsyncStorage` plano.
- [ ] 🟠 `MMKV` solo para datos no sensibles (tema, borrador de viaje, caché de queries). Nunca credenciales.
- [ ] 🟠 `Sentry` no captura tokens ni passwords (configurar `beforeSend` para scrub). Verifico enviando un error de prueba y mirando el evento en Sentry.

### 13.4 Almacenamiento de archivos (Storage)

- [ ] 🟠 Avatares: bucket `avatars` con RLS: solo el owner puede upload, todos pueden SELECT.
- [ ] 🟠 Cover photos (v1): bucket `trip_covers` con RLS: solo miembros del trip pueden SELECT, solo organizer puede upload.
- [ ] 🟠 Validación de MIME: la Edge Function `uploadAvatar` rechaza `image/svg+xml` (XSS), `application/pdf`, etc. Solo `image/jpeg`, `image/png`, `image/webp`.
- [ ] 🟠 Límite de tamaño: avatares ≤ 2 MB, covers ≤ 5 MB.
- [ ] 🟠 Sanitización de nombre de archivo: el nombre final se genera con UUID, no con el nombre original. El `Content-Disposition` no incluye el nombre del usuario.

### 13.5 Invitaciones

- [ ] 🔴 Token de 32 bytes random vía `crypto.getRandomValues`; en DB se guarda `token_hash = SHA-256(token)`. El token en claro se devuelve al owner UNA SOLA VEZ.
- [ ] 🔴 Expiración a 14 días desde creación.
- [ ] 🟠 Rate limit por IP: 5 aceptaciones / minuto en la Edge Function `acceptInvite`. Verifico con script: 6º intento en 1 min → 429.
- [ ] 🟠 Scoping: un token de invitación del trip A no funciona en el trip B (constraint lógica, no error silencioso).
- [ ] 🟠 Revocación: `revoked = true` se aplica instantáneamente; no hay caché que sirva el token revocado.

### 13.6 Scraping de links (Edge Function de Fase 3)

- [ ] 🟠 **SSRF**: `scrapeLink` rechaza URLs con `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local), `0.0.0.0`, `::1`, `fc00::/7`. Verifico con `https://localhost/admin` y con `http://10.0.0.1` → 400.
- [ ] 🟠 **Timeout**: la request al sitio externo tiene timeout de 5 s. Verifico con un sitio que duerme 10 s → 504.
- [ ] 🟠 **Max size**: la respuesta se trunca a 1 MB. Verifico con un sitio de > 1 MB.
- [ ] 🟠 **MIME allowlist**: solo `text/html`, `text/plain`, `image/jpeg`, `image/png`, `image/webp`. Otros MIME → 415.
- [ ] 🟠 **No script execution**: la respuesta NO se ejecuta (no se renderiza con un browser headless). Solo se extrae el `<title>`, `<meta>`, OG tags.
- [ ] 🟠 **URL validation**: `https?://` solo, longitud ≤ 2 048 chars, no caracteres de control.

### 13.7 Privacidad (GDPR / LOPDGDD)

- [ ] 🟠 En `/profile` hay un botón "Exportar mis datos" → genera un JSON con todo lo que el servidor sabe de mí: profile, trips donde soy miembro, expenses pagados, splits, votes. Descarga vía `Share` API.
- [ ] 🟠 En `/profile` hay un botón "Eliminar mi cuenta" → confirmación doble, escribo "ELIMINAR", soft-delete del `auth.users`, anonimización de `display_name` y `avatar_url` en todas las filas referenciadas. Tras 30 días, hard-delete.
- [ ] 🟠 En un trip, como organizer, puedo "Eliminar viaje" → confirmación, soft-delete (`archived_at != null`).
- [ ] 🟠 Como member, puedo "Salir del viaje" → mi `TripMember.left_at = now()`; mis expenses pagados se preservan con `user_id` (pero el display name ya no se actualiza).
- [ ] 🟠 Retention: las fotos de receipts (v1) y avatares se eliminan cuando el viaje se cierra + 90 días.
- [ ] 🟠 Logs de Sentry NO contienen emails, nombres o importes. Configurar `beforeSend` con scrub.

---

## 14. Accesibilidad

> Ejecutar: en iPhone SE y Pixel 4a. Activar VoiceOver / TalkBack respectivamente.

- [ ] 🟠 **Touch targets ≥ 44 dp** (Apple HIG) / 48 dp (Material). Recorrer todas las pantallas con la cuadrícula de developer (iOS) o Layout Bounds (Android) y verificar que ningún botón es < 44 dp.
- [ ] 🟠 **Contraste AA** (4.5:1 texto, 3:1 grandes). Recorrer pantallas y verificar con un color picker que el texto primary sobre `bg-base` cumple 4.5:1. Idem texto muted.
- [ ] 🟠 **VoiceOver / TalkBack**: cada botón tiene `accessibilityLabel` legible (no "icon-button" genérico, sino "Crear viaje"). Verificar leyendo todos los botones con el screen reader.
- [ ] 🟠 **Tab order** lógico: en el formulario de signup, al pulsar "Next" en el teclado el foco va a la password, no salta al botón "Crear cuenta".
- [ ] 🟠 **Errores accesibles**: cuando hay un `errorText` en un `FormField`, VoiceOver lo lee automáticamente.
- [ ] 🟠 **Loading state** anuncia "Cargando" al screen reader (`accessibilityLabel="Cargando"`).
- [ ] 🟠 **Dynamic Type** (iOS) y **Font scaling** (Android): con la fuente al 200 %, la app sigue siendo usable (no hay texto cortado, no se rompe layout crítico). El componente `Money` con `maxFontSizeMultiplier={1.3}` respeta el límite.
- [ ] 🟠 **Reduce motion** (iOS) / **Remove animations** (Android): con esta opción activada, no hay animaciones bruscas; las transiciones son instantáneas.
- [ ] 🟠 **Color no es el único canal**: los heatmaps (yes/maybe/no) tienen además un icono o label, no solo color. Los badges de balance (positivo/negativo) tienen un icono (+/-), no solo color verde/rojo.
- [ ] 🟠 **Idioma**: todos los textos están en español. No hay strings hardcodeadas en inglés que se cuelen en producción.
- [ ] 🟠 **Links y URLs** en destinos: el screen reader lee "Link externo, Casa rural Sierra, abre en navegador".

---

## 15. Performance

> Ejecutar: en device físico con 4G simulado (no Wi-Fi). Usar `expo-perf` o Performance Monitor de React DevTools.

- [ ] 🔴 **AC-X.4** TripDashboard p95 < 1.5 s en 4G con 30 miembros × 30 gastos × 50 votos por poll. Medir con `performance.now()` desde tap hasta render completo (incluye `TripHeader`, `ProgressStepper`, `MemberList`, `ExpensesList`).
- [ ] 🟠 **TripsHome** p95 < 1 s con 20 viajes en la lista.
- [ ] 🟠 **Add expense** end-to-end (tap → optimistic update → server response → UI final) < 500 ms p95.
- [ ] 🟠 **Vote en date poll** (tap → optimistic → persist) < 200 ms p95.
- [ ] 🟠 **Memory footprint** < 150 MB en iPhone SE tras 10 minutos de uso normal.
- [ ] 🟠 **Cold start** < 2.5 s en iPhone SE (kill app, reopen, hasta `TripsHome` con sesión).
- [ ] 🟠 **Bundle size**: el `.ipa` ≤ 50 MB; el `.aab` ≤ 40 MB.
- [ ] 🟠 **JS bundle** (lo que parsea Hermes al arrancar) < 5 MB.
- [ ] 🟠 **Realtime latency**: voto de otro device se refleja en mi UI en p95 < 2 s.
- [ ] 🟠 **Skia/Image** cache: scroll rápido en lista de gastos no causa frame drops (< 60 fps mantenido).
- [ ] 🟠 **Background → foreground**: tras 5 minutos en background, la app reactiva en < 1 s sin recargar datos.

---

## 16. Telemetría y errores

> Ejecutar: disparando eventos y verificando en Sentry / dashboard de eventos.

- [ ] 🟠 Sentry recibe un evento de `crash` al forzar un crash de prueba (botón oculto en `/profile` solo en staging).
- [ ] 🟠 Sentry recibe `ServiceError` con `kind = network` al simular offline (DevTools → Network: offline).
- [ ] 🟠 El logger **NO** captura emails, passwords, tokens de invitación ni importes. Verifico enviando errores de prueba y revisando el evento en Sentry.
- [ ] 🟠 Eventos de negocio: `trip_created`, `trip_member_joined`, `date_poll_opened`, `date_poll_closed`, `destination_chosen`, `expense_added`, `settlement_shared`, `trip_closed` se emiten con propiedades mínimas (`trip_id`, `user_id`, `timestamp`).
- [ ] 🟠 Crash-free sessions ≥ 99.5 % en staging durante la semana previa al release.
- [ ] 🟠 Error rate en Edge Functions < 0.5 % (5xx / total) en staging durante la semana previa.
- [ ] 🟠 El `ErrorBoundary` global captura un crash de React y muestra un `ErrorState` en lugar de una pantalla blanca.
- [ ] 🟠 Tras un error recuperable (ej. 5xx transient), el usuario ve un toast con CTA "Reintentar" y la operación se puede reintentar sin estado corrupto.
- [ ] 🔵 `console.log` en producción está deshabilitado (reemplazado por `logger.debug` que solo emite en dev).

---

## 17. Cierre del checklist

> Esta sección la completa el/la QA Lead al terminar.

- [ ] 🔴 Todos los ítems 🔴 (blocker / critical) marcados.
- [ ] 🟠 Los Majors tienen issue creado en el tracker con plan documentado y owner asignado.
- [ ] 🟡 Los Minors tienen backlog priorizado.
- [ ] 🔵 Sentry no tiene errores nuevos (open issues) en las últimas 24 h de staging.
- [ ] 🔴 La build RC se etiqueta en GitHub como `v1.0.0-rc.X`.
- [ ] 🔴 La release notes están escritas y revisadas por `pm-product` y `qa-engineer`.
- [ ] 🔴 El smoke E2E en CI pasa contra staging: `npm run test:e2e:all` → 5/5 verdes en iOS y Android.
- [ ] 🔴 Las migraciones SQL se han ejecutado en staging sin errores y son reversibles.
- [ ] 🔴 La build de producción (`eas build --profile production`) compila sin warnings.
- [ ] 🟠 El equipo de soporte (1 persona) está informado del flujo crítico de "no puedo entrar" / "no veo mis viajes" / "mis gastos no cuadran".
- [ ] 🟠 El runbook de rollback está documentado: cómo revertir la release, cómo poner la app en "maintenance mode", cómo restaurar datos.
- [ ] 🟠 Se ha enviado a `verifier` un resumen con: # bugs por severidad, # tests automatizados, # E2E, # dispositivos probados, # hallazgos de seguridad.

**Aceptación final:** este checklist es **COMPLETO** solo si:
- 0 ítems 🔴 sin marcar.
- 0 ítems 🟠 sin issue + plan.
- Todos los 🔵 documentados o resueltos.
- Build RC firmada y subida a TestFlight / Play Console Internal.

---

**Anexo — Plantilla de bug report:**

```md
## Bug: <título corto>

- **Severidad:** blocker | critical | major | minor
- **Feature / Épica:** E<n>
- **AC del PRD violado:** AC-X.Y.Z
- **Dispositivo:** iPhone SE iOS 15.4 / Pixel 4a Android 12
- **Build:** v1.0.0-rc.X (commit <sha>)
- **Pasos para reproducir:**
  1. ...
  2. ...
- **Esperado:** ...
- **Actual:** ...
- **Screenshots / video:** `qa-screenshots/release-1.0.0/<feature>/<caso>.png`
- **Log de Sentry:** <link>
- **Notas adicionales:** ...
```

**Anexo — Cuentas de test (staging):**

| Email | Contraseña | Rol |
|---|---|---|
| `qa-owner@plantir.test` | `Test1234` | Owner típico |
| `qa-member@plantir.test` | `Test1234` | Member típico |
| `qa-other@plantir.test` | `Test1234` | Sin membresía (para tests adversariales) |
| `qa-new-<timestamp>@plantir.test` | `Test1234` | Signup fresco |

Credenciales reales en vault 1Password `Engineering / Plantir / QA Staging`.

---

**Fin del checklist v1.0.**
