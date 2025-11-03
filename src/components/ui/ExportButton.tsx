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
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { exportToCSV, exportToExcel, exportToPDF } = useFinancialExports();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    setExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportToCSV(data, filename);
          toast.success('Exportado a CSV exitosamente');
          break;
        case 'excel':
          await exportToExcel(data, filename);
          toast.success('Exportado a Excel exitosamente');
          break;
        case 'pdf':
          await exportToPDF('export-content', filename);
          toast.success('Exportado a PDF exitosamente');
          break;
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || exporting || data.length === 0}>
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

