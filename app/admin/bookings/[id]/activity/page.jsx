'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { AdminFooter } from '@/components/layout/AdminFooter';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ActivityLogPanel } from '@/components/activity/ActivityVersions';

export default function ActivityPage() {
  const { id } = useParams();
  return (
    <AdminShell>
      <AdminFooter.Pad>
        <PageHeader
          breadcrumbs={[
            { label: 'Bookings', href: '/admin' },
            { label: 'Booking', href: `/admin/bookings/${id}` },
            { label: 'Activity' },
          ]}
          title="Activity Log"
        />
        <ActivityLogPanel bookingId={id} />
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
