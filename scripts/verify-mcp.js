#!/usr/bin/env node

/**
 * Script de verificación del servidor MCP
 * Verifica que todos los archivos necesarios existan
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const checks = [];

// Verificar índice
const indexPath = path.join(projectRoot, 'docs', 'index.json');
if (fs.existsSync(indexPath)) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  checks.push({
    name: 'Índice de documentación',
    status: '✓',
    details: `${index.metadata.totalDocuments} documentos indexados`
  });
} else {
  checks.push({
    name: 'Índice de documentación',
    status: '✗',
    details: 'No encontrado'
  });
}

// Verificar servidor MCP
const serverPath = path.join(projectRoot, 'scripts', 'mcp-server.ts');
if (fs.existsSync(serverPath)) {
  checks.push({
    name: 'Servidor MCP',
    status: '✓',
    details: 'scripts/mcp-server.ts existe'
  });
} else {
  checks.push({
    name: 'Servidor MCP',
    status: '✗',
    details: 'No encontrado'
  });
}

// Verificar configuración
const configPath = path.join(projectRoot, '.cursor', 'mcp.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  checks.push({
    name: 'Configuración Cursor',
    status: '✓',
    details: `Servidor: ${Object.keys(config.mcpServers || {})[0] || 'ninguno'}`
  });
} else {
  checks.push({
    name: 'Configuración Cursor',
    status: '✗',
    details: '.cursor/mcp.json no encontrado'
  });
}

// Verificar dependencias
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const hasSDK = packageJson.devDependencies?.['@modelcontextprotocol/sdk'];
const hasTsx = packageJson.devDependencies?.tsx;

checks.push({
  name: 'Dependencias',
  status: hasSDK && hasTsx ? '✓' : '✗',
  details: `SDK: ${hasSDK ? '✓' : '✗'}, tsx: ${hasTsx ? '✓' : '✗'}`
});

// Mostrar resultados
console.log('\n🔍 Verificación del Servidor MCP Coreboard\n');
console.log('─'.repeat(50));

checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(25)} ${check.details}`);
});

console.log('─'.repeat(50));

const allPassed = checks.every(c => c.status === '✓');
if (allPassed) {
  console.log('\n✅ Todo configurado correctamente!\n');
  console.log('El servidor MCP debería estar disponible en Cursor.');
  console.log('Reinicia Cursor si no lo detecta automáticamente.\n');
} else {
  console.log('\n⚠️  Algunos componentes faltan. Revisa los errores arriba.\n');
}

process.exit(allPassed ? 0 : 1);

