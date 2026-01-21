import { AdminUser } from './types';

export class PermissionManager {
  static isSuperAdmin(user: AdminUser) {
    return user.role === 'super_admin';
  }

  static hasPermission(user: AdminUser, permissionKey: string): boolean {
    if (this.isSuperAdmin(user)) return true;
    return user.permissions?.includes(permissionKey) ?? false;
  }

  // --- Scope Logic ---

  /**
   * Checks if the user has permission to perform an action on a target scope.
   * Priority: ALL > REGION > BRANCH
   */
  static hasScopePermission(
    user: AdminUser,
    basePermission: string, // e.g., 'users.manage'
    targetRegion?: number | null,
    targetCity?: string | null
  ): boolean {
    if (this.isSuperAdmin(user)) return true;

    // 1. Check Global Permission (e.g., 'users.manage.all')
    // Also support legacy exact match 'users.manage' as global for backward compatibility if needed, 
    // but we prefer specific permissions now.
    if (this.hasPermission(user, `${basePermission}.all`) || this.hasPermission(user, basePermission)) {
      return true;
    }

    // 2. Check Regional Permission (e.g., 'users.manage.region')
    if (this.hasPermission(user, `${basePermission}.region`)) {
      // Must match user's region
      if (user.region && Number(targetRegion) === Number(user.region)) {
        return true;
      }
      // If target has no region (and we are regional manager), debatably we can't manage them 
      // unless they are unassigned. Let's assume strict: must match region.
    }

    // 3. Check Branch Permission (e.g., 'users.manage.branch')
    if (this.hasPermission(user, `${basePermission}.branch`)) {
      // Must match user's city (branch)
      if (user.city && String(targetCity) === String(user.city)) {
        return true;
      }
    }

    return false;
  }

  // --- Specific Managers ---

  static canManageUsers(user: AdminUser, targetUser?: AdminUser): boolean {
    // If no target provided, check if they have ANY manage permission
    if (!targetUser) {
      return this.hasPermission(user, 'users.manage.all') ||
        this.hasPermission(user, 'users.manage.region') ||
        this.hasPermission(user, 'users.manage.branch') ||
        this.hasPermission(user, 'users.manage'); // Legacy
    }

    // Prevent managing oneself or super admins (unless super admin)
    if (targetUser.role === 'super_admin' && !this.isSuperAdmin(user)) return false;

    return this.hasScopePermission(user, 'users.manage', Number(targetUser.region), String(targetUser.city));
  }

  static canViewUsers(user: AdminUser, targetUser?: AdminUser): boolean {
    if (!targetUser) {
      return this.hasPermission(user, 'users.view.all') ||
        this.hasPermission(user, 'users.view.region') ||
        this.hasPermission(user, 'users.view.branch') ||
        this.canManageUsers(user);
    }
    return this.hasScopePermission(user, 'users.view', Number(targetUser.region), String(targetUser.city)) ||
      this.canManageUsers(user, targetUser);
  }

  static canManageMembers(user: AdminUser, targetRegion?: number | null, targetCity?: string | null): boolean {
    return this.hasScopePermission(user, 'members.manage', targetRegion, targetCity);
  }

  static canViewMembers(user: AdminUser, targetRegion?: number | null, targetCity?: string | null): boolean {
    return this.hasScopePermission(user, 'members.view', targetRegion, targetCity) ||
      this.canManageMembers(user, targetRegion, targetCity);
  }

  static canEditRestrictedFields(user: AdminUser): boolean {
    return this.hasPermission(user, 'members.edit_restricted');
  }

  // --- Other modules (Generic) ---

  static canManageNews(user: AdminUser): boolean {
    return this.hasPermission(user, 'news.manage');
  }

  static canManageAnnouncements(user: AdminUser): boolean {
    return this.hasPermission(user, 'announcements.manage');
  }

  static canManageSliders(user: AdminUser): boolean {
    return this.hasPermission(user, 'sliders.manage');
  }

  static canManageStickyMessages(user: AdminUser): boolean {
    return this.hasPermission(user, 'sticky_message.manage');
  }

  static canManageCalendar(user: AdminUser): boolean {
    return this.hasPermission(user, 'calendar.manage');
  }

  static canManageManagement(user: AdminUser): boolean {
    return this.hasPermission(user, 'management.manage');
  }

  static canManageBranches(user: AdminUser): boolean {
    // Usually a global 'structure' task, but could be regional in future.
    return this.hasPermission(user, 'branches.manage');
  }

  static canManageCategories(user: AdminUser): boolean {
    return this.hasPermission(user, 'categories.manage');
  }

  static canManageDefinitions(user: AdminUser): boolean {
    return this.hasPermission(user, 'definitions.manage');
  }

  static canManageSiteSettings(user: AdminUser): boolean {
    return this.hasPermission(user, 'settings.manage');
  }

  static canManageDues(user: AdminUser): boolean {
    return this.hasPermission(user, 'dues.manage');
  }

  static canViewDues(user: AdminUser): boolean {
    return this.hasPermission(user, 'dues.view') || this.canManageDues(user);
  }

  static canManageFinance(user: AdminUser): boolean {
    return this.hasPermission(user, 'finance.manage');
  }

  static canViewFinance(user: AdminUser): boolean {
    return this.hasPermission(user, 'finance.view') || this.canManageFinance(user);
  }

  static canManageLegal(user: AdminUser): boolean {
    return this.hasPermission(user, 'legal.manage');
  }

  static canViewLegal(user: AdminUser): boolean {
    return this.hasPermission(user, 'legal.view') || this.canManageLegal(user);
  }

  // --- Helpers ---

  static getUserAccessibleCities(user: AdminUser): string[] {
    if (this.hasPermission(user, 'members.view.all') || this.hasPermission(user, 'members.manage.all')) {
      return []; // All
    }
    // If regional, return all cities in region? (Need region-city implementation, simplifying for now)
    if (this.hasPermission(user, 'members.view.branch') || this.hasPermission(user, 'members.manage.branch')) {
      return user.city ? [user.city] : [];
    }
    return [];
  }

  static getMenuItems(user: AdminUser) {
    const baseItems = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' }
    ];

    // Üye yönetimi
    if (this.canViewMembers(user)) {
      baseItems.push({ name: 'Üyeler', href: '/admin/members', icon: 'users' });
    }

    if (this.canViewDues(user)) {
      baseItems.push({ name: 'Aidatlar', href: '/admin/dues', icon: 'dues' });
    }

    if (this.canViewFinance(user)) {
      baseItems.push({ name: 'Finans', href: '/admin/finance', icon: 'finance' });
    }

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

    if (this.canViewLegal(user)) {
      baseItems.push({ name: 'Hukuk Destek', href: '/admin/legal', icon: 'legal' });
    }

    if (this.canViewUsers(user)) { // Updated to use new check
      baseItems.push({ name: 'Kullanıcılar', href: '/admin/users', icon: 'admin-users' });
    }

    // Denetim Kayıtları
    if (this.hasPermission(user, 'logs.view')) {
      baseItems.push({ name: 'Denetim Kayıtları', href: '/admin/audit-logs', icon: 'shield' });
    }

    return baseItems;
  }
}
