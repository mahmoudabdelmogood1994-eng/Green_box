# Architecture Notes

## Why three tiers instead of one

A single "put a big AI model on every sensor" design is expensive to
deploy across a factory fleet and fragile on unreliable connectivity.
Green Box splits the problem by how urgently each piece of intelligence is
needed:

1. **Reflex tier (`firmware/`) — needed in microseconds, needed offline.**
   A tiny int8 leaky-integrate-and-fire (LIF) kernel runs on the
   Cortex-M7 real-time core next to the sensors. It doesn't try to name
   the fault — it just decides, cheaply and locally, "this pattern is
   abnormal enough to escalate." This is the only tier that must never
   depend on network or a heavier model being available.
2. **Cognition tier (`ml-model/`) — needed in seconds, needed on-device.**
   Once the reflex kernel escalates an event, the Edge Impulse-trained
   TFLite classifier (running on the Cortex-A53 + NPU side under Linux)
   does the heavier job of classifying *what kind* of failure this looks
   like, using the same chip.
3. **Platform tier (`platform/`) — needed in minutes, needed at fleet
   scale.** The dashboard aggregates classified events across every node,
   drives the AI-assisted diagnosis chat and supplier-recommendation
   flows, and turns "we think this bearing is failing" into a purchase
   order with a verified supplier.

This mirrors how the underlying hardware is organized: an NXP i.MX 8M
Plus-class SoC already ships a real-time M7 core alongside an
application-class A53 + NPU core on one chip, connected internally by
RPMsg — so tiers 1 and 2 map directly onto silicon that's already
available, rather than requiring extra hardware per node.

## Data flow

```
sensor ADC readings
   -> firmware/reflex_kernel.c (rk_step) [Cortex-M7]
   -> escalation over RPMsg (firmware/ipc_rpmsg.h) [SoC-internal IPC]
   -> ml-model TFLite inference (tflite_learn_825137_18) [Cortex-A53 + NPU]
   -> classified event pushed to platform/ (live-alerts, nodes) [cloud]
   -> AI flows (diagnose-problem, predictive-part-identification,
      recommend-efficient-supplier) [platform/src/ai/flows]
   -> marketplace purchase order [platform/src/app/marketplace]
```

## Honest status per tier

See each subfolder's own README for specifics:

- [`firmware/README.md`](../firmware/README.md) — has an explicit
  "what's real vs. stubbed" table. Read this before quoting a
  detection-latency number to investors; the M7-silicon benchmark hasn't
  been run yet.
- [`ml-model/README.txt`](../ml-model/README.txt) — Edge Impulse
  deployment instructions; note the `edge-impulse-sdk` folder is excluded
  to save space and needs to be pulled in separately per those
  instructions.
- `platform/` — the most complete tier; a working Next.js app, though it
  currently runs against Firebase-backed sample/mock data rather than
  live sensor feeds (that live-data wiring is the integration work in the
  roadmap).

## Data used for the current model

The current classifier was trained on the public **AI4I 2020 Predictive
Maintenance** dataset (`ml-model/input_data/ai4i2020.csv`), not on
Egyptian factory-floor data yet. Positioning this honestly to an
incubator — "trained on a public benchmark, roadmap includes retraining
on pilot data" — is more credible than implying it's already
field-calibrated.
