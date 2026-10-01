"""
retrain_no_leakage.py

Retrains the Green Box predictive-maintenance classifier using ONLY the
five features that are genuinely available in real time, before a
failure occurs: Air temperature, Process temperature, Rotational speed,
Torque, Tool wear.

TWF, HDF, PWF, OSF, RNF are intentionally EXCLUDED as inputs -- they are
failure-TYPE diagnostic flags only known after a failure has already
been identified (verified: Machine failure == OR(these 5 flags) for
99.73% of rows in the real dataset). Using them as inputs, as the
original shipped model did, is data leakage that produces a
perfect-looking but operationally useless classifier (0% recall on real
failures once the flags are unavailable, per the evaluation in this
project's history).

This script:
  1. Loads the real ai4i2020.csv dataset (same file as before).
  2. Splits it into a stratified 80/20 train/test set (test set is
     never touched during training or scaling fit).
  3. Trains a RandomForest as a quick, informative ceiling baseline.
  4. Trains a small dense Keras network sized for embedded deployment,
     with class weighting for the severe 3.4% positive-class imbalance.
  5. Converts the trained network to an int8 TFLite model.
  6. Re-evaluates the ACTUAL quantized int8 model on the held-out test
     set (not just the float32 Keras model) -- this is the same rigor
     applied to the original model's evaluation, and it's what actually
     ships to the Cortex-A53/NPU side.
  7. Reports honest precision/recall/F1/confusion-matrix/ROC-AUC. No
     number in the printed report is invented -- everything is computed
     from the held-out test set.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, confusion_matrix, roc_auc_score,
                              classification_report)
import tensorflow as tf

RANDOM_STATE = 42
FEATURE_COLS = ['Air temperature [K]', 'Process temperature [K]',
                 'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]']
LABEL_COL = 'Machine failure'


def load_data(csv_path):
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]
    X = df[FEATURE_COLS].to_numpy(dtype=np.float32)
    y = df[LABEL_COL].to_numpy(dtype=np.int32)
    return X, y


def report(name, y_true, y_pred, y_score=None):
    print(f"\n--- {name} ---")
    print(f"Accuracy:  {accuracy_score(y_true, y_pred):.4f}")
    print(f"Precision: {precision_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"Recall:    {recall_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"F1:        {f1_score(y_true, y_pred, zero_division=0):.4f}")
    if y_score is not None:
        print(f"ROC-AUC:   {roc_auc_score(y_true, y_score):.4f}")
    cm = confusion_matrix(y_true, y_pred)
    print(f"Confusion matrix [ [TN FP] [FN TP] ]:\n{cm}")
    return {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, zero_division=0),
        'recall': recall_score(y_true, y_pred, zero_division=0),
        'f1': f1_score(y_true, y_pred, zero_division=0),
        'confusion_matrix': cm.tolist(),
    }


def main():
    X, y = load_data('input_data/ ai4i2020.csv')
    print(f"Total rows: {len(X)}, failure rate: {y.mean():.4f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    print(f"Train: {len(X_train)} ({y_train.sum()} failures), "
          f"Test: {len(X_test)} ({y_test.sum()} failures)")

    scaler = StandardScaler().fit(X_train)  # fit ONLY on train, never on test
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    # --- Baseline: RandomForest, quick ceiling estimate ---------------
    rf = RandomForestClassifier(n_estimators=200, class_weight='balanced',
                                 random_state=RANDOM_STATE, max_depth=8)
    rf.fit(X_train_s, y_train)
    rf_pred = rf.predict(X_test_s)
    rf_score = rf.predict_proba(X_test_s)[:, 1]
    report("RandomForest baseline (not embedded, ceiling estimate)",
           y_test, rf_pred, rf_score)

    # --- Small dense network, sized for embedded deployment -----------
    tf.random.set_seed(RANDOM_STATE)
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(5,)),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(8, activation='relu'),
        tf.keras.layers.Dense(2, activation='softmax'),
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])

    # Class weighting for the ~3.4% positive rate -- without this the
    # network trivially collapses to "always predict no failure", same
    # failure mode as the leaky model showed once leakage was removed.
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    class_weight = {0: 1.0, 1: n_neg / n_pos}
    print(f"\nClass weights: {class_weight}")

    model.fit(X_train_s, y_train, epochs=60, batch_size=32, verbose=0,
              class_weight=class_weight, validation_split=0.15)

    nn_probs = model.predict(X_test_s, verbose=0)[:, 1]
    nn_pred = (nn_probs >= 0.5).astype(int)
    report("Dense NN, float32 (pre-quantization)", y_test, nn_pred, nn_probs)

    # --- Convert to int8 TFLite, exactly like the original deployment -
    def representative_dataset():
        for i in range(0, len(X_train_s), 1):
            yield [X_train_s[i:i+1].astype(np.float32)]
            if i > 300:
                break

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    tflite_model = converter.convert()

    tflite_path = '/home/claude/greenbox_ml_v2/greenbox_predictive_maintenance_v2.tflite'
    import os
    os.makedirs(os.path.dirname(tflite_path), exist_ok=True)
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"\nSaved quantized model: {tflite_path} ({len(tflite_model)} bytes)")

    # --- Evaluate the ACTUAL quantized int8 model, not just the float model
    interp = tf.lite.Interpreter(model_content=tflite_model)
    interp.allocate_tensors()
    in_d = interp.get_input_details()[0]
    out_d = interp.get_output_details()[0]
    in_scale, in_zero = in_d['quantization']
    out_scale, out_zero = out_d['quantization']

    quant_preds = []
    quant_scores = []
    for row in X_test_s:
        q = np.round(row / in_scale + in_zero).astype(np.int32)
        q = np.clip(q, -128, 127).astype(np.int8).reshape(1, 5)
        interp.set_tensor(in_d['index'], q)
        interp.invoke()
        out = interp.get_tensor(out_d['index'])[0].astype(np.float32)
        deq = (out - out_zero) * out_scale
        quant_preds.append(int(np.argmax(deq)))
        quant_scores.append(deq[1])
    quant_preds = np.array(quant_preds)
    quant_scores = np.array(quant_scores)

    result = report("Dense NN, INT8 quantized (the actual shipped model)",
                     y_test, quant_preds, quant_scores)

    print("\n=== THRESHOLD SWEEP (quantized model, tune to your tolerance) ===")
    print(f"{'threshold':>10} {'recall':>8} {'precision':>10} {'flags/day*':>11}")
    for thresh in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
        pred_t = (quant_scores >= thresh).astype(int)
        rec_t = recall_score(y_test, pred_t, zero_division=0)
        prec_t = precision_score(y_test, pred_t, zero_division=0)
        n_flags = int(pred_t.sum())
        print(f"{thresh:>10.1f} {rec_t:>8.3f} {prec_t:>10.3f} {n_flags:>11d}")
    print("*flags/day column is actually 'flags out of the 2000-row test set' -- "
          "rename once you know your real per-day sample rate.")

    print("\n=== SUMMARY (held-out test set, never seen during training) ===")
    print(f"Test set size: {len(y_test)}, real failures in test set: {int(y_test.sum())}")
    print(f"Quantized model catches {int(np.sum((quant_preds==1)&(y_test==1)))}"
          f" / {int(y_test.sum())} real failures "
          f"(recall={result['recall']:.4f}), "
          f"with {int(np.sum((quant_preds==1)&(y_test==0)))} false alarms "
          f"out of {int((y_test==0).sum())} true negatives "
          f"(precision={result['precision']:.4f}).")


if __name__ == '__main__':
    main()
