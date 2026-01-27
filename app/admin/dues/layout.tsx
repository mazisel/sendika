'use client';

import { useEffect, useState } from 'react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';

export default function DuesLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = AdminAuth.getCurrentUser();
    setUser(currentUser);
  }, []);

  if (!user) return null;

  if (!PermissionManager.canViewDues(user)) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Bu alana erişim yetkiniz bulunmuyor.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}
