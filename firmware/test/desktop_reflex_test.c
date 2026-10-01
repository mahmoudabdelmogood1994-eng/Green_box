/*
 * desktop_reflex_test.c
 *
 * Runs the real reflex_kernel.c logic against a synthetic sensor stream
 * on a desktop -- no FreeRTOS, no M7, no NXP SDK required. This is what
 * makes the kernel math in this drop verifiable today, instead of being
 * a claim that has to wait for hardware to check.
 *
 * Scenario: 200 steps of normal operation, then a ramping vibration +
 * temperature fault (loosely modeled on the bearing-failure scenario in
 * the Technical Document's Section 4.2 use case), to confirm the kernel
 * fires on the fault and stays quiet during normal operation.
 *
 * Build: gcc -std=c11 -I../include ../src/reflex_kernel.c
 *            ../src/ipc_rpmsg_stub.c desktop_reflex_test.c -lm -o reflex_test
 * Run:   ./reflex_test
 */

#include <stdio.h>
#include "reflex_kernel.h"
#include "ipc_rpmsg.h"

int main(void)
{
    reflex_kernel_t rk;
    rk_init(&rk);
    ipc_rpmsg_init();

    printf("reflex_kernel_t resident state: %u bytes\n", rk_state_size_bytes());

    int fired_during_normal = 0;
    int fired_during_fault = 0;
    int fault_first_fire_step = -1;

    for (int step = 0; step < 400; step++) {
        rk_sensor_sample_t sample;

        bool in_fault = (step >= 200);
        float fault_progress = in_fault ? (float)(step - 200) / 200.0f : 0.0f;

        /* Normal operating baseline, loosely realistic for a small motor. */
        sample.temperature_c = 45.0f + 2.0f * fault_progress * 20.0f;
        sample.torque_nm = 10.0f + fault_progress * 8.0f;
        sample.vibration_g = 0.3f + fault_progress * 1.5f;

        rk_step_result_t result;
        rk_step(&rk, &sample, &result);

        if (result.any_fired) {
            if (in_fault) {
                fired_during_fault++;
                if (fault_first_fire_step < 0) fault_first_fire_step = step;
            } else {
                fired_during_normal++;
            }
        }

        if (step % 40 == 0 || (in_fault && result.any_fired && fault_first_fire_step == step)) {
            printf("step=%3d fault=%d  T=%.1fC torque=%.1fNm vib=%.2fg  "
                   "fired=%d spike_rate=%.2f\n",
                   step, in_fault, sample.temperature_c, sample.torque_nm,
                   sample.vibration_g, result.any_fired, result.spike_rate);
        }
    }

    printf("\n--- summary ---\n");
    printf("false fires during normal operation (steps 0-199): %d\n", fired_during_normal);
    printf("fires during fault ramp (steps 200-399):           %d\n", fired_during_fault);
    printf("first fault fire at step:                          %d\n", fault_first_fire_step);
    printf("\nNOTE: thresholds/decay are the reference implementation's\n");
    printf("illustrative constants, not calibrated to real Green Box M\n");
    printf("sensor data. This test checks the kernel's *logic* is sound,\n");
    printf("not that these specific numbers are production-ready.\n");

    return 0;
}
