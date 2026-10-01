
'use client';

import { useParams } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import { suppliers, partSuppliers, parts } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Clock, DollarSign, ListChecks, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SupplierPage() {
  const params = useParams();
  const { toast } = useToast();
  const partName = decodeURIComponent(params.partName as string);

  // Find the part ID from the part name
  const part = parts.find(p => p.name.toLowerCase() === partName.toLowerCase());
  
  // Find all supplier relationships for that part ID
  const relevantPartSuppliers = part ? partSuppliers.filter(ps => ps.partId === part.id) : [];


  const handleBuy = (supplierName: string) => {
    toast({
      title: "Order Placed",
      description: `Purchase order for ${partName} from ${supplierName} has been created.`,
    });
  };

  return (
    <MainLayout>
      <Header title={`Suppliers for ${partName}`} />
      <main className="flex-1 space-y-6 p-4 md:p-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        {relevantPartSuppliers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relevantPartSuppliers.map(ps => {
              const supplier = suppliers.find(s => s.id === ps.supplierId);
              if (!supplier) return null;

              return (
                <Card key={supplier.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{supplier.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                      <Globe className="h-4 w-4" />
                      {supplier.country}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Price</span>
                      <span className="font-bold text-lg">${ps.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Lead Time</span>
                      <span className="font-semibold">{ps.leadTime} days</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2"><ListChecks className="h-4 w-4" />Specifications</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{ps.spec}</p>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button className="w-full" onClick={() => handleBuy(supplier.name)}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Buy from this Supplier
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <h3 className="text-lg font-medium">No Suppliers Found</h3>
              <p className="text-muted-foreground">
                There are currently no registered suppliers for &quot;{partName}&quot;.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </MainLayout>
  );
}
