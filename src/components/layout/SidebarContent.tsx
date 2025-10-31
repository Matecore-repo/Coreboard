// ============================================================================
// COMPONENTE: SidebarContent (OPTIMIZADO)
// ============================================================================
// Barra lateral con navegación principal - Refactorizado para mejor rendimiento

import React, { memo, useMemo, useCallback } from 'react';
import {
  Calendar,
  Home,
  Users,
  Settings,
  Zap,
  DollarSign,
  Building2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';

/**
 * Props para SidebarContent
 */
interface SidebarContentProps {
  demoName: string | null;
  userEmail: string | null;
  isDemo: boolean;
  activeNavItem: string;
  navItems: Array<{ id: string; label: string; icon: LucideIcon | null }>;
  showQuickActions: boolean;
  isMobile: boolean;
  onNavItemClick: (itemId: string) => void;
  onLogout: () => void;
  onQuickActionsToggle: () => void;
  onProfileClick?: () => void;
}

/**
 * Función helper memoizada para obtener iniciales del email
 */
const getInitials = (email?: string | null): string => {
  if (!email) return 'U';
  const name = email.split('@')[0];
  const parts = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ');
  const a = (parts[0] || '').charAt(0);
  const b = (parts[1] || '').charAt(0);
  return (a + (b || '')).toUpperCase();
};

/**
 * Función helper memoizada para obtener iniciales del nombre
 */
const getInitialsFromName = (name?: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const a = (parts[0] || '').charAt(0);
  const b = (parts[1] || '').charAt(0);
  return (a + (b || '')).toUpperCase();
};

/**
 * Componente NavItemButton memoizado
 * Evita re-renderizados innecesarios de cada botón individual
 */
const NavItemButton = memo(({
  item,
  isActive,
  onClick,
}: {
  item: { id: string; label: string; icon: LucideIcon | null };
  isActive: boolean;
  onClick: () => void;
}) => {
  const Icon = item.icon;
  
  if (!Icon) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full mb-1.5 transition-[background-color] duration-75 will-change-[background-color] ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-sidebar-foreground"
      }`}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
});

NavItemButton.displayName = 'NavItemButton';

/**
 * Componente SidebarContent optimizado
 * 
 * Optimizaciones:
 * - Memoización de cálculos costosos
 * - Componentes hijos memoizados
 * - Callbacks estables
 * - Validación de iconos antes de renderizar
 */
export const SidebarContent = memo(({
  demoName,
  userEmail,
  isDemo,
  activeNavItem,
  navItems,
  showQuickActions,
  isMobile,
  onNavItemClick,
  onLogout,
  onQuickActionsToggle,
  onProfileClick,
}: SidebarContentProps) => {
  // Memoizar el cálculo de iniciales y nombre de usuario
  const userInitials = useMemo(() => {
    return isDemo ? getInitialsFromName(demoName) : getInitials(userEmail);
  }, [isDemo, demoName, userEmail]);

  const userName = useMemo(() => {
    return isDemo 
      ? (demoName?.trim() || "Unnamed")
      : (userEmail?.split("@")[0] || "Unnamed");
  }, [isDemo, demoName, userEmail]);

  // Filtrar items válidos (con iconos) una sola vez
  const validNavItems = useMemo(() => {
    return navItems.filter(item => item.icon !== null);
  }, [navItems]);

  // Callback estable para evitar re-renderizados
  const handleNavClick = useCallback((itemId: string) => {
    onNavItemClick(itemId);
  }, [onNavItemClick]);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const handleQuickActionsToggle = useCallback(() => {
    onQuickActionsToggle();
  }, [onQuickActionsToggle]);

  return (
    <div className="w-full bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* ===================================================================
          SECCIÓN: Avatar y Usuario
          =================================================================== */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <Avatar 
          className="h-12 w-12 border-2 border-border flex-shrink-0 cursor-pointer"
          onClick={onProfileClick}
        >
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-muted-foreground text-xs">Bienvenido</span>
          <span className="text-sidebar-foreground font-medium truncate">
            {userName}
          </span>
        </div>
      </div>

      {/* ===================================================================
          SECCIÓN: Navegación
          =================================================================== */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {validNavItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeNavItem === item.id}
            onClick={() => handleNavClick(item.id)}
          />
        ))}

        {/* Botón de Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full mb-1.5 transition-colors duration-75 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </nav>

      {/* ===================================================================
          SECCIÓN: Acciones Rápidas
          =================================================================== */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0">
        <Button
          onClick={handleQuickActionsToggle}
          className="w-full rounded-full h-9"
          variant={showQuickActions ? "secondary" : "default"}
          aria-label={showQuickActions ? "Ocultar acciones rápidas" : "Mostrar acciones rápidas"}
        >
          <Zap className="h-4 w-4 mr-2 flex-shrink-0" />
          Acciones Rápidas
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renderizados innecesarios
  return (
    prevProps.demoName === nextProps.demoName &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.isDemo === nextProps.isDemo &&
    prevProps.activeNavItem === nextProps.activeNavItem &&
    prevProps.showQuickActions === nextProps.showQuickActions &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.navItems === nextProps.navItems &&
    prevProps.onNavItemClick === nextProps.onNavItemClick &&
    prevProps.onLogout === nextProps.onLogout &&
    prevProps.onQuickActionsToggle === nextProps.onQuickActionsToggle
  );
});

SidebarContent.displayName = 'SidebarContent';
