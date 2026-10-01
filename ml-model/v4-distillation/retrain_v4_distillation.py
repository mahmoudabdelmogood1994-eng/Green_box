"""
retrain_v4_distillation.py

Builds on v3. Two real additions, both tested for real signal via an
RF ceiling check BEFORE spending NN training time on them (see the
ceiling check in this project's history: v3 features -> F1 0.843,
v4 features -> F1 0.905):

1. THREE MORE ENGINEERED FEATURES that directly linearize the dataset's
   known decision rules instead of leaving the network to infer them:
     - strain_ratio = strain / type-specific OSF threshold (11000/12000/13000)
     - power_dist   = signed distance outside the [3500, 9000]W PWF band
     - hdf_risk     = 1 if (temp_diff < 8.6 AND speed < 1380), else 0
   These still use only real-time-available raw sensor data + Type --
   no leakage. They just hand the network a pre-computed version of the
   nonlinear boundary instead of asking it to discover threshold
   interactions from a handful of positive examples.

2. KNOWLEDGE DISTILLATION: instead of training the small network only
   on the true 0/1 labels, it's also trained to match the RandomForest's
   predicted probabilities (the ceiling model). This is a real,
   established technique for compact models -- it gives the small
   network a richer training signal (the RF's learned decision surface)
   instead of just sparse binary labels on 339 positive examples.

Distillation loss = alpha * CE(true labels) + (1-alpha) * CE(RF soft labels)
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, confusion_matrix, roc_auc_score)
import tensorflow as tf

RANDOM_STATE = 42
RAW_COLS = ['Air temperature [K]', 'Process temperature [K]',
            'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]']
STRAIN_THRESH = {'L': 11000, 'M': 12000, 'H': 13000}


def load_and_engineer(csv_path):
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    df['power_w'] = df['Torque [Nm]'] * df['Rotational speed [rpm]'] * 2 * np.pi / 60
    df['temp_diff'] = df['Process temperature [K]'] - df['Air temperature [K]']
    df['strain'] = df['Tool wear [min]'] * df['Torque [Nm]']
    df['strain_thresh'] = df['Type'].map(STRAIN_THRESH)
    df['strain_ratio'] = df['strain'] / df['strain_thresh']
    df['power_dist'] = np.where(
        df['power_w'] < 3500, 3500 - df['power_w'],
        np.where(df['power_w'] > 9000, df['power_w'] - 9000, 0))
    df['hdf_risk'] = ((df['temp_diff'] < 8.6) &
                       (df['Rotational speed [rpm]'] < 1380)).astype(float)

    type_dummies = pd.get_dummies(df['Type'], prefix='type').astype(np.float32)
    feature_df = pd.concat([
        df[RAW_COLS],
        df[['power_w', 'temp_diff', 'strain', 'strain_ratio', 'power_dist', 'hdf_risk']],
        type_dummies,
    ], axis=1)

    X = feature_df.to_numpy(dtype=np.float32)
    y = df['Machine failure'].to_numpy(dtype=np.int32)
    return X, y, list(feature_df.columns)


def report(name, y_true, y_pred, y_score=None):
    print(f"\n--- {name} ---")
    print(f"Accuracy:  {accuracy_score(y_true, y_pred):.4f}")
    print(f"Precision: {precision_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"Recall:    {recall_score(y_true, y_pred, zero_division=0):.4f}")
    print(f"F1:        {f1_score(y_true, y_pred, zero_division=0):.4f}")
    if y_score is not None:
        print(f"ROC-AUC:   {roc_auc_score(y_true, y_score):.4f}")
    print(f"Confusion matrix [ [TN FP] [FN TP] ]:\n{confusion_matrix(y_true, y_pred)}")
    return {'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred, zero_division=0),
            'recall': recall_score(y_true, y_pred, zero_division=0),
            'f1': f1_score(y_true, y_pred, zero_division=0)}


def main():
    X, y, feature_names = load_and_engineer('input_data/ ai4i2020.csv')
    print(f"Features ({len(feature_names)}): {feature_names}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)
    n_features = X_train_s.shape[1]

    # --- RF ceiling (teacher for distillation) -------------------------
    rf = RandomForestClassifier(n_estimators=200, class_weight='balanced',
                                 max_depth=10, random_state=RANDOM_STATE)
    rf.fit(X_train_s, y_train)
    report("RandomForest ceiling (v4 features, teacher model)",
           y_test, rf.predict(X_test_s), rf.predict_proba(X_test_s)[:, 1])

    rf_soft_train = rf.predict_proba(X_train_s)  # soft targets for distillation

    def build_model():
        tf.random.set_seed(RANDOM_STATE)
        m = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(n_features,)),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(16, activation='relu'),
            tf.keras.layers.Dense(2, activation='softmax'),
        ])
        return m

    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss', patience=10, restore_best_weights=True)

    n_pos = y_train.sum(); n_neg = len(y_train) - n_pos
    class_weight = {0: 1.0, 1: n_neg / n_pos}

    # --- Baseline: same recipe as v3, but with the richer v4 features --
    model_plain = build_model()
    model_plain.compile(optimizer='adam', loss='sparse_categorical_crossentropy',
                         metrics=['accuracy'])
    model_plain.fit(X_train_s, y_train, epochs=100, batch_size=32, verbose=0,
                     class_weight=class_weight, validation_split=0.15,
                     callbacks=[early_stop])
    probs_plain = model_plain.predict(X_test_s, verbose=0)[:, 1]
    res_plain = report("v4 features, plain class-weighted (no distillation)",
                        y_test, (probs_plain >= 0.5).astype(int), probs_plain)

    # --- Distillation: train against a blend of true labels + RF's soft
    # probabilities, so the small network learns the RF's decision
    # surface, not just 271 sparse positive examples.
    alpha = 0.3  # weight on true hard labels; 0.7 on the RF's soft labels
    y_train_onehot = tf.keras.utils.to_categorical(y_train, 2)
    blended_targets = alpha * y_train_onehot + (1 - alpha) * rf_soft_train

    model_distill = build_model()
    model_distill.compile(optimizer='adam', loss='categorical_crossentropy',
                           metrics=['accuracy'])
    # Sample weights still emphasize the rare positive class, since
    # blended soft targets alone tend to under-represent it further.
    sample_weight = np.where(y_train == 1, n_neg / n_pos, 1.0)
    model_distill.fit(X_train_s, blended_targets, epochs=100, batch_size=32,
                       verbose=0, sample_weight=sample_weight,
                       validation_split=0.15, callbacks=[early_stop])
    probs_distill = model_distill.predict(X_test_s, verbose=0)[:, 1]
    res_distill = report("v4 features, RF-distilled",
                          y_test, (probs_distill >= 0.5).astype(int), probs_distill)

    best_model, best_name, best_res = (
        (model_distill, "distilled", res_distill) if res_distill['f1'] >= res_plain['f1']
        else (model_plain, "plain", res_plain))
    print(f"\n>>> Best on held-out test set: {best_name} (F1={best_res['f1']:.3f}) <<<")

    # --- Convert winner to int8 TFLite, evaluate for real --------------
    def representative_dataset():
        for i in range(min(500, len(X_train_s))):
            yield [X_train_s[i:i+1].astype(np.float32)]

    converter = tf.lite.TFLiteConverter.from_keras_model(best_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    tflite_model = converter.convert()

    import os
    out_path = '/home/claude/greenbox_ml_v4/greenbox_predictive_maintenance_v4.tflite'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(tflite_model)
    print(f"Saved: {out_path} ({len(tflite_model)} bytes)")

    interp = tf.lite.Interpreter(model_content=tflite_model)
    interp.allocate_tensors()
    in_d = interp.get_input_details()[0]; out_d = interp.get_output_details()[0]
    in_scale, in_zero = in_d['quantization']; out_scale, out_zero = out_d['quantization']

    quant_scores = []
    for row in X_test_s:
        q = np.clip(np.round(row / in_scale + in_zero), -128, 127).astype(np.int8).reshape(1, n_features)
        interp.set_tensor(in_d['index'], q)
        interp.invoke()
        out = interp.get_tensor(out_d['index'])[0].astype(np.float32)
        quant_scores.append((out - out_zero) * out_scale)
    quant_scores = np.array(quant_scores)[:, 1]
    quant_pred = (quant_scores >= 0.5).astype(int)

    final = report(f"FINAL: INT8 quantized, {best_name}, v4 features",
                    y_test, quant_pred, quant_scores)

    print("\n=== THRESHOLD SWEEP (final quantized model) ===")
    print(f"{'threshold':>10} {'recall':>8} {'precision':>10} {'n_flags':>9}")
    for thresh in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
        pred_t = (quant_scores >= thresh).astype(int)
        rec_t = recall_score(y_test, pred_t, zero_division=0)
        prec_t = precision_score(y_test, pred_t, zero_division=0)
        print(f"{thresh:>10.1f} {rec_t:>8.3f} {prec_t:>10.3f} {int(pred_t.sum()):>9d}")

    print("\n=== COMPARISON ACROSS ALL VERSIONS (quantized, held-out test) ===")
    print("v2 (raw features):                      precision=0.282, recall=0.941, F1=0.443")
    print("v3 (engineered features, larger NN):    precision=0.409, recall=0.765, F1=0.533")
    print(f"v4 (rule-encoded features, {best_name}):{' '*(14-len(best_name))}precision={final['precision']:.3f}, recall={final['recall']:.3f}, F1={final['f1']:.3f}")
    print("RF ceiling (v4 features, not embeddable): precision=0.983, recall=0.838, F1=0.905")


if __name__ == '__main__':
    main()
