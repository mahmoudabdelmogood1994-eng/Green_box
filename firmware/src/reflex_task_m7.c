/*
 * reflex_task_m7.c
 *
 * FreeRTOS task that runs on the Cortex-M7 core. Reads sensors, steps the
 * reflex kernel, and forwards results to the Linux/NPU side over RPMsg.
 *
 * STATUS: task structure and control flow are real; the sensor read
 * function (rk_read_sensors_stub) and the FreeRTOS/CMSIS includes below
 * are STUBS -- ADC driver wiring depends on the final Green Box M sensor
 * board (ADC channel mapping, sampling rate) which is Phase 2 hardware
 * bring-up work, not something to guess at here. The reflex_kernel.c
 * math itself has no such dependency and can be validated today.
 *
 * This file will not compile standalone -- it assumes FreeRTOS.h,
 * task.h, and an NXP MCUXpresso SDK ADC driver are available, which is
 * the real M7-side build environment. See test/desktop_reflex_test.c for
 * a build target that exercises the kernel math without any of that.
 */

#if defined(GREENBOX_BUILD_TARGET_M7)

#include "FreeRTOS.h"
#include "task.h"
#include "reflex_kernel.h"
#include "ipc_rpmsg.h"

/* Reflex loop period. Matches the "high-frequency sampling" role of the
 * RTOS side described in the Technical Document Section 2.2 (Software /
 * OS) -- tune once real sensor bandwidth requirements are known. */
#define REFLEX_TASK_PERIOD_MS   10

/* STUB: replace with real ADC reads once the sensor board's channel
 * mapping is finalized (see file header). */
static void rk_read_sensors_stub(rk_sensor_sample_t *out)
{
    out->temperature_c = 0.0f;
    out->torque_nm = 0.0f;
    out->vibration_g = 0.0f;
}

void reflex_task_main(void *pv_parameters)
{
    (void)pv_parameters;

    reflex_kernel_t rk;
    rk_init(&rk);
    ipc_rpmsg_init();

    uint32_t seq = 0;
    TickType_t last_wake = xTaskGetTickCount();

    for (;;) {
        rk_sensor_sample_t sample;
        rk_read_sensors_stub(&sample);

        rk_step_result_t result;
        rk_step(&rk, &sample, &result);

        /* Only send over IPC when something fired, plus a periodic
         * heartbeat every 100 steps -- avoids saturating the RPMsg ring
         * buffer with a message on every 10ms tick when nothing changed. */
        if (result.any_fired || (seq % 100 == 0)) {
            ipc_reflex_message_t msg;
            msg.seq = seq;
            msg.timestamp_ms = (uint32_t)(xTaskGetTickCount() * portTICK_PERIOD_MS);
            msg.spike_rate = result.spike_rate;
            msg.fired_mask = 0;
            for (int c = 0; c < RK_NUM_CHANNELS; c++) {
                msg.membrane_q[c] = rk.membrane_q[c];
                if (result.fired[c]) {
                    msg.fired_mask |= (uint8_t)(1u << c);
                }
            }
            ipc_rpmsg_send(&msg);
        }

        seq++;
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(REFLEX_TASK_PERIOD_MS));
    }
}

#endif /* GREENBOX_BUILD_TARGET_M7 */
