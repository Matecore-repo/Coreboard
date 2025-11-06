import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { toastSuccess, toastError } from '../../lib/toast';

interface ExportButtonProps {
  data: any[] | { [sheetName: string]: any[] };
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { exportToCSV, exportToExcel, exportToPDF } = useFinancialExports();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    // Verificar si hay datos
    const hasData = Array.isArray(data) 
      ? data.length > 0 
      : Object.keys(data).length > 0 && Object.values(data).some((sheet: any) => Array.isArray(sheet) && sheet.length > 0);
    
    if (!hasData) {
      toastError('No hay datos para exportar');
      return;
    }

    setExporting(true);
    try {
      switch (format) {
        case 'csv':
          // Para CSV, solo exportamos la primera hoja si es objeto
          if (Array.isArray(data)) {
            exportToCSV(data, filename);
          } else {
            const firstSheet = Object.values(data)[0];
            if (Array.isArray(firstSheet) && firstSheet.length > 0) {
              exportToCSV(firstSheet, filename);
            }
          }
          toastSuccess('Exportado a CSV exitosamente');
          break;
        case 'excel':
          await exportToExcel(data, filename);
          toastSuccess('Exportado a Excel exitosamente');
          break;
        case 'pdf':
          await exportToPDF('export-content', filename);
          toastSuccess('Exportado a PDF exitosamente');
          break;
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      toastError('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={
            disabled || 
            exporting || 
            (Array.isArray(data) ? data.length === 0 : Object.values(data).every((sheet: any) => !Array.isArray(sheet) || sheet.length === 0))
          }
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar a CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar a Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <File className="h-4 w-4 mr-2" />
          Exportar a PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

