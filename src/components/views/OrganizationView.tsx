// ============================================================================
// COMPONENTE: OrganizationView (REFACTORIZADO - Sistema de Invitación)
// ============================================================================
// Gestión completa de organizaciones: ver, renombrar, invitar miembros y eliminar
// Layout simplificado consistente con HomeView

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSalons } from '../../hooks/useSalons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { PageContainer } from '../layout/PageContainer';
import { GenericActionBar } from '../GenericActionBar';
import { toastSuccess, toastError } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../ui/utils';
import {
  Trash2,
  Pencil,
  Save,
  X,
  Users,
  UserPlus,
  Search,
  Check,
  Edit3,
  Home,
  MessageCircle,
  Settings,
  Plus,
  MoreHorizontal,
  Menu,
  Sparkles,
  Star,
  Bookmark,
  Copy,
  Laugh,
  Info,
} from 'lucide-react';
import useOrganizationChat from '../../hooks/useOrganizationChat';

interface Organization {
  id: string;
  name: string;
  tax_id?: string;
  settings?: any;
  created_at: string;
}

interface Membership {
  id?: string;
  user_id: string;
  role: 'admin' | 'owner' | 'employee' | 'viewer';
  is_primary: boolean;
  user?: {
    email: string;
    full_name?: string;
  };
  employee?: {
    id: string;
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    commission_type?: 'percentage' | 'fixed';
    default_commission_pct?: number;
    default_commission_amount?: number;
    active: boolean;
  };
}

interface SearchedUser {
  id: string;
  email: string;
  full_name?: string;
}

interface OrganizationViewProps {
  isDemo?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
}

interface DisplayMessage {
  id: string;
  author: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface HistoryItem {
  id: string;
  title: string;
  description: string;
}

const FALLBACK_MESSAGES: DisplayMessage[] = [
  {
    id: 'sample-1',
    author: 'Nacho Angelone',
    role: 'user',
    content: '¿Podemos enviar una campaña de bienvenida a los nuevos clientes esta semana?',
    timestamp: '09:32',
  },
  {
    id: 'sample-2',
    author: 'Coreboard Assistant',
    role: 'assistant',
    content: 'Claro, preparé un borrador de mensaje. ¿Querés que lo agregue al editor para que lo ajustes?',
    timestamp: '09:33',
  },
  {
    id: 'sample-3',
    author: 'Ignacio Angelone',
    role: 'user',
    content: 'Sí, sumale también un recordatorio de promo para servicios de color.',
    timestamp: '09:35',
  },
  {
    id: 'sample-4',
    author: 'Coreboard Assistant',
    role: 'assistant',
    content: 'Listo. Actualicé el borrador con la promo y lo dejé marcado como “Pendiente de revisión”.',
    timestamp: '09:36',
  },
  {
    id: 'sample-5',
    author: 'Coreboard Assistant',
    role: 'system',
    content: 'Recordatorio: hay 12 clientes sin confirmar turno esta semana.',
    timestamp: '09:40',
  },
  {
    id: 'sample-6',
    author: 'Nacho Angelone',
    role: 'user',
    content: 'Perfecto, mañana vemos métricas. Gracias.',
    timestamp: '09:41',
  },
];

const FALLBACK_HISTORY: HistoryItem[] = [
  { id: 'h1', title: 'Resumen de objetivos', description: 'Metas del Q4 y próximos pasos' },
  { id: 'h2', title: 'Capacitación staff', description: 'Documento de onboarding' },
  { id: 'h3', title: 'Promo verano', description: 'Borrador campaña redes sociales' },
  { id: 'h4', title: 'Checklist diaria', description: 'Flujo apertura/cierre' },
  { id: 'h5', title: 'Script ventas', description: 'Preguntas para upsell' },
  { id: 'h6', title: 'Reporte fidelización', description: 'Análisis clientes recurrentes' },
];

const getInitials = (text: string | undefined) => {
  if (!text) return '';
  const cleaned = text.trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const { user: currentUser, currentRole, currentOrgId, leaveOrganization } = useAuth() as any;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Estados de edición
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  // Estados para invitar miembros
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin' | 'viewer'>('employee');
  const [inviting, setInviting] = useState(false);

  // Estado para eliminar organización
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estado para quitar miembro
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [removing, setRemoving] = useState(false);

  // Estado para salir de la organización
  const [leaveOrgDialogOpen, setLeaveOrgDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Estados para gestión de empleados
  const { employees, isLoading: loadingEmployees, createEmployee, updateEmployee, deleteEmployee } = useEmployees(currentOrgId ?? undefined);
  const { salons } = useSalons(currentOrgId ?? undefined, { enabled: true });
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedSalons, setSelectedSalons] = useState<Set<string>>(new Set());
  const [employeeFormData, setEmployeeFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_pct: 50.0,
    default_commission_amount: 0,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [composerValue, setComposerValue] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Refs para evitar cargas múltiples
  const loadingRef = useRef(false);
  const loadedOrgIdRef = useRef<string | null>(null);
  const previousOrgIdRef = useRef<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const MAX_COMPOSER_HEIGHT = 24 * 6;

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const isEmployee = currentRole === 'employee';
  const canEdit = isAdmin || isOwner;
  const canManageMembers = isAdmin || isOwner;
  const canDelete = isOwner;
  const canViewMembers = true; // Todos los usuarios pueden ver miembros

  // ============================================================================
  // FUNCIONES DE GESTIÓN DE EMPLEADOS
  // ============================================================================

  const handleSelectEmployeeFromList = useCallback(async (employee: any) => {
    // Cargar salones asignados
    const { data: assignments } = await supabase
      .from('salon_employees')
      .select('salon_id')
      .eq('employee_id', employee.id)
      .eq('is_active', true);
    
    const assignedSalonIds = new Set((assignments || []).map(a => a.salon_id));
    setSelectedSalons(assignedSalonIds);
    
    setSelectedEmployee({
      employee: employee,
      membership: memberships.find(m => m.user_id === employee.user_id) || null
    });
  }, [memberships]);

  const handleEditEmployeeFromList = useCallback(async (employee: any) => {
    setEditingEmployee(employee);
    setEmployeeFormData({
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone || '',
      commission_type: (employee.commission_type as 'percentage' | 'fixed') || 'percentage',
      default_commission_pct: employee.default_commission_pct || 0,
      default_commission_amount: employee.default_commission_amount || 0,
    });
    
    // Cargar salones asignados
    const { data: assignments } = await supabase
      .from('salon_employees')
      .select('salon_id')
      .eq('employee_id', employee.id)
      .eq('is_active', true);
    
    const assignedSalonIds = new Set((assignments || []).map(a => a.salon_id));
    setSelectedSalons(assignedSalonIds);
    
    setSelectedEmployee(null); // Cerrar action bar
    setTimeout(() => {
      setEmployeeDialogOpen(true);
    }, 200);
  }, []);

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeFormData);
        
        // Actualizar asignación a salones
        if (selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            const { data: existing } = await supabase
              .from('salon_employees')
              .select('id')
              .eq('salon_id', salonId)
              .eq('employee_id', editingEmployee.id)
              .single();
            
            if (!existing) {
              const { error: assignError } = await supabase
                .from('salon_employees')
                .insert([{
                  salon_id: salonId,
                  employee_id: editingEmployee.id,
                  assigned_by: userData?.user?.id || currentUser?.id,
                  is_active: true,
                }]);
              
              if (assignError) throw assignError;
            }
          });
          
          await Promise.all(assignmentPromises);
        }
        
        toastSuccess('Empleado actualizado correctamente');
      } else {
        if (!currentOrgId) {
          toastError('No se puede crear empleado: organización no encontrada');
          return;
        }

        // Buscar usuario por email si se proporciona
        let userId: string | null = null;
        if (employeeFormData.email) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', employeeFormData.email.toLowerCase().trim())
            .limit(1);
          
          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            
            // Verificar que el usuario tiene membresía en esta organización
            const { data: membership } = await supabase
              .from('memberships')
              .select('user_id')
              .eq('org_id', currentOrgId)
              .eq('user_id', userId)
              .single();
            
            if (!membership) {
              toastError('El usuario con ese email no tiene membresía en esta organización');
              return;
            }
          }
        }

        // Validar que el empleado tenga user_id (regla de oro)
        if (!userId) {
          toastError('No se puede crear empleado sin usuario. El empleado debe tener un usuario asociado (user_id obligatorio). Debe invitar al usuario primero.');
          return;
        }

        // Validar usando el validador
        const { validateEmployeeHasUser } = await import('../../lib/employeeValidator');
        const validation = validateEmployeeHasUser({
          ...employeeFormData,
          user_id: userId,
          org_id: currentOrgId,
        });
        
        if (!validation.valid) {
          toastError(validation.message || 'Error de validación del empleado');
          return;
        }

        const createdEmployee = await createEmployee({
          ...employeeFormData,
          org_id: currentOrgId,
          user_id: userId,
          active: true,
        });
        
        // Asignar empleado a salones seleccionados
        if (createdEmployee && selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            const { error: assignError } = await supabase
              .from('salon_employees')
              .insert([{
                salon_id: salonId,
                employee_id: createdEmployee.id,
                  assigned_by: userData?.user?.id || currentUser?.id,
                is_active: true,
              }]);
            
            if (assignError) throw assignError;
          });
          
          await Promise.all(assignmentPromises);
        }
        
        toastSuccess('Empleado creado correctamente');
      }

      setEmployeeDialogOpen(false);
      setEditingEmployee(null);
      setSelectedSalons(new Set());
      setSelectedEmployee(null);
      setEmployeeFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
      await loadMemberships(currentOrgId!);
    } catch (error) {
      console.error('Error saving employee:', error);
      toastError('Error al guardar el empleado');
    }
  };


  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) return;

    try {
      await deleteEmployee(employeeId);
      toastSuccess('Empleado eliminado correctamente');
      setSelectedEmployee(null);
      await loadMemberships(currentOrgId!);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toastError('Error al eliminar el empleado');
    }
  };

  const handleToggleSalon = (salonId: string) => {
    setSelectedSalons(prev => {
      const next = new Set(prev);
      if (next.has(salonId)) {
        next.delete(salonId);
      } else {
        next.add(salonId);
      }
      return next;
    });
  };

  const handleAssociateUserId = async () => {
    if (!selectedEmployee?.user_id || !employeeFormData.email) {
      toastError('Email requerido para asociar usuario');
      return;
    }

    try {
      // Buscar el usuario por email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', employeeFormData.email.toLowerCase().trim())
        .limit(1);
      
      if (!profiles || profiles.length === 0) {
        toastError('No se encontró un usuario con ese email');
        return;
      }
      
      const userId = profiles[0].id;
      
      // Verificar que el usuario tiene membresía en esta organización
      const { data: membership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', currentOrgId)
        .eq('user_id', userId)
        .single();
      
      if (!membership) {
        toastError('El usuario no tiene membresía en esta organización');
        return;
      }
      
      // Asociar el user_id al empleado
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, { user_id: userId });
        toastSuccess('Usuario asociado correctamente');
        setEmployeeDialogOpen(false);
        await loadMemberships(currentOrgId!);
      }
    } catch (error) {
      console.error('Error asociando usuario:', error);
      toastError('Error al asociar usuario');
    }
  };

  // Obtener datos del empleado seleccionado para el action bar
  const employeeActionBarData = useMemo(() => {
    if (!selectedEmployee || !selectedEmployee.employee) return null;
    
    const employee = selectedEmployee.employee;
    const membership = selectedEmployee.membership;
    
    // Obtener nombres de salones asignados
    const assignedSalonNames = salons
      .filter(s => selectedSalons.has(s.id))
      .map(s => s.name)
      .join(', ') || 'Ninguno';
    
    return {
      title: employee.full_name,
      subtitle: employee.email || 'Sin email',
            badge: {
              text: employee.active ? 'Activo' : 'Inactivo',
              variant: (employee.active ? 'default' : 'outline') as 'default' | 'outline'
            },
      detailFields: [
        { label: 'Email', value: employee.email || 'N/A' },
        { label: 'Teléfono', value: employee.phone || 'N/A' },
        { 
          label: 'Comisión', 
          value: employee.commission_type === 'fixed' 
            ? `$${employee.default_commission_amount?.toFixed(2) || 0}`
            : `${employee.default_commission_pct || 0}%`
        },
        { label: 'Salones Asignados', value: assignedSalonNames },
        { label: 'Rol en organización', value: membership 
          ? (membership.role === 'employee' ? 'Empleado' : membership.role === 'admin' ? 'Administrador' : membership.role)
          : 'Sin cuenta' },
      ]
    };
  }, [selectedEmployee, selectedSalons, salons]);

  const memberDirectory = useMemo(() => {
    const directory: Record<string, { label: string }> = {};
    memberships.forEach((membership) => {
      if (!membership.user_id) return;
      const label = membership.user?.full_name || membership.user?.email || `Usuario ${membership.user_id.substring(0, 8)}`;
      directory[membership.user_id] = { label };
    });
    return directory;
  }, [memberships]);

  const {
    channels,
    currentChannel,
    messages,
    loadingChannels,
    loadingMessages,
    realtimeStatus,
    selectedChannelId,
    selectChannel,
    sendMessage: sendChatMessage,
    createChannel: createChatChannel,
  } = useOrganizationChat(currentOrgId, { initialChannelId: null });

  const hasChannels = channels.length > 0;

  const navItems = useMemo<NavItem[]>(() => [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'members', label: 'Miembros', icon: Users },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ], []);

  const historyItems = useMemo<HistoryItem[]>(() => {
    if (channels.length > 0) {
      return channels.slice(0, 6).map((channel) => ({
        id: channel.id,
        title: channel.name,
        description: channel.slug ? `#${channel.slug}` : channel.is_private ? 'Conversación privada' : 'Canal de la organización',
      }));
    }
    return FALLBACK_HISTORY;
  }, [channels]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    if (messages.length > 0) {
      return messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUser?.id;
        const author = isCurrentUser ? 'Tú' : memberDirectory[message.sender_id]?.label || 'Miembro';
        return {
          id: message.id,
          author,
          role: isCurrentUser ? 'user' : 'assistant',
          content: message.body || '',
          timestamp: message.created_at ? new Date(message.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '',
        };
      });
    }
    return FALLBACK_MESSAGES;
  }, [messages, currentUser?.id, memberDirectory]);

  const membersPreview = useMemo(() => {
    if (memberships.length === 0) return [] as typeof memberships;
    return memberships.slice(0, 5);
  }, [memberships]);

  const activeChannel = useMemo(() => {
    if (!channels || channels.length === 0) return null;
    return channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];
  }, [channels, selectedChannelId]);

  const historyLoading = loadingChannels && !hasChannels;

  const lastAssistantMessage = useMemo(() => {
    for (let index = displayMessages.length - 1; index >= 0; index -= 1) {
      const message = displayMessages[index];
      if (message.role === 'assistant') {
        return message;
      }
    }
    return null;
  }, [displayMessages]);

  const hasAssistantMessage = Boolean(lastAssistantMessage);
  const channelSelectValue = activeChannel?.id ?? '';
  const channelSubtitle = activeChannel ? (activeChannel.is_private ? 'Chat privado' : 'Canal de la organización') : 'Canal general';
  const ownerMembership = useMemo(() => memberships.find((member) => member.role === 'owner'), [memberships]);
  const headerTitle = activeChannel?.name ?? 'General';

  const renderSidebarPanels = (org: Organization) => (
    <div className="flex h-full flex-col gap-4">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">History Chat</span>
            <span className="text-xs text-muted-foreground">Resumen de prompts recientes</span>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Opciones de historial">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          {historyLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`history-skeleton-${index}`} className="h-14 animate-pulse rounded-2xl bg-muted/50" />
            ))
          ) : historyItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
              Sin historial disponible
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-3 py-3 transition hover:border-primary/40 hover:bg-card"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" aria-label={`Acciones para ${item.title}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Organización</p>
            <p className="text-xs text-muted-foreground">Información y acceso rápido</p>
          </div>
          <Badge variant="outline" className="text-xs uppercase">Activo</Badge>
        </div>
        <Separator className="my-4" />
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-[0.08em]">Información</p>
            <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium text-foreground">{org.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Propietario</span>
                <span className="font-medium text-foreground">{ownerMembership?.user?.email || ownerMembership?.user?.full_name || 'No asignado'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Creada</span>
                <span className="text-foreground">
                  {new Date(org.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Miembros</p>
              <span className="text-xs text-muted-foreground">{memberships.length} en total</span>
            </div>
            <div className="mt-3 space-y-2">
              {loadingMembers ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={`member-skeleton-${index}`} className="h-14 animate-pulse rounded-2xl bg-muted/40" />
                ))
              ) : membersPreview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 px-4 py-4 text-center text-sm text-muted-foreground">
                  No hay miembros cargados
                </div>
              ) : (
                membersPreview.map((member) => {
                  const label = member.user?.full_name || member.user?.email || `Usuario ${member.user_id.substring(0, 4)}`;
                  const roleLabel = member.role === 'owner'
                    ? 'Propietario'
                    : member.role === 'admin'
                      ? 'Administrador'
                      : member.role === 'employee'
                        ? 'Empleado'
                        : 'Visualizador';

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/90 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/40">
                          <AvatarFallback>{getInitials(label)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{roleLabel}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Opciones para ${label}`}
                        onClick={() => {
                          if (member.role === 'owner') return;
                          setMemberToRemove(member);
                          setRemoveMemberDialogOpen(true);
                        }}
                        disabled={member.role === 'owner'}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="flex-1 min-w-[120px]" onClick={() => setInviteDialogOpen(true)}>
              Invitar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => setEditingOrg(true)}>
              Editar
            </Button>
            {canDelete && (
              <Button size="sm" variant="destructive" className="flex-1 min-w-[120px]" onClick={() => setDeleteDialogOpen(true)}>
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  const handleCreateChatChannel = useCallback(
    async (params: { name: string; type: 'organization' | 'direct' | 'custom'; isPrivate: boolean; memberIds?: string[] }) => {
      if (!currentOrgId) return;
      await createChatChannel(currentOrgId, params);
    },
    [createChatChannel, currentOrgId]
  );

  const handleSendChatMessage = useCallback(
    async (channelId: string, params: { body: string; attachments?: unknown[]; replyTo?: string | null }) => {
      if (!currentOrgId) return;
      await sendChatMessage(channelId, currentOrgId, params);
    },
    [currentOrgId, sendChatMessage]
  );

  const handlePromptNewChannel = useCallback(async () => {
    const name = window.prompt('Nombre para el nuevo canal');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await handleCreateChatChannel({ name: trimmed, type: 'custom', isPrivate: false });
  }, [handleCreateChatChannel]);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toastSuccess('Mensaje copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando mensaje:', error);
      toastError('No se pudo copiar el mensaje');
    }
  }, []);

  const handleAddToComposer = useCallback((content: string) => {
    setComposerValue((prev) => (prev ? `${prev}\n\n${content}` : content));
    setComposerError(null);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, []);

  const handleRegenerateClick = useCallback(() => {
    if (lastAssistantMessage) {
      setComposerValue(lastAssistantMessage.content);
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    }
  }, [lastAssistantMessage]);

  const handleComposerInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
    setComposerValue(target.value);
    if (composerError) {
      setComposerError(null);
    }
  }, [composerError, MAX_COMPOSER_HEIGHT]);

  const handleComposerSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!hasChannels) {
      setComposerError('Crea un canal para poder comenzar a chatear.');
      return;
    }

    const channelId = activeChannel?.id;
    if (!channelId) {
      setComposerError('Selecciona un canal antes de enviar.');
      return;
    }

    const trimmed = composerValue.trim();
    if (!trimmed) {
      setComposerError('Escribe un mensaje antes de enviar.');
      return;
    }

    try {
      setIsSendingMessage(true);
      await handleSendChatMessage(channelId, { body: trimmed });
      setComposerValue('');
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setComposerError('No se pudo enviar el mensaje. Intenta nuevamente.');
    } finally {
      setIsSendingMessage(false);
    }
  }, [activeChannel?.id, composerValue, handleSendChatMessage, hasChannels]);

  // ============================================================================
  // FUNCIONES DE CARGA (Memoizadas y optimizadas)
  // ============================================================================

  const loadMemberships = useCallback(async (orgId: string) => {
    setLoadingMembers(true);
    try {
      const { data: members, error } = await supabase
        .from('memberships')
        .select('id, user_id, role, is_primary')
        .eq('org_id', orgId)
        .limit(100);

      if (error) {
        console.error('Error loading memberships:', error);
        return;
      }

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        
        // Obtener emails y nombres de profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, { email: p.email, full_name: p.full_name }]));

        // Obtener nombres de employees si no están en profiles (por user_id)
        const { data: employees } = await supabase
          .from('employees')
          .select('user_id, full_name, email')
          .in('user_id', userIds)
          .not('user_id', 'is', null);

        const employeeMap = new Map((employees || []).map(e => [e.user_id, { full_name: e.full_name, email: e.email }]));

        // Combinar información de profiles y employees
        setMemberships(members.map((m: any) => {
          const profile = profileMap.get(m.user_id);
          const employee = employeeMap.get(m.user_id);
          
          // Priorizar: profile -> employee -> fallback
          const email = profile?.email || employee?.email || `Usuario ${m.user_id.substring(0, 8)}`;
          const full_name = profile?.full_name || employee?.full_name || undefined;

          return {
            ...m,
            user: {
              email,
              full_name
            }
          };
        }));
      } else {
        setMemberships([]);
      }
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const loadOrganizationData = useCallback(async () => {
    if (!currentOrgId) {
      setLoading(false);
      setOrganization(null);
      return;
    }

    if (loadingRef.current || loadedOrgIdRef.current === currentOrgId) {
      return;
    }

    loadingRef.current = true;
    loadedOrgIdRef.current = currentOrgId;
    setLoading(true);

    try {
      // Abort controller con timeout suave para evitar bloqueos prolongados
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 12000);

      // Cargar organización (request principal)
      const orgResult: any = await (supabase
        .from('orgs')
        .select('id, name, tax_id, created_at')
        .eq('id', currentOrgId)
        // @ts-ignore: abortSignal está disponible en supabase-js v2
        .abortSignal ? (supabase
          .from('orgs')
          .select('id, name, tax_id, created_at')
          .eq('id', currentOrgId)
          // @ts-ignore
          .abortSignal(controller.signal)
          .single()) : (supabase
          .from('orgs')
          .select('id, name, tax_id, created_at')
          .eq('id', currentOrgId)
          .single()));

      clearTimeout(abortTimer);

      if (orgResult.error) {
        throw new Error(orgResult.error.message || 'Error al cargar la organización');
      }

      const org = orgResult.data;
      if (!org) {
        throw new Error('Organización no encontrada');
      }

      setOrganization(org);
      setOrgName(org.name || '');
      setOrgTaxId(org.tax_id || '');

      // Cargar miembros
      await loadMemberships(currentOrgId);

    } catch (error: any) {
      console.error('Error loading organization:', error);
      const errorMsg = error.message || 'Error al cargar la organización. Verifica tu conexión.';
      toastError(errorMsg);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrgId, loadMemberships]);

  // ============================================================================
  // EFECTO PRINCIPAL
  // ============================================================================

  useEffect(() => {
    if (isDemo) {
      const demoOrg: Organization = {
        id: 'demo-org-123',
        name: 'Salón Demo - COREBOARD',
        tax_id: '00-000000-0',
        created_at: new Date().toISOString()
      };

      const demoMembers: Membership[] = [{
        id: 'demo-member-1',
        user_id: currentUser?.id || 'demo-user',
        role: 'owner',
        is_primary: true,
        user: { email: currentUser?.email || 'demo@coreboard.local' }
      }];

      setOrganization(demoOrg);
      setOrgName(demoOrg.name);
      setOrgTaxId(demoOrg.tax_id || '');
      setMemberships(demoMembers);
      setLoading(false);
      loadedOrgIdRef.current = 'demo-org-123';
      previousOrgIdRef.current = 'demo-org-123';
      return;
    }

    // Resetear carga si cambió el orgId o si se monta desde otra vista
    if (currentOrgId !== previousOrgIdRef.current) {
      loadedOrgIdRef.current = null;
      loadingRef.current = false;
      previousOrgIdRef.current = currentOrgId;
    }

    if (currentOrgId && loadedOrgIdRef.current !== currentOrgId && !loadingRef.current) {
      loadOrganizationData();
    } else if (!currentOrgId) {
      setLoading(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
      previousOrgIdRef.current = null;
    }
  }, [currentOrgId, isDemo, loadOrganizationData]);

  // ============================================================================
  // FUNCIONES DE ACCIÓN
  // ============================================================================

  const updateOrganization = async () => {
    if (!organization || !canEdit || !orgName.trim()) {
      toastError('El nombre es requerido');
      return;
    }

    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name: orgName.trim(),
          tax_id: orgTaxId.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, name: orgName.trim(), tax_id: orgTaxId.trim() });
      setEditingOrg(false);
      toastSuccess('Organización actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toastError(error.message || 'Error al actualizar la organización');
    }
  };

  // ============================================================================
  // FUNCIONES DE BÚSQUEDA Y GESTIÓN DE MIEMBROS
  // ============================================================================

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const searchTerm = query.trim().toLowerCase();
      const isEmail = searchTerm.includes('@');
      
      // Buscar en profiles por email (exacto primero, luego parcial)
      let profiles: any[] = [];
      if (isEmail) {
        // Si parece un email, buscar exacto primero
        const { data: exactProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', searchTerm)
          .limit(10);
        
        if (exactProfiles && exactProfiles.length > 0) {
          profiles = exactProfiles;
        } else {
          // Si no hay exacto, buscar parcial
          const { data: partialProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .ilike('email', `%${searchTerm}%`)
            .limit(10);
          profiles = partialProfiles || [];
        }
      } else {
        // Si no es email, buscar por coincidencia parcial
        const { data: partialProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .ilike('email', `%${searchTerm}%`)
          .limit(10);
        profiles = partialProfiles || [];
      }

      // Buscar en employees por email (si tienen user_id)
      let employeesByEmail: any[] = [];
      if (isEmail) {
        const { data: empByEmail } = await supabase
          .from('employees')
          .select('user_id, full_name, email')
          .ilike('email', `%${searchTerm}%`)
          .not('user_id', 'is', null)
          .limit(10);
        employeesByEmail = empByEmail || [];
      }

      // Buscar en employees por full_name (solo si tienen user_id)
      const { data: employeesByName } = await supabase
        .from('employees')
        .select('user_id, full_name, email')
        .ilike('full_name', `%${searchTerm}%`)
        .not('user_id', 'is', null)
        .limit(10);

      // Combinar resultados
      const userMap = new Map<string, SearchedUser>();
      
      // Agregar profiles
      (profiles || []).forEach((p: any) => {
        if (!userMap.has(p.id)) {
          userMap.set(p.id, {
            id: p.id,
            email: p.email || '',
            full_name: p.full_name || undefined
          });
        }
      });

      // Agregar employees encontrados por email
      (employeesByEmail || []).forEach((e: any) => {
        if (e.user_id) {
          const existing = userMap.get(e.user_id);
          if (existing) {
            existing.full_name = e.full_name || existing.full_name;
            existing.email = e.email || existing.email;
          } else {
            userMap.set(e.user_id, {
              id: e.user_id,
              email: e.email || '',
              full_name: e.full_name || undefined
            });
          }
        }
      });

      // Agregar employees encontrados por nombre
      (employeesByName || []).forEach((e: any) => {
        if (e.user_id && e.full_name) {
          const existing = userMap.get(e.user_id);
          if (existing) {
            existing.full_name = e.full_name || existing.full_name;
            existing.email = e.email || existing.email;
          } else {
            userMap.set(e.user_id, {
              id: e.user_id,
              email: e.email || '',
              full_name: e.full_name
            });
          }
        }
      });

      // Filtrar usuarios que ya son miembros de la organización
      const memberIds = new Set(memberships.map(m => m.user_id));
      const filteredResults = Array.from(userMap.values()).filter(u => !memberIds.has(u.id));

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toastError('Error al buscar usuarios. Intenta de nuevo.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [memberships]);

  const inviteMember = async () => {
    if (!currentOrgId || !selectedUser || !canManageMembers) return;

    try {
      setInviting(true);

      if (isDemo) {
        toastSuccess('Miembro invitado (modo demo)');
        setInviteDialogOpen(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // Crear invitación usando RPC
      const { data, error } = await supabase.rpc('create_invitation', {
        p_organization_id: currentOrgId,
        p_email: selectedUser.email,
        p_role: inviteRole,
        p_token: null, // Generar token automáticamente
        p_expires_days: 7
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      toastSuccess(`Invitación enviada a ${selectedUser.email}`);
      setInviteDialogOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toastError(error.message || 'Error al invitar al miembro');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async () => {
    if (!memberToRemove || !canManageMembers || memberToRemove.role === 'owner') {
      toastError('No se puede eliminar el propietario de la organización');
      return;
    }

    try {
      setRemoving(true);

      if (isDemo) {
        setMemberships(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
        toastSuccess('Miembro eliminado (modo demo)');
        setRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
        return;
      }

      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('org_id', currentOrgId)
        .eq('user_id', memberToRemove.user_id);

      if (error) throw error;

      // Cancelar invitaciones pendientes para este usuario en esta organización
      // Esto permite que puedan ser invitados nuevamente sin problemas
      if (memberToRemove.user?.email) {
        await supabase
          .from('invitations')
          .update({ used_at: new Date().toISOString() })
          .eq('organization_id', currentOrgId)
          .eq('email', memberToRemove.user.email.toLowerCase().trim())
          .is('used_at', null);
      }

      setMemberships(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
      toastSuccess('Miembro eliminado de la organización');
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (error: any) {
      console.error('Error removing member:', error);
      toastError(error.message || 'Error al eliminar el miembro');
    } finally {
      setRemoving(false);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!currentOrgId || !organization) return;

    try {
      setLeaving(true);

      if (isDemo) {
        toastSuccess('Has salido de la organización (modo demo)');
        setLeaveOrgDialogOpen(false);
        return;
      }

      await leaveOrganization(currentOrgId);
      toastSuccess('Has salido de la organización correctamente');
      setLeaveOrgDialogOpen(false);
      
      // La función leaveOrganization ya maneja la redirección
      // Si no hay más organizaciones, el usuario será redirigido al login
    } catch (error: any) {
      console.error('Error leaving organization:', error);
      toastError(error.message || 'Error al salir de la organización');
    } finally {
      setLeaving(false);
    }
  };

  const deleteOrganization = async () => {
    if (!organization || !canDelete) return;

    try {
      setDeleting(true);

      if (isDemo) {
        toastSuccess('Organización eliminada (modo demo)');
        setOrganization(null);
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('orgs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', organization.id);

      if (error) throw error;

      toastSuccess('Organización eliminada correctamente');
      setDeleteDialogOpen(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toastError(error.message || 'Error al eliminar la organización');
    } finally {
      setDeleting(false);
    }
  };

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (!inviteDialogOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inviteDialogOpen, searchUsers]);

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">Organización</span>
          <p className="text-muted-foreground">No tienes una organización asignada.</p>
        </div>
      </PageContainer>
    );
  }

  const navActiveId = 'chat';

  return (
    <TooltipProvider delayDuration={80}>
      <PageContainer>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid gap-6 lg:grid-cols-[72px_minmax(0,1fr)_360px] xl:grid-cols-[84px_minmax(0,1fr)_400px]">
            <nav className="hidden lg:flex flex-col items-center rounded-3xl border border-border/60 bg-card/80 py-6 text-muted-foreground" role="navigation" aria-label="Barra lateral">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                {getInitials(organization.name)}
              </div>
              <Separator className="my-6 h-px w-10 bg-border/60" />
              <div className="flex flex-1 flex-col items-center gap-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === navActiveId;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                          )}
                          aria-label={item.label}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <Separator className="my-6 h-px w-10 bg-border/60" />
              <Button variant="outline" size="icon" className="text-muted-foreground hover:text-primary" aria-label="Crear canal" onClick={handlePromptNewChannel}>
                <Plus className="h-4 w-4" />
              </Button>
            </nav>

            <main className="relative flex min-h-[75vh] flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm" role="main">
              <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border/60 bg-card/95 px-5 py-4 backdrop-blur">
                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir navegación">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[260px] sm:w-[320px]">
                    <SheetHeader>
                      <SheetTitle>Navegación</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col gap-2" role="navigation" aria-label="Principal">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === navActiveId;
                        return (
                          <Button
                            key={item.id}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className="justify-start gap-3"
                            onClick={() => setIsMobileNavOpen(false)}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="flex min-w-[220px] flex-1 items-center gap-3">
                    <div className="min-w-[140px]">
                      <p className="text-sm font-semibold text-foreground">{headerTitle}</p>
                      <p className="text-xs text-muted-foreground">{channelSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={channelSelectValue} onValueChange={(value) => selectChannel(value)} disabled={!hasChannels}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder={hasChannels ? 'Selecciona un canal' : 'Sin canales'} />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" className="text-muted-foreground hover:text-primary" onClick={handlePromptNewChannel} aria-label="Crear canal">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative hidden min-w-[200px] flex-1 sm:flex">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar en el chat" className="pl-9" aria-label="Buscar" role="search" />
                  </div>
                </div>

                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <div className="ml-auto flex items-center gap-2">
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir panel lateral">
                        <Info className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <Button variant="ghost" size="icon" aria-label="Más acciones">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                  <SheetContent side="right" className="w-[320px] sm:w-[360px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Resumen</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">{renderSidebarPanels(organization)}</div>
                  </SheetContent>
                </Sheet>
              </header>

              <div className="flex-1 overflow-hidden">
                {hasChannels ? (
                  <ScrollArea className="h-full px-6 py-6" type="hover" role="log" aria-live="polite">
                    <div className="space-y-5">
                      {displayMessages.map((message) => {
                        const isUserMessage = message.role === 'user';
                        const isSystemMessage = message.role === 'system';
                        const avatarLabel = getInitials(message.author);

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'rounded-3xl border border-border/60 bg-card/90 px-4 py-4 shadow-sm transition hover:border-border',
                              isUserMessage && 'border-primary/40 bg-primary/10',
                              isSystemMessage && 'border-dashed border-border/50 bg-muted/60'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10 border border-border/40">
                                  <AvatarFallback>{avatarLabel}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-medium text-foreground">{message.author}</p>
                                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                                  </div>
                                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message.content}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Copiar mensaje"
                                  onClick={() => handleCopyMessage(message.content)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Reaccionar"
                                  onClick={() => toastSuccess('Reacciones próximamente')}
                                >
                                  <Laugh className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Agregar al editor"
                                  onClick={() => handleAddToComposer(message.content)}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                    <p className="max-w-sm text-sm text-muted-foreground">No hay canales aún. Creá uno para comenzar a conversar con tu equipo.</p>
                    <Button onClick={handlePromptNewChannel}>Crear canal</Button>
                  </div>
                )}
              </div>

              {hasAssistantMessage && (
                <div className="flex justify-center border-t border-border/60 px-6 py-4">
                  <Button variant="outline" className="gap-2" onClick={handleRegenerateClick}>
                    <Sparkles className="h-4 w-4" /> Regenerar respuesta
                  </Button>
                </div>
              )}

              <form
                onSubmit={handleComposerSubmit}
                className="border-t border-border/60 bg-card/95 px-5 py-4"
                role="form"
                aria-label="Editor de mensajes"
              >
                <div className="flex flex-col gap-3">
                  <Textarea
                    ref={composerRef}
                    value={composerValue}
                    onChange={handleComposerInput}
                    placeholder={hasChannels ? 'Escribe tu mensaje. Usa / para comandos rápidos…' : 'Crea un canal para comenzar a chatear.'}
                    className="min-h-[52px] resize-none rounded-2xl border-border/60 bg-card/80 px-4 py-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    rows={2}
                    disabled={!hasChannels || isSendingMessage}
                    aria-invalid={composerError ? 'true' : 'false'}
                  />
                  <div className="sr-only" aria-live="polite">
                    {composerError ? `Error: ${composerError}` : 'Compositor listo para enviar.'}
                  </div>
                  {composerError && (
                    <p className="text-sm text-destructive">{composerError}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" className="gap-1 px-3 py-1.5" onClick={() => toastSuccess('Explorar prompts próximamente')}>
                        <Sparkles className="h-3 w-3" /> Browse prompts
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="gap-1 px-3 py-1.5" onClick={() => toastSuccess('Modo sin marca activado')}>
                        <Star className="h-3 w-3" /> Sin marca
                      </Button>
                    </div>
                    <Button type="submit" disabled={!hasChannels || isSendingMessage || !composerValue.trim()} className="gap-2" aria-label="Enviar mensaje">
                      {isSendingMessage ? 'Enviando…' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </form>
            </main>

            <aside className="hidden lg:flex" role="complementary" aria-label="Resumen de organización">
              {renderSidebarPanels(organization)}
            </aside>
          </div>
        </div>
      </PageContainer>

      {/* Dialog de confirmación para eliminar organización */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la organización "{organization.name}" y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para quitar miembro */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar miembro de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas quitar a {memberToRemove?.user?.full_name || memberToRemove?.user?.email || 'este miembro'} de la organización? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removing}
            >
              {removing ? 'Quitando...' : 'Quitar Miembro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para salir de la organización */}
      <AlertDialog open={leaveOrgDialogOpen} onOpenChange={setLeaveOrgDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas salir de la organización "{organization?.name}"? Esta acción no se puede deshacer. Ya no tendrás acceso a los datos de esta organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaving}
            >
              {leaving ? 'Saliendo...' : 'Salir de la organización'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear/editar empleado */}
      <Dialog 
        open={employeeDialogOpen} 
        onOpenChange={(open) => {
          setEmployeeDialogOpen(open);
          // Si se cierra el modal, cerrar también el action bar si está abierto
          if (!open) {
            setSelectedEmployee(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Modifica los datos del empleado.'
                : 'Agrega un nuevo empleado a tu organización.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={employeeFormData.full_name}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={employeeFormData.email}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                  placeholder="juan@email.com"
                />
                {employeeFormData.email && editingEmployee && !editingEmployee.user_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAssociateUserId}
                  >
                    Asociar Usuario
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editingEmployee && !editingEmployee.user_id 
                  ? 'Ingresa el email del empleado invitado para asociar su cuenta'
                  : 'Email del empleado'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                value={employeeFormData.phone}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                placeholder="+54911234567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commission_type">Tipo de comisión</Label>
              <Select
                value={employeeFormData.commission_type}
                onValueChange={(value: 'percentage' | 'fixed') => {
                  setEmployeeFormData({
                    ...employeeFormData,
                    commission_type: value,
                  });
                }}
              >
                <SelectTrigger id="commission_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {employeeFormData.commission_type === 'percentage' ? (
              <div className="grid gap-2">
                <Label htmlFor="commission_pct">Tasa de comisión (%)</Label>
                <Input
                  id="commission_pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={employeeFormData.default_commission_pct}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    default_commission_pct: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="commission_amount">Monto fijo de comisión ($)</Label>
                <Input
                  id="commission_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={employeeFormData.default_commission_amount}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    default_commission_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Asignar a Salones</Label>
              {salons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay salones disponibles</p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {salons.map((salon) => (
                    <div key={salon.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`salon-${salon.id}`}
                        checked={selectedSalons.has(salon.id)}
                        onChange={() => handleToggleSalon(salon.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`salon-${salon.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{salon.name}</div>
                        {salon.address && (
                          <div className="text-xs text-muted-foreground">{salon.address}</div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEmployeeDialogOpen(false);
              setEditingEmployee(null);
              setSelectedEmployee(null);
              setSelectedSalons(new Set());
              setEmployeeFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmployee} disabled={!employeeFormData.full_name.trim()}>
              {editingEmployee ? 'Actualizar' : 'Crear'} Empleado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GenericActionBar para empleado seleccionado - Solo mostrar si el modal NO está abierto */}
      {employeeActionBarData && selectedEmployee && !employeeDialogOpen && (
        <GenericActionBar
          title={employeeActionBarData.title}
          subtitle={employeeActionBarData.subtitle}
          badge={employeeActionBarData.badge}
          isOpen={!!selectedEmployee && !employeeDialogOpen}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => {
            if (selectedEmployee?.employee) {
              handleEditEmployeeFromList(selectedEmployee.employee);
            }
          }}
          onDelete={selectedEmployee.employee ? () => {
            if (selectedEmployee.employee) {
              setSelectedEmployee(null); // Cerrar action bar
              handleDeleteEmployee(selectedEmployee.employee.id);
            }
          } : undefined}
          detailFields={employeeActionBarData.detailFields}
        />
      )}
  </TooltipProvider>
  );
};

export default OrganizationView;
