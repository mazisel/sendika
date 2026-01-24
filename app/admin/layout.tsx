'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Users,
  FileText,
  Megaphone,
  Settings,
  Building2,
  MapPin,
  Tags,
  Image,
  Menu,
  X,
  LogOut,
  UserPlus,
  Bell,
  BarChart3,
  Calendar,
  Search,
  ChevronDown,
  User,
  Wallet,
  PiggyBank,
  Sun,
  Moon,
  Shield,
  Gavel,
  BookOpen,
  Wrench,
  MessageSquare
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';
import StickyMessageBanner from '@/components/StickyMessageBanner';
import GlobalSearch from '@/components/GlobalSearch';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);
  const lastUpdated = useMemo(() => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    }).format(Date.now());
  }, []);

  // Admin giriş kontrolü ve kullanıcı bilgilerini al
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await AdminAuth.isAuthenticated();
      if (!isAuth && pathname !== '/admin/login') {
        router.push('/admin/login');
      } else if (isAuth) {
        const user = AdminAuth.getCurrentUser();
        setCurrentUser(user);
      }
    };

    checkAuth();

    // Listen for auth state changes (especially token expiration)
    const { data: { subscription } } = AdminAuth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT') {
        console.warn('Auth session invalid or expired:', event);
        await AdminAuth.logout();
        router.push('/admin/login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const user = AdminAuth.getCurrentUser();
        setCurrentUser(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('admin-theme');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (storedTheme === 'light') {
      setIsDarkMode(false);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
    setIsThemeInitialized(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isThemeInitialized) return;

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('admin-theme', 'light');
    }
  }, [isDarkMode, isThemeInitialized]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const handleLogout = async () => {
    try {
      await AdminAuth.logout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      window.location.href = '/admin/login';
    }
  };

  // Expanded menus state
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  interface MenuItem {
    title: string;
    href: string;
    icon: any;
    description: string;
    items?: MenuItem[];
  }

  // Yetki bazlı menü öğelerini al
  const getMenuItems = (): MenuItem[] => {
    if (!currentUser) return [];

    const baseItems: MenuItem[] = [
      {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: Home,
        description: 'Genel bakış ve istatistikler'
      }
    ];

    if (PermissionManager.canViewMembers(currentUser)) {
      baseItems.push({
        title: 'İstatistikler',
        href: '/admin/statistics',
        icon: BarChart3,
        description: 'Detaylı üye istatistikleri ve analiz'
      });

      baseItems.push({
        title: 'Üyeler',
        href: '/admin/members',
        icon: Users,
        description: currentUser.role_type === 'branch_manager' && currentUser.city
          ? `${currentUser.city} üyelerini yönet`
          : 'Sendika üyelerini yönet'
      });
    }

    if (PermissionManager.canViewFinance(currentUser)) {
      baseItems.push({
        title: 'Finans',
        href: '/admin/finance',
        icon: Wallet,
        description: PermissionManager.canManageFinance(currentUser)
          ? 'Kasa/banka hesaplarını ve finansal işlemleri yönet'
          : 'Finansal hareketleri görüntüle'
      });
    }



    if (PermissionManager.canManageBranches(currentUser)) {
      baseItems.push({
        title: 'Bölge ve Şubeler',
        href: '/admin/branches',
        icon: MapPin,
        description: 'Bölge ve şube bilgilerini yönet'
      });
    }

    if (PermissionManager.canManageUsers(currentUser)) {
      baseItems.push({
        title: 'Kullanıcılar',
        href: '/admin/users',
        icon: UserPlus,
        description: 'Admin kullanıcılarını yönet'
      });
    }

    // Site Yönetimi Grubu
    const siteManagementItems: MenuItem[] = [];

    if (PermissionManager.canManageManagement(currentUser)) {
      siteManagementItems.push({
        title: 'Yönetim Kadrosu',
        href: '/admin/management',
        icon: Building2,
        description: 'Yönetim kadrosunu yönet'
      });
    }

    // Sadece genel merkez yöneticileri görebilir
    if (PermissionManager.canManageNews(currentUser)) {
      siteManagementItems.push({
        title: 'Haberler',
        href: '/admin/news',
        icon: FileText,
        description: 'Haber içeriklerini yönet'
      });
    }

    if (PermissionManager.canManageAnnouncements(currentUser)) {
      siteManagementItems.push({
        title: 'Duyurular',
        href: '/admin/announcements',
        icon: Megaphone,
        description: 'Genel duyuruları yönet'
      });
      siteManagementItems.push({
        title: 'Başlık Duyuruları',
        href: '/admin/header-announcements',
        icon: Bell,
        description: 'Acil duyuruları yönet'
      });
    }

    if (PermissionManager.canManageSliders(currentUser)) {
      siteManagementItems.push({
        title: 'Slider',
        href: '/admin/sliders',
        icon: Image,
        description: 'Anasayfa slider\'ını yönet'
      });
    }

    if (PermissionManager.canManageCategories(currentUser)) {
      siteManagementItems.push({
        title: 'Kategoriler',
        href: '/admin/categories',
        icon: Tags,
        description: 'İçerik kategorilerini yönet'
      });
    }

    if (PermissionManager.hasPermission(currentUser, 'settings.manage')) {
      siteManagementItems.push({
        title: 'Site Ayarları',
        href: '/admin/settings',
        icon: Settings,
        description: 'Site logosu ve renklerini yönet'
      });
    }


    if (PermissionManager.canManageDefinitions(currentUser)) {
      siteManagementItems.push({
        title: 'Avantajlar',
        href: '/admin/discounts',
        icon: Tags,
        description: 'Anlaşmalı kurum avantajlarını yönet'
      });
    }

    // Belge Yönetimi
    // Assuming a general permission check or specific ones. 
    // Using 'documents.view' based on migration.
    if (PermissionManager.hasPermission(currentUser, 'documents.view') || PermissionManager.hasPermission(currentUser, 'decisions.view')) {
      baseItems.push({
        title: 'Belge Yönetimi',
        href: '/admin/documents/decisions', // Default entry point
        icon: FileText,
        description: 'Karar defteri ve evrak yönetimi'
      });
    }

    if (siteManagementItems.length > 0) {
      baseItems.push({
        title: 'Site ve Mobil Yönetimi',
        href: '#',
        icon: Settings,
        description: 'Site ve mobil içerik ve ayarları',
        items: siteManagementItems
      });
    }

    if (PermissionManager.canManageDefinitions(currentUser)) {
      baseItems.push({
        title: 'Tanımlamalar',
        href: '/admin/definitions',
        icon: BookOpen,
        description: 'İşyeri, pozisyon gibi genel listeleri yönet'
      });
    }


    // Araçlar Menüsü
    const toolsItems: MenuItem[] = [];

    if (PermissionManager.canManageStickyMessages(currentUser)) {
      toolsItems.push({
        title: 'Sabit Metin',
        href: '/admin/tools/sticky-message',
        icon: MessageSquare,
        description: 'Üst menüde gösterilecek sabit mesaj'
      });
    }

    if (PermissionManager.canManageCalendar(currentUser)) {
      toolsItems.push({
        title: 'Ortak Ajanda',
        href: '/admin/tools/calendar',
        icon: Calendar,
        description: 'Yönetim ve etkinlik takvimi'
      });
    }

    if (toolsItems.length > 0) {
      baseItems.push({
        title: 'Araçlar',
        href: '#',
        icon: Wrench,
        description: 'Yönetim araçları',
        items: toolsItems
      });
    }


    if (PermissionManager.canManageSiteSettings(currentUser)) {
      baseItems.push({
        title: 'SMS',
        href: '/admin/sms',
        icon: Megaphone,
        description: 'Üyelere SMS gönder'
      });
    }

    // Hukuk Destek Modülü
    if (PermissionManager.canViewLegal(currentUser)) {
      baseItems.push({
        title: 'Hukuk Destek',
        href: '/admin/legal',
        icon: Gavel,
        description: 'Hukuki destek taleplerini yönet'
      });
    }

    // Denetim Kayıtları
    if (PermissionManager.hasPermission(currentUser, 'logs.view')) {
      baseItems.push({
        title: 'Denetim Kayıtları',
        href: '/admin/audit-logs',
        icon: Shield,
        description: 'Sistem loglarını incele'
      });
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const Icon = item.icon;
    const isExpanded = expandedMenus[item.title];
    const hasChildren = item.items && item.items.length > 0;
    const isActive = !hasChildren && (pathname === item.href || pathname.startsWith(item.href + '/'));

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleMenu(item.title)}
            className={`
              w-full group/item flex items-center justify-between lg:justify-center lg:group-hover:justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300
              text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap overflow-hidden
            `}
          >
            <div className="flex items-center min-w-0">
              <Icon className="mr-0 lg:mr-0 lg:group-hover:mr-5 h-6 w-6 flex-shrink-0 text-slate-500 group-hover/item:text-slate-700 dark:text-slate-400 dark:group-hover/item:text-slate-200 transition-all duration-300" />
              <div className="text-left transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:max-w-0 lg:group-hover:max-w-[200px] overflow-hidden">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</div>
              </div>
            </div>
            <div className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:max-w-0 lg:group-hover:max-w-[24px] overflow-hidden ml-2 lg:ml-0 lg:group-hover:ml-2">
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} />
            </div>
          </button>

          {isExpanded && (
            <div className="pl-11 space-y-1 ml-0 transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:max-h-full lg:overflow-hidden">
              {item.items!.map(subItem => renderMenuItem(subItem, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          group/item flex items-center lg:justify-center lg:group-hover:justify-start px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative whitespace-nowrap overflow-hidden
          ${isActive
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
          }
        `}
        onClick={() => setSidebarOpen(false)}
      >
        <Icon className={`
          mr-0 lg:mr-0 lg:group-hover:mr-5 h-6 w-6 flex-shrink-0 transition-transform duration-300
          ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover/item:text-slate-700 group-hover/item:scale-105 dark:text-slate-400 dark:group-hover/item:text-slate-200'}
        `} />
        <div className="flex-1 transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:max-w-0 lg:group-hover:max-w-[200px] overflow-hidden">
          <div className="font-medium">{item.title}</div>
          {level === 0 && (
            <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-100 dark:text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
              {item.description}
            </div>
          )}
        </div>
        {isActive && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white dark:bg-slate-100 rounded-l-full" />
        )}
      </Link>
    );
  };

  // Reset expanded menus when sidebar closes (mobile)
  useEffect(() => {
    if (!sidebarOpen) {
      setExpandedMenus({});
    }
  }, [sidebarOpen]);

  // Login sayfasında layout gösterme
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="admin-theme h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Spacer */}
      <div className="hidden lg:block w-20 flex-shrink-0 transition-all duration-300" />

      {/* Sidebar */}
      <div
        onMouseLeave={() => setExpandedMenus({})}
        className={`
        fixed inset-y-0 left-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl dark:shadow-slate-900/40 border-r border-slate-200/60 dark:border-slate-800/60
        transform transition-all duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        lg:w-20 lg:hover:w-72 group
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center lg:justify-center lg:group-hover:justify-start h-16 px-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-900 shrink-0 overflow-hidden whitespace-nowrap">
          <div className="flex items-center space-x-3 lg:space-x-0 lg:group-hover:space-x-3 transition-all duration-300 min-w-max">
            <div className="w-10 h-10 bg-white/20 dark:bg-slate-800/60 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:max-w-0 lg:group-hover:max-w-xs overflow-hidden">
              <h1 className="text-xl font-bold text-white">Sendika Admin</h1>
              <p className="text-xs text-blue-100">Yönetim Paneli</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="space-y-2">
            {menuItems.map(item => renderMenuItem(item))}
          </div>

        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm dark:shadow-slate-900/40 shrink-0">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors mr-4"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Global Search */}
            <GlobalSearch menuItems={menuItems} />

            {/* User menu */}
            <div className="flex items-center space-x-4 ml-auto">
              <StickyMessageBanner />
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={isDarkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">
                      {currentUser?.full_name || 'Admin'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {currentUser?.role_type === 'branch_manager' && currentUser?.city
                        ? `${currentUser.city} Şube Yöneticisi`
                        : currentUser?.role_type === 'regional_manager' && currentUser?.region
                          ? `${currentUser.region}. Bölge Sorumlusu`
                          : currentUser?.role_type === 'general_manager'
                            ? 'Genel Merkez Yöneticisi'
                            : currentUser?.role === 'super_admin'
                              ? 'Süper Admin'
                              : 'Yönetici'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 py-1 z-50">
                    <Link
                      href="/admin/profile"
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3 text-slate-500 dark:text-slate-400" />
                      Profil Ayarları
                    </Link>
                    <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3 text-slate-500 dark:text-slate-400" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <div>© 2026 Sendikal. Tüm hakları saklıdır.</div>
            <div className="flex items-center space-x-4">
              <span>v1.0.1 - Kapalı Beta</span>
              <span>•</span>
              <span>Son güncelleme: {lastUpdated}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}
