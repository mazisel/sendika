'use client';

import { useState, useEffect } from 'react';
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
  User
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

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
  }, [pathname, router]);

  const handleLogout = () => {
    AdminAuth.logout();
    router.push('/admin/login');
  };

  // Yetki bazlı menü öğelerini al
  const getMenuItems = () => {
    if (!currentUser) return [];
    
    const baseItems = [
      {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: Home,
        description: 'Genel bakış ve istatistikler'
      },
      {
        title: 'İstatistikler',
        href: '/admin/statistics',
        icon: BarChart3,
        description: 'Detaylı üye istatistikleri ve analiz'
      },
      {
        title: 'Üyeler',
        href: '/admin/members',
        icon: Users,
        description: currentUser.role_type === 'branch_manager' 
          ? `${currentUser.city} üyelerini yönet` 
          : 'Sendika üyelerini yönet'
      }
    ];

    // Sadece genel merkez yöneticileri görebilir
    if (PermissionManager.canManageNews(currentUser)) {
      baseItems.push({
        title: 'Haberler',
        href: '/admin/news',
        icon: FileText,
        description: 'Haber içeriklerini yönet'
      });
    }

    if (PermissionManager.canManageAnnouncements(currentUser)) {
      baseItems.push({
        title: 'Duyurular',
        href: '/admin/announcements',
        icon: Megaphone,
        description: 'Genel duyuruları yönet'
      });
      baseItems.push({
        title: 'Başlık Duyuruları',
        href: '/admin/header-announcements',
        icon: Bell,
        description: 'Acil duyuruları yönet'
      });
    }

    if (PermissionManager.canManageSliders(currentUser)) {
      baseItems.push({
        title: 'Slider',
        href: '/admin/sliders',
        icon: Image,
        description: 'Anasayfa slider\'ını yönet'
      });
    }

    if (PermissionManager.canManageManagement(currentUser)) {
      baseItems.push({
        title: 'Yönetim',
        href: '/admin/management',
        icon: Building2,
        description: 'Yönetim kadrosunu yönet'
      });
    }

    if (PermissionManager.canManageBranches(currentUser)) {
      baseItems.push({
        title: 'Şubeler',
        href: '/admin/branches',
        icon: MapPin,
        description: 'Şube bilgilerini yönet'
      });
    }

    if (PermissionManager.canManageCategories(currentUser)) {
      baseItems.push({
        title: 'Kategoriler',
        href: '/admin/categories',
        icon: Tags,
        description: 'İçerik kategorilerini yönet'
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

    return baseItems;
  };

  const menuItems = getMenuItems();

  // Login sayfasında layout gösterme
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/60 transform transition-all duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex lg:flex-col lg:w-72
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sendika Admin</h1>
              <p className="text-xs text-blue-100">Yönetim Paneli</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200
                    ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-slate-700 group-hover:scale-105'}
                  `} />
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-4 py-3 text-sm font-medium text-slate-700 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-red-600 transition-colors" />
              <div>
                <div className="font-medium">Çıkış Yap</div>
                <div className="text-xs text-slate-500 mt-0.5">Oturumu sonlandır</div>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-4 ml-auto">
              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">
                      {currentUser?.full_name || 'Admin'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {currentUser?.role_type === 'branch_manager' && currentUser?.city
                        ? `${currentUser.city} Şube Yöneticisi` 
                        : currentUser?.role_type === 'general_manager'
                        ? 'Genel Merkez Yöneticisi'
                        : 'Yönetici'
                      }
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <Link
                      href="/admin/profile"
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profil Ayarları
                    </Link>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-slate-600">
            <div>© 2025 Sendika Admin Panel. Tüm hakları saklıdır.</div>
            <div className="flex items-center space-x-4">
              <span>v1.0.0</span>
              <span>•</span>
              <span>Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</span>
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
