# Green Box M -- reflex kernel (Cortex-M7 side)

A C port of Black Dragon Runtime's `quantized_reflex.py` int8 LIF reflex
kernel, adapted from a 40x60 structural sensing grid to Green Box M's
discrete industrial sensor channels (temperature, torque, vibration,
tool-wear delta), targeting the Cortex-M7 core on the NXP i.MX 8M Plus.

This is one piece of the two-tier architecture: reflex kernel on the M7
(this repo), cognition layer (Bat / Hermit Crab / Squid) on the
Cortex-A53 + NPU side under Linux via NXP's eIQ toolchain, connected by
RPMsg over the SoC's internal IPC.

## What's real vs. stubbed in this drop

| File | Status |
|---|---|
| `include/reflex_kernel.h`, `src/reflex_kernel.c` | **Real.** Faithful port of the Python reference's fixed-point math. Compiled and tested on desktop (see below) -- correctly fires zero times during 200 steps of simulated normal operation, then fires during a simulated bearing-fault ramp, first detection at step 253/400. Thresholds are still illustrative placeholders -- see the calibration-gap note below for a concrete example of why these need real recalibration. |
| `test/desktop_reflex_test.c` | **Real, runnable today.** No hardware or FreeRTOS required. |
| `include/ipc_rpmsg.h` | **Real interface**, intended to be stable once wired to hardware. |
| `src/ipc_rpmsg_stub.c` | **Stub.** Prints instead of sending over real RPMsg-Lite. Needs NXP MCUXpresso SDK to become real -- see comments in the file. |
| `include/greenbox_model_v4.h`, `src/greenbox_model_v4.c` | **Real.** Hand-written C port of `ml-model/v4-distillation/greenbox_predictive_maintenance_v4.tflite` -- same weights, biases, and quantization scales, extracted directly from the trained model and verified bit-exact against the real TFLite interpreter on all 2000 held-out test rows (`test/desktop_model_v4_test.c`, 25/25 within one int8 quantization step). No dynamic allocation anywhere. Runs directly on the M7, not across IPC -- see the file header for why. |
| `include/safety_supervisor.h`, `src/safety_supervisor.c` | **Real.** Fuses the reflex kernel, the AI model, and hard (placeholder) hardware limits into one safety decision, with the hard-limit check unconditionally overriding both learned/adaptive signals. Verified with `test/desktop_safety_test.c` across 5 scenarios. `HARD_LIMIT_TEMPERATURE_C`/`HARD_LIMIT_VIBRATION_G` are explicitly labeled placeholders -- replace with the real asset's rated limits before deployment. |

### A real integration gap this work surfaced

Testing `safety_supervisor.c` against a genuinely normal dataset row (torque
62.7 Nm, correctly scored low-risk by the AI model) found that the reflex
kernel still fires on it -- its placeholder "normal torque" baseline (12 Nm,
set early in this project for a generic motor) was never reconciled with
the AI4I2020 dataset's real torque range (~3-80 Nm, averaging ~40). This
isn't a bug in the fusion logic; it's the reflex kernel correctly applying
a now-known-to-be-stale calibration. Recorded here, with a concrete
measured example, rather than quietly patched -- recalibrating
`reflex_kernel.c`'s thresholds against real sensor ranges is necessary
before deployment, not optional polish.
| `src/reflex_task_m7.c` | **Real task structure, stubbed sensor read.** Won't compile standalone -- needs FreeRTOS.h/task.h and an ADC driver from the MCUXpresso SDK, which depends on the final sensor board's ADC channel mapping (not yet finalized). |

## What is NOT calibrated

The thresholds (`3.0, 3.0, 3.0, 2.5`) and decay factor (`0.85`) are carried
over unchanged from the Python reference's illustrative constants. They
are placeholders. Real values should come from the Phase 2 pilot's field
data (per the Technical Document's roadmap), not be assumed correct
because the logic compiles and runs cleanly.

## Build and run the desktop test (works right now)

```bash
gcc -std=c11 -Wall -Wextra -Iinclude src/reflex_kernel.c \
    src/ipc_rpmsg_stub.c test/desktop_reflex_test.c -lm -o reflex_test
./reflex_test
```

## Next steps to make the M7 side real

1. Finalize the sensor board's ADC channel mapping, replace
   `rk_read_sensors_stub()` in `reflex_task_m7.c` with real ADC driver
   calls (NXP MCUXpresso SDK).
2. Pull in FreeRTOS + the MCUXpresso SDK for i.MX 8M Plus M7, define
   `GREENBOX_BUILD_TARGET_M7`, and build `reflex_task_m7.c` as part of the
   M7 firmware image.
3. Replace `ipc_rpmsg_stub.c` with real `rpmsg_lite_send()` calls per the
   MCUXpresso SDK's multicore RPMsg example for i.MX 8M Plus.
4. Benchmark `rk_step()` on real M7 silicon (cycle count, not desktop
   wall time) -- this is the number that replaces the Ethos-U55 figure
   in the Technical Document, not a relabeling of it.
5. Re-run threshold/decay calibration once Phase 2 field data exists.
6. Optionally hand-optimize the per-channel loop in `rk_step()` with
   CMSIS-DSP/CMSIS-NN intrinsics once a real benchmark shows it's the
   bottleneck -- not before, since the current C is small and simple
   enough that a compiler on -O2 may already do well with it.
