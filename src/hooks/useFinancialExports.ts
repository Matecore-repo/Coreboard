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

  const exportToExcel = useCallback(async (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

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

