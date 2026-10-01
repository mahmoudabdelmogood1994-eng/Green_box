import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import NodeList from '@/components/nodes/node-list';
import { nodes } from '@/lib/data';
import { Button } from '@/components/ui/button';

export default function NodesPage() {
  return (
    <MainLayout>
      <Header title="Green Box Nodes" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <NodeList initialNodes={nodes} />
      </main>
    </MainLayout>
  );
}
