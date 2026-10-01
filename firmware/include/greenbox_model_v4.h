/*
 * greenbox_model_v4.h
 *
 * Quantized (INT8) predictive-maintenance classifier, ported from
 * ml-model/v4-distillation/greenbox_predictive_maintenance_v4.tflite.
 *
 * WHAT THIS FILE IS: a from-scratch C re-implementation of that exact
 * trained model's forward pass -- same weights, same biases, same
 * per-channel quantization scales, extracted directly from the .tflite
 * flatbuffer. It was verified to produce BIT-IDENTICAL int8 output to
 * the real TFLite interpreter on all 2000 held-out test rows before
 * this file was written -- this is not a re-derivation that "should"
 * match, it's one that was checked to match, row by row.
 *
 * WHY IT EXISTS AS HAND-WRITTEN C INSTEAD OF THE TFLITE RUNTIME: the
 * TFLite interpreter allocates its tensor arena and manages graph
 * execution dynamically, which is a reasonable design for the Linux/A53
 * side but not appropriate to link directly into an RTOS control loop.
 * This file has no interpreter, no graph, and no allocation of any
 * kind -- every buffer is a fixed-size stack array, sized at compile
 * time. It's also considerably smaller than the .tflite file since
 * there's no flatbuffer schema/interpreter overhead, just the raw
 * parameters and a ~60-line forward pass.
 *
 * WHAT THIS FILE DOES NOT CHANGE: it is a faithful port of an existing
 * model's math, not a new or improved model. Its accuracy (83.8% recall
 * / 81.4% precision at threshold 0.9, on the AI4I2020 benchmark
 * dataset) is exactly what was measured in Python -- porting language
 * does not change what the model does or doesn't know.
 */

#ifndef GREENBOX_MODEL_V4_H
#define GREENBOX_MODEL_V4_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Decision threshold. Chosen deliberately (not the naive 0.5 default)
 * based on the held-out threshold sweep in
 * ml-model/v4-distillation/README.md -- 0.9 is the operating point
 * that achieves 83.8% recall / 81.4% precision on that test set.
 * Re-validate this constant if the model, features, or deployment's
 * real failure rate changes -- it is specific to this exact model. */
#define GBX_V4_THRESHOLD 0.9f

/* Machine "Type" quality variant, from the AI4I2020 dataset convention.
 * This is a static, always-known attribute of the machine (not a
 * leakage flag) -- set once per asset, not read from a live sensor. */
typedef enum {
    GBX_TYPE_L = 0,
    GBX_TYPE_M = 1,
    GBX_TYPE_H = 2,
} gbx_machine_type_t;

/* Raw, real-time-available sensor readings. Deliberately does NOT
 * include TWF/HDF/PWF/OSF/RNF -- those are failure-TYPE diagnostic
 * flags only known after a failure is already identified, and using
 * them as inputs was the data-leakage bug found and removed earlier in
 * this project (see ml-model/README.md).
 *
 * Fields are `double`, not `float`. This is deliberate: gbx_v4_predict
 * verifiably disagreed with the real trained model on a real test row
 * when using float32 throughout, because one engineered feature
 * (hdf_risk) is a hard threshold and that row sat almost exactly on the
 * boundary -- float32 vs float64 rounding of the same two decimal
 * inputs landed on opposite sides of it. See greenbox_model_v4.c for
 * the full story. If your sensor driver only produces float32 ADC
 * readings, that's fine -- promote to double when filling this struct,
 * it's the internal computation precision that mattered here, not
 * where the raw reading originally came from. */
typedef struct {
    double air_temperature_k;
    double process_temperature_k;
    double rotational_speed_rpm;
    double torque_nm;
    double tool_wear_min;
    gbx_machine_type_t machine_type;
} gbx_v4_raw_input_t;

/* Result of a prediction: both the raw probability (for logging/
 * telemetry) and the already-thresholded boolean decision, so callers
 * don't each re-implement the threshold comparison differently. */
typedef struct {
    float failure_probability;   /* dequantized P(failure), 0.0-1.0 */
    bool  failure_predicted;     /* failure_probability >= GBX_V4_THRESHOLD */
} gbx_v4_result_t;

/* Runs the full pipeline: feature engineering (power_w, temp_diff,
 * strain, strain_ratio, power_dist, hdf_risk, Type one-hot) ->
 * standardization -> INT8 quantization -> 4-layer forward pass ->
 * softmax -> threshold check. No allocation, no global mutable state,
 * safe to call from an RTOS task or interrupt context (it's a pure
 * function of its input, aside from the static const weight tables).
 */
gbx_v4_result_t gbx_v4_predict(const gbx_v4_raw_input_t *input);

#ifdef __cplusplus
}
#endif

#endif /* GREENBOX_MODEL_V4_H */
