/*
 * safety_supervisor.h
 *
 * Fuses three independent signals into one safety decision, every
 * control cycle:
 *   1. The reflex kernel (reflex_kernel.h) -- fast, adaptive, per-channel
 *      spike detection.
 *   2. The AI classifier (greenbox_model_v4.h) -- 83.8% recall / 81.4%
 *      precision at threshold 0.9, per ml-model/v4-distillation/README.md.
 *   3. HARD hardware limits -- fixed, non-adaptive, non-learned values
 *      from the asset's actual datasheet/mechanical rating. These are
 *      checked independently of the other two and OVERRIDE them.
 *
 * WHY A HARD-LIMIT OVERRIDE EXISTS AT ALL: the AI model catches 83.8%
 * of real failures on its benchmark test set. That leaves roughly 16%
 * it does not catch -- by construction, no classifier trained this way
 * can promise otherwise ("zero errors" is not an achievable target for
 * a statistical classifier). The hard-limit check is the deterministic
 * backstop for exactly that residual: if temperature or vibration is
 * independently already past the point the hardware is rated to
 * survive, this module disconnects regardless of what the reflex
 * kernel or the AI model concluded. It does not need the AI to be
 * right, on purpose.
 *
 * ARCHITECTURE NOTE: the AI model runs directly on this same core (M7),
 * not across an IPC hop to the Cortex-A53/Linux side. This is
 * deliberate: gbx_v4_predict() takes low-single-digit microseconds
 * (measured on a desktop CPU; expect similarly negligible cost on M7),
 * so there is no performance reason to offload it, and a real reason
 * not to -- a safety decision should not depend on a non-real-time OS
 * being responsive. Linux/A53+NPU can still receive a copy of every
 * decision for logging, the cloud connector, and the marketplace
 * platform (see ipc_rpmsg.h) -- it just isn't in the decision path.
 *
 * WHAT THIS MODULE DOES NOT DO: it does not know your asset's real
 * thermal or vibration failure limits. HARD_LIMIT_TEMPERATURE_C and
 * HARD_LIMIT_VIBRATION_G below are placeholders and are clearly marked
 * as such -- they must be replaced with the actual datasheet/mechanical
 * rating for whatever equipment this is deployed on before this is
 * anything more than a structurally-correct skeleton. Shipping this
 * with invented numbers, unlabeled, would be exactly the kind of
 * unearned confidence this project has been trying to avoid.
 */

#ifndef SAFETY_SUPERVISOR_H
#define SAFETY_SUPERVISOR_H

#include <stdint.h>
#include <stdbool.h>
#include "reflex_kernel.h"
#include "greenbox_model_v4.h"

#ifdef __cplusplus
extern "C" {
#endif

/* ---- HARD hardware limits ---------------------------------------------
 * PLACEHOLDERS. Replace with the real asset's rated maximum before any
 * real deployment. These are intentionally NOT tied to the reflex
 * kernel's adaptive thresholds or the AI model's learned decision
 * boundary -- they represent "the equipment will be physically damaged
 * or unsafe past this point," a fact about the hardware, not a
 * prediction about it.
 */
#define HARD_LIMIT_TEMPERATURE_C   120.0   /* PLACEHOLDER -- real bearing/motor
                                               thermal rating goes here */
#define HARD_LIMIT_VIBRATION_G     4.0     /* PLACEHOLDER -- real mechanical
                                               vibration rating goes here */

typedef enum {
    /* Nothing fired: reflex kernel quiet, AI below threshold, sensors
     * within hard limits. */
    GBX_SAFETY_CONTINUE = 0,

    /* Reflex kernel and/or AI model flagged elevated risk, but hard
     * limits are NOT yet breached. Take a graduated protective action
     * (e.g. reduce speed, raise an alert to a human) -- not an
     * emergency stop. */
    GBX_SAFETY_AI_ESCALATION = 1,

    /* Hard limits are breached, REGARDLESS of what the reflex kernel or
     * AI model concluded. This is the deterministic path that exists
     * specifically to cover cases the learned/adaptive layers miss.
     * Always trust this over the other two signals. */
    GBX_SAFETY_HARD_LIMIT_DISCONNECT = 2,
} gbx_safety_action_t;

/* Everything needed for one fused safety decision, gathered from a
 * single real-time sensor sample. Two input structs are used
 * deliberately, not unified into one -- the reflex kernel and the AI
 * model were developed against two different feature/unit conventions
 * (reflex kernel: generic motor telemetry in Celsius; AI model: the
 * AI4I2020 dataset's Kelvin/air-process-temperature/tool-wear
 * convention). Reconciling those into a single real sensor-fusion
 * struct is real integration work for whoever wires this to actual
 * ADC drivers -- this module takes both explicitly rather than
 * pretending that reconciliation has already happened. */
typedef struct {
    rk_sensor_sample_t reflex_sample;   /* for reflex_kernel.h's rk_step() */
    gbx_v4_raw_input_t ai_sample;       /* for greenbox_model_v4.h's gbx_v4_predict() */
    double vibration_g;                 /* raw vibration reading, for the hard-limit check */
    double temperature_c;               /* raw temperature reading, for the hard-limit check */
} gbx_safety_input_t;

typedef struct {
    gbx_safety_action_t action;
    bool reflex_fired;             /* did the reflex kernel fire this step */
    bool ai_predicted_failure;     /* did the AI model predict failure (>= threshold) */
    float ai_failure_probability;  /* raw AI probability, for logging/telemetry */
    bool hard_limit_breached;      /* did the deterministic override trigger */
    const char *hard_limit_reason; /* "temperature", "vibration", or NULL */
} gbx_safety_result_t;

/* Persistent state across calls -- just the reflex kernel's own state
 * (membrane potentials, spike history). The AI model and hard-limit
 * check are both pure functions of their input, no state needed. */
typedef struct {
    reflex_kernel_t reflex_state;
} gbx_safety_supervisor_t;

void gbx_safety_init(gbx_safety_supervisor_t *sup);

/* Runs one fused safety decision. No allocation, deterministic, safe
 * to call from an RTOS task or interrupt context. */
gbx_safety_result_t gbx_safety_step(gbx_safety_supervisor_t *sup,
                                     const gbx_safety_input_t *input);

#ifdef __cplusplus
}
#endif

#endif /* SAFETY_SUPERVISOR_H */
