import type { ChangeStreamNameSpace } from "@ldb/mongo";

export const namespaces = {
    changeStreamConfigsNamespace: { db: "ops_configs", coll: "change_stream_configs" },
} as const satisfies Record<string, ChangeStreamNameSpace>;
