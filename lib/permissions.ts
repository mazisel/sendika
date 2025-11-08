import { AdminUser } from './types';

export class PermissionManager {
  private static isSuperAdmin(user: AdminUser) {
    return user.role === 'super_admin';
  }

  private static isGeneralManager(user: AdminUser) {
    return user.role_type === 'general_manager';
  }

  private static isRegionalManager(user: AdminUser) {
    return user.role_type === 'regional_manager' && !!user.region;
  }

  private static isBranchManager(user: AdminUser) {
    return user.role_type === 'branch_manager' && !!user.city;
  }

  static canAccessAllMembers(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canAccessRegionMembers(user: AdminUser, region?: number | null): boolean {
    if (!this.isRegionalManager(user)) {
      return false;
    }
    if (!user.region) return false;
    return region ? user.region === region : true;
  }

  static canAccessCityMembers(user: AdminUser, city?: string, region?: number | null): boolean {
    if (this.canAccessAllMembers(user)) {
      return true;
    }

    if (this.canAccessRegionMembers(user, region)) {
      return true;
    }
    
    if (this.isBranchManager(user)) {
      return city ? user.city === city : true;
    }
    
    return false;
  }

  static canManageUsers(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageNews(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageAnnouncements(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageSliders(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageManagement(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageBranches(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user) || this.isRegionalManager(user);
  }

  static canManageCategories(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageDefinitions(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canManageDues(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user) || this.isRegionalManager(user);
  }

  static canViewDues(user: AdminUser): boolean {
    return true;
  }

  static canManageFinance(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canViewFinance(user: AdminUser): boolean {
    return this.isSuperAdmin(user) || this.isGeneralManager(user);
  }

  static canEditRestrictedFields(user: AdminUser): boolean {
    return this.isSuperAdmin(user);
  }

  static getUserAccessibleCities(user: AdminUser): string[] {
    if (this.canAccessAllMembers(user)) {
      return []; // Boş array tüm şehirlere erişim anlamına gelir
    }
    
    if (this.isBranchManager(user) && user.city) {
      return [user.city];
    }
    
    return [];
  }

  static getMenuItems(user: AdminUser) {
    const baseItems = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' }
    ];

    // Üye yönetimi - tüm yöneticiler görebilir
    baseItems.push({ name: 'Üyeler', href: '/admin/members', icon: 'users' });

    if (this.canViewDues(user)) {
      baseItems.push({ name: 'Aidatlar', href: '/admin/dues', icon: 'dues' });
    }

    if (this.canViewFinance(user)) {
      baseItems.push({ name: 'Finans', href: '/admin/finance', icon: 'finance' });
    }

    // Sadece genel merkez yöneticileri görebilir
    if (this.canManageNews(user)) {
      baseItems.push({ name: 'Haberler', href: '/admin/news', icon: 'news' });
    }

    if (this.canManageAnnouncements(user)) {
      baseItems.push({ name: 'Duyurular', href: '/admin/announcements', icon: 'announcements' });
      baseItems.push({ name: 'Başlık Duyuruları', href: '/admin/header-announcements', icon: 'header' });
    }

    if (this.canManageSliders(user)) {
      baseItems.push({ name: 'Slider', href: '/admin/sliders', icon: 'slider' });
    }

    if (this.canManageManagement(user)) {
      baseItems.push({ name: 'Yönetim', href: '/admin/management', icon: 'management' });
    }

    if (this.canManageBranches(user)) {
      baseItems.push({ name: 'Şubeler', href: '/admin/branches', icon: 'branches' });
    }

    if (this.canManageCategories(user)) {
      baseItems.push({ name: 'Kategoriler', href: '/admin/categories', icon: 'categories' });
    }

    if (this.canManageDefinitions(user)) {
      baseItems.push({ name: 'Tanımlamalar', href: '/admin/definitions', icon: 'definitions' });
    }

    if (this.canManageUsers(user)) {
      baseItems.push({ name: 'Kullanıcılar', href: '/admin/users', icon: 'admin-users' });
    }

    return baseItems;
  }
}
