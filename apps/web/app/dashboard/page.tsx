'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse } from '@mohan-bagh/shared';

import { api } from '../../lib/api';
import AdminLayout from '../../components/admin/AdminLayout';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>('/auth/me')
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <AdminLayout user={user}>
      <section className="rounded-2xl bg-primary px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
        <p className="text-sm text-white/75">
          Welcome back
          {user ? `, ${user.name}` : ''}
        </p>

        <h2 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
          Manage your broker network
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
          Review activity, keep the team organized, and manage
          the Mohan Bagh hierarchy from one place.
        </p>
      </section>

      {/* Dashboard content */}
    </AdminLayout>
  );
}