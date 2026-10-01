# Green Box predictive-maintenance model v2 -- leakage removed

## Why this exists

The original shipped model (`../tflite-model/tflite_learn_825137_18.tflite`)
used `TWF, HDF, PWF, OSF, RNF` as input features. Verified against the
real dataset: `Machine failure == OR(those 5 flags)` for 99.73% of rows
-- those flags are failure-TYPE diagnostics only known *after* a failure
is identified, not real-time sensor readings. Testing the original
model with those flags zeroed (the real deployment condition) gave
**0% recall on actual failures**. Full writeup of that test is in the
project history; the short version is the original model's near-perfect
reported accuracy was entirely an artifact of data leakage, not a
working predictive-maintenance classifier.

## What changed

`retrain_no_leakage.py` retrains from scratch using ONLY the 5 features
genuinely available in real time: Air temperature, Process temperature,
Rotational speed, Torque, Tool wear. It:
- Splits the real dataset 80/20, stratified, and never touches the test
  set during training or feature scaling.
- Trains a small dense network (5 -> 16 -> 8 -> 2) sized for embedded
  deployment, using class weighting for the ~3.4% positive rate (without
  this, the network collapses to always predicting "no failure" -- the
  same failure mode the leaky model showed once its leakage was removed).
- Converts to INT8 TFLite and **re-evaluates the actual quantized model**
  on the held-out test set, not just the float32 Keras model.
- Prints a threshold sweep so the recall/precision tradeoff can be tuned
  to your actual false-alarm tolerance rather than defaulting to 0.5.

## Results (held-out test set, 2000 rows never seen in training, run yourself to reproduce)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| RandomForest baseline (not embeddable, ceiling estimate) | 0.966 | 0.500 | 0.750 | 0.600 | 0.974 |
| Dense NN, float32 | 0.919 | 0.287 | 0.941 | 0.440 | 0.978 |
| **Dense NN, INT8 quantized (the actual shipped artifact)** | **0.920** | **0.290** | **0.941** | **0.443** | **0.977** |

At the default 0.5 threshold, the quantized model **catches 64 of 68
real failures in the test set (94% recall)**, at a cost of **157 false
alarms out of 1932 true negatives (29% precision)** -- roughly 1 real
failure for every ~3.5 alerts raised.

**This is an honest number, not a good-looking one, and that's the
point.** 94% recall on a genuine early-warning task is a legitimate,
useful result -- missing a failure is expensive, so trading some false
alarms for high recall is often the right call for predictive
maintenance. But go into a technical review knowing the real number is
94%/29%, not the original (fake) 100%/100%.

## Tuning the tradeoff

The threshold sweep printed by the script shows the real recall/precision
tradeoff:

| Threshold | Recall | Precision |
|---|---|---|
| 0.2 | 0.985 | 0.171 |
| 0.5 (default) | 0.941 | 0.282 |
| 0.7 | 0.853 | 0.403 |
| 0.8 | 0.809 | 0.514 |

If false alarms are costly to act on (a technician has to physically
inspect each one), move the threshold up. If missing a failure is far
more costly than a false alarm (safety-critical equipment), keep it low
or lower still. This is a business decision, not a modeling one -- make
it deliberately rather than defaulting to 0.5.

## What this is NOT yet

- **Not trained on real Egyptian factory data.** This is still the
  AI4I2020 public benchmark dataset, now used honestly (no leakage)
  rather than dishonestly (with leakage). The dataset's underlying
  process (a generic milling/machining process) still doesn't match
  Egypt's dominant sectors (cement, textiles, food processing) -- that
  gap, flagged earlier in this project, is unchanged by fixing the
  leakage bug.
- **Not integrated into the platform or firmware tiers.** This file
  exists as a corrected artifact and a reproducible training script.
  Wiring it into the actual inference pipeline (replacing
  `tflite_learn_825137_18.tflite`) is a separate, deliberate step --
  do that only after deciding on a threshold and confirming the model
  card here still describes what's actually deployed.
- **Not hyperparameter-tuned.** Network size, class-weight ratio, and
  epoch count are reasonable defaults, not the result of a tuning sweep.
  There's likely real headroom to improve on these numbers with the
  same (leakage-free) data before ever touching a real factory line.

## Reproduce it yourself

```bash
cd ml-model
python3 v2-no-leakage/retrain_no_leakage.py
```
