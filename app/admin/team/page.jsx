'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Tabs';
import { EmptyStateBlock } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const Table = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow-x: auto;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1.6fr 160px 140px;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  min-width: 640px;

  &:last-child {
    border-bottom: none;
  }
`;

const Head = styled(Row)`
  background: ${({ theme }) => theme.colors.bgMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Hint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.45;
`;

const CreateCard = styled.form`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[5]};
  display: grid;
  gap: ${({ theme }) => theme.space[3]};
`;

const CreateTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const CreateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const CreateActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
`;

function roleTone(role) {
  return role === 'main_admin' ? 'success' : 'info';
}

function roleLabel(role) {
  return role === 'main_admin' ? 'Main admin' : 'Admin';
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'admin',
};

export default function TeamPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (user && user.role !== 'main_admin') {
      router.replace('/admin');
    }
  }, [user, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/api/admins');
        if (cancelled) return;
        setAdmins(data?.admins || []);
        setCanManage(!!data?.canManageRoles);
      } catch (err) {
        if (!cancelled) toast(err.message, { variant: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, reloadToken]);

  useDataRefresh(() => {
    setLoading(true);
    setReloadToken((n) => n + 1);
  });

  const handleRoleChange = async (id, role) => {
    setSavingId(id);
    try {
      await api.patch('/api/admins', { id, role });
      toast('Role updated');
      setReloadToken((n) => n + 1);
      if (id === user?.id) await refresh?.();
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await api.post('/api/admins', {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      });
      toast('Admin created');
      setForm(EMPTY_FORM);
      setLoading(true);
      setReloadToken((n) => n + 1);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (user && user.role !== 'main_admin') {
    return (
      <AdminShell>
        <EmptyStateBlock
          title="Main admins only"
          description="Team management is limited to main admins."
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Admin"
        title="Team"
        subtitle="Create admins and manage roles. Main admins see all bookings; admins only see bookings assigned to them."
      />
      <Hint>
        New accounts default to scoped admin. You can promote them to main admin. At least one main
        admin must remain.
      </Hint>

      {canManage && (
        <CreateCard onSubmit={handleCreate}>
          <CreateTitle>Create admin</CreateTitle>
          <CreateGrid>
            <Input
              label="Full name"
              name="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Jane Smith"
              autoComplete="off"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@example.com"
              autoComplete="off"
            />
            <Input
              label="Temporary password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              hint="At least 6 characters. Share securely; they can change it in Settings."
              autoComplete="new-password"
            />
            <Select
              label="Role"
              value={form.role}
              onValueChange={(role) => setForm((f) => ({ ...f, role }))}
              options={[
                { value: 'admin', label: 'Admin (own bookings)' },
                { value: 'main_admin', label: 'Main admin (all bookings)' },
              ]}
            />
          </CreateGrid>
          <CreateActions>
            <Button type="submit" disabled={creating || !form.email || !form.password}>
              {creating ? 'Creating…' : 'Create admin'}
            </Button>
          </CreateActions>
        </CreateCard>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : admins.length === 0 ? (
        <EmptyStateBlock
          title="No admins yet"
          description="Use the form above to create the first staff account."
        />
      ) : (
        <Table>
          <Head>
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Change</div>
          </Head>
          {admins.map((admin) => (
            <Row key={admin.id}>
              <div>{admin.full_name || '—'}</div>
              <div>{admin.email || '—'}</div>
              <div>
                <Badge $tone={roleTone(admin.role)}>{roleLabel(admin.role)}</Badge>
              </div>
              <div>
                {canManage ? (
                  <Select
                    aria-label={`Role for ${admin.email || admin.id}`}
                    value={admin.role}
                    disabled={savingId === admin.id}
                    onValueChange={(role) => {
                      if (role !== admin.role) handleRoleChange(admin.id, role);
                    }}
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'main_admin', label: 'Main admin' },
                    ]}
                  />
                ) : (
                  roleLabel(admin.role)
                )}
              </div>
            </Row>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
