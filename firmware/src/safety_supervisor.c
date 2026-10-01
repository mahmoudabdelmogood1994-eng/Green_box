/*
 * safety_supervisor.c
 *
 * See safety_supervisor.h for the full design rationale. The fusion
 * priority is deliberate and fixed:
 *   1. Hard limit breach  -> GBX_SAFETY_HARD_LIMIT_DISCONNECT (always wins)
 *   2. Reflex OR AI fired -> GBX_SAFETY_AI_ESCALATION
 *   3. Otherwise          -> GBX_SAFETY_CONTINUE
 *
 * This order is what makes the hard-limit check a genuine backstop
 * rather than just another vote: it is checked and applied
 * unconditionally, before the AI/reflex signals are even consulted, so
 * a case where the AI says "no failure" but the hardware is already
 * past its rated limit still results in a disconnect.
 */

#include "safety_supervisor.h"
#include <string.h>

void gbx_safety_init(gbx_safety_supervisor_t *sup)
{
    rk_init(&sup->reflex_state);
}

static bool gbx_check_hard_limits(const gbx_safety_input_t *input, const char **reason_out)
{
    if (input->temperature_c >= HARD_LIMIT_TEMPERATURE_C) {
        *reason_out = "temperature";
        return true;
    }
    if (input->vibration_g >= HARD_LIMIT_VIBRATION_G) {
        *reason_out = "vibration";
        return true;
    }
    *reason_out = NULL;
    return false;
}

gbx_safety_result_t gbx_safety_step(gbx_safety_supervisor_t *sup,
                                     const gbx_safety_input_t *input)
{
    gbx_safety_result_t result;
    memset(&result, 0, sizeof(result));

    /* Run both the adaptive reflex kernel and the AI classifier every
     * cycle -- both are cheap (reflex kernel: a handful of fixed-point
     * ops; AI model: a ~14-64-32-16-2 forward pass, low-single-digit
     * microseconds measured on a desktop CPU). Neither result is
     * trusted yet at this point; the hard-limit check below decides
     * first. */
    rk_step_result_t reflex_result;
    rk_step(&sup->reflex_state, &input->reflex_sample, &reflex_result);
    result.reflex_fired = reflex_result.any_fired;

    gbx_v4_result_t ai_result = gbx_v4_predict(&input->ai_sample);
    result.ai_predicted_failure = ai_result.failure_predicted;
    result.ai_failure_probability = ai_result.failure_probability;

    /* Priority 1: hard limits. Checked and applied unconditionally --
     * this is what covers the AI's and reflex kernel's residual miss
     * rate, on purpose. Does not consult reflex_fired or
     * ai_predicted_failure at all. */
    const char *hard_limit_reason = NULL;
    bool hard_limit_breached = gbx_check_hard_limits(input, &hard_limit_reason);
    result.hard_limit_breached = hard_limit_breached;
    result.hard_limit_reason = hard_limit_reason;

    if (hard_limit_breached) {
        result.action = GBX_SAFETY_HARD_LIMIT_DISCONNECT;
        return result;
    }

    /* Priority 2: either learned/adaptive signal flags elevated risk,
     * but hardware is still within its rated limits -- a graduated
     * response (reduce speed, alert a human), not an emergency stop. */
    if (result.reflex_fired || result.ai_predicted_failure) {
        result.action = GBX_SAFETY_AI_ESCALATION;
        return result;
    }

    /* Priority 3: nothing fired, hardware within limits. */
    result.action = GBX_SAFETY_CONTINUE;
    return result;
}
