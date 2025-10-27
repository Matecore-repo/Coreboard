export interface DemoOrganization {
  id: string;
  name: string;
  tax_id?: string;
  created_at: string;
}

export interface DemoMembership {
  id: string;
  user_id: string;
  role: 'admin' | 'owner' | 'employee';
  is_primary: boolean;
  user: {
    email: string;
  };
}

export interface DemoInvitation {
  id: string;
  email?: string;
  role: 'admin' | 'owner' | 'employee';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export function generateDemoOrganizationData(userEmail?: string, userId?: string) {
  const org: DemoOrganization = {
    id: 'demo-org-123',
    name: 'Salón Demo - COREBOARD',
    tax_id: '00-000000-0',
    created_at: new Date().toISOString()
  };

  const members: DemoMembership[] = [
    {
      id: 'demo-member-1',
      user_id: userId || 'demo-user',
      role: 'owner',
      is_primary: true,
      user: { email: userEmail || 'demo@coreboard.local' }
    },
    {
      id: 'demo-member-2',
      user_id: 'emp-123',
      role: 'employee',
      is_primary: false,
      user: { email: 'empleado@salon.com' }
    },
    {
      id: 'demo-member-3',
      user_id: 'emp-456',
      role: 'employee',
      is_primary: false,
      user: { email: 'barbero@salon.com' }
    }
  ];

  const invitations: DemoInvitation[] = [
    {
      id: 'demo-invite-1',
      email: 'nuevo.empleado@salon.com',
      role: 'employee',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-invite-2',
      email: 'gerente@salon.com',
      role: 'owner',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  ];

  return { org, members, invitations };
}
