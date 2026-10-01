
'use server';

/**
 * @fileOverview A conversational AI agent for maintenance advice.
 *
 * - conversationalMaintenanceAdvisor - A function that handles a conversational interaction for maintenance advice.
 * - ConversationalMaintenanceInput - The input type for the function.
 * - ConversationalMaintenanceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ConversationalMaintenanceInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment experiencing the problem.'),
  problemDescription: z.string().describe('The initial, detailed description of the problem.'),
  history: z.array(MessageSchema).describe('The history of the conversation so far.'),
  language: z.enum(['en', 'es', 'ar']).describe('The language for the AI to respond in.'),
});
export type ConversationalMaintenanceInput = z.infer<typeof ConversationalMaintenanceInputSchema>;

const ConversationalMaintenanceOutputSchema = z.string().describe("The model's response to the user's message.");
export type ConversationalMaintenanceOutput = z.infer<typeof ConversationalMaintenanceOutputSchema>;


export async function conversationalMaintenanceAdvisor(input: ConversationalMaintenanceInput): Promise<ConversationalMaintenanceOutput> {
    
  const prompt = ai.definePrompt({
    name: 'conversationalMaintenancePrompt',
    input: { schema: ConversationalMaintenanceInputSchema },
    output: { format: 'text' },
    prompt: `You are an expert industrial maintenance technician acting as a helpful AI assistant. Your goal is to help the user diagnose and solve an equipment problem through conversation.

You MUST respond in the language specified by the user. The target language is: {{{language}}}.

You have been given the following context about the equipment and the initial problem:
- Equipment Type: {{{equipmentType}}}
- Initial Problem: {{{problemDescription}}}

The user has started a conversation with you. Here is the history of your conversation so far:
{{#each history}}
- {{role}}: {{content}}
{{/each}}

Based on this conversation, provide a helpful, concise, and technically accurate response to the user's last message. Be friendly and conversational. If you need more information, ask clarifying questions. If you can suggest a solution, provide clear, step-by-step instructions. If you identify a required part, state it clearly.`,
  });

  const conversationalMaintenanceFlow = ai.defineFlow(
    {
      name: 'conversationalMaintenanceFlow',
      inputSchema: ConversationalMaintenanceInputSchema,
      outputSchema: ConversationalMaintenanceOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );

  return conversationalMaintenanceFlow(input);
}
