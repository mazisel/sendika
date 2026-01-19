'use client';

import { Suspense } from 'react';
import AdminMembersContent from './content';

export default function AdminMembersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>}>
      <AdminMembersContent />
    </Suspense>
  );
}
