#!/usr/bin/env node
// scripts/kill-port.js
// Script para cerrar procesos que están usando el puerto 3000 en Windows

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = 3000;

async function killPort() {
  try {
    console.log(`🔍 Buscando procesos en el puerto ${PORT}...`);
    
    // Encontrar procesos usando el puerto 3000
    const { stdout } = await execPromise(`netstat -ano | findstr :${PORT}`);
    
    if (!stdout || stdout.trim() === '') {
      console.log(`✅ No hay procesos usando el puerto ${PORT}`);
      return;
    }
    
    // Extraer PIDs de las líneas
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });
    
    if (pids.size === 0) {
      console.log(`✅ No se encontraron procesos para cerrar`);
      return;
    }
    
    console.log(`⚠️  Encontrados ${pids.size} proceso(s) usando el puerto ${PORT}`);
    
    // Cerrar cada proceso
    for (const pid of pids) {
      try {
        console.log(`🔪 Cerrando proceso PID: ${pid}...`);
        await execPromise(`taskkill /PID ${pid} /F`);
        console.log(`✅ Proceso ${pid} cerrado exitosamente`);
      } catch (error) {
        // Ignorar errores si el proceso ya no existe o no se puede cerrar
        console.log(`⚠️  No se pudo cerrar el proceso ${pid} (puede que ya esté cerrado)`);
      }
    }
    
    // Esperar un momento para que los procesos se cierren completamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Puerto ${PORT} liberado`);
  } catch (error) {
    // Si no hay procesos, netstat devuelve error, así que es normal
    if (error.code === 1) {
      console.log(`✅ No hay procesos usando el puerto ${PORT}`);
    } else {
      console.error(`❌ Error al cerrar procesos: ${error.message}`);
      // No lanzar error para que el script continúe
    }
  }
}

// Ejecutar la función
killPort().catch(console.error);

