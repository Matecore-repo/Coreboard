#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

interface DocumentIndex {
  metadata: {
    title: string;
    generatedAt: string;
    totalDocuments: number;
  };
  documents: Array<{
    path: string;
    originalPath: string;
    category: string;
  }>;
}

interface Document {
  metadata: {
    title: string;
    path: string;
    category: string;
    tags?: string[];
    lastUpdated?: string;
    fileName?: string;
  };
  content: string;
  sections?: any[];
}

class CoreboardMCPServer {
  private server: Server;
  private indexPath: string;
  private projectRoot: string;
  private index: DocumentIndex | null = null;
  private documentsCache: Map<string, Document> = new Map();

  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.indexPath = path.join(this.projectRoot, 'docs', 'index.json');
    
    this.server = new Server(
      {
        name: 'coreboard-indexer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_documents',
          description: 'Buscar documentos por categoría, título o contenido',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Término de búsqueda (categoría, título o contenido)',
              },
              category: {
                type: 'string',
                description: 'Filtrar por categoría específica',
              },
              limit: {
                type: 'number',
                description: 'Límite de resultados (default: 10)',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_document',
          description: 'Obtener el contenido completo de un documento por su path',
          inputSchema: {
            type: 'object',
            properties: {
              documentPath: {
                type: 'string',
                description: 'Ruta del documento (ej: docs/AI_CONTEXT.json)',
              },
            },
            required: ['documentPath'],
          },
        },
        {
          name: 'list_categories',
          description: 'Listar todas las categorías disponibles en la documentación',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_index_stats',
          description: 'Obtener estadísticas del índice de documentación',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.loadIndex();

        switch (name) {
          case 'search_documents':
            return await this.searchDocuments(args as any);
          case 'get_document':
            return await this.getDocument(args as any);
          case 'list_categories':
            return await this.listCategories();
          case 'get_index_stats':
            return await this.getIndexStats();
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Listar recursos
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      await this.loadIndex();
      
      const resources = this.index?.documents.map((doc) => ({
        uri: `coreboard://${doc.path}`,
        name: path.basename(doc.path, '.json'),
        description: `Documento: ${doc.originalPath} (${doc.category})`,
        mimeType: 'application/json',
      })) || [];

      return { resources };
    });

    // Leer recurso
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^coreboard:\/\/(.+)$/);
      
      if (!match) {
        throw new Error(`URI inválida: ${uri}`);
      }

      const docPath = match[1];
      const fullPath = path.join(this.projectRoot, docPath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Documento no encontrado: ${docPath}`);
      }

      const content = await this.loadDocument(fullPath);
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    });
  }

  private async loadIndex(): Promise<void> {
    if (this.index) return;

    if (!fs.existsSync(this.indexPath)) {
      throw new Error(`Índice no encontrado: ${this.indexPath}`);
    }

    const indexContent = fs.readFileSync(this.indexPath, 'utf-8');
    this.index = JSON.parse(indexContent);
  }

  private async loadDocument(filePath: string): Promise<Document> {
    // Cache check
    if (this.documentsCache.has(filePath)) {
      return this.documentsCache.get(filePath)!;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Documento no encontrado: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const document: Document = JSON.parse(content);
    
    this.documentsCache.set(filePath, document);
    return document;
  }

  private async searchDocuments(args: { query: string; category?: string; limit?: number }) {
    const { query, category, limit = 10 } = args;
    const queryLower = query.toLowerCase();
    const results: Array<{
      path: string;
      title: string;
      category: string;
      snippet: string;
      relevance: number;
    }> = [];

    for (const doc of this.index!.documents) {
      // Filtrar por categoría si se especifica
      if (category && doc.category !== category) continue;

      try {
        const fullPath = path.join(this.projectRoot, doc.path);
        const document = await this.loadDocument(fullPath);
        
        let relevance = 0;
        const snippets: string[] = [];

        // Buscar en título
        if (document.metadata.title.toLowerCase().includes(queryLower)) {
          relevance += 10;
          snippets.push(`Título: ${document.metadata.title}`);
        }

        // Buscar en categoría
        if (document.metadata.category.toLowerCase().includes(queryLower)) {
          relevance += 5;
        }

        // Buscar en tags
        if (document.metadata.tags) {
          const matchingTags = document.metadata.tags.filter(tag =>
            tag.toLowerCase().includes(queryLower)
          );
          if (matchingTags.length > 0) {
            relevance += 3;
            snippets.push(`Tags: ${matchingTags.join(', ')}`);
          }
        }

        // Buscar en contenido
        const contentLower = document.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          relevance += 1;
          // Extraer snippet del contenido
          const index = contentLower.indexOf(queryLower);
          const start = Math.max(0, index - 100);
          const end = Math.min(document.content.length, index + query.length + 100);
          const snippet = document.content.substring(start, end);
          snippets.push(`...${snippet}...`);
        }

        if (relevance > 0) {
          results.push({
            path: doc.path,
            title: document.metadata.title,
            category: doc.category,
            snippet: snippets.join(' | '),
            relevance,
          });
        }
      } catch (error) {
        // Ignorar errores de lectura de documentos individuales
        console.error(`Error leyendo ${doc.path}:`, error);
      }
    }

    // Ordenar por relevancia
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Limitar resultados
    const limitedResults = results.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              totalResults: results.length,
              results: limitedResults,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getDocument(args: { documentPath: string }) {
    const { documentPath } = args;
    const fullPath = path.join(this.projectRoot, documentPath);

    const document = await this.loadDocument(fullPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(document, null, 2),
        },
      ],
    };
  }

  private async listCategories() {
    const categories = new Set<string>();
    
    for (const doc of this.index!.documents) {
      categories.add(doc.category);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              categories: Array.from(categories).sort(),
              total: categories.size,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getIndexStats() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...this.index!.metadata,
              categories: await this.getCategoriesCount(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getCategoriesCount(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    
    for (const doc of this.index!.documents) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }

    return counts;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP Coreboard iniciado');
  }
}

// Ejecutar servidor
const server = new CoreboardMCPServer();
server.run().catch(console.error);

