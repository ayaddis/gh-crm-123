# DESIGN_BRIEF.md — CRM-123 (brief para Claude Design)

> **Qué es esto:** el brief de diseño de **CRM-123**, un CRM minimalista para un equipo comercial pequeño de **pólizas de seguros multiproducto en México** (moneda MXN, español con tecnicismos en inglés).
> **Qué no es:** no incluye código ni estructura de base de datos.
> **Regla de datos:** las pantallas muestran **únicamente** los datos, catálogos y estatus definidos en `SCRIPTS-SQL.md` (la estructura oficial). **No se agregan, renombran ni combinan campos o estatus.** Si un diseño necesita un dato que no aparece aquí, **no lo inventes**: márcalo como "pregunta para el humano" y sigue con lo demás.

## 1. Producto en una página

| | |
|---|---|
| **Marca** | CRM-123 (solo texto, sin logotipo) |
| **Dos aplicaciones** | **Escritorio** (vendedores y supervisores; denso y operativo) y **PWA** (supervisores; consulta rápida en el móvil) |
| **Roles** | **Vendedor** (ve y gestiona solo lo suyo) y **Supervisor** (ve todo, administra y reasigna) |
| **Principios** | Minimalista, estándar, funcional. Solo opciones estrictamente básicas y necesarias. Cada pantalla responde a "¿qué tengo que hacer hoy?" |
| **Palabras prohibidas en toda la interfaz** | "Eliminar", "Borrar". Se usa **Archivar** (clientes, oportunidades), **Desactivar** (usuarios, catálogos) o **Cancelar** (pólizas, seguimientos) |
| **Identificadores personales** | Nunca se pide RFC, CURP, DPI, NIT, DNI ni pasaporte. El **teléfono (10 dígitos)** identifica al cliente |

## 2. Dirección visual

**Tono:** sobrio, confiable, profesional. Sensación de herramienta de trabajo bien ordenada, no de aplicación de moda. Solo **modo claro**.

| Elemento | Dirección |
|---|---|
| Color principal | Azul profundo `#1E3A8A` (barra lateral, encabezados, tema de la PWA); acciones primarias `#2563EB` |
| Fondos y bordes | Fondo de página `#F8FAFC`, tarjetas y tablas `#FFFFFF`, bordes `#E2E8F0` |
| Texto | Principal `#0F172A`, secundario `#475569`, deshabilitado `#94A3B8` |
| Estatus positivo | Texto `#15803D` sobre `#DCFCE7` (Pagado, Vigente, Ganada, Liquidada, Hecho) |
| Estatus de atención | Texto `#B45309` sobre `#FEF3C7` (Pendiente, Por vencer, Emitida, En trámite, Negociación) |
| Estatus de riesgo | Texto `#B91C1C` sobre `#FEE2E2` (Vencido, Vencida, Perdida, Rechazado) |
| Estatus informativo | Texto `#1D4ED8` sobre `#DBEAFE` (Nuevo, Contactado, Cotización enviada, Reportado) |
| Estatus neutro | Texto `#475569` sobre `#F1F5F9` (Cancelada, Cancelado, Cerrado, Archivado, Inactivo) |
| Tipografía | **Inter**. Escritorio 14 px base (tablas 13 px); PWA 16 px base. Cifras con alineación tabular. Títulos de pantalla 20–22 px semibold |
| Forma | Esquinas de 6 px, sin sombras pesadas (solo borde y, en diálogos, sombra suave), iconografía lineal tipo Lucide |
| Espaciado | Escala de 4 px. Escritorio denso (filas de tabla de 36 px); PWA holgado (objetivos táctiles de mínimo 44 px) |
| Movimiento | Mínimo: transiciones de 150 ms; sin animaciones decorativas |
| Accesibilidad | Contraste mínimo 4.5:1; **el color nunca es el único indicador** (cada estatus lleva texto); foco visible; formularios con etiquetas visibles |

**Estatus como etiqueta (*chip*):** texto corto en español, color según la tabla anterior. Los mismos estatus se ven igual en escritorio y PWA.

**Formatos:** dinero `$12,345.00 MXN` (sin "MXN" en tablas si la columna ya lo indica); fechas `dd/mm/aaaa` (ej. `07/11/2026`); teléfono `55 1234 5678`; porcentajes `10.00 %`.

## 3. Aplicación de escritorio

### 3.1 Estructura general
- **Barra lateral izquierda fija (220 px)**, azul profundo: marca "CRM-123" arriba, y opciones: **Tablero**, **Clientes**, **Oportunidades**, **Pólizas**, **Cobranza**, **Siniestros**, **Comisiones**. Al final, solo para Supervisor: sección **Administración** (Usuarios, Catálogos, Porcentajes de comisión, Metas, Historial).
- **Barra superior:** buscador global de clientes (nombre o teléfono, mínimo 3 caracteres; resultados en lista desplegable) y menú de la persona (nombre, rol, "Cambiar contraseña", "Salir").
- **Área de contenido** a ancho completo con título de pantalla, acción principal a la derecha y filtros en una fila compacta.
- Tablas densas con encabezado fijo, orden por columna, paginación de 25 filas y acciones por fila en el extremo derecho. Detalles y formularios cortos en **panel lateral derecho (drawer)**; confirmaciones en diálogo.

### 3.2 Pantallas

#### D1. Inicio de sesión
- Tarjeta centrada: marca CRM-123, **Correo**, **Contraseña**, botón **Entrar**. Mensaje de error genérico: "Correo o contraseña incorrectos".
- Sin registro, sin "crear cuenta". Un enlace de ayuda: "¿No puedes entrar? Pide a tu supervisor que restablezca tu contraseña."

#### D2. Cambio de contraseña obligatorio (primer ingreso o tras restablecimiento)
- Texto: "Por seguridad, crea tu propia contraseña." Campos: **Contraseña nueva** (mínimo 10 caracteres, con indicador de requisitos), **Repite la contraseña**. Botón **Guardar y continuar**. No se puede salir de esta pantalla sin cambiarla (solo **Salir**).

#### D3. Tablero del día (pantalla de inicio)
Jerarquía de arriba abajo:
1. **Saludo y fecha:** "Hola, {Nombre}" · "sábado 07/11/2026". Solo para Supervisor: selector **Ver: Todo el equipo / {vendedor}**.
2. **Cuatro contadores** en una fila: *Seguimientos de hoy*, *Seguimientos vencidos* (rojo si > 0), *Recibos vencidos o por vencer*, *Renovaciones próximas*. Cada contador es un acceso directo a su lista.
3. **Cuadrícula de 2 × 2 listas** (máx. 8 filas por lista, con "Ver todos"):
   - **Seguimientos:** cliente, nota, fecha; vencidos primero. Acción rápida **Marcar hecho**.
   - **Cobranza:** póliza, cliente, recibo (n.º), vencimiento, monto, etiqueta Vencido/Por vencer. Acción rápida **Marcar pagado**.
   - **Renovaciones:** póliza, cliente, producto, fin de vigencia, días restantes.
   - **Mi mes** (tarjeta): prima ganada del mes frente a la **meta mensual** (barra de avance con porcentaje), oportunidades abiertas y prima estimada en *pipeline*. Si no hay meta: "Sin meta asignada este mes".

#### D4. Clientes (lista)
- Filtros: búsqueda (nombre o teléfono), **Responsable** (solo Supervisor), **Archivados** (interruptor, apagado por defecto).
- Columnas: **Nombre**, **Teléfono**, **Empresa**, **Ciudad/Estado**, **Origen**, **Responsable** (solo Supervisor), **Oportunidades abiertas** (n.º).
- Acción principal: **Nuevo cliente**.

#### D5. Ficha de cliente
- **Encabezado:** nombre, teléfono, correo, empresa, ciudad/estado, origen, responsable; acciones **Editar**, **Archivar**, y para Supervisor **Reasignar**.
- **Pestañas:** **Resumen** (notas y últimos movimientos), **Oportunidades**, **Pólizas**, **Actividad** (historial de contactos con acción **Registrar actividad**: llamada, WhatsApp, correo, reunión o nota; el historial **no se edita**), **Seguimientos** (con **Nuevo seguimiento**).
- Acciones rápidas siempre visibles: **Registrar actividad**, **Nuevo seguimiento**, **Nueva oportunidad**.

#### D6. Nuevo / editar cliente (panel lateral)
- Campos: **Nombre completo** (obligatorio), **Teléfono** (obligatorio, 10 dígitos, con máscara; es el identificador), **Correo**, **Empresa**, **Ciudad/Estado**, **Origen** (Referido, Redes, Llamada en frío, Otro), **Notas**. El **Responsable** se asigna automáticamente a quien crea (el Supervisor puede elegirlo).
- Error de teléfono repetido: "Ya existe un cliente con ese teléfono. Consulta con tu supervisor."

#### D7. Oportunidades
- Dos vistas intercambiables: **Tablero por etapas** (columnas Nuevo, Contactado, Cotización enviada, Negociación; con Ganada y Perdida del mes en columnas más angostas) y **Tabla**.
- Tarjeta/fila: cliente, producto, prima anual estimada, fecha estimada de cierre, responsable (Supervisor). Cambio de etapa por arrastre (tablero) o menú de etapa.
- Filtros: producto, responsable (Supervisor), **Archivadas**. Totales por columna: número y prima estimada.
- Acción principal: **Nueva oportunidad** (cliente, producto, prima anual estimada, fecha estimada de cierre).

#### D8. Detalle de oportunidad (panel lateral)
- Datos: cliente, producto, prima anual estimada, fecha estimada de cierre, etapa, responsable; línea de tiempo de etapas.
- Cambiar etapa: **Ganada** abre de inmediato **Emitir póliza (D9)**; **Perdida** pide **Motivo de pérdida** (obligatorio).
- Acciones: **Editar**, **Archivar**, **Registrar actividad**, **Nuevo seguimiento**.

#### D9. Emitir póliza (diálogo; aparece al ganar una oportunidad)
- Datos de solo lectura arriba: cliente, producto, responsable (ejecutivo).
- Campos: **Aseguradora** (lista), **Agente** (lista; opcional), **Número de póliza**, **Prima anual (MXN)**, **Forma de pago** (Anual, Semestral, Trimestral, Mensual), **Inicio de vigencia**, **Fin de vigencia**.
- **Vista previa del calendario de recibos** (n.º, vencimiento, monto) calculada según la forma de pago, antes de confirmar. Aviso: "Los datos de emisión no se pueden modificar después; si hay un error, se cancela la póliza y se emite de nuevo."
- Botones: **Emitir póliza**, **Cancelar**.

#### D10. Pólizas (lista)
- Filtros: estatus (Emitida, Vigente, Vencida, Cancelada), producto, aseguradora, responsable (Supervisor), **vencen en los próximos 60 días**.
- Columnas: **N.º de póliza**, **Cliente**, **Producto**, **Aseguradora**, **Agente**, **Prima anual**, **Forma de pago**, **Vigencia** (inicio–fin), **Estatus**, **Responsable** (Supervisor).

#### D11. Detalle de póliza
- **Encabezado:** número, estatus, cliente (enlace), producto, aseguradora, agente, responsable (ejecutivo), prima anual, forma de pago, vigencia.
- **Calendario de recibos:** tabla (n.º, vencimiento, monto, estatus, fecha de pago) con acción **Marcar pagado** por fila (pide fecha de pago, hoy por defecto).
- **Siniestros** de la póliza con **Registrar siniestro**.
- Acción **Cancelar póliza** (diálogo que pide **Motivo de cancelación**, con aviso: "Se cancelarán los recibos pendientes. Los recibos pagados y las comisiones generadas se conservan."). Una póliza cancelada se muestra en gris y sin acciones.

#### D12. Cobranza
- Pestañas: **Vencidos**, **Por vencer (7 días)**, **Todos**. Filtros: responsable (Supervisor), rango de fechas de vencimiento.
- Columnas: **Póliza**, **Cliente**, **Teléfono**, **Recibo** (n.º), **Vencimiento**, **Monto**, **Estatus**. Acción por fila: **Marcar pagado**.
- Total de la vista (suma de montos) en el pie.

#### D13. Siniestros
- Lista: **Póliza**, **Cliente**, **Fecha del evento**, **N.º de siniestro de la aseguradora**, **Estatus** (Reportado, En trámite, Pagado, Rechazado, Cerrado). Filtro por estatus; por defecto **abiertos** (Reportado y En trámite).
- **Registrar siniestro** (panel): póliza, fecha del evento, descripción, n.º de siniestro de la aseguradora (opcional). Cambio de estatus desde el detalle.

#### D14. Comisiones
- **Vendedor:** solo **sus** comisiones como ejecutivo. Resumen arriba: *Pendiente por liquidar* y *Liquidado* del mes. Tabla: **Póliza**, **Cliente** (puede decir "Cliente reasignado"), **Tipo** (Venta / Cobranza), **Recibo**, **Base**, **%**, **Importe**, **Estatus** (Pendiente / Liquidada). Solo lectura.
- **Supervisor:** todas, con filtros **Beneficiario** (Ejecutivo / Agente), **Persona**, **Tipo**, **Estatus**, **Mes**. Totales por estatus. Acción **Liquidar** por fila y **Liquidar seleccionadas**; diálogo de confirmación "Esta acción no se puede deshacer".

#### Administración (solo Supervisor)

- **D15. Usuarios:** tabla con **Nombre**, **Correo**, **Rol**, **Estado** (Activo / Inactivo) y la marca **Contraseña temporal pendiente**. Contador de cupos: "Vendedores activos 7 de 10 · Supervisores activos 2 de 2". Acciones: **Nuevo usuario**, **Editar**, **Restablecer contraseña**, **Desactivar / Reactivar**. Al crear o restablecer se muestra **una sola vez** la contraseña temporal en un diálogo con botón **Copiar** y el aviso "No se volverá a mostrar".
- **D16. Catálogos:** tres pestañas — **Productos** (Auto, Accidentes y Salud, Daños, Hogar, Pyme), **Aseguradoras**, **Agentes** (nombre y teléfono). Cada una: lista con **Nuevo**, **Editar**, **Desactivar / Reactivar**. Lo desactivado deja de ofrecerse en formularios nuevos.
- **D17. Porcentajes de comisión:** cuadrícula con una fila por producto y cuatro columnas: **Venta · Agente**, **Venta · Ejecutivo**, **Cobranza · Agente**, **Cobranza · Ejecutivo**. Nota fija: "Los cambios aplican a las pólizas nuevas. Las ya emitidas conservan los porcentajes con los que se emitieron." Botón **Guardar cambios**.
- **D18. Metas:** selector de mes y tabla con un vendedor por fila y **Meta de prima (MXN)** editable; muestra el avance del mes junto a cada meta.
- **D19. Historial (solo lectura):** filtros por fecha, tipo de dato (Clientes, Oportunidades, Pólizas, Recibos, Siniestros, Comisiones, Seguimientos, Catálogos, Usuarios, Configuración, Eventos), acción (Alta, Cambio, Evento) y persona. Filas: **Fecha y hora**, **Persona**, **Acción**, **Dato afectado**, con panel lateral **Ver detalle** (antes y después de los campos que cambiaron). Nunca ofrece editar ni quitar registros.

#### Diálogo: Reasignar cliente (Supervisor, desde ficha de cliente)
Elegir **Nuevo responsable** (lista de usuarios activos). Aviso: "Se moverán también sus oportunidades, seguimientos pendientes y pólizas vigentes. Las comisiones ya generadas conservan a su ejecutivo original." Botones **Reasignar** y **Cancelar**.

## 4. PWA del supervisor (móvil, consulta rápida)

### 4.1 Estructura general
- **Barra superior** azul profundo con el título de la pantalla. **Barra de navegación inferior** de cuatro opciones: **Panel**, **Buscar**, **Resumen**, **Cuenta**.
- Una columna, tarjetas de ancho completo, información priorizada: lo más importante arriba, sin tablas anchas (las filas son tarjetas de dos o tres líneas).
- Instalable en pantalla de inicio (nombre "CRM-123"). Sin modo sin conexión funcional: solo una pantalla "Sin conexión" informativa.

### 4.2 Pantallas

#### P1. Inicio de sesión · P2. Cambio de contraseña obligatorio
Igual que D1 y D2, adaptadas a móvil (campos grandes, teclado de correo).

#### P3. Panel (inicio)
1. **Indicadores del equipo** en tarjetas de dos columnas: *Pipeline abierto* (n.º y prima estimada), *Ganado del mes* (prima y tasa de cierre), *Recibos vencidos*, *Renovaciones próximas*, *Siniestros abiertos*, *Seguimientos vencidos*. Las que requieren atención se resaltan en rojo/ámbar con el número en grande.
2. **Ranking de vendedores** del mes: tarjeta por vendedor con nombre, prima ganada vs. meta (barra y porcentaje), oportunidades abiertas y alertas (recibos vencidos, seguimientos vencidos). Orden por prima ganada. Al tocar abre P4.

#### P4. Detalle de vendedor
Nombre y meta del mes; pestañas **Seguimientos vencidos**, **Recibos vencidos**, **Pipeline** (lista de oportunidades abiertas con cliente, producto, prima). Cada elemento muestra cliente y teléfono con acción **Llamar** (enlace telefónico).

#### P5. Buscar y reasignar
Campo de búsqueda grande (nombre o teléfono). Resultados como tarjetas (nombre, teléfono, responsable). Al tocar: resumen del cliente y botón **Reasignar** (lista de usuarios activos y confirmación con el mismo aviso de D-Reasignar).

#### P6. Resumen matutino
1. **Interruptor** "Envío automático de lunes a viernes a las 7:30 (hora de Ciudad de México)" con estado Activado / Pausado y confirmación al cambiarlo.
2. **Botón grande "Enviar ahora"** (se deshabilita durante la espera de seguridad y mientras haya un envío en proceso).
3. **Estado de la última ejecución:** fecha y hora, tipo (Automático / Manual), resultado (*enviados* y *fallidos*) y, si hay fallos, "Ver detalle" con el nombre del vendedor y el motivo.
4. Aviso visible mientras se esté en modo de pruebas: "Modo de pruebas: los correos llegan solo a la cuenta de pruebas."

#### P7. Cuenta
Nombre, correo, rol; **Cambiar contraseña**; **Salir**; versión de la aplicación.

#### P8. "Solo para supervisores"
Pantalla que ve un vendedor si entra a la PWA: "Esta aplicación es para supervisores. Usa la versión de escritorio." y botón **Salir**.

#### P9. Sin conexión
Pantalla estática: "Sin conexión. Revisa tu internet e intenta de nuevo." con botón **Reintentar**.

## 5. Estados (obligatorios en cada pantalla)

| Estado | Escritorio | PWA |
|---|---|---|
| **Cargando** | Esqueletos (*skeletons*) con la forma de la tabla o tarjeta; nunca pantalla en blanco ni *spinner* a pantalla completa | Esqueletos de tarjetas |
| **Vacía** | Mensaje corto, qué falta y una acción (ver mensajes abajo) | Igual, con botón grande |
| **Error** | Aviso en la zona afectada con mensaje claro y botón **Reintentar**; los errores de formulario aparecen junto al campo | Aviso en tarjeta con **Reintentar** |
| **Sin permiso** | "No tienes permiso para esta acción." (sin pistas técnicas) | Igual |
| **Proceso en ejecución** | Botón con indicador y texto del proceso ("Guardando…", "Emitiendo póliza…"); botón deshabilitado; sin doble envío | Igual; en el resumen matutino, estado persistente "Enviando resumen…" con avance y resultado final |

**Mensajes de estado vacío (ejemplos):**
- Tablero: "Sin pendientes por hoy." · Seguimientos: "No tienes seguimientos para hoy." · Cobranza: "No hay recibos vencidos ni por vencer." · Renovaciones: "Ninguna póliza vence en los próximos 60 días."
- Clientes: "Aún no hay clientes. Crea el primero con **Nuevo cliente**." · Oportunidades: "Aún no hay oportunidades." · Pólizas: "Aún no hay pólizas." · Siniestros: "No hay siniestros abiertos." · Comisiones: "Aún no hay comisiones. Se generan al marcar recibos como pagados."
- Historial: "No hay registros con esos filtros." · Resumen matutino: "Aún no se ha enviado ningún resumen."

**Mensajes de error (ejemplos):** "No pudimos cargar la información. Intenta de nuevo." · "Ya existe un cliente con ese teléfono. Consulta con tu supervisor." · "Ya hay un envío en proceso." · "Espera unos segundos antes de enviar otro resumen." · "El envío no se pudo iniciar. Intenta de nuevo."

## 6. Flujos principales

1. **Primer ingreso:** el supervisor crea al usuario → recibe contraseña temporal (una sola vez) → la persona entra con su correo → es obligada a crear su contraseña → llega al Tablero.
2. **Captar un cliente:** Clientes → *Nuevo cliente* → (opcional) *Nueva oportunidad* → *Nuevo seguimiento* con fecha → aparece en el Tablero ese día.
3. **Vender y emitir:** Oportunidad → etapa **Ganada** → se abre *Emitir póliza* con vista previa de recibos → *Emitir póliza* → se ve el calendario de recibos en la póliza.
4. **Cobrar:** Cobranza (o Tablero) → *Marcar pagado* → el recibo pasa a Pagado, la póliza pasa a Vigente si era Emitida y se generan las comisiones correspondientes.
5. **Perder una oportunidad:** etapa **Perdida** → pide motivo → sale de las abiertas.
6. **Cancelar una póliza:** Detalle de póliza → *Cancelar póliza* → pide motivo → confirma → recibos pendientes quedan Cancelados.
7. **Siniestro:** Detalle de póliza (o Siniestros) → *Registrar siniestro* → actualiza estatus hasta Pagado, Rechazado o Cerrado.
8. **Reasignar (Supervisor):** Ficha de cliente (escritorio) o Buscar (PWA) → *Reasignar* → confirma aviso.
9. **Enviar resumen ahora (PWA):** Resumen → *Enviar ahora* → confirma → estado "Enviando resumen…" → resultado (enviados y fallidos).
10. **Activar o pausar el envío automático (PWA):** Resumen → interruptor → confirma.
11. **Liquidar comisiones (Supervisor):** Comisiones → filtrar → seleccionar → *Liquidar seleccionadas* → confirma que no se puede deshacer.

## 7. Qué ve cada rol (resumen para el diseño)

| Pantalla | Vendedor | Supervisor |
|---|---|---|
| Tablero, Clientes, Oportunidades, Pólizas, Cobranza, Siniestros | Solo lo suyo | Todo el equipo, con filtro por responsable |
| Comisiones | Solo las suyas como ejecutivo (lectura) | Todas; liquida |
| Reasignar | No | Sí |
| Administración (Usuarios, Catálogos, Porcentajes, Metas, Historial) | No aparece | Sí |
| PWA | Solo ve "Solo para supervisores" | Todas las pantallas P1–P9 |

Las opciones que un rol no puede usar **no se muestran** (no aparecen deshabilitadas).

## 8. Entregables que se esperan de Claude Design

1. Sistema visual mínimo: color, tipografía, espaciado, componentes base (botón, campo, tabla, etiqueta de estatus, tarjeta, panel lateral, diálogo, barra lateral, barra inferior).
2. Pantallas de escritorio **D1 a D19** y el diálogo de reasignación, con sus estados vacío, cargando y error en las pantallas principales (D3, D4, D5, D7, D10, D12, D14).
3. Pantallas de PWA **P1 a P9**, con el estado "proceso en ejecución" de P6.
4. Una nota por pantalla con **qué datos muestra** (en lenguaje de negocio) para que el desarrollo los reconozca sin ambigüedad.
