'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api-client';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api('/auth/logout', { method: 'POST' });
        } finally {
          window.location.assign('/login');
        }
      }}
      className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 hover:bg-primary-soft disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
    </button>
  );
}
