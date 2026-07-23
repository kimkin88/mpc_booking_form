'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { AdminFooter } from '@/components/layout/AdminFooter';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { VersionsPanel } from '@/components/activity/ActivityVersions';
import { api } from '@/lib/apiClient';

export default function VersionsPage() {
  const { id } = useParams();
  const [version, setVersion] = useState(1);

  useEffect(() => {
    api.get(`/api/bookings/${id}`).then((d) => setVersion(d.booking.current_version));
  }, [id]);

  return (
    <AdminShell>
      <AdminFooter.Pad>
        <PageHeader
          breadcrumbs={[
            { label: 'Bookings', href: '/admin' },
            { label: 'Booking', href: `/admin/bookings/${id}` },
            { label: 'Versions' },
          ]}
          title="Compare Versions"
        />
        <VersionsPanel bookingId={id} currentVersion={version} />
      </AdminFooter.Pad>
      <AdminFooter
        actions={
          <Link href={`/admin/bookings/${id}`}>
            <Button variant="secondary">Back to Booking</Button>
          </Link>
        }
      />
    </AdminShell>
  );
}
