import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock supabase client (default export)
vi.mock('../../lib/supabase', () => ({
  default: {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [], error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
  }
}));

import { useAppointments } from '../useAppointments';

describe('useAppointments', () => {
  it('fetches appointments without crashing', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAppointments());
    // initial state
    expect(Array.isArray(result.current.appointments)).toBe(true);
  });
});


