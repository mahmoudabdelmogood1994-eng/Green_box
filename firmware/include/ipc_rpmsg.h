/*
 * ipc_rpmsg.h
 *
 * Interface for sending reflex-kernel output from the Cortex-M7 (RTOS)
 * side to the Cortex-A53 + NPU (Linux) side over RPMsg, per the AMP
 * architecture in the Green Box M Technical Document (Section 2.2/2.4).
 *
 * STATUS: interface + payload struct are real and intended to be stable.
 * The .c implementation in this drop is a STUB that logs locally instead
 * of calling NXP's RPMsg-Lite driver -- wiring this to the real MCUXpresso
 * SDK RPMsg-Lite API (rpmsg_lite_create_ept / rpmsg_lite_send) is Phase 2
 * bring-up work on actual hardware, not something that can be validated
 * without the board and SDK in hand.
 */

#ifndef IPC_RPMSG_H
#define IPC_RPMSG_H

#include <stdint.h>
#include <stdbool.h>
#include "reflex_kernel.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Payload sent from M7 to Linux/NPU side on every reflex step where at
 * least one channel fired, or periodically as a heartbeat (see
 * reflex_task_m7.c). Kept small and fixed-size on purpose: RPMsg-Lite
 * favors small, fixed-layout messages over the shared-memory ring buffer. */
typedef struct {
    uint32_t seq;                 /* monotonically increasing step counter */
    uint32_t timestamp_ms;        /* M7 tick count at time of sample */
    int8_t membrane_q[RK_NUM_CHANNELS];
    uint8_t fired_mask;           /* bit i set if channel i fired this step */
    float spike_rate;             /* smoothed spike rate over history window */
} ipc_reflex_message_t;

/* Initialize the RPMsg endpoint. Returns true on success.
 * In this stub, always returns true and prints a message. */
bool ipc_rpmsg_init(void);

/* Send one reflex step result to the Linux/NPU side.
 * In this stub, this is a local print, not a real IPC send. */
bool ipc_rpmsg_send(const ipc_reflex_message_t *msg);

#ifdef __cplusplus
}
#endif

#endif /* IPC_RPMSG_H */
