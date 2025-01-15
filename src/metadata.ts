import type { Metadata } from "@ldb/utils";

export const name = "configs-monitor-service" as const;
export const version = "0.0.1" as const;

export const metadata = { name, version } as const satisfies Metadata;
