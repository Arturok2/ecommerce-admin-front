# E-commerce Order Management System (OMS)

Panel administrativo genérico y reutilizable para la gestión de un e-commerce de calzado: catálogo (categorías jerárquicas, productos con variantes de color/talla) y flujo completo de ventas (órdenes, historial de estados). Construido como dos aplicaciones independientes — **Backend (API)** y **Frontend (Panel Admin)** — pensadas para desplegarse por separado.

---

## 1. Arquitectura y Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + NestJS |
| ORM | Prisma ORM |
| Base de datos | PostgreSQL (Supabase, con connection pooling) |
| Autenticación | JWT (`@nestjs/jwt`) + bcrypt |
| Frontend | Next.js 14+ (App Router) |
| Estilos / UI | Tailwind CSS + Shadcn UI |
| Tablas de datos | TanStack Table (`@tanstack/react-table`) |
| Tipado | TypeScript estricto en ambas aplicaciones |

**Módulos del backend:** `auth`, `categories`, `products`, `customers`, `orders`, más el módulo global `prisma`.

**Vistas del frontend:** `login`, y dentro del grupo protegido `(dashboard)`: métricas (`/`), `categories`, `products`, `orders`.

---

## 2. Decisiones de Diseño Destacadas

### 2.1 Normalización de variantes de producto (Color / Talla)

Un producto de calzado (`Product`) no se vende directamente: se vende una combinación específica de color y talla, cada una con su propio stock, SKU y precio. En vez de modelar columnas rígidas `color` y `talla` en una sola tabla, el schema se normalizó en tres niveles:

```
Product  →  ProductVariant  →  VariantAttribute
```

- **`Product`** guarda solo los datos genéricos (nombre, marca, descripción, imágenes).
- **`ProductVariant`** es la unidad real de venta: `sku` único, `precio` y `stock` independientes por combinación.
- **`VariantAttribute`** guarda pares `tipo`/`valor` (`"Talla"`/`"27"`, `"Color"`/`"Blanco"`) ligados a una variante.

**Justificación:** este diseño evita una explosión combinatoria de columnas y permite agregar nuevos tipos de atributo (material, ancho, etc.) sin alterar el schema — solo se insertan filas nuevas. También permite que el stock y el precio se controlen a nivel de la unidad que realmente se factura, no del producto genérico.

### 2.2 Transacción atómica (`$transaction`) y precio calculado en el servidor

La creación de una orden (`OrdersService.create`) ejecuta, dentro de una única transacción de Prisma:

1. Verificación de existencia del cliente.
2. Lectura del **precio y stock reales** de cada variante directamente desde la base de datos.
3. Validación de stock disponible.
4. Generación de un número de orden corto y único.
5. Creación de la orden, sus items, la dirección de envío y el primer registro de historial.
6. Descuento del stock vendido.

**Justificación:**
- **Nunca se confía en el precio enviado por el cliente HTTP** — el `precioUnitario` de cada `OrderItem` se toma de `variante.precio` leído en el mismo momento de la transacción, eliminando cualquier posibilidad de manipular el total de una venta desde el frontend o una petición directa a la API.
- **Atomicidad real:** si cualquier paso falla (stock insuficiente, variante inexistente, cliente inválido), la transacción completa se revierte — no puede quedar una orden creada sin sus items, o un stock descontado sin una venta asociada. Esto es crítico en un dominio donde la consistencia del inventario y el historial de auditoría no son negociables.

### 2.3 Route Group `(dashboard)` para la protección de rutas en Next.js

El panel administrativo vive dentro de un *route group* `src/app/(dashboard)/`, con un único `layout.tsx` que:
- Verifica la existencia del token JWT (`localStorage`) al montar.
- Redirige a `/login` si no hay sesión, antes de renderizar cualquier vista hija.
- Centraliza el sidebar de navegación y el botón de cierre de sesión.

**Justificación:** los *route groups* de Next.js permiten compartir un layout (y su lógica de protección) entre múltiples rutas (`/`, `/categories`, `/products`, `/orders`) **sin afectar la URL** — `(dashboard)` no aparece en la ruta final. Esto evita repetir la verificación de sesión en cada página individual y centraliza el punto único de entrada/salida del panel protegido.

---

## 3. Guía de Instalación

### 3.1 Backend (NestJS + Prisma)

```bash
cd backend
npm install
```

Crea un archivo `.env` en la raíz del backend:

```env
# Conexión a Supabase — pooling para runtime, directa para migraciones
DATABASE_URL="postgresql://<usuario>:<password>@<host-pooler>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<usuario>:<password>@<host-directo>:5432/postgres"

# Autenticación
JWT_SECRET="reemplaza-esto-por-un-secreto-largo-y-aleatorio"

# CORS — URL del frontend
FRONTEND_URL="http://localhost:3000"

# Semilla de datos (opcional — ver sección de credenciales)
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="Admin123!"

PORT=3001
```

Genera el cliente de Prisma y aplica el schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Levanta el servidor:

```bash
npm run start:dev
```

Al arrancar, `OnApplicationBootstrap` crea automáticamente el administrador y los clientes ficticios de prueba si las tablas están vacías (ver sección de credenciales).

### 3.2 Frontend (Next.js)

```bash
cd frontend
npm install
```

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Levanta el servidor de desarrollo:

```bash
npm run dev
```

El panel estará disponible en `http://localhost:3000`. Al entrar sin sesión, redirige automáticamente a `/login`.

---

## 4. Credenciales por Defecto (Semilla)

Al levantar el backend por primera vez (tabla `Admin` vacía), se crea automáticamente un administrador con las credenciales definidas en `.env` (o los valores por defecto si no se sobreescriben):

| Campo | Valor por defecto |
|---|---|
| **Email** | `admin@example.com` |
| **Contraseña** | `Admin123!` |

> ⚠️ Estas credenciales son solo para evaluación/desarrollo. Cambia `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en tu `.env` antes de cualquier despliegue real, y rota el `JWT_SECRET`.

También se insertan 2–3 clientes ficticios (tabla `Customer`) para que el selector de "Generar Venta Ficticia" tenga datos disponibles de inmediato.

---

## 5. Flujo Recomendado para Evaluar el Proyecto

1. Inicia sesión en `/login` con las credenciales por defecto.
2. Crea una o más categorías (con y sin categoría padre, para ver la jerarquía).
3. Crea un producto con al menos dos variantes (distintas combinaciones de color/talla).
4. Genera una venta ficticia desde el módulo de Órdenes, seleccionando el producto recién creado.
5. Abre "Gestionar" sobre la orden creada y actualiza su estado — observa cómo se refleja en el timeline de historial y en la tabla principal.
