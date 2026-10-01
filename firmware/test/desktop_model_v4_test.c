/*
 * desktop_model_v4_test.c
 *
 * Runs the real, ported gbx_v4_predict() against real held-out test
 * rows, comparing its output to the REAL TFLite interpreter's output
 * for those exact same rows (captured in gbx_test_vectors.inc via
 * ml-model, not invented). This is the end-to-end check that the C
 * port -- feature engineering, standardization, quantization, and the
 * 4-layer forward pass all together -- reproduces the real model, not
 * just that the isolated math checked out in Python.
 *
 * Build: gcc -std=c11 -I../include ../src/greenbox_model_v4.c \
 *            desktop_model_v4_test.c -lm -o model_v4_test
 * Run:   ./model_v4_test
 */

#include <stdio.h>
#include <math.h>
#include "greenbox_model_v4.h"
#include "gbx_test_vectors.inc"

int main(void)
{
    int correct_class = 0;
    float max_prob_diff = 0.0f;

    for (int i = 0; i < NUM_TEST_CASES; i++) {
        const test_case_t *tc = &TEST_CASES[i];
        gbx_v4_raw_input_t input = {
            .air_temperature_k = tc->air,
            .process_temperature_k = tc->proc,
            .rotational_speed_rpm = tc->speed,
            .torque_nm = tc->torque,
            .tool_wear_min = tc->wear,
            .machine_type = (gbx_machine_type_t)tc->type,
        };

        gbx_v4_result_t result = gbx_v4_predict(&input);

        float diff = fabsf(result.failure_probability - tc->expected_prob);
        if (diff > max_prob_diff) max_prob_diff = diff;

        int predicted_class = result.failure_predicted ? 1 : 0;

        printf("case %2d: true_label=%d  C_prob=%.6f  real_prob=%.6f  diff=%.6f  "
               "C_decision(thr=0.9)=%d\n",
               i, tc->expected_class, result.failure_probability, tc->expected_prob,
               diff, predicted_class);

        if (diff < 0.0040f) correct_class++;
    }

    printf("\n=== SUMMARY ===\n");
    printf("Max probability difference vs real interpreter: %.6f\n", max_prob_diff);
    printf("Cases matching real interpreter within one int8 quantization\n");
    printf("step (1/256 = 0.0039, the theoretical floor for this format): %d / %d\n",
           correct_class, NUM_TEST_CASES);
    printf("(Note: this checks the C port matches the REAL trained model's\n");
    printf(" output -- it is not a measure of the model's real-world accuracy,\n");
    printf(" which is reported separately in ml-model/v4-distillation/README.md)\n");

    return (correct_class == NUM_TEST_CASES) ? 0 : 1;
}
