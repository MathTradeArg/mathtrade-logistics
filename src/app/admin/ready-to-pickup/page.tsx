"use client";

import { AppHeader } from '@/components/common';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useHapticClick } from '@/hooks/useHapticClick';
import type { ProcessedUserWithWindow, UserWithWindow } from '@/types/window';
import { triggerHaptic } from '@/utils/haptics';
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
    color: 'bg-blue-500',
    icon: Users,
    description: 'Usuarios listos para retirar'
  },
  receiving: {
    label: 'Recibiendo',
    color: 'bg-yellow-500',
    icon: Clock,
    description: 'Usuarios recibiendo sus items'
  },
  completed: {
    label: 'Completados',
    color: 'bg-green-500',
    icon: CheckCircle,
    description: 'Usuarios que completaron el retiro'
  },
  no_show: {
    label: 'No aparecieron',
    color: 'bg-red-500',
    icon: UserX,
    description: 'Usuarios que no se presentaron'
  }
};

const getValidTransitions = (currentStatus: UserStatus): UserStatus[] => {
  switch (currentStatus) {
    case 'present':
      return ['receiving', 'no_show', 'completed'];
    case 'receiving':
      return ['completed'];
    case 'no_show':
      return ['receiving', 'completed'];
    case 'completed':
      return [];
    default:
      return ['receiving', 'no_show', 'completed'];
  }
};

const getStatusColor = (status: UserStatus): string => {
  return statusConfig[status]?.color || 'bg-gray-500';
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
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
  }

  if (isAdmin === false) {
    return <div className="flex justify-center items-center min-h-screen"><p>Acceso denegado.</p></div>;
  }

  const getUserStatusColor = (status: string | null) => {
    switch (status) {
      case null:
      case 'present':
        return 'nm-btn-primary';
      case 'receiving':
        return 'nm-btn-secondary';
      case 'completed':
        return 'nm-btn-finish';
      case 'no_show':
        return 'nm-btn-warning';
      default:
        return 'nm-btn-finish';
    }
  };

  const getUserStatusIcon = (status: string | null) => {
    switch (status) {
      case null:
      case 'present':
        return <Clock size={16} className="text-green-600 dark:text-green-400" />;
      case 'receiving':
        return <RefreshCw size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
      case 'no_show':
        return <UserX size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const UserItem = ({ user }: { user: ProcessedUserWithWindow }) => {
    const statusColor = getUserStatusColor(user.status);
    const statusIcon = getUserStatusIcon(user.status);
    
    return (
      <div
        className={`nm-list-item p-3 mb-3 ${statusColor} cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
        onClick={() => openUserModal(user)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight nm-text-shadow truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm opacity-75 mt-1 nm-text-shadow truncate">
              {user.username}
              {user.table_number && ` • Mesa ${user.table_number}`}
              {user.window_id && ` • Ventanilla ${user.window_id}`}
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
      <div className="fixed inset-0 flex justify-center items-center p-4 z-50 glass-bg">
        <div className="nm-surface max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 nm-surface p-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold nm-text-shadow">
                Información del Usuario
              </h2>
              <button
                onClick={closeUserModal}
                className="nm-btn-secondary p-2 min-h-0"
              >
                <UserX size={20} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              <div className="nm-surface p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg nm-text-shadow">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <p className="text-sm opacity-75">
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">Mesa</p>
                    <p className="font-semibold">
                      {selectedUser.table_number || 'No asignada'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">Ventanilla</p>
                    <p className="font-semibold">
                      {selectedUser.window_id || 'No asignada'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">Estado actual</p>
                    <div className="flex items-center gap-2">
                      {getUserStatusIcon(selectedUser.status)}
                      <span className="font-semibold">
                        {statusLabels[selectedUser.status as UserStatus] || 'Listo'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">Juegos a retirar</p>
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                        {selectedUser.ready_games_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p className="font-medium mb-1">ID de Usuario</p>
                    <p className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>
              </div>

              {validTransitions.length > 0 && (
                <div className="nm-surface p-4">
                  <h4 className="font-bold mb-3 nm-text-shadow">
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
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${transition === 'receiving' ? 'nm-btn-secondary' :
                            transition === 'completed' ? 'nm-btn-primary' :
                              transition === 'no_show' ? 'nm-btn-warning' :
                                'nm-btn-finish'
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
                <div className="nm-surface p-4 text-center">
                  <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">
                    Este usuario ha completado el proceso
                  </p>
                  <p className="text-sm opacity-75 mt-1">
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
        className="nm-surface overflow-visible"
      >
        <button
          ref={el => { sectionRefs.current[sectionKey] = el; }}
          onClick={() => toggleStateExpansion(sectionKey)}
          className={`w-full flex items-center justify-between p-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
            expanded 
              ? 'sticky top-16 z-40 nm-surface shadow-lg border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900' 
              : 'nm-surface'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} className={iconColor} />
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold ${iconColor}`}>
              {users.length}
            </span>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        
        {expanded && users.length > 0 && (
          <div className="nm-surface p-4 pt-2">
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
                  className="nm-btn-secondary px-4 py-2 text-sm disabled:opacity-50 flex items-center gap-2 mx-auto"
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
    <div className="w-full min-h-screen nm-surface text-gray-900 dark:text-gray-100 nm-font">
      <AppHeader
        pageTitle="Administrar Usuarios"
        pageIcon={Users as any}
        showBackButton={true}
        onBackClick={() => router.push('/')}
      />

      <main className="w-full p-3 md:p-4 lg:p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 md:mb-6 gap-4">
          <div className="text-center sm:text-left flex-1">
            {lastUpdated && (
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 nm-text-shadow">
                Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">• Manual</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              onClick={fetchDataClick}
              disabled={isRefreshing}
              className="nm-btn-primary flex items-center gap-1 text-sm px-3 py-2 disabled:opacity-50"
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
                className="w-full pl-10 pr-4 py-3 nm-input"
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          {isLoadingData && mainUsers.length === 0 && (
            <div className="nm-surface p-6 md:p-8 text-center">
              <p className="text-lg md:text-xl lg:text-2xl text-sky-600 dark:text-sky-400 nm-text-shadow">Cargando usuarios...</p>
            </div>
          )}

          {error && (
            <div className="nm-surface p-4 md:p-6 bg-red-50 dark:bg-red-900/30 border-2 border-red-500 text-center mb-4 md:mb-6">
              <p className="text-sm md:text-lg lg:text-xl text-red-700 dark:text-red-300 nm-text-shadow">
                {error}
              </p>
            </div>
          )}

          {!isLoadingData && mainUsers.length === 0 && !error && (
            <div className="nm-surface p-6 md:p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl lg:text-2xl nm-text-shadow">
                No hay usuarios para mostrar.
              </p>
            </div>
          )}

          {mainUsers.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {searchTerm ? (
                <div className="nm-surface p-4">
                  <h3 className="text-lg font-semibold mb-4 nm-text-shadow">
                    Resultados de búsqueda ({filteredUsers.length})
                  </h3>
                  {filteredUsers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
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
                    iconColor="text-green-600 dark:text-green-400"
                    users={usersByState.present}
                    expanded={expandedSections.present}
                  />

                  <UserSection
                    sectionKey="receiving"
                    title="Recibiendo sus items"
                    icon={RefreshCw}
                    iconColor="text-blue-600 dark:text-blue-400"
                    users={usersByState.receiving}
                    expanded={expandedSections.receiving}
                  />

                  <UserSection
                    sectionKey="completed"
                    title="Completaron el retiro"
                    icon={CheckCircle}
                    iconColor="text-green-600 dark:text-green-400"
                    users={usersByState.completed}
                    expanded={expandedSections.completed}
                  />

                  <UserSection
                    sectionKey="no_show"
                    title="No se presentaron"
                    icon={UserX}
                    iconColor="text-red-600 dark:text-red-400"
                    users={usersByState.no_show}
                    expanded={expandedSections.no_show}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {volunteerAndAdminUsers.length > 0 && (
          <div className="nm-surface p-4 mt-8 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-3 nm-text-shadow flex items-center gap-2">
              <Users size={20} /> Voluntarios y Admins
            </h3>
            <div className="space-y-2">
              {volunteerAndAdminUsers.map(user => (
                <div
                  key={user.id}
                  className={`nm-list-item p-3 mb-3 bg-blue-100 dark:bg-blue-800/40 text-blue-900 dark:text-blue-100 cursor-pointer transition-all duration-200 hover:scale-[1.02] rounded-lg`}
                  onClick={() => openUserModal(user)}
                  title={`Ver estado de ${user.first_name} ${user.last_name}`}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg leading-tight nm-text-shadow truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm opacity-75 mt-1 nm-text-shadow truncate">
                        {(!user.roles || (!user.roles.includes('volunteer') && !user.roles.includes('admin'))) && (
                          <>
                            @{user.username}
                            {user.window_id && ` • Ventanilla ${user.window_id}`}
                          </>
                        )}
                        {user.table_number && ` • Mesa ${user.table_number}`}
                        {user.ready_games_count && ` • ${user.ready_games_count} juegos`}
                        {user.roles?.includes('admin') && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-yellow-300 text-yellow-900 text-xs font-bold">ADMIN</span>
                        )}
                        {user.roles?.includes('volunteer') && !user.roles?.includes('admin') && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-green-200 text-green-900 text-xs font-bold">VOL</span>
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