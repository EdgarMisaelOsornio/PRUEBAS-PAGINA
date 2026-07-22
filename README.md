# Service Desk — portal interno

Portal de herramientas operativas construido con Next.js 16 y React 19.

## Ejecutar el proyecto

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` como `.env.local` y completa las variables correspondientes.
3. Inicia el entorno de desarrollo con `npm run dev`.
4. Abre `http://localhost:3000`.

## Sistema visual

- Color principal: verde petróleo `#0F766E`.
- Navegación: azul marino `#0A2029`.
- Acento de modo oscuro: turquesa `#2DD4BF`.
- Tipografía: Plus Jakarta Sans en módulos y Geist en la aplicación Next.js.
- Estilos compartidos: `public/shared/service-desk-theme.css`.

El rediseño conserva la lógica de los módulos de E-Transporte, SEDENA, Videowalls y Políticas. El módulo de Políticas mantiene sus reglas específicas de impresión.

## Validación

- `npm run lint`
- `npm run build`

No se incluyen credenciales ni el archivo `.env.local` en el paquete distribuible.
