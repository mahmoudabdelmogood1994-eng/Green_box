/*
 * genkit.ts -- AI model configuration.
 *
 * REVISION (this pass): previously used @genkit-ai/google-genai to call
 * Gemini in Google's cloud. That plugin, and the outbound API call it
 * makes, is now removed. This configures Genkit against a locally-run
 * Ollama server instead, via genkitx-ollama -- prompts and industrial
 * data never leave the machine (or on-prem server) Ollama is running
 * on, and there is no Google Cloud API call anywhere in this file.
 *
 * NOTE ON WHAT "Genkit" ITSELF IS: the `genkit` orchestration library
 * (definePrompt/defineFlow/schema validation) is an open-source
 * framework originally built by Google/Firebase, but using it does not
 * itself call any Google service -- it is local orchestration code. The
 * actual network call this file used to make was the googleAI() plugin
 * talking to the Gemini API; that plugin is gone. If "remove Google
 * services" is meant to include Firebase (Firestore + Auth), that is a
 * separate, larger change (a database + auth replacement) not made in
 * this pass -- see platform/README.md.
 *
 * PREREQUISITE: this now requires a running Ollama server with a model
 * pulled locally (or on a reachable on-prem host). See
 * platform/README.md for setup and for the tradeoffs vs. a hosted API.
 */
import {genkit} from 'genkit';
import {ollama} from 'genkitx-ollama';

// Configurable via env so a dev box and a factory-floor on-prem server
// can point at different Ollama instances without a code change.
const OLLAMA_SERVER_ADDRESS = process.env.OLLAMA_SERVER_ADDRESS || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

export const ai = genkit({
  plugins: [
    ollama({
      models: [{name: OLLAMA_MODEL, type: 'chat'}],
      serverAddress: OLLAMA_SERVER_ADDRESS,
    }),
  ],
  model: `ollama/${OLLAMA_MODEL}`,
});

