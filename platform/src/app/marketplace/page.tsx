
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import PartList from '@/components/marketplace/part-list';
import { parts } from '@/lib/data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <MainLayout>
      <Header title="Spares Marketplace" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <PartList initialParts={parts} />
      </main>
    </MainLayout>
  );
}
