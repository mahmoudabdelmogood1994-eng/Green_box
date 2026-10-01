
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import MaintenanceChat from '@/components/ai/maintenance-chat';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProblemDiagnosisForm from '@/components/ai/problem-diagnosis-form';
import PredictivePartForm from '@/components/ai/predictive-part-form';
import SupplierRecommenderForm from '@/components/ai/supplier-recommender-form';

function AIToolsContent() {
  const searchParams = useSearchParams();
  const equipmentType = searchParams.get('equipmentType') || '';
  const problemDescription = searchParams.get('problemDescription') || '';
  const initialTab = searchParams.get('tab') || 'advisor';
  const initialPartName = searchParams.get('partName') || '';

  return (
    <MainLayout>
      <Header title="Intelligent Tools" />
      <main className="flex-1 flex flex-col p-4 md:p-8 space-y-4">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Tabs defaultValue={initialTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="advisor">Maintenance Chat</TabsTrigger>
            <TabsTrigger value="diagnosis">Problem Diagnosis</TabsTrigger>
            <TabsTrigger value="prediction">Part Prediction</TabsTrigger>
            <TabsTrigger value="recommender">Supplier Finder</TabsTrigger>
          </TabsList>
          <TabsContent value="advisor" className="flex-1 flex flex-col mt-4">
            <MaintenanceChat
              initialEquipmentType={equipmentType}
              initialProblemDescription={problemDescription}
            />
          </TabsContent>
          <TabsContent value="diagnosis" className="mt-4">
             <ProblemDiagnosisForm />
          </TabsContent>
          <TabsContent value="prediction" className="mt-4">
            <PredictivePartForm />
          </TabsContent>
          <TabsContent value="recommender" className="mt-4">
            <SupplierRecommenderForm initialPartName={initialPartName} />
          </TabsContent>
        </Tabs>

      </main>
    </MainLayout>
  );
}

export default function AIToolsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AIToolsContent />
    </Suspense>
  );
}
