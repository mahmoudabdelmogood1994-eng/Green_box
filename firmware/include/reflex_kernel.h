/*
 * reflex_kernel.h
 *
 * Fixed-point (int8) leaky-integrate-and-fire reflex kernel for Green Box M.
 *
 * This is a direct port of the algorithm in Black Dragon Runtime's
 * `src/bhs/optimize/quantized_reflex.py`, adapted from a 40x60 structural
 * sensing grid to Green Box M's small set of discrete industrial sensor
 * channels (vibration, temperature, torque, tool wear).
 *
 * Target: NXP i.MX 8M Plus, Cortex-M7 core, running under FreeRTOS.
 * This file has no OS or driver dependency by itself -- it is pure
 * fixed-point math, so it is straightforward to unit test on a desktop
 * before flashing to the M7.
 *
 * STATUS: real, ported algorithm. NOT yet benchmarked on M7 silicon --
 * see reflex_task_m7.c for the FreeRTOS task wiring, and README.md for
 * what is real vs. stubbed in this drop.
 */

#ifndef REFLEX_KERNEL_H
#define REFLEX_KERNEL_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ---- Channel definitions -------------------------------------------- */

/* Green Box M reads 4 scalar channels per reflex step, mirroring the
 * (temperature, stress, vibration, crack_signal) layout of the original
 * BHS reflex kernel, remapped to the sensors this product actually has. */
typedef enum {
    RK_CHANNEL_TEMPERATURE = 0,   /* motor/bearing surface temp, deg C */
    RK_CHANNEL_TORQUE      = 1,   /* Nm, from current/torque sensor    */
    RK_CHANNEL_VIBRATION   = 2,   /* g, RMS accel over the ADC window  */
    RK_CHANNEL_WEAR_DELTA  = 3,   /* rate of change of tool/tool-wear  */
    RK_NUM_CHANNELS        = 4
} rk_channel_t;

/* Spike history window length, in reflex steps, used to compute a
 * smoothed spike rate (same role as `window` in the Python reference). */
#define RK_HISTORY_WINDOW 10

/* ---- Fixed-point scale ------------------------------------------------
 * Drive values are expected in roughly [0, SCALE_RANGE] before
 * quantization to int8. This mirrors QSCALE = 127 / SCALE_RANGE in the
 * Python reference. SCALE_RANGE is tunable per deployment; the default
 * below is carried over unchanged from the reference implementation and
 * should be re-validated against real sensor drive-signal ranges during
 * Phase 2 pilot data collection, not assumed correct for a new sensor
 * suite without checking.
 */
#define RK_SCALE_RANGE   6.0f
#define RK_QSCALE        (127.0f / RK_SCALE_RANGE)

/* ---- Per-channel thresholds and decay --------------------------------
 * Carried over from the Python reference's illustrative constants
 * (threshold = [3.0, 3.0, 3.0, 2.5], decay = 0.85). These are NOT
 * calibrated to real Green Box M sensor data -- they are placeholders
 * to be replaced once field data from the Phase 2 pilot is available.
 */
#define RK_DECAY_Q7   ((int16_t)(0.85f * 128.0f))   /* Q7 fixed-point decay */

typedef struct {
    int8_t membrane_q[RK_NUM_CHANNELS];
    int8_t threshold_q[RK_NUM_CHANNELS];
    uint8_t spike_history[RK_HISTORY_WINDOW];
    uint8_t hist_idx;
    float prev_stress; /* prev torque reading, used for the wear-delta channel */
} reflex_kernel_t;

/* Raw sensor reading for one reflex step, pre-quantization. */
typedef struct {
    float temperature_c;
    float torque_nm;
    float vibration_g;
} rk_sensor_sample_t;

/* Result of one reflex step. */
typedef struct {
    bool fired[RK_NUM_CHANNELS];
    bool any_fired;
    float spike_rate;      /* fraction of the last RK_HISTORY_WINDOW steps that fired */
} rk_step_result_t;

/* Initialize kernel state. Call once at task start. */
void rk_init(reflex_kernel_t *rk);

/* Run one reflex step. Pure function of (rk, sample) -> result;
 * rk is mutated in place (membrane state, spike history).
 * This is the function called from the FreeRTOS reflex task's hot loop --
 * see reflex_task_m7.c.
 */
void rk_step(reflex_kernel_t *rk, const rk_sensor_sample_t *sample,
             rk_step_result_t *result);

/* Total resident state size in bytes -- useful for confirming the M7's
 * SRAM budget, mirroring `nbytes` in the Python reference. */
uint32_t rk_state_size_bytes(void);

#ifdef __cplusplus
}
#endif

#endif /* REFLEX_KERNEL_H */
