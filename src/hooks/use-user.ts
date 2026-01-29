'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const router = useRouter();

  const { data, error, isLoading } = useSWR('auth-user', async () => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  }, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  useEffect(() => {
    if (!isLoading && data === null) {
      router.push('/login');
    }
  }, [data, isLoading, router]);

  const userProfile = data ? {
    email: data.email,
    full_name: data.user_metadata?.full_name || data.email?.split('@')[0],
  } : { email: '', full_name: '' };

  return {
    user: data ?? undefined,
    userProfile,
    isLoading,
    error,
  };
}
