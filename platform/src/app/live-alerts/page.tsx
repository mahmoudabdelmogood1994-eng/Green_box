
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import LiveAlertsDisplay from '@/components/dashboard/live-alerts-display';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LiveAlertsPage() {
  return (
    <MainLayout>
      <Header title="Live Critical Alerts" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <LiveAlertsDisplay />
      </main>
    </MainLayout>
  );
}
