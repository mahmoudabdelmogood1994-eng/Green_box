'use server';

/**
 * @fileOverview An AI agent that diagnoses equipment problems and suggests solutions.
 *
 * - diagnoseProblem - A function that handles the problem diagnosis process.
 * - DiagnoseProblemInput - The input type for the diagnoseProblem function.
 * - DiagnoseProblemOutput - The return type for the diagnoseProblem function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DiagnoseProblemInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment experiencing the problem.'),
  problemDescription: z.string().describe('A detailed description of the problem or symptoms.'),
  language: z.enum(['en', 'es', 'ar']).default('en')
    .describe('The language for the diagnosis and solutions text.'),
});
export type DiagnoseProblemInput = z.infer<typeof DiagnoseProblemInputSchema>;

const DiagnoseProblemOutputSchema = z.object({
  diagnosis: z.string().describe('A concise diagnosis of the most likely problem.'),
  suggestedSolutions: z.array(z.string()).describe('A list of actionable steps or solutions to resolve the issue.'),
});
export type DiagnoseProblemOutput = z.infer<typeof DiagnoseProblemOutputSchema>;

export async function diagnoseProblem(input: DiagnoseProblemInput): Promise<DiagnoseProblemOutput> {
  return diagnoseProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseProblemPrompt',
  input: { schema: DiagnoseProblemInputSchema },
  output: { schema: DiagnoseProblemOutputSchema },
  prompt: `You are an expert industrial maintenance technician. Your task is to diagnose an equipment problem based on the provided information and suggest concrete solutions.
Respond in this language: {{{language}}}.

Analyze the equipment type and the description of the problem. Provide a clear, likely diagnosis and a list of step-by-step solutions to fix it.

Equipment Type: {{{equipmentType}}}
Problem Description: {{{problemDescription}}}
`,
});

const diagnoseProblemFlow = ai.defineFlow(
  {
    name: 'diagnoseProblemFlow',
    inputSchema: DiagnoseProblemInputSchema,
    outputSchema: DiagnoseProblemOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
