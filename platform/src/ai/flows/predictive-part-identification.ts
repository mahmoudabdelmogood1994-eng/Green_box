'use server';

/**
 * @fileOverview Predicts equipment failures and identifies necessary spare parts.
 *
 * - predictPart - Predicts equipment failures and identifies necessary spare parts.
 * - PredictPartInput - The input type for the predictPart function.
 * - PredictPartOutput - The return type for the predictPart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictPartInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment being monitored.'),
  operationalData: z.string().describe('Operational data from the equipment, including sensor readings, performance metrics, and maintenance history.'),
  failureHistory: z.string().describe('Historical data on equipment failures, including failure types, frequency, and repair logs.'),
  language: z.enum(['en', 'es', 'ar']).default('en')
    .describe('The language for the response text.'),
});
export type PredictPartInput = z.infer<typeof PredictPartInputSchema>;

/*
 * HONESTY FIX (this revision): the previous schema asked the LLM for a
 * numeric confidenceLevel (0-1). That number has no statistical basis --
 * it's the model guessing a plausible-looking float, not a calibrated
 * probability from the actual predictive-maintenance classifier (that
 * real, tested model lives in ml-model/ and is a separate code path this
 * chat-style flow does not call). Presenting an LLM-invented float next
 * to genuinely tested numbers elsewhere in this project is exactly the
 * kind of fake-precision that undermines credibility with a technical
 * reviewer. This revision replaces it with a coarse categorical rating
 * plus a plain-language reason, which is honest about what a language
 * model can actually provide here -- and adds an explicit disclaimer
 * field so the UI can render a "this is an AI-generated hypothesis, not
 * a calibrated statistical output" notice.
 */
const PredictPartOutputSchema = z.object({
  predictedFailure: z.string().describe('The predicted type of equipment failure.'),
  requiredPart: z.string().describe('The identified spare part needed to address the predicted failure.'),
  confidenceRating: z.enum(['low', 'medium', 'high']).describe(
    'A coarse, qualitative confidence rating -- NOT a calibrated statistical probability.'
  ),
  confidenceReason: z.string().describe('One or two sentences on why this confidence rating was chosen.'),
  disclaimer: z.string().describe(
    'A short, user-facing note that this is an AI-generated hypothesis for a human ' +
    'technician to verify, not a calibrated prediction from a trained model on this ' +
    'equipment.'
  ),
});
export type PredictPartOutput = z.infer<typeof PredictPartOutputSchema>;

export async function predictPart(input: PredictPartInput): Promise<PredictPartOutput> {
  return predictPartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictPartPrompt',
  input: {schema: PredictPartInputSchema},
  output: {schema: PredictPartOutputSchema},
  prompt: `You are an expert maintenance manager, skilled at predictively identifying equipment failures and required spare parts.
Respond in this language: {{{language}}}.

Analyze the provided equipment data to predict potential failures and identify
the necessary replacement parts. Give a coarse confidence rating of "low",
"medium", or "high" -- do NOT invent a precise numeric probability, since you
have no calibrated model behind this estimate, only the text provided. Always
include the disclaimer field noting this is an AI-generated hypothesis for a
human technician to verify, not a calibrated prediction.

Equipment Type: {{{equipmentType}}}
Operational Data: {{{operationalData}}}
Failure History: {{{failureHistory}}}`,
});

const predictPartFlow = ai.defineFlow(
  {
    name: 'predictPartFlow',
    inputSchema: PredictPartInputSchema,
    outputSchema: PredictPartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
