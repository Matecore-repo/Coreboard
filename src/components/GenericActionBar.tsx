import { useState, memo, useCallback, useEffect } from "react";
import { Edit2, Trash2, Eye, X, MoreVertical, Calendar as CalendarIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  icon?: React.ReactNode;
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
  onReschedule?: (payload: { date?: string; time?: string; openPicker?: "date" | "time" }) => void;
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
  onReschedule,
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
          />

          {/* Action Bar - z-index menor que modales */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-2xl"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Compact Header */}
              <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate">{title}</h3>
                    {badge && (
                      <Badge variant={badge.variant || "secondary"}>
                        {badge.text}
                      </Badge>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Mobile: Botón principal "Modificar" si hay onEdit, o menú "Acciones" si hay múltiples acciones */}
                      {onEdit && (!customActions || customActions.length === 0) && !onReschedule ? (
                        // Si solo hay onEdit, mostrar botón directo "Modificar"
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onEdit}
                          className="h-8 px-3"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
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
                            >
                              Acciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="top" className="w-48">
                            {onEdit && (
                              <DropdownMenuItem onClick={onEdit}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Modificar
                              </DropdownMenuItem>
                            )}
                            {customActions?.map((action, index) => (
                              <DropdownMenuItem key={index} onClick={action.onClick}>
                                {action.icon && <span className="mr-2">{action.icon}</span>}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            {(onEdit || customActions) && onDelete && <DropdownMenuSeparator />}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
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
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Desktop: Botón principal "Modificar" si hay onEdit, o menú "Acciones" si hay múltiples acciones */}
                      {onEdit && (!customActions || customActions.length === 0) && !onReschedule ? (
                        // Si solo hay onEdit, mostrar botón directo "Modificar"
                        <Button
                          variant="default"
                          size="sm"
                          onClick={onEdit}
                          className="h-8 px-3"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
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
                            >
                              Acciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="top" className="w-56">
                            {onEdit && (
                              <DropdownMenuItem onClick={onEdit}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Modificar
                              </DropdownMenuItem>
                            )}

                            {customActions?.map((action, index) => (
                              <DropdownMenuItem key={index} onClick={action.onClick}>
                                {action.icon && <span className="mr-2">{action.icon}</span>}
                                {action.label}
                              </DropdownMenuItem>
                            ))}

                            {/* Subgrupo Reprogramar (solo si hay onReschedule) */}
                            {onReschedule && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  Reprogramar
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent sideOffset={8} className="w-56">
                                  <DropdownMenuItem onClick={() => { if (onReschedule) onReschedule({ date: new Date().toISOString().slice(0,10) }); }}>
                                    Hoy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { if (onReschedule) { const d = new Date(); d.setDate(d.getDate()+1); onReschedule({ date: d.toISOString().slice(0,10) }); } }}>
                                    Mañana
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { if (onReschedule) onReschedule({ openPicker: 'date' }); }}>
                                    Elegir fecha...
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { if (onReschedule) onReschedule({ openPicker: 'time' }); }}>
                                    Elegir hora...
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}

                            {(onEdit || customActions || onReschedule) && onDelete && <DropdownMenuSeparator />}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
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
                  >
                    <div className="px-4 py-3 space-y-2 bg-muted/10">
                      {detailFields.map((field, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground min-w-[100px]">
                            {field.label}:
                          </span>
                          <span className="text-xs flex-1">
                            {field.value}
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
