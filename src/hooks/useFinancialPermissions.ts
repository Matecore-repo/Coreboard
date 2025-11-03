import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFinancialPermissions() {
  const { user, currentRole } = useAuth();

  const canViewFinances = useMemo(() => {
    return currentRole === 'owner';
  }, [currentRole]);

  const canEditFinances = useMemo(() => {
    return currentRole === 'owner';
  }, [currentRole]);

  const canExportFinances = useMemo(() => {
    return currentRole === 'owner';
  }, [currentRole]);

  return {
    canViewFinances,
    canEditFinances,
    canExportFinances,
  };
}

