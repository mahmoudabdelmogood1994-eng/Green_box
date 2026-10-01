'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { recommendEfficientSupplier, type RecommendEfficientSupplierOutput } from '@/ai/flows/recommend-efficient-supplier';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { Truck, Loader2, Factory, Route, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  partName: z.string().min(1, 'Part name is required.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  deliveryLocation: z.string().min(1, 'Delivery location is required.'),
});

type FormValues = z.infer<typeof formSchema>;

type SupplierRecommenderFormProps = {
  initialPartName?: string;
};

export default function SupplierRecommenderForm({ initialPartName = '' }: SupplierRecommenderFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RecommendEfficientSupplierOutput | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partName: '',
      quantity: 10,
      deliveryLocation: 'Factory 2, Assembly Line C',
    },
  });
  
  useEffect(() => {
    if (initialPartName) {
      form.setValue('partName', initialPartName);
    }
  }, [initialPartName, form]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setResult(null);
      try {
        const recommendation = await recommendEfficientSupplier({ ...values, language });
        setResult(recommendation);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to get recommendation. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Find Efficient Supplier</CardTitle>
          <CardDescription>
            Enter part details to find the most efficient supplier and delivery route.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="partName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hydraulic Pump" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Factory 1, Bay 3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="mr-2 h-4 w-4" />
                )}
                Find Supplier
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendation</CardTitle>
          <CardDescription>Optimal supplier and logistics based on your request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 h-[350px] flex items-center justify-center">
            {isPending && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {!isPending && !result && <p className="text-muted-foreground">Results will appear here.</p>}
            {result && !result.grounded && (
                <div className="w-full space-y-3 animate-in fade-in-50 text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                    <p className="font-semibold">No matching supplier in catalog</p>
                    <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                </div>
            )}
            {result && result.grounded && (
                <div className="w-full space-y-4 animate-in fade-in-50">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Factory className="h-4 w-4 text-accent" />
                            <span>Recommended Supplier</span>
                        </div>
                        <p className="text-xl font-semibold">{result.supplierName}</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Route className="h-4 w-4 text-accent" />
                            <span>Delivery Route</span>
                        </div>
                        <p className="text-lg">{result.deliveryRoute}</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <DollarSign className="h-4 w-4 text-accent" />
                            <span>Estimated Cost</span>
                        </div>
                        <p className="text-xl font-semibold">${result.estimatedCost.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <PackageCheck className="h-4 w-4 text-accent" />
                            <span>Availability</span>
                        </div>
                        <p className="text-lg">{result.availability}</p>
                    </div>
                    <p className="text-xs text-muted-foreground border-t pt-2">{result.reasoning}</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
