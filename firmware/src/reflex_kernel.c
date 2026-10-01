/*
 * reflex_kernel.c
 *
 * See reflex_kernel.h for scope and status notes.
 *
 * This mirrors QuantizedReflexKernel.step() from quantized_reflex.py:
 *   1. Compute per-channel "drive" signal from raw sensor deltas.
 *   2. Quantize drive to int8.
 *   3. Decay the membrane potential in Q7 fixed point, accumulate drive.
 *   4. Compare against threshold; reset membrane to 0 on fire.
 *   5. Update a rolling spike-history window and report the spike rate.
 *
 * No dynamic allocation, no floating-point in the hot per-step integer
 * math (decay/accumulate/compare) -- floating point is used only in the
 * one-time drive-signal computation below, matching the reference. If
 * profiling on real M7 silicon shows the FPU-based drive computation is
 * a bottleneck, that step can be fixed-pointed too; not done here because
 * the reference implementation itself does not require it.
 */

#include "reflex_kernel.h"
#include <math.h>

static int8_t rk_quantize_one(float x)
{
    float scaled = x * RK_QSCALE;
    float rounded = roundf(scaled);
    if (rounded > 127.0f) rounded = 127.0f;
    if (rounded < -128.0f) rounded = -128.0f;
    return (int8_t)rounded;
}

/* Mirrors QuantizedReflexKernel._drive_q() for a single (non-grid) sample. */
static void rk_compute_drive_q(const rk_sensor_sample_t *sample,
                                float prev_torque,
                                int8_t drive_q[RK_NUM_CHANNELS])
{
    float d_temp = sample->temperature_c - 60.0f;
    if (d_temp < 0.0f) d_temp = 0.0f;
    d_temp = d_temp / 20.0f;

    float d_torque = sample->torque_nm - 12.0f;
    if (d_torque < 0.0f) d_torque = 0.0f;
    d_torque = d_torque / 20.0f;

    float d_vib = sample->vibration_g - 0.6f;
    if (d_vib < 0.0f) d_vib = 0.0f;
    d_vib = d_vib * 8.0f;

    float d_wear = fabsf(sample->torque_nm - prev_torque) / 5.0f;

    drive_q[RK_CHANNEL_TEMPERATURE] = rk_quantize_one(d_temp);
    drive_q[RK_CHANNEL_TORQUE]      = rk_quantize_one(d_torque);
    drive_q[RK_CHANNEL_VIBRATION]   = rk_quantize_one(d_vib);
    drive_q[RK_CHANNEL_WEAR_DELTA]  = rk_quantize_one(d_wear);
}

void rk_init(reflex_kernel_t *rk)
{
    const float thresholds[RK_NUM_CHANNELS] = { 3.0f, 3.0f, 3.0f, 2.5f };

    for (int c = 0; c < RK_NUM_CHANNELS; c++) {
        rk->membrane_q[c] = 0;
        rk->threshold_q[c] = rk_quantize_one(thresholds[c]);
    }
    for (int i = 0; i < RK_HISTORY_WINDOW; i++) {
        rk->spike_history[i] = 0;
    }
    rk->hist_idx = 0;
    rk->prev_stress = 0.0f;
}

void rk_step(reflex_kernel_t *rk, const rk_sensor_sample_t *sample,
             rk_step_result_t *result)
{
    int8_t drive_q[RK_NUM_CHANNELS];
    rk_compute_drive_q(sample, rk->prev_stress, drive_q);

    uint8_t any_fired = 0;

    for (int c = 0; c < RK_NUM_CHANNELS; c++) {
        /* decay in Q7 fixed point: (membrane * decay) >> 7, int16 to avoid
         * overflow on the multiply, matching the Python reference exactly */
        int16_t decayed = (int16_t)(((int16_t)rk->membrane_q[c] * RK_DECAY_Q7) >> 7);
        int16_t acc = (int16_t)(decayed + drive_q[c]);

        if (acc > 127) acc = 127;
        if (acc < -128) acc = -128;

        bool fired = (acc >= rk->threshold_q[c]);
        if (fired) {
            acc = 0;
            any_fired = 1;
        }

        rk->membrane_q[c] = (int8_t)acc;
        result->fired[c] = fired;
    }

    result->any_fired = (any_fired != 0);

    rk->spike_history[rk->hist_idx] = any_fired;
    rk->hist_idx = (uint8_t)((rk->hist_idx + 1) % RK_HISTORY_WINDOW);

    uint32_t sum = 0;
    for (int i = 0; i < RK_HISTORY_WINDOW; i++) {
        sum += rk->spike_history[i];
    }
    result->spike_rate = (float)sum / (float)RK_HISTORY_WINDOW;

    rk->prev_stress = sample->torque_nm;
}

uint32_t rk_state_size_bytes(void)
{
    return (uint32_t)sizeof(reflex_kernel_t);
}
