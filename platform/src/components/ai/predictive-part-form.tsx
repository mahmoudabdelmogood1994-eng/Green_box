'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { predictPart, type PredictPartOutput } from '@/ai/flows/predictive-part-identification';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { BrainCircuit, Loader2, Gauge, Wrench, AlertTriangle, Info } from 'lucide-react';

const formSchema = z.object({
  equipmentType: z.string().min(1, 'Equipment type is required.'),
  operationalData: z.string().min(1, 'Operational data is required.'),
  failureHistory: z.string().min(1, 'Failure history is required.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function PredictivePartForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PredictPartOutput | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentType: 'CNC Milling Machine',
      operationalData: 'Vibration: 0.8g, Temp: 85C, Spindle Speed: 12000rpm, Power Draw: 5kW',
      failureHistory: 'Last 12 months: 2x Spindle bearing failure, 1x Coolant pump clog.',
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setResult(null);
      try {
        const prediction = await predictPart({ ...values, language });
        setResult(prediction);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to get prediction. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Predict Required Spare Part</CardTitle>
          <CardDescription>
            Enter equipment data to predict potential failures and identify required parts.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CNC Milling Machine" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operationalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operational Data</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Sensor readings, performance metrics..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="failureHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure History</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Failure types, frequency, repair logs..." {...field} />
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
                  <BrainCircuit className="mr-2 h-4 w-4" />
                )}
                Analyze & Predict
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Result</CardTitle>
          <CardDescription>AI-powered failure prediction and part recommendation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 h-[410px] flex items-center justify-center">
            {isPending && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {!isPending && !result && <p className="text-muted-foreground">Results will appear here.</p>}
            {result && (
                <div className="w-full space-y-4 animate-in fade-in-50">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <AlertTriangle className="h-4 w-4 text-accent" />
                            <span>Predicted Failure</span>
                        </div>
                        <p className="text-xl font-semibold">{result.predictedFailure}</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Wrench className="h-4 w-4 text-accent" />
                            <span>Required Part</span>
                        </div>
                        <p className="text-xl font-semibold">{result.requiredPart}</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Gauge className="h-4 w-4 text-accent" />
                            <span>Confidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={
                                'font-semibold text-lg capitalize ' +
                                (result.confidenceRating === 'high' ? 'text-green-500' :
                                 result.confidenceRating === 'medium' ? 'text-amber-500' : 'text-red-500')
                            }>
                                {result.confidenceRating}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.confidenceReason}</p>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{result.disclaimer}</span>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
