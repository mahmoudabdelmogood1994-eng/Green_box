# Green Box predictive-maintenance model v3 -- feature engineering

## What changed from v2

v2 fixed the data-leakage bug but used only the 5 raw sensor readings.
This version adds three **physics-informed engineered features**, derived
only from those same legitimate real-time readings plus the machine's
Type (a static attribute, always known -- not a leakage flag):

- `power_w = Torque * Rotational speed (rad/s)`
- `temp_diff = Process temperature - Air temperature`
- `strain = Tool wear * Torque`

These were not guessed -- before adding them, I checked the real dataset
and confirmed the actual failure mechanisms are near-deterministic
functions of exactly these quantities (e.g., every OSF failure for a
Type-L machine happens at `strain` above ~11,000, matching Type-M at
~12,000 and Type-H at ~13,000; every HDF failure happens at
`temp_diff` between ~7.6-8.6K combined with rotational speed
1212-1379rpm). Full verification commands are in the project history.

## An important finding along the way: there's real headroom left

A RandomForest trained on these engineered features hit **96% precision,
75% recall (F1 0.84)** as a ceiling estimate -- a large jump from the
raw-feature ceiling (F1 0.60 in v2). That confirms the engineered
features carry substantial real signal. But the small, embeddable dense
network does **not** reach that ceiling yet:

| Model | Precision | Recall | F1 |
|---|---|---|---|
| RandomForest ceiling (not embeddable) | **0.962** | 0.750 | **0.843** |
| v2: raw features, small NN (INT8) | 0.282 | **0.941** | 0.443 |
| v3: engineered features, small NN (5→24→12→2, INT8) | 0.365 | 0.838 | 0.509 |
| v3: engineered features, larger NN (11→64→32→16→2, SMOTE, INT8) | **0.409** | 0.765 | **0.533** |

**Read this honestly, not optimistically**: feature engineering helped
(F1 improved from 0.44 to 0.53), but there's a real, measured gap
between what a bigger, non-embedded model can extract from these
features (F1 0.84) and what the current small network achieves (F1
0.53). That gap is a legitimate target for further work -- likely a
larger network than what's shipped here, better hyperparameter search,
or an architecture change -- not something this pass closed.

## There is no single "best" model here -- it's a real tradeoff

The three candidates above sit at different points on the
precision/recall curve. None is simply better than the others:

- **v2 (raw features)**: highest recall (94%) -- catches almost every
  real failure, but 3.5 false alarms for every real one.
- **v3 large (engineered + SMOTE)**: better precision (41%) -- fewer
  false alarms, but misses more real failures (23.5% missed vs 5.9%
  for v2).

Given the safety context this project has discussed (deployments where
missing a failure is costly), **higher recall is usually the safer
default** even at a real cost in false alarms -- but that's a judgment
call about your specific deployment's cost of a false alarm vs. a missed
failure, not something a model can decide for you. The threshold sweep
in each script lets you move along this curve deliberately.

## What would likely close the remaining gap (not done in this pass)

- A proper hyperparameter search (layer sizes, learning rate, dropout)
  rather than the two hand-picked architectures tried here.
- Trying a gradient-boosted-tree representation and only falling back to
  a neural net if TFLite export of trees proves impractical for the
  target hardware.
- More training data -- still fundamentally limited by the ~339 real
  failures in this benchmark dataset; a real field pilot's data would
  likely help more than further tuning on this fixed dataset ever will.

## Reproduce it

```bash
cd ml-model
python3 v3-feature-engineering/retrain_v3_feature_engineering.py
```
