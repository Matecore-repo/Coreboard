# Servidor MCP para Coreboard

Este proyecto incluye un servidor MCP (Model Context Protocol) personalizado que indexa y sirve la documentación del proyecto para mejorar el contexto de la IA.

## Configuración

El servidor MCP está configurado en `.cursor/mcp.json`. Cursor debería detectarlo automáticamente al abrir el proyecto.

## Herramientas Disponibles

El servidor MCP expone las siguientes herramientas:

1. **search_documents**: Buscar documentos por categoría, título o contenido
2. **get_document**: Obtener el contenido completo de un documento
3. **list_categories**: Listar todas las categorías disponibles
4. **get_index_stats**: Obtener estadísticas del índice

## Recursos

Todos los documentos indexados en `docs/index.json` están disponibles como recursos MCP con el prefijo `coreboard://`.

## Pruebas

Para probar el servidor manualmente:

```bash
npm run mcp:test
```

## Estructura

- `scripts/mcp-server.ts`: Servidor MCP principal
- `.cursor/mcp.json`: Configuración para Cursor
- `docs/index.json`: Índice de documentación (29 documentos)

