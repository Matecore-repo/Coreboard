import { useCallback } from 'react';
import * as XLSX from 'xlsx';

export function useFinancialExports() {
  const exportToCSV = useCallback((data: any[], filename: string) => {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportToExcel = useCallback(async (data: any[] | { [sheetName: string]: any[] }, filename: string) => {
    const workbook = XLSX.utils.book_new();

    // Si es un objeto con múltiples hojas
    if (typeof data === 'object' && !Array.isArray(data)) {
      const sheetNames = Object.keys(data);
      if (sheetNames.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      sheetNames.forEach(sheetName => {
        const sheetData = data[sheetName];
        if (Array.isArray(sheetData) && sheetData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(sheetData);
          // Ajustar ancho de columnas
          const colWidths = Object.keys(sheetData[0]).map(key => ({
            wch: Math.max(key.length, 15)
          }));
          worksheet['!cols'] = colWidths;
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });
    } else if (Array.isArray(data)) {
      // Si es un array simple
      if (data.length === 0) {
        throw new Error('No hay datos para exportar');
      }
      const worksheet = XLSX.utils.json_to_sheet(data);
      // Ajustar ancho de columnas
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    } else {
      throw new Error('Formato de datos inválido');
    }

    // Generar archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Descargar archivo
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportToPDF = useCallback(async (elementId: string, filename: string) => {
    // Por ahora, solo se puede exportar como imagen
    // En producción, usar jsPDF + html2canvas
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento no encontrado');
    }
    // Implementación básica - en producción usar html2canvas + jsPDF
    console.warn('Exportación PDF requiere html2canvas + jsPDF');
  }, []);

  return {
    exportToCSV,
    exportToExcel,
    exportToPDF,
  };
}

