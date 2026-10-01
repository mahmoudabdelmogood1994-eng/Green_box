# Green-Box-Model

Developer Note: The edge-impulse-sdk folder has been excluded from the repository to save space. To obtain the full source code, please follow the instructions provided in the original README.txt file downloaded from Edge Impulse.

## Read this before using `tflite-model/tflite_learn_825137_18.tflite`

That model was found to have a real data-leakage problem: it uses
`TWF/HDF/PWF/OSF/RNF` (failure-type flags only known after a failure is
already identified) as input features, which makes its near-perfect
reported accuracy meaningless for real deployment -- verified by testing
it with those flags held at their real-time value (zero): **0% recall
on actual failures**.

**Use `v4-distillation/` for the current best result** -- 83.8% recall /
81.4% precision (F1 0.826) on a held-out test set, from the same
real-time-available sensor data, at a deliberately tuned decision
threshold (0.9, not the default 0.5). See its README for the full
methodology, including a technique that was tried and did NOT help
(distillation), reported honestly rather than omitted.
`v2-no-leakage/` and `v3-feature-engineering/` are kept for the
step-by-step history of how that result was reached. `tflite-model/`
(the original) is kept only for before/after comparison -- not as a
recommended artifact.

