'use server';

/**
 * @fileOverview An AI agent that recommends the most efficient supplier and delivery route for a required part.
 *
 * - recommendEfficientSupplier - A function that handles the supplier recommendation process.
 * - RecommendEfficientSupplierInput - The input type for the recommendEfficientSupplier function.
 * - RecommendEfficientSupplierOutput - The return type for the recommendEfficientSupplier function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {parts, suppliers, partSuppliers} from '@/lib/data';

const RecommendEfficientSupplierInputSchema = z.object({
  partName: z.string().describe('The name of the required part.'),
  quantity: z.number().describe('The quantity of the part needed.'),
  deliveryLocation: z.string().describe('The delivery location for the part.'),
  language: z.enum(['en', 'es', 'ar']).default('en')
    .describe('The language for the reasoning text in the output.'),
});
export type RecommendEfficientSupplierInput = z.infer<typeof RecommendEfficientSupplierInputSchema>;

const RecommendEfficientSupplierOutputSchema = z.object({
  supplierName: z.string().describe('The name of the recommended supplier.'),
  deliveryRoute: z.string().describe('The recommended delivery route.'),
  estimatedCost: z.number().describe('The estimated cost of the part and delivery, in USD.'),
  availability: z.string().describe('The availability of the part at the supplier.'),
  reasoning: z.string().describe('Why this supplier was picked over the other real candidates.'),
  grounded: z.boolean().describe(
    'True if this recommendation was chosen from real catalog data. False ' +
    'means no matching supplier exists in the catalog and the response is ' +
    'a fallback notice, not a real recommendation.'
  ),
});
export type RecommendEfficientSupplierOutput = z.infer<typeof RecommendEfficientSupplierOutputSchema>;

export async function recommendEfficientSupplier(
  input: RecommendEfficientSupplierInput
): Promise<RecommendEfficientSupplierOutput> {
  return recommendEfficientSupplierFlow(input);
}

/*
 * GROUNDING FIX (this revision): the previous version of this flow asked
 * the model to invent a supplier name, delivery route, and cost from
 * scratch, with nothing to check it against -- meaning a factory could
 * be told to order from a company that doesn't exist, at a price nobody
 * quoted. This version looks up the real candidate suppliers for the
 * requested part from the sample catalog (`src/lib/data.ts`) first, and
 * restricts the model to choosing and explaining among those real rows.
 * It does NOT invent a name/price when there is no match -- it returns
 * `grounded: false` instead, which the UI should render as "no matching
 * supplier in catalog" rather than presenting a fabricated answer.
 *
 * `src/lib/data.ts` is still sample/demo data, not a live supplier
 * database -- swapping this lookup for a real Firestore/`suppliers`
 * query later is a drop-in change to the block below, the prompt
 * contract does not need to change.
 */
function findCandidates(partName: string) {
  const needle = partName.trim().toLowerCase();
  const matchedPart = parts.find(
    p => p.name.toLowerCase() === needle || p.name.toLowerCase().includes(needle)
  );
  if (!matchedPart) return {matchedPart: null, candidates: []};

  const candidates = partSuppliers
    .filter(ps => ps.partId === matchedPart.id)
    .map(ps => {
      const supplier = suppliers.find(s => s.id === ps.supplierId);
      return {
        supplierName: supplier?.name ?? 'Unknown supplier',
        country: supplier?.country ?? 'Unknown',
        price: ps.price,
        leadTimeDays: ps.leadTime,
        spec: ps.spec,
      };
    });
  return {matchedPart, candidates};
}

const CandidateSchema = z.object({
  supplierName: z.string(),
  country: z.string(),
  price: z.number(),
  leadTimeDays: z.number(),
  spec: z.string(),
});

const GroundedPromptInputSchema = z.object({
  partName: z.string(),
  quantity: z.number(),
  deliveryLocation: z.string(),
  language: z.enum(['en', 'es', 'ar']),
  candidates: z.array(CandidateSchema),
});

const prompt = ai.definePrompt({
  name: 'recommendEfficientSupplierPrompt',
  input: {schema: GroundedPromptInputSchema},
  output: {
    schema: RecommendEfficientSupplierOutputSchema.omit({grounded: true}),
  },
  prompt: `You are an expert in industrial logistics and supply chain management.
Respond in this language: {{{language}}}.

You must choose your recommendation ONLY from the real candidate suppliers
listed below. Do not invent a supplier, price, or lead time that is not in
this list -- every number in your answer must come from one of these rows.

Part requested: {{{partName}}}
Quantity: {{{quantity}}}
Delivery location: {{{deliveryLocation}}}

Real candidate suppliers for this part:
{{#each candidates}}
- {{supplierName}} ({{country}}): unit price {{price}} USD, lead time {{leadTimeDays}} days, spec: {{spec}}
{{/each}}

Pick the single best candidate considering price, lead time, and delivery
location, multiply unit price by the requested quantity for estimatedCost,
and explain your reasoning briefly in "reasoning". Set "deliveryRoute" to a
short plausible route description from the supplier's country to the
delivery location. Set "availability" based on the candidate's lead time.
`,
});

const recommendEfficientSupplierFlow = ai.defineFlow(
  {
    name: 'recommendEfficientSupplierFlow',
    inputSchema: RecommendEfficientSupplierInputSchema,
    outputSchema: RecommendEfficientSupplierOutputSchema,
  },
  async input => {
    const {candidates} = findCandidates(input.partName);

    if (candidates.length === 0) {
      // Honest failure path instead of letting the model fabricate an answer.
      return {
        supplierName: 'No matching supplier',
        deliveryRoute: 'N/A',
        estimatedCost: 0,
        availability: 'No catalog match for this part name',
        reasoning: `No supplier in the current catalog carries a part matching "${input.partName}". This is sample/demo catalog data (src/lib/data.ts), not a live supplier database.`,
        grounded: false,
      };
    }

    const {output} = await prompt({
      partName: input.partName,
      quantity: input.quantity,
      deliveryLocation: input.deliveryLocation,
      language: input.language,
      candidates,
    });
    return {...output!, grounded: true};
  }
);
