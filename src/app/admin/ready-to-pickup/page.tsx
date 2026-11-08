"use client";

import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useHapticClick } from '@/hooks/useHapticClick';
import type { ProcessedUserWithWindow, UserWithWindow } from '@/types/window';
import { triggerHaptic } from '@/utils/haptics';
import { Chip, LoadingSpinner } from '@/components/common/ui';
import ProblemHeader from '@/components/staff/ProblemHeader';
import { CheckCircle, ChevronDown, ChevronUp, Clock, RefreshCw, Search, Users, UserX, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

type UserStatus = 'present' | 'receiving' | 'completed' | 'no_show';

interface UserSummary {
  present: number;
  receiving: number;
  completed: number;
  no_show: number;
  total: number;
}

interface ExpandedSection {
  present: boolean;
  receiving: boolean;
  completed: boolean;
  no_show: boolean;
}

const statusConfig = {
  present: {
    label: 'Listos',
    color: 'bg-primary',
    icon: Users,
    description: 'Usuarios listos para retirar'
  },
  receiving: {
    label: 'Recibiendo',
    color: 'bg-warning',
    icon: Clock,
    description: 'Usuarios recibiendo sus items'
  },
  completed: {
    label: 'Completados',
    color: 'bg-want',
    icon: CheckCircle,
    description: 'Usuarios que completaron el retiro'
  },
  no_show: {
    label: 'No aparecieron',
    color: 'bg-danger',
    icon: UserX,
    description: 'Usuarios que no se presentaron'
  }
};

const getValidTransitions = (currentStatus: UserStatus): UserStatus[] => {
  switch (currentStatus) {
    case 'present':
      return ['no_show'];
    case 'receiving':
      return ['no_show', 'completed'];
    case 'no_show':
      return ['receiving', 'completed'];
    case 'completed':
      return ['receiving'];
    default:
      return ['no_show'];
  }
};

const getStatusColor = (status: UserStatus): string => {
  return statusConfig[status]?.color || 'bg-cancel';
};

const getStatusLabel = (status: UserStatus): string => {
  return statusConfig[status]?.label || 'Desconocido';
};

export default function ReadyToPickupPage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ProcessedUserWithWindow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<ExpandedSection>({
    present: false,
    receiving: false,
    completed: false,
    no_show: false
  });
  const [selectedUser, setSelectedUser] = useState<ProcessedUserWithWindow | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const hasLoadedInitialData = useRef(false);
  
  const [visibleItems, setVisibleItems] = useState<{ [key in keyof ExpandedSection]: number }>({
    present: 20,
    receiving: 20,
    completed: 20,
    no_show: 20
  });
  
  const [loadingMore, setLoadingMore] = useState<{ [key in keyof ExpandedSection]: boolean }>({
    present: false,
    receiving: false,
    completed: false,
    no_show: false
  });
  
  const ITEMS_PER_BATCH = 20;
  
  const sectionRefs = useRef<{ [key in keyof ExpandedSection]: HTMLButtonElement | null }>({
    present: null,
    receiving: null,
    completed: null,
    no_show: null
  });

  const { execute: fetchReadyUsers } = useApi<UserWithWindow[]>('logistics/users/ready-to-pickup/', { method: 'GET' });
  const { execute: updateUserStatus } = useApi<any>('logistics/users/update-status/', { method: 'PATCH' });

  useEffect(() => {
    if (!authIsLoading && (isAuthenticated === false || isAdmin === false)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authIsLoading, router]);

  const fetchData = useCallback(async () => {
    if (isAdmin === false) return;

    try {
      setIsRefreshing(true);

      const usersData = await fetchReadyUsers();
      const processedUsers = (usersData || [])
        .map(user => ({
          ...user,
          status: user.status || null
        }));

      setUsers(processedUsers);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error al obtener datos:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener datos.');
    } finally {
      setIsRefreshing(false);
      if (isLoadingData) {
        setIsLoadingData(false);
      }
    }
  }, [isAdmin, fetchReadyUsers, isLoadingData]);

  const handleUserStatusChange = async (userId: string | number, newStatus: 'present' | 'receiving' | 'no_show' | 'completed') => {
    try {
      await updateUserStatus({
        user_id: userId,
        status: newStatus
      });

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (err) {
      console.error('Error al actualizar estado del usuario:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado del usuario.');
    }
  };

  const navigateToWindowConfigClick = useHapticClick(() => router.push('/admin/window-config'));
  const fetchDataClick = useHapticClick(fetchData);
  const userStatusChangeClick = useHapticClick((userId: string | number, newStatus: 'present' | 'receiving' | 'no_show' | 'completed') => {
    handleUserStatusChange(userId, newStatus);
  });
  const toggleStateExpansion = useHapticClick((state: keyof ExpandedSection) => {
    setExpandedSections(prev => ({ ...prev, [state]: !prev[state] }));
    if (expandedSections[state]) {
      setVisibleItems(prev => ({ ...prev, [state]: ITEMS_PER_BATCH }));
      setLoadingMore(prev => ({ ...prev, [state]: false }));
    }
  });

  const loadMoreItems = useHapticClick((state: keyof ExpandedSection) => {
    setLoadingMore(prev => ({ ...prev, [state]: true }));
    
    requestAnimationFrame(() => {
      setVisibleItems(prev => ({ ...prev, [state]: prev[state] + ITEMS_PER_BATCH }));
      
      setTimeout(() => {
        setLoadingMore(prev => ({ ...prev, [state]: false }));
      }, 200);
    });
  });

  const openUserModal = useHapticClick((user: ProcessedUserWithWindow) => {
    setSelectedUser(user);
    setShowUserModal(true);
  });

  const closeUserModal = useHapticClick(() => {
    setShowUserModal(false);
    setSelectedUser(null);
  });

  const isCommonUser = useCallback((u: ProcessedUserWithWindow) => 
    !u.roles || (!u.roles.includes('volunteer') && !u.roles.includes('admin')), []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        (user.table_number && user.table_number.toString().includes(searchLower))
      );
    });
  }, [users, searchTerm]);

  const usersByState = useMemo(() => ({
    present: filteredUsers.filter(u => isCommonUser(u) && (u.status === null || u.status === 'present')),
    receiving: filteredUsers.filter(u => isCommonUser(u) && u.status === 'receiving'),
    completed: filteredUsers.filter(u => isCommonUser(u) && u.status === 'completed'),
    no_show: filteredUsers.filter(u => isCommonUser(u) && u.status === 'no_show')
  }), [filteredUsers, isCommonUser]);

  const mainUsers = useMemo(() => users.filter(isCommonUser), [users, isCommonUser]);

  const volunteerAndAdminUsers = useMemo(() => 
    users.filter(user => user.roles && (user.roles.includes('volunteer') || user.roles.includes('admin'))), 
    [users]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const buttonElement = entry.target as HTMLButtonElement;
          const sectionKey = Object.keys(sectionRefs.current).find(
            key => sectionRefs.current[key as keyof ExpandedSection] === buttonElement
          ) as keyof ExpandedSection;
          
          if (sectionKey && expandedSections[sectionKey]) {
            if (loadingMore[sectionKey]) {
              return;
            }
            
            if (!entry.isIntersecting) {
              setExpandedSections(prev => ({ ...prev, [sectionKey]: false }));
              
              setTimeout(() => {
                const sectionButton = sectionRefs.current[sectionKey];
                if (sectionButton) {
                  const buttonRect = sectionButton.getBoundingClientRect();
                  const currentScrollY = window.scrollY;
                  const viewportHeight = window.innerHeight;
                  const appHeaderHeight = 64; 
                  const safeTopMargin = appHeaderHeight + 20; 
                  
                  if (buttonRect.top < safeTopMargin || buttonRect.top > viewportHeight - 100) {
                    sectionButton.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center' 
                    });
                  }
                  else {
                    const targetScroll = currentScrollY - (buttonRect.top - safeTopMargin);
                    window.scrollTo({ 
                      top: Math.max(0, targetScroll), 
                      behavior: 'smooth' 
                    });
                  }
                }
              }, 100);
            }
          }
        });
      },
      {
        threshold: 0.1, 
        rootMargin: '-80px 0px 0px 0px' 
      }
    );

    Object.entries(sectionRefs.current).forEach(([key, ref]) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => observer.disconnect();
  }, [expandedSections, loadingMore]);

  useEffect(() => {
    if (isAuthenticated && isAdmin === true && !hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      fetchData();
    }
    if (!authIsLoading && (isAuthenticated === false || isAdmin === false)) {
      setIsLoadingData(false);
    }
  }, [isAuthenticated, isAdmin, authIsLoading, fetchData]);

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (isAdmin === false) {
    return <div className="flex justify-center items-center min-h-screen"><p>Acceso denegado.</p></div>;
  }

  const getUserStatusColor = (status: string | null) => {
    switch (status) {
      case null:
      case 'present':
        return 'border-l-4 border-want';
      case 'receiving':
        return 'border-l-4 border-primary';
      case 'completed':
        return 'border-l-4 border-cancel';
      case 'no_show':
        return 'border-l-4 border-danger';
      default:
        return 'border-l-4 border-gray-200';
    }
  };

  const getUserStatusIcon = (status: string | null) => {
    switch (status) {
      case null:
      case 'present':
        return <Clock size={16} className="text-want-ink" />;
      case 'receiving':
        return <RefreshCw size={16} className="text-primary" />;
      case 'completed':
        return <CheckCircle size={16} className="text-want-ink" />;
      case 'no_show':
        return <UserX size={16} className="text-danger" />;
      default:
        return null;
    }
  };

  const UserItem = ({ user }: { user: ProcessedUserWithWindow }) => {
    const statusColor = getUserStatusColor(user.status);
    const statusIcon = getUserStatusIcon(user.status);
    
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-3 mb-3 ${statusColor} cursor-pointer`}
        onClick={() => openUserModal(user)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-bold text-heading leading-tight">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-body text-gray-500 mt-1">
              {user.username}
              {user.table_number && ` • Mesa ${user.table_number}`}
              {user.window_id && ` • ${user.window_name}`}
              {user.ready_games_count && ` • ${user.ready_games_count} juegos`}
            </p>
          </div>
          <div className="flex items-center ml-2 flex-shrink-0">
            {statusIcon}
          </div>
        </div>
      </div>
    );
  };

  const UserModal = () => {
    if (!selectedUser) return null;

    const validTransitions = getValidTransitions(selectedUser.status as UserStatus);
    const statusLabels = {
      present: 'Listo',
      receiving: 'Recibiendo',
      completed: 'Completado',
      no_show: 'No apareció'
    };

    const transitionLabels = {
      present: 'Marcar como Listo',
      receiving: 'Marcar como Recibiendo',
      completed: 'Marcar como Completado',
      no_show: 'Marcar como No Apareció'
    };

    return (
      <div className="fixed inset-0 z-modal flex items-center justify-center bg-overlay p-4">
        <div className="rounded-lg bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 rounded-lg bg-white p-4 border-b border-gray-200 z-raised">
            <div className="flex justify-between items-center">
              <h2 className="text-heading font-bold ">
                Información del Usuario
              </h2>
              <button
                onClick={closeUserModal}
                className="min-h-14 rounded-lg border border-gray-200 bg-white px-4 font-semibold text-gray-800 p-2 min-h-0"
              >
                <UserX size={20} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              <div className="rounded-lg bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-heading ">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <p className="text-body opacity-75">
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-body">
                  <div>
                    <p className="font-medium text-gray-600">Mesa</p>
                    <p className="font-semibold">
                      {selectedUser.table_number || 'No asignada'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Ventanilla</p>
                    <p className="font-semibold">
                      {selectedUser.window_name || 'No asignada'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Estado actual</p>
                    <div className="flex items-center gap-2">
                      {getUserStatusIcon(selectedUser.status)}
                      <span className="font-semibold">
                        {statusLabels[selectedUser.status as UserStatus] || 'Listo'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Juegos a retirar</p>
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-primary" />
                      <span className="font-semibold text-heading text-primary">
                        {selectedUser.ready_games_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-caption text-gray-500">
                    <p className="font-medium mb-1">ID de Usuario</p>
                    <p className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>
              </div>

              {validTransitions.length > 0 && (
                <div className="rounded-lg bg-white p-4">
                  <h4 className="font-bold mb-3 ">
                    Cambiar Estado
                  </h4>
                  <div className="space-y-2">
                    {validTransitions.map(transition => (
                      <button
                        key={transition}
                        onClick={() => {
                          userStatusChangeClick(selectedUser.id, transition);
                          closeUserModal();
                        }}
                        className={`w-full min-h-14 p-3 rounded-lg flex items-center gap-3 ${transition === 'receiving' ? 'border border-gray-200 bg-white text-gray-800' :
                            transition === 'completed' ? 'bg-primary text-white' :
                              transition === 'no_show' ? 'bg-danger text-white' :
                                'bg-want text-white'
                          }`}
                      >
                        <div className="w-6 h-6 flex items-center justify-center">
                          {transition === 'receiving' && <RefreshCw size={16} />}
                          {transition === 'completed' && <CheckCircle size={16} />}
                          {transition === 'no_show' && <UserX size={16} />}
                          {transition === 'present' && <Clock size={16} />}
                        </div>
                        <span className="font-medium">
                          {transitionLabels[transition]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {validTransitions.length === 0 && (
                <div className="rounded-lg bg-white p-4 text-center">
                  <CheckCircle size={48} className="mx-auto mb-3 text-want" />
                  <p className="font-medium text-gray-600">
                    Este usuario ha completado el proceso
                  </p>
                  <p className="text-body opacity-75 mt-1">
                    No hay transiciones disponibles
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UserSection = ({ 
    sectionKey, 
    title, 
    icon: Icon, 
    iconColor, 
    users, 
    expanded 
  }: {
    sectionKey: keyof ExpandedSection;
    title: string;
    icon: any;
    iconColor: string;
    users: ProcessedUserWithWindow[];
    expanded: boolean;
  }) => {
    const visibleUserCount = visibleItems[sectionKey];
    const visibleUsers = users.slice(0, visibleUserCount);
    const hasMore = users.length > visibleUserCount;
    const isLoadingMore = loadingMore[sectionKey];

    return (
      <div 
        data-section={sectionKey}
        className="rounded-lg bg-white overflow-visible"
      >
        <button
          ref={el => { sectionRefs.current[sectionKey] = el; }}
          onClick={() => toggleStateExpansion(sectionKey)}
          className={`w-full flex items-center justify-between p-4 transition-all duration-200 hover:bg-gray-50 ${
            expanded 
              ? 'sticky top-16 z-sticky rounded-lg bg-white shadow-lg border-b-2 border-gray-200' 
              : 'rounded-lg bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} className={iconColor} />
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-heading font-bold ${iconColor}`}>
              {users.length}
            </span>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        
        {expanded && users.length > 0 && (
          <div className="rounded-lg bg-white p-4 pt-2">
            <div className="space-y-2">
              {visibleUsers.map((user: ProcessedUserWithWindow) => (
                <UserItem key={user.id} user={user} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => loadMoreItems(sectionKey)}
                  disabled={isLoadingMore}
                  className="min-h-14 rounded-lg border border-gray-200 bg-white px-4 font-semibold text-gray-800 px-4 py-2 text-body disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      Cargar más ({users.length - visibleUserCount} restantes)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full text-gray-900">
      <main className="w-full p-3 md:p-4 lg:p-6 flex flex-col">
        <ProblemHeader id="no-show" />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 md:mb-6 gap-4">
          <div className="text-center sm:text-left flex-1">
            {lastUpdated && (
              <p className="text-caption md:text-body text-gray-600 ">
                Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                <span className="ml-2 text-orange-800">• Manual</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              onClick={fetchDataClick}
              disabled={isRefreshing}
              className="min-h-14 rounded-lg bg-primary px-4 font-semibold text-white flex items-center gap-1 text-body px-3 py-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
              <span className="sm:hidden">Sync</span>
            </button>
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <div className="pl-12 pr-12">
              <input
                type="text"
                placeholder="Nombre, usuario o mesa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => triggerHaptic()}
                className="w-full pl-10 pr-4 py-3 min-h-14 rounded-lg border border-gray-200 bg-white px-3 text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          {isLoadingData && mainUsers.length === 0 && (
            <div className="rounded-lg bg-white p-6 md:p-8 text-center">
              <p className="text-heading lg:text-2xl text-primary">Cargando usuarios...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-white p-4 md:p-6 bg-danger/10 border-2 border-danger text-center mb-4 md:mb-6">
              <p className="text-body md:text-heading text-danger">
                {error}
              </p>
            </div>
          )}

          {!isLoadingData && mainUsers.length === 0 && !error && (
            <div className="rounded-lg bg-white p-6 md:p-8 text-center">
              <p className="text-gray-600 text-heading lg:text-2xl">
                No hay usuarios para mostrar.
              </p>
            </div>
          )}

          {mainUsers.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {searchTerm ? (
                <div className="rounded-lg bg-white p-4">
                  <h3 className="text-heading font-semibold mb-4 ">
                    Resultados de búsqueda ({filteredUsers.length})
                  </h3>
                  {filteredUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map(user => (
                        <UserItem key={user.id} user={user} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <UserSection
                    sectionKey="present"
                    title="Listos para retirar"
                    icon={Clock}
                    iconColor="text-want-ink"
                    users={usersByState.present}
                    expanded={expandedSections.present}
                  />

                  <UserSection
                    sectionKey="receiving"
                    title="Recibiendo sus items"
                    icon={RefreshCw}
                    iconColor="text-primary"
                    users={usersByState.receiving}
                    expanded={expandedSections.receiving}
                  />

                  <UserSection
                    sectionKey="completed"
                    title="Completaron el retiro"
                    icon={CheckCircle}
                    iconColor="text-want-ink"
                    users={usersByState.completed}
                    expanded={expandedSections.completed}
                  />

                  <UserSection
                    sectionKey="no_show"
                    title="No se presentaron"
                    icon={UserX}
                    iconColor="text-danger"
                    users={usersByState.no_show}
                    expanded={expandedSections.no_show}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {volunteerAndAdminUsers.length > 0 && (
          <div className="rounded-lg bg-white p-4 mt-8 rounded-xl bg-primary/10">
            <h3 className="text-heading font-bold text-primary mb-3 flex items-center gap-2">
              <Users size={20} /> Voluntarios y organizadores
            </h3>
            <div className="space-y-2">
              {volunteerAndAdminUsers.map(user => (
                <div
                  key={user.id}
                  className="mb-3 cursor-pointer rounded-lg border border-primary/30 bg-primary/10 p-3 text-primary"
                  onClick={() => openUserModal(user)}
                  title={`Ver estado de ${user.first_name} ${user.last_name}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-heading leading-tight">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-body opacity-75 mt-1">
                        {(!user.roles || (!user.roles.includes('volunteer') && !user.roles.includes('admin'))) && (
                          <>
                            @{user.username}
                            {user.window_id && ` • ${user.window_name}`}
                          </>
                        )}
                        {user.table_number && ` • Mesa ${user.table_number}`}
                        {user.ready_games_count && ` • ${user.ready_games_count} juegos`}
                        {user.roles?.includes('admin') && (
                          <Chip tone="warning" className="ml-2">ORGANIZADOR</Chip>
                        )}
                        {user.roles?.includes('volunteer') && !user.roles?.includes('admin') && (
                          <Chip tone="good" className="ml-2">VOL</Chip>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center ml-2 flex-shrink-0">
                      {getUserStatusIcon(user.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showUserModal && <UserModal />}
      </main>
    </div>
  );
}