'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { diagnoseProblem, type DiagnoseProblemOutput } from '@/ai/flows/diagnose-problem';
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
import { BrainCircuit, Loader2, ListChecks, Stethoscope, CheckCircle } from 'lucide-react';

const formSchema = z.object({
  equipmentType: z.string().min(1, 'Equipment type is required.'),
  problemDescription: z.string().min(1, 'Problem description is required.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProblemDiagnosisForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DiagnoseProblemOutput | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentType: 'Welding Robot B-3',
      problemDescription: 'The robot arm is moving erratically and failing to complete welds accurately. Making a clicking sound on the main joint.',
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      setResult(null);
      try {
        const diagnosisResult = await diagnoseProblem({ ...values, language });
        setResult(diagnosisResult);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to get diagnosis. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Diagnose Equipment Problem</CardTitle>
          <CardDescription>
            Describe the problem to get a diagnosis and suggested solutions from our AI expert.
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
                name="problemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Description</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="Describe the symptoms, error codes, and recent events..." {...field} />
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
                  <Stethoscope className="mr-2 h-4 w-4" />
                )}
                Diagnose Problem
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Diagnosis & Solutions</CardTitle>
          <CardDescription>Expert analysis of the equipment issue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 h-[410px] flex items-center justify-center">
            {isPending && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
            {!isPending && !result && <p className="text-muted-foreground">Results will appear here.</p>}
            {result && (
                <div className="w-full space-y-4 animate-in fade-in-50">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Stethoscope className="h-4 w-4 text-accent" />
                            <span>Diagnosis</span>
                        </div>
                        <p className="text-lg font-semibold">{result.diagnosis}</p>
                    </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <ListChecks className="h-4 w-4 text-accent" />
                            <span>Suggested Solutions</span>
                        </div>
                        <ul className="space-y-2 pl-5">
                            {result.suggestedSolutions.map((solution, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                    <span>{solution}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
