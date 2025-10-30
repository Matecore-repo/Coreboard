// ============================================================================
// COMPONENTE: LoadingView
// ============================================================================
// Componente de carga optimizado

import React, { memo } from 'react';

/**
 * Componente LoadingView
 * Muestra un spinner de carga mientras se cargan los componentes
 * Utilizado con Suspense para lazy-loaded components
 */
export const LoadingView = memo(() => (
  <div className="flex items-center justify-center p-12">
    {/* Spinner animado */}
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));

LoadingView.displayName = 'LoadingView';
