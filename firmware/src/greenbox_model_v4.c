/*
 * greenbox_model_v4.c
 *
 * See greenbox_model_v4.h for scope, verification status, and why this
 * is hand-written C instead of the TFLite runtime.
 *
 * The forward-pass algorithm implemented here (per-channel INT8
 * quantization, ReLU-as-clamp-to-zero-point, dequantize + softmax on
 * the final layer) was worked out and checked against the real TFLite
 * interpreter in Python BEFORE being transcribed here (0 mismatches
 * across all 2000 held-out test rows, bit-exact on the int8 output).
 * This file is a direct transcription of that verified algorithm, not
 * a fresh re-derivation.
 */

#include "greenbox_model_v4.h"
#include <math.h>
#include <stddef.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#include "greenbox_model_v4_weights.inc"

#define GBX_NUM_FEATURES 14
#define GBX_L0_IN 14
#define GBX_L0_OUT 64
#define GBX_L1_OUT 32
#define GBX_L2_OUT 16
#define GBX_L3_OUT 2

/* Type-specific overstrain-failure threshold, verified against the real
 * dataset: OSF fires above ~11000 for Type L, ~12000 for M, ~13000 for
 * H. Used only to compute strain_ratio -- a real-time-available derived
 * feature, not a leakage flag. */
static double gbx_strain_threshold(gbx_machine_type_t type)
{
    switch (type) {
        case GBX_TYPE_L: return 11000.0;
        case GBX_TYPE_M: return 12000.0;
        case GBX_TYPE_H: return 13000.0;
        default:         return 12000.0; /* shouldn't happen; fail toward the middle threshold */
    }
}

/* Feature order MUST match training exactly:
 *   [air_temp, process_temp, rot_speed, torque, tool_wear,
 *    power_w, temp_diff, strain, strain_ratio, power_dist, hdf_risk,
 *    type_H, type_L, type_M]
 * (Type one-hot order is alphabetical -- H, L, M -- because that's the
 * order pandas.get_dummies produced during training.)
 *
 * DOUBLE PRECISION HERE IS NOT INCIDENTAL. An earlier version of this
 * function used `float` throughout and was found, via the end-to-end
 * test in test/desktop_model_v4_test.c, to disagree with the real
 * model on a real held-out row -- not by quantization noise, but by a
 * 0.8 swing in probability. Root cause: `hdf_risk` is a hard threshold
 * (temp_diff < 8.6). For a row sitting almost exactly on that boundary
 * (310.9 - 302.3), float32 arithmetic rounds to 8.600006 (>= 8.6,
 * hdf_risk=0) while the float64 arithmetic used during training rounds
 * to 8.599999999999966 (< 8.6, hdf_risk=1) -- opposite classifications
 * of a high-importance feature, from the same two decimal inputs.
 * Using `double` here matches training precision and fixes this
 * specific case, verified below. It does NOT eliminate the underlying
 * fragility: hdf_risk is a hard 0/1 rule on a continuous signal, so ANY
 * row close enough to the real 8.6K boundary is inherently sensitive to
 * precision -- and real sensor noise will cause the same kind of flip
 * in the field, not just floating-point rounding. That's a property of
 * this feature's design (a hard threshold, not a soft margin like
 * power_dist), not something a precision fix can fully close. Softening
 * hdf_risk to a continuous distance-from-threshold value, the same way
 * power_dist already is, would need a retrain -- noted as a follow-up,
 * not done here since the currently deployed model was trained with
 * the binary version specifically.
 */
static void gbx_compute_features(const gbx_v4_raw_input_t *in, double feat[GBX_NUM_FEATURES])
{
    const double power_w = (double)in->torque_nm * (double)in->rotational_speed_rpm * 2.0 * M_PI / 60.0;
    const double temp_diff = (double)in->process_temperature_k - (double)in->air_temperature_k;
    const double strain = (double)in->tool_wear_min * (double)in->torque_nm;
    const double strain_thresh = gbx_strain_threshold(in->machine_type);
    const double strain_ratio = strain / strain_thresh;
    double power_dist;
    if (power_w < 3500.0) {
        power_dist = 3500.0 - power_w;
    } else if (power_w > 9000.0) {
        power_dist = power_w - 9000.0;
    } else {
        power_dist = 0.0;
    }
    const double hdf_risk = (temp_diff < 8.6 && (double)in->rotational_speed_rpm < 1380.0) ? 1.0 : 0.0;

    feat[0] = in->air_temperature_k;
    feat[1] = in->process_temperature_k;
    feat[2] = in->rotational_speed_rpm;
    feat[3] = in->torque_nm;
    feat[4] = in->tool_wear_min;
    feat[5] = power_w;
    feat[6] = temp_diff;
    feat[7] = strain;
    feat[8] = strain_ratio;
    feat[9] = power_dist;
    feat[10] = hdf_risk;
    feat[11] = (in->machine_type == GBX_TYPE_H) ? 1.0 : 0.0;
    feat[12] = (in->machine_type == GBX_TYPE_L) ? 1.0 : 0.0;
    feat[13] = (in->machine_type == GBX_TYPE_M) ? 1.0 : 0.0;
}

static int8_t gbx_clip_i8(float v)
{
    if (v > 127.0f) return 127;
    if (v < -128.0f) return -128;
    return (int8_t)v;
}

/* One dense layer: acc[out] = bias[out] + sum_in( a[in] * W[out,in] ),
 * then (for hidden layers) requantize to the next layer's int8 domain
 * with ReLU implemented as "clamp to the value representing 0.0" --
 * which is exactly zero_point for these post-ReLU tensors (all -128
 * here, i.e. these are effectively uint8-style ranges stored in int8).
 * `apply_relu = false` for the final layer, which instead just produces
 * pre-softmax logits.
 */
static void gbx_dense_layer(const int32_t *a_zero_centered, int32_t n_in,
                             const int8_t *W, const int32_t *B, const float *Wscale,
                             int32_t n_out, float in_scale,
                             float out_scale, int32_t out_zp, bool apply_relu,
                             int32_t *out_zero_centered /* len n_out, or NULL if final */,
                             int8_t *out_q /* len n_out, always written */)
{
    for (int32_t j = 0; j < n_out; j++) {
        int32_t acc = B[j];
        const int8_t *row = &W[(size_t)j * (size_t)n_in];
        for (int32_t k = 0; k < n_in; k++) {
            acc += (int32_t)row[k] * a_zero_centered[k];
        }
        float float_val = (float)acc * (in_scale * Wscale[j]);
        float q = roundf(float_val / out_scale) + (float)out_zp;
        int8_t q8 = gbx_clip_i8(q);
        if (apply_relu && q8 < out_zp) {
            q8 = (int8_t)out_zp;
        }
        out_q[j] = q8;
        if (out_zero_centered) {
            out_zero_centered[j] = (int32_t)q8 - out_zp;
        }
    }
}

gbx_v4_result_t gbx_v4_predict(const gbx_v4_raw_input_t *input)
{
    double feat[GBX_NUM_FEATURES];
    gbx_compute_features(input, feat);

    /* Standardize (sklearn StandardScaler convention: (x-mean)/scale),
     * then quantize to the model's real input scale/zero-point. Done in
     * double to match the precision feature engineering was verified
     * against; SCALER_MEAN/SCALE and IN_SCALE are stored as float since
     * they don't sit on hard comparison boundaries the way temp_diff
     * does, so float precision there does not reintroduce the bug above. */
    int8_t xq[GBX_L0_IN];
    for (int i = 0; i < GBX_L0_IN; i++) {
        double standardized = (feat[i] - (double)SCALER_MEAN[i]) / (double)SCALER_SCALE[i];
        double q = round(standardized / (double)IN_SCALE) + (double)IN_ZP;
        xq[i] = gbx_clip_i8((float)q);
    }

    int32_t a0[GBX_L0_IN];
    for (int i = 0; i < GBX_L0_IN; i++) {
        a0[i] = (int32_t)xq[i] - IN_ZP;
    }

    /* Layer 0: 14 -> 64, ReLU */
    int8_t q1[GBX_L0_OUT]; int32_t a1[GBX_L0_OUT];
    gbx_dense_layer(a0, GBX_L0_IN, W0, B0, WSCALE0, GBX_L0_OUT,
                     IN_SCALE, ACT_SCALE[0], ACT_ZP[0], true, a1, q1);

    /* Layer 1: 64 -> 32, ReLU */
    int8_t q2[GBX_L1_OUT]; int32_t a2[GBX_L1_OUT];
    gbx_dense_layer(a1, GBX_L0_OUT, W1, B1, WSCALE1, GBX_L1_OUT,
                     ACT_SCALE[0], ACT_SCALE[1], ACT_ZP[1], true, a2, q2);

    /* Layer 2: 32 -> 16, ReLU */
    int8_t q3[GBX_L2_OUT]; int32_t a3[GBX_L2_OUT];
    gbx_dense_layer(a2, GBX_L1_OUT, W2, B2, WSCALE2, GBX_L2_OUT,
                     ACT_SCALE[1], ACT_SCALE[2], ACT_ZP[2], true, a3, q3);

    /* Layer 3: 16 -> 2, no ReLU (raw logits) */
    int8_t logits_q[GBX_L3_OUT];
    gbx_dense_layer(a3, GBX_L2_OUT, W3, B3, WSCALE3, GBX_L3_OUT,
                     ACT_SCALE[2], LOGIT_SCALE, LOGIT_ZP, false, NULL, logits_q);

    /* Dequantize logits, softmax (float32 -- 2 elements, negligible cost) */
    float logit0 = ((float)logits_q[0] - (float)LOGIT_ZP) * LOGIT_SCALE;
    float logit1 = ((float)logits_q[1] - (float)LOGIT_ZP) * LOGIT_SCALE;
    float m = (logit0 > logit1) ? logit0 : logit1;
    float e0 = expf(logit0 - m);
    float e1 = expf(logit1 - m);
    float prob_failure = e1 / (e0 + e1);

    gbx_v4_result_t result;
    result.failure_probability = prob_failure;
    result.failure_predicted = (prob_failure >= GBX_V4_THRESHOLD);
    return result;
}
