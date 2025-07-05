# Math Trade Argentina - Sistema de Logística

Sistema completo de gestión logística para los eventos presenciales del Math Trade Argentina con diseño neumórfico moderno, soporte dark mode y funcionalidades avanzadas de administración.

## Características Principales

### 🎨 Diseño Neumórfico y UI/UX
- Interfaz moderna con efectos de profundidad y sombras suaves
- Soporte completo para dark mode automático
- Animaciones fluidas y transiciones suaves
- Diseño optimizado para móviles
- Retroalimentación háptica en dispositivos compatibles

### 🏢 Sistema de Ventanillas y Gestión de Usuarios
- **Configuración flexible de ventanillas**: Asignación de mesas específicas por ventanilla
- **Estados de usuarios avanzados**: `null`, `present`, `receiving`, `completed`, `no_show`
- **Vista administrativa**: Panel completo para gestión de usuarios y estados
- **Vista pública**: Pantalla optimizada para TV/proyector con información en tiempo real
- **Actualización automática**: Sincronización cada 10-15 segundos
- **Gestión de colas**: Priorización inteligente basada en estados

### 📦 Sistema de Gestión de Cajas
- **Creación de cajas**: Armado automático con items filtrados por destino
- **Cajas entrantes**: Revisión y procesamiento de cajas recibidas
- **Seguimiento completo**: Estado detallado de cada item dentro de las cajas

### 📱 Escaneo QR y Procesamiento
- **Recepción de juegos**: Escaneo QR para marcar items como recibidos
- **Entrega de juegos**: Proceso completo de entrega con confirmación
- **Actualización automática de estados**: Cambio de estado de usuario al escanear
- **Soporte para cámara**: Utilización de cámara trasera para mejor escaneo
- **Validación de fases**: Habilitación/deshabilitación según fase del evento

### 🔐 Sistema de Autenticación y Permisos
- **Autenticación por tokens**: Sistema seguro con validación de sesiones
- **Roles diferenciados**: Usuarios normales vs administradores
- **Protección de rutas**: Acceso controlado a funcionalidades administrativas
- **Persistencia de sesión**: Mantenimiento de estado entre sesiones

### 📊 Sistema de Reportes
- **Reportes de items**: Documentación de problemas con items específicos
- **Reportes de usuarios**: Sistema de reportes sobre comportamiento de usuarios
- **Subida de imágenes**: Adjuntar fotos como evidencia
- **Panel administrativo**: Vista completa de todos los reportes para admins

## Estructura de Rutas

### Rutas Administrativas
- `/admin/ready-to-pickup` - Panel administrativo para gestión de usuarios y ventanillas
- `/admin/window-config` - Configuración avanzada de ventanillas y asignación de mesas
- `/boxes` - Sistema completo de gestión de cajas (entrantes, creación, listado)
- `/reports/all` - Panel administrativo para gestión de reportes

### Rutas de Operación
- `/receive-games` - Recepción de juegos con escáner QR
- `/deliver-to-user` - Entrega de juegos a usuarios con escáner QR
- `/reports` - Sistema de reportes para usuarios

### Rutas Públicas y Display
- `/display/ready-to-pickup` - Vista informativa optimizada para pantalla gigante
- `/` - Página principal con sistema de login
- `/demo` - Página de demostración del sistema

## Funcionalidades Detalladas

### Sistema de Ventanillas
- **Configuración dinámica**: Cada ventanilla puede tener múltiples mesas asignadas
- **Auto-asignación**: Los usuarios se asignan automáticamente según su número de mesa
- **Estados detallados**:
  - `null`/`present`: Usuario presente y listo para ser atendido
  - `receiving`: Usuario siendo atendido en este momento
  - `completed`: Usuario que ya completó su proceso
  - `no_show`: Usuario que no se presentó después de ser llamado
- **Vista administrativa**: Control completo de estados con botones de acción rápida
- **Vista pública**: Información optimizada para pantallas grandes sin controles
- **Actualización automática**: Sincronización cada 10-15 segundos
- **Priorización inteligente**: Orden de visualización basado en estados

### Gestión de Cajas
- **Tres módulos principales**:
  - **Cajas Entrantes**: Revisión y procesamiento de cajas recibidas de otros lugares
  - **Crear Cajas**: Armado de nuevas cajas con items listos para envío
  - **Cajas Creadas**: Listado y seguimiento de cajas ya creadas
- **Filtros avanzados**: Por origen, destino, número de caja, estado de items
- **Selección múltiple**: Marcado de items individuales para procesamiento
- **Validación automática**: Detección de destinos no empaquetables
- **Seguimiento completo**: Estado detallado de cada item dentro de las cajas

### Escaneo QR y Procesamiento
- **Recepción de juegos** (`/receive-games`):
  - Escaneo de QR de usuario
  - Actualización automática de estado a `present`
  - Visualización de items a recibir
  - Marcado masivo o individual de items como recibidos
  - Actualización de estado a `In Event` (status 5)
- **Entrega de juegos** (`/deliver-to-user`):
  - Escaneo de QR de usuario
  - Actualización automática de estado a `receiving`
  - Visualización de items para entregar
  - Confirmación de entrega masiva o individual
  - Actualización de estado a `Delivered` (status 6)
- **Funcionalidades QR**:
  - Uso de cámara trasera para mejor escaneo
  - Soporte para URLs con parámetro QR automático
  - Validación según fase del evento
  - Manejo de errores con timeout automático

### Sistema de Autenticación
- **Autenticación por tokens**: Sistema seguro con localStorage
- **Roles diferenciados**: 
  - Usuarios normales: Acceso a funcionalidades básicas
  - Administradores: Acceso completo a paneles administrativos
- **Protección de rutas**: Redirección automática si no autenticado
- **Persistencia de sesión**: Mantenimiento entre recargas
- **Validación continua**: Verificación de tokens en cada request

### Sistema de Reportes
- **Reportes de items**:
  - Búsqueda de items por título o código
  - Adjuntar múltiples fotos como evidencia
  - Descripción detallada del problema
- **Reportes de usuarios**:
  - Búsqueda de usuarios por nombre
  - Descripción del comportamiento a reportar
- **Panel administrativo** (`/reports/all`):
  - Vista completa de todos los reportes
  - Filtros de búsqueda avanzados
  - Visualización de imágenes adjuntas
  - Información detallada de reportador y reportado

### Gestión de Fases del Evento
- **Fase 0 - No Iniciado**: Funcionalidades limitadas
- **Fase 1 - Recepción**: Habilitada recepción de juegos y gestión de cajas
- **Fase 2 - Entrega**: Habilitada entrega de juegos
- **Control administrativo**: Cambio de fases desde panel de control
- **Validación automática**: Habilitación/deshabilitación de funcionalidades según fase

### Panel de Control Global
- **Acceso desde cualquier página**: Botón flotante siempre disponible
- **Funcionalidades para usuarios**:
  - Cambio de tema (dark/light mode)
  - Información de la fase actual del evento
  - Acceso a funcionalidades principales
- **Funcionalidades para administradores**:
  - Cambio de fase del evento
  - Acceso directo a paneles administrativos
  - Apertura de vistas para pantalla gigante
  - Configuración de ventanillas

## Tecnologías y Arquitectura

### Frontend
- **Next.js 14**: Framework React con App Router
- **React 18**: Biblioteca de UI con hooks modernos
- **TypeScript**: Tipado estático para mayor robustez
- **Tailwind CSS**: Framework de estilos utilitarios
- **Estilos neumórficos**: Diseño personalizado con efectos de profundidad

### Estado y Contexto
- **React Context API**: Gestión de estado global
- **Custom hooks**: Lógica reutilizable encapsulada
- **Providers especializados**:
  - `EventPhaseContext`: Gestión de fases del evento
  - `ControlPanelContext`: Estado del panel de control
  - `ActionStatusContext`: Gestión de mensajes de estado

### Integración API
- **Hook personalizado `useApi`**: Abstracción de calls HTTP
- **Autenticación automática**: Headers de autorización en cada request
- **Manejo de errores**: Procesamiento y display de errores de API
- **Optimización**: Cancelación de requests y cache cuando es apropiado

### Testing
- **Jest**: Framework de testing
- **React Testing Library**: Testing de componentes
- **Cobertura completa**: Tests unitarios y de integración
- **Mocks**: Simulación de APIs y dependencias externas

## Desarrollo y Configuración

### Instalación
```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]
cd mathtrade-logistics-fork

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# El sistema estará disponible en http://localhost:3000
```

### Scripts Disponibles
```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción

# Testing
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Coverage de tests

# Código
npm run lint         # Linting con ESLint
npm run lint:fix     # Corrección automática de lint
npm run type-check   # Verificación de tipos TypeScript
```

### Variables de Entorno
```env
# Configuración API (Requerido)
NEXT_PUBLIC_MT_API_HOST=http://localhost:8000/

# Configuración de autenticación (Opcional)
NEXT_PUBLIC_AUTH_ENABLED=true

# Configuración de desarrollo (Opcional)
NODE_ENV=development
```

### Estructura del Proyecto
```
src/
├── app/                    # App Router de Next.js
│   ├── admin/             # Rutas administrativas
│   │   ├── ready-to-pickup/   # Panel de gestión de usuarios
│   │   └── window-config/     # Configuración de ventanillas
│   ├── boxes/             # Gestión de cajas
│   ├── deliver-to-user/   # Entrega de juegos
│   ├── display/           # Vistas públicas para pantalla
│   ├── receive-games/     # Recepción de juegos
│   ├── reports/           # Sistema de reportes
│   └── globals.css        # Estilos globales
├── components/
│   ├── boxes/             # Componentes de gestión de cajas
│   ├── common/            # Componentes compartidos
│   ├── control-panel/     # Panel de control global
│   ├── modals/            # Modales y dialogs
│   ├── qr/                # Componentes de escaneo QR
│   └── trades/            # Componentes de trades/juegos
├── contexts/              # React Context providers
│   ├── ActionStatusContext.tsx
│   ├── ControlPanelContext.tsx
│   └── EventPhaseContext.tsx
├── hooks/                 # Custom hooks
│   ├── boxes/             # Hooks específicos de cajas
│   ├── useApi.ts          # Hook principal de API
│   ├── useAuth.tsx        # Hook de autenticación
│   └── useWindowManagement.ts
├── styles/                # Estilos personalizados
│   ├── glassmorphism.css
│   └── neumorphism.css
├── types/                 # Definiciones TypeScript
│   ├── box.ts
│   ├── game.ts
│   ├── trade.ts
│   ├── user.ts
│   └── window.ts
└── utils/                 # Utilidades y helpers
    ├── file.ts
    ├── haptics.ts
    └── hash.ts
```

### Integración con Backend
El sistema está diseñado para integrarse con la API de Math Trade Argentina:

#### Endpoints Principales
- `GET /logistics/users/ready-to-pickup/` - Usuarios listos para retirar
- `GET /logistics/window-config/` - Configuración de ventanillas
- `GET /logistics/boxes/` - Gestión de cajas
- `GET /logistics/user/{id}/games/receive/` - Juegos a recibir
- `GET /logistics/user/{id}/games/deliver/` - Juegos a entregar
- `PATCH /logistics/games/bulk-update-status/` - Actualización masiva de estados
- `PATCH /logistics/users/update-status/` - Actualización de estado de usuario
- `POST /reports/` - Creación de reportes
- `POST /users/images/` - Subida de imágenes

#### Autenticación
- Sistema de tokens Bearer
- Almacenamiento en localStorage
- Validación automática en cada request
- Manejo de expiración de tokens

### Consideraciones de Desarrollo

#### Convenciones de Código
- **Imports**: Uso de alias `@` para rutas absolutas
- **Componentes**: PascalCase para componentes, camelCase para props
- **Hooks**: Prefijo `use` seguido de PascalCase
- **Tipos**: Interfaces en PascalCase, tipos simples en camelCase
- **Archivos**: kebab-case para archivos, PascalCase para componentes

#### Mejores Prácticas
- **Componentes funcionales**: Uso exclusivo de functional components
- **Hooks personalizados**: Encapsulación de lógica compleja
- **Memoización**: useMemo y useCallback para optimización
- **Error boundaries**: Manejo de errores en componentes críticos
- **Accesibilidad**: Atributos ARIA y navegación por teclado

#### Testing
- **Cobertura mínima**: 80% de cobertura en componentes críticos
- **Tests unitarios**: Todos los hooks y utilidades
- **Tests de integración**: Flujos principales del usuario
- **Mocks**: APIs y dependencias externas mockeadas

## Casos de Uso y Flujos

### Flujo de Recepción de Juegos
1. **Acceso**: Usuario autenticado accede a `/receive-games`
2. **Escaneo**: Escanea QR del usuario que trae juegos
3. **Actualización automática**: Estado del usuario cambia a `present`
4. **Visualización**: Se muestran todos los juegos que el usuario debe entregar
5. **Procesamiento**: Se pueden marcar items individuales o todos como recibidos
6. **Actualización**: Items cambian a estado `In Event` (status 5)
7. **Finalización**: Opción de escanear otro QR o finalizar

### Flujo de Entrega de Juegos
1. **Acceso**: Usuario autenticado accede a `/deliver-to-user`
2. **Escaneo**: Escanea QR del usuario que retira juegos
3. **Actualización automática**: Estado del usuario cambia a `receiving`
4. **Visualización**: Se muestran todos los juegos que el usuario debe retirar
5. **Procesamiento**: Se pueden marcar items individuales o todos como entregados
6. **Actualización**: Items cambian a estado `Delivered` (status 6)
7. **Finalización**: Opción de escanear otro QR o finalizar

### Flujo de Gestión de Ventanillas
1. **Configuración**: Admin configura ventanillas y mesas en `/admin/window-config`
2. **Asignación automática**: Usuarios se asignan a ventanillas según número de mesa
3. **Gestión de estados**: Admin puede cambiar estados desde `/admin/ready-to-pickup`
4. **Visualización pública**: Información se muestra en `/display/ready-to-pickup`
5. **Actualización automática**: Sincronización cada 10-15 segundos

### Flujo de Gestión de Cajas
1. **Cajas Entrantes**: Revisión de cajas recibidas de otros lugares
2. **Filtrado**: Aplicación de filtros por origen, caja, etc.
3. **Selección**: Marcado de items individuales para procesamiento
4. **Procesamiento**: Marcado de items como recibidos por la organización
5. **Creación de Cajas**: Armado de nuevas cajas con items listos
6. **Validación**: Verificación de destinos disponibles para empaquetado
7. **Seguimiento**: Monitoreo de cajas creadas y su estado

### Flujo de Reportes
1. **Selección de tipo**: Elegir entre reportar item o usuario
2. **Búsqueda**: Buscar el item o usuario específico
3. **Documentación**: Tomar fotos (para items) o describir problema
4. **Descripción**: Agregar detalles del problema encontrado
5. **Envío**: Submisión del reporte al sistema
6. **Seguimiento**: Administradores pueden revisar en `/reports/all`

## Mantenimiento y Monitoreo

### Logs y Depuración
- **Console logs**: Información detallada en consola del navegador
- **Error tracking**: Captura y display de errores de API
- **Performance monitoring**: Seguimiento de carga y rendimiento
- **User actions**: Logging de acciones críticas del usuario

### Optimización
- **Lazy loading**: Carga diferida de componentes no críticos
- **Memoización**: Optimización de re-renders con React.memo
- **Bundle splitting**: División del código para carga eficiente
- **Image optimization**: Optimización automática de imágenes

### Seguridad
- **Input validation**: Validación de todos los inputs del usuario
- **XSS protection**: Sanitización de contenido dinámico
- **CSRF protection**: Protección contra ataques CSRF
- **Token validation**: Verificación continua de tokens de autenticación

## Troubleshooting

### Problemas Comunes
1. **Error de autenticación**: Verificar token en localStorage
2. **Escaneo QR no funciona**: Verificar permisos de cámara
3. **Datos no actualizan**: Verificar conexión con API
4. **Interfaz no responde**: Verificar JavaScript habilitado

### Soluciones
- **Clear cache**: Limpiar cache del navegador
- **Refresh tokens**: Logout y login nuevamente
- **Check permissions**: Verificar permisos de cámara y localización
- **Network issues**: Verificar conectividad de red

## Roadmap y Futuras Mejoras

### Funcionalidades Planificadas
- **Notificaciones push**: Alertas en tiempo real
- **Modo offline**: Funcionamiento sin conexión
- **Analytics**: Métricas y estadísticas detalladas
- **Exportación de datos**: Export de reportes y estadísticas
- **API real-time**: WebSocket para actualizaciones instantáneas

### Mejoras Técnicas
- **PWA support**: Aplicación web progresiva
- **Performance optimization**: Mejoras de velocidad
- **Accessibility**: Mejoras de accesibilidad
- **Internacionalización**: Soporte multi-idioma
- **Testing coverage**: Aumento de cobertura de tests

## Funcionalidades Destacadas

### Sistema de Ventanillas
- **Configuración flexible**: Cada ventanilla puede tener múltiples mesas asignadas
- **Auto-asignación inteligente**: Los usuarios se asignan automáticamente según su número de mesa
- **Actualización en tiempo real**: Sincronización automática cada 10-15 segundos
- **Vista administrativa**: Control completo de estados con botones de acción rápida
- **Vista pública optimizada**: Información clara para pantallas grandes sin controles

### Gestión de Estados Avanzada
- **Estados detallados**:
  - **Listo** (`null`/`present`): Usuario presente y preparado para retirar
  - **Recibiendo** (`receiving`): Usuario siendo atendido en este momento
  - **Completado** (`completed`): Usuario que ya completó su proceso
  - **No Aparece** (`no_show`): Usuario que no se presentó después de ser llamado
- **Transiciones inteligentes**: Flujo lógico entre estados
- **Actualización automática**: Cambio de estado al escanear QR

### Diseño Responsivo y Accesible
- **Optimización móvil**: Interfaz adaptada para dispositivos móviles
- **Pantallas grandes**: Vistas optimizadas para TV/proyector
- **Navegación intuitiva**: Panel de control flotante siempre accesible
- **Retroalimentación háptica**: Vibración en dispositivos compatibles
- **Accesibilidad**: Soporte para lectores de pantalla y navegación por teclado

## Contribución

### Cómo Contribuir
1. **Fork el proyecto** desde GitHub
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Realiza los cambios** siguiendo las convenciones del proyecto
4. **Ejecuta los tests** para asegurar que todo funciona
5. **Commit tus cambios** con mensajes descriptivos
6. **Push a tu rama** (`git push origin feature/nueva-funcionalidad`)
7. **Crea un Pull Request** con descripción detallada

### Estándares de Código
- **Seguir convenciones**: TypeScript, ESLint, Prettier
- **Tests requeridos**: Agregar tests para nuevas funcionalidades
- **Documentación**: Actualizar README si es necesario
- **Code review**: Esperar aprobación antes de merge

### Reportar Bugs
- **Usar GitHub Issues** para reportar bugs
- **Incluir información detallada**: Pasos para reproducir, screenshots, etc.
- **Etiquetar apropiadamente**: bug, enhancement, question, etc.

## Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

### Derechos y Responsabilidades
- **Uso libre**: Puedes usar, modificar y distribuir el código
- **Atribución**: Mantener el copyright y la licencia original
- **Sin garantía**: El software se proporciona "tal como está"
- **Contribuciones**: Las contribuciones se consideran bajo la misma licencia

---

**Math Trade Argentina - Sistema de Logística** - Desarrollado con ❤️ para la comunidad de juegos de mesa