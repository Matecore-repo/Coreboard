import { useState, memo, useCallback, useEffect } from "react";
import { Edit2, Trash2, Eye, X, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DetailField {
  label: string;
  value: string | React.ReactNode;
}

interface GenericActionBarProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  customActions?: ActionButton[];
  detailFields?: DetailField[];
}

export const GenericActionBar = memo(function GenericActionBar({
  title,
  subtitle,
  badge,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  customActions,
  detailFields,
}: GenericActionBarProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  // Detect mobile screens
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset details when action bar closes
  useEffect(() => {
    if (!isOpen) {
      setShowDetails(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop con blur - z-index menor que modales */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[45]"
            onClick={onClose}
            role="button"
            aria-label="Cerrar barra de acciones"
            data-action="close-action-bar"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
              }
            }}
          />

          {/* Action Bar - z-index menor que modales */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-2xl"
            role="dialog"
            aria-labelledby="action-bar-title"
            aria-describedby="action-bar-subtitle"
            aria-modal="false"
            data-action-bar="true"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Compact Header */}
              <div className="px-4 py-3 flex items-center justify-between bg-muted/30" role="region" aria-label="Encabezado de barra de acciones">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <h3 id="action-bar-title" className="truncate">{title}</h3>
                    {badge && (
                      <Badge variant={badge.variant || "secondary"} aria-label={`Estado: ${badge.text}`}>
                        {badge.text}
                      </Badge>
                    )}
                  </div>
                  {subtitle && (
                    <p id="action-bar-subtitle" className="text-xs text-muted-foreground truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Compact Actions - Desktop/Mobile Responsive */}
                <div className="flex items-center gap-1">
                  {isMobile ? (
                    <>
                      {/* Mobile: Show only essential buttons + dropdown for others */}
                      {detailFields && detailFields.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleDetails}
                          className="h-8 w-8 p-0"
                          aria-label={showDetails ? "Ocultar detalles" : "Mostrar detalles"}
                          aria-expanded={showDetails}
                          data-action="toggle-details"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      
                      {/* Mobile: Botón principal "Modificar" si hay onEdit, o menú "Acciones" si hay múltiples acciones */}
                      {onEdit && (!customActions || customActions.length === 0) ? (
                        // Si solo hay onEdit, mostrar botón directo "Modificar"
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onEdit}
                          className="h-8 px-3"
                          aria-label="Modificar elemento"
                          data-action="edit"
                        >
                          <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
                          Modificar
                        </Button>
                      ) : (
                        // Si hay múltiples acciones, mostrar menú "Acciones"
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-20 px-2"
                              aria-label="Abrir menú de acciones"
                              aria-haspopup="true"
                              data-action="open-actions-menu"
                            >
                              Acciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="top" className="w-48" role="menu" aria-label="Acciones disponibles">
                            {onEdit && (
                              <DropdownMenuItem onClick={onEdit} role="menuitem" aria-label="Modificar elemento" data-action="edit">
                                <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Modificar
                              </DropdownMenuItem>
                            )}
                            {customActions?.map((action, index) => (
                              <DropdownMenuItem key={index} onClick={action.onClick} role="menuitem" aria-label={action.label} data-action={action.label.toLowerCase().replace(/\s+/g, '-')}>
                                {action.icon && <span className="mr-2" aria-hidden="true">{action.icon}</span>}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            {(onEdit || customActions) && onDelete && <DropdownMenuSeparator />}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                                role="menuitem"
                                aria-label="Eliminar elemento"
                                data-action="delete"
                              >
                                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                        aria-label="Cerrar barra de acciones"
                        data-action="close-action-bar"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Desktop: Botón principal "Modificar" si hay onEdit, o menú "Acciones" si hay múltiples acciones */}
                      {onEdit && (!customActions || customActions.length === 0) ? (
                        // Si solo hay onEdit, mostrar botón directo "Modificar"
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onEdit}
                          className="h-8 px-3"
                          aria-label="Modificar elemento"
                          data-action="edit"
                        >
                          <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
                          Modificar
                        </Button>
                      ) : (
                        // Si hay múltiples acciones, mostrar menú "Acciones"
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-24 px-2"
                              aria-label="Abrir menú de acciones"
                              aria-haspopup="true"
                              data-action="open-actions-menu"
                              data-action-type="menu-trigger"
                            >
                              Acciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="top" className="w-56" role="menu" aria-label="Acciones disponibles" data-menu="action-bar-menu">
                            {onEdit && (
                              <DropdownMenuItem onClick={onEdit} role="menuitem" aria-label="Modificar elemento" data-action="edit" data-action-type="edit">
                                <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Modificar
                              </DropdownMenuItem>
                            )}

                            {customActions?.map((action, index) => {
                              const actionType = action.label.toLowerCase().replace(/\s+/g, '-');
                              return (
                                <DropdownMenuItem 
                                  key={index} 
                                  onClick={action.onClick} 
                                  role="menuitem" 
                                  aria-label={action.label} 
                                  data-action={actionType}
                                  data-action-type={actionType}
                                  disabled={action.disabled}
                                >
                                  {action.icon && <span className="mr-2" aria-hidden="true">{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                              );
                            })}

                            {(onEdit || customActions) && onDelete && <DropdownMenuSeparator />}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                                role="menuitem"
                                aria-label="Eliminar elemento"
                                data-action="delete"
                              >
                                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Mostrar botón de detalles y cerrar aparte */}
                      {detailFields && detailFields.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleDetails}
                          className="h-8 w-8 p-0"
                          aria-label={showDetails ? "Ocultar detalles" : "Mostrar detalles"}
                          aria-expanded={showDetails}
                          data-action="toggle-details"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                        aria-label="Cerrar barra de acciones"
                        data-action="close-action-bar"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Expandable Details */}
              <AnimatePresence>
                {showDetails && detailFields && detailFields.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border overflow-hidden"
                    role="region"
                    aria-label="Detalles del elemento"
                    aria-expanded={showDetails}
                  >
                    <div className="px-4 py-3 space-y-2.5 bg-muted/10">
                      {detailFields.map((field, index) => (
                        <div key={index} className="flex items-start gap-3" role="group" aria-label={field.label}>
                          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                            {field.label}:
                          </span>
                          <span className="text-sm text-foreground flex-1 font-medium">
                            {field.value || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
