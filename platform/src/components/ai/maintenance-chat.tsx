
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { conversationalMaintenanceAdvisor } from '@/ai/flows/conversational-maintenance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, User, Bot, Wrench } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Textarea } from '../ui/textarea';
import { useLanguage } from '@/context/language-context';

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});
type ChatFormValues = z.infer<typeof chatSchema>;

const initialFormSchema = z.object({
  equipmentType: z.string().min(1, 'Equipment type is required.'),
  problemDescription: z.string().min(1, 'Problem description is required.'),
});
type InitialFormValues = z.infer<typeof initialFormSchema>;

type Message = {
  role: 'user' | 'model';
  content: string;
};

type MaintenanceChatProps = {
  initialEquipmentType?: string;
  initialProblemDescription?: string;
};

export default function MaintenanceChat({
  initialEquipmentType: initialEquipmentTypeProp = '',
  initialProblemDescription: initialProblemDescriptionProp = '',
}: MaintenanceChatProps) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const { language } = useLanguage();

  const [equipmentType, setEquipmentType] = useState(initialEquipmentTypeProp);
  const [problemDescription, setProblemDescription] = useState(initialProblemDescriptionProp);

  const chatForm = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: { message: '' },
  });

  const initialForm = useForm<InitialFormValues>({
    resolver: zodResolver(initialFormSchema),
    defaultValues: { equipmentType: 'Welding Robot B-3', problemDescription: '' },
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      const scrollableViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }, 100);
  };
  
  const startConversation = (eqType: string, probDesc: string, initialUserMessage: string) => {
    setEquipmentType(eqType);
    setProblemDescription(probDesc);
    setHasStarted(true);
    if(initialUserMessage) setMessages([{ role: 'user', content: initialUserMessage }]);
    
    startTransition(async () => {
      try {
        const response = await conversationalMaintenanceAdvisor({
          equipmentType: eqType,
          problemDescription: probDesc,
          history: initialUserMessage ? [{ role: 'user', content: initialUserMessage }] : [], 
          language: language,
        });
        setMessages((prev) => [...prev, { role: 'model', content: response }]);
        scrollToBottom();
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to get initial advice. Please try again.',
          variant: 'destructive',
        });
        setHasStarted(false); // Allow retry
      }
    });
  }

  useEffect(() => {
    if (initialEquipmentTypeProp && initialProblemDescriptionProp && !hasStarted) {
      const userMessage = `I have a problem with my ${initialEquipmentTypeProp}. Here's the issue: ${initialProblemDescriptionProp}`;
      startConversation(initialEquipmentTypeProp, initialProblemDescriptionProp, userMessage);
    }
  }, [initialEquipmentTypeProp, initialProblemDescriptionProp, hasStarted]);


  const handleFollowUpSubmit = (values: ChatFormValues) => {
    const userMessage: Message = { role: 'user', content: values.message };
    setMessages((prev) => [...prev, userMessage]);
    chatForm.reset();
    scrollToBottom();

    startTransition(async () => {
      try {
        const response = await conversationalMaintenanceAdvisor({
          equipmentType: equipmentType,
          problemDescription: problemDescription,
          history: [...messages, userMessage],
          language: language,
        });
        setMessages((prev) => [...prev, { role: 'model', content: response }]);
        scrollToBottom();
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to get a response. Please try again.',
          variant: 'destructive',
        });
        setMessages(messages => messages.slice(0, -1));
      }
    });
  };
  
  const handleInitialFormSubmit = (values: InitialFormValues) => {
    const userMessage = `I have a problem with my ${values.equipmentType}. Here's the issue: ${values.problemDescription}`;
    startConversation(values.equipmentType, values.problemDescription, userMessage);
  };
  
  const extractPartName = (text: string): string | null => {
    const partKeywords = [
        'part required:', 'required part:', 'you will need a', 'replace the', 
        'pieza requerida:', 'necesitará una', 'reemplace la',
        'الجزء المطلوب:', 'ستحتاج إلى', 'استبدل'
    ];
    const lowerText = text.toLowerCase();
    
    for (const keyword of partKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        let potentialPart = text.substring(index + keyword.length).trim();
        potentialPart = potentialPart.split(/[\n.,¡!¿?]/)[0].trim();
        potentialPart = potentialPart.replace(/^['"“]|['"”]$/g, ''); // Also remove curly quotes
        if (potentialPart.length > 0 && potentialPart.length < 50) {
          // Simple filter for common non-part words, can be improved
          if (!['the','a','an','un','una'].includes(potentialPart.toLowerCase())) {
            return potentialPart;
          }
        }
      }
    }
    return null;
  };


  return (
    <Card className="flex flex-col flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" />
          Maintenance Advisor Chat
        </CardTitle>
        <CardDescription>
          Your AI assistant for diagnosing and solving equipment problems.
        </CardDescription>
      </CardHeader>
      <CardContent ref={scrollAreaRef} className="flex-1 flex flex-col gap-4">
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6">
            {!hasStarted && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-muted rounded-full p-4 mb-4">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Welcome to the Maintenance Advisor</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Describe an equipment problem below to get started, or click on an alert from the dashboard.
                </p>
                <Card className="mt-6 text-left w-full max-w-lg">
                    <Form {...initialForm}>
                        <form onSubmit={initialForm.handleSubmit(handleInitialFormSubmit)}>
                            <CardContent className="pt-6 space-y-4">
                                <FormField
                                    control={initialForm.control}
                                    name="equipmentType"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Equipment Type</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g., Welding Robot B-3" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={initialForm.control}
                                    name="problemDescription"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Problem Description</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="e.g., The robot arm is moving erratically..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </CardContent>
                            <div className='p-6 pt-0'>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Analysis'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
              </div>
            )}
            {messages.map((message, index) => {
                const partName = message.role === 'model' ? extractPartName(message.content) : null;
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3',
                      message.role === 'user' && 'justify-end'
                    )}
                  >
                    {message.role === 'model' && (
                      <Avatar className="w-8 h-8 border-2 border-primary">
                        <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-md rounded-lg p-3 text-sm',
                        message.role === 'model'
                          ? 'bg-muted'
                          : 'bg-primary text-primary-foreground'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {partName && (
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <Button asChild variant="outline" size="sm" className="bg-background">
                            <Link href={`/suppliers/${encodeURIComponent(partName)}`}>
                              <Wrench className="mr-2 h-4 w-4" />
                              Find Suppliers for {partName}
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
            })}
             {isPending && messages.length > 0 && (
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 border-2 border-primary">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        {hasStarted && (
            <div className="mt-auto pt-4 border-t">
            <Form {...chatForm}>
                <form onSubmit={chatForm.handleSubmit(handleFollowUpSubmit)} className="flex items-center gap-2">
                <FormField
                    control={chatForm.control}
                    name="message"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormControl>
                        <Input
                            placeholder="Ask a follow-up question..."
                            {...field}
                            disabled={isPending}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" disabled={isPending}>
                    {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Send className="h-4 w-4" />
                    )}
                </Button>
                </form>
            </Form>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
