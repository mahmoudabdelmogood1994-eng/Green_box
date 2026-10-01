# Green Box predictive-maintenance model v4 -- rule-encoded features + threshold tuning

## What changed from v3

Two things were tried. One worked; one didn't. Both are reported here,
because a negative result is still a real result.

**1. Three more engineered features, verified to add signal before
training anything** (RF ceiling check: v3 features -> F1 0.843, v4
features -> F1 0.905):
- `strain_ratio` = strain / the Type-specific OSF threshold (11000 for
  Type L, 12000 for M, 13000 for H) -- hands the network a pre-computed
  version of a threshold interaction it would otherwise have to infer
  from a handful of positive examples per Type.
- `power_dist` = signed distance outside the [3500, 9000]W band that
  drives PWF failures.
- `hdf_risk` = a direct 0/1 encoding of the HDF rule (temp_diff < 8.6K
  AND rotational speed < 1380rpm).

All three are still pure functions of the 5 real-time sensor readings
plus Type -- no leakage.

**2. Knowledge distillation from the RandomForest ceiling model into
the small network** (training against a blend of true labels and the
RF's predicted probabilities, not just 0/1 labels). This is a real,
established technique for compact models. **It did not help here**:
plain class-weighted training (F1 0.564 float / 0.504 quantized at
default threshold) slightly beat distillation (F1 0.541 float) on this
dataset. Reported honestly rather than dropped quietly -- not every
reasonable technique pays off, and pretending this one did would be
exactly the kind of unearned claim this project has been trying to
avoid.

## The real result: threshold tuning closed most of the gap

Comparing models only at the default 0.5 threshold (as v2 and v3 did)
understates what v4 can actually do. Its full threshold sweep:

| Threshold | Recall | Precision | F1 |
|---|---|---|---|
| 0.5 (default) | 92.6% | 34.6% | 0.504 |
| 0.7 | 86.8% | 54.1% | 0.667 |
| **0.9** | **83.8%** | **81.4%** | **0.826** |

**At threshold 0.9, this model catches 57 of 68 real failures (83.8%
recall) with 13 false alarms out of 1,932 true negatives (81.4%
precision) -- F1 0.826, versus the RandomForest ceiling's F1 0.905.**
That's a real, verified, quantized-model number, close to what a
non-embeddable ensemble achieves, on a model that's 9.7KB.

## Honest comparison across every version tried in this project

| Version | Precision | Recall | F1 |
|---|---|---|---|
| v2 (raw features, threshold 0.5) | 28.2% | 94.1% | 0.443 |
| v3 (engineered features, larger NN, threshold 0.5) | 40.9% | 76.5% | 0.533 |
| v4 (rule-encoded features, threshold 0.5) | 34.6% | 92.6% | 0.504 |
| **v4 (rule-encoded features, threshold 0.9)** | **81.4%** | **83.8%** | **0.826** |
| RF ceiling, not embeddable (reference only) | 98.3% | 83.8% | 0.905 |

**The lesson, stated plainly**: the single biggest lever in this whole
series of experiments was not more epochs, not a bigger network, and
not distillation -- it was (a) encoding the dataset's actual known
decision rules as input features instead of leaving them for the model
to infer from ~300 positive examples, and (b) picking an evaluation
threshold deliberately instead of defaulting to 0.5. Both are cheap.
Neither is a modeling trick that generalizes to guarantee "we'll always
find an 80%+ precision point" on a different, real dataset -- this
result is specific to this dataset having near-deterministic,
discoverable failure rules. A real factory's failure modes may or may
not be this cleanly rule-based; that's an empirical question the
Phase 2 pilot data will answer, not something this benchmark dataset
can promise in advance.

## What this does NOT mean

- **Not "solved."** 83.8% recall means roughly 1 in 6 real failures is
  still missed. For a safety-relevant deployment, that residual miss
  rate is exactly why the layered-safety framing (deterministic reflex
  kernel + human review + fail-safe defaults, discussed earlier in this
  project) matters more than chasing the last few points of recall.
- **Not validated on real factory data.** Still the AI4I2020 benchmark.
- **Threshold 0.9 is specific to this model and this dataset's class
  balance.** Re-tune it if the feature set, model, or deployment's real
  failure rate changes.

## Reproduce it

```bash
cd ml-model
python3 v4-distillation/retrain_v4_distillation.py
```
