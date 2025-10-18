import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  default: {
    auth: {
      onAuthStateChange: () => ({ subscription: { unsubscribe: () => {} } }),
      signInWithPassword: async () => ({ data: { session: { user: { id: 'u1', email: 'a@a.com' } } }, error: null }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({}),
    },
    from: () => ({
      select: () => ({
        eq: async () => ({ data: { role: 'demo', salon_id: null }, error: null }),
        then: (resolve: any) => resolve({ data: { role: 'demo', salon_id: null }, error: null }),
      }),
    }),
  }
}));

import { AuthProvider, useAuth } from '../AuthContext';

function wrapper({ children }: any) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  it('allows sign in and sign out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signIn('a@a.com', 'pass');
    });
    expect(result.current.user).not.toBeNull();
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.user).toBeNull();
  });
});


