/*
 * ipc_rpmsg_stub.c
 *
 * Placeholder IPC backend. Prints to stdout instead of touching real
 * RPMsg-Lite hardware, so reflex_kernel.c and reflex_task_m7.c can be
 * built and unit-tested on a desktop before there is a board to flash.
 *
 * To make this real: replace the body of ipc_rpmsg_send() with a call to
 * NXP's RPMsg-Lite `rpmsg_lite_send(instance, endpoint, dest_addr,
 * (char *)msg, sizeof(*msg), timeout)`, and initialize the RPMsg-Lite
 * instance/endpoint in ipc_rpmsg_init() per the MCUXpresso SDK's
 * multicore RPMsg example for i.MX 8M Plus.
 */

#include "ipc_rpmsg.h"
#include <stdio.h>

bool ipc_rpmsg_init(void)
{
    printf("[ipc_rpmsg_stub] init (STUB -- not real RPMsg-Lite)\n");
    return true;
}

bool ipc_rpmsg_send(const ipc_reflex_message_t *msg)
{
    printf("[ipc_rpmsg_stub] seq=%u t=%ums fired_mask=0x%02x spike_rate=%.2f "
           "membrane=[%d,%d,%d,%d]\n",
           msg->seq, msg->timestamp_ms, msg->fired_mask, msg->spike_rate,
           msg->membrane_q[0], msg->membrane_q[1],
           msg->membrane_q[2], msg->membrane_q[3]);
    return true;
}
