import type { ChangeStreamNameSpace } from "@ldb/mongo";

export const watcherNamespaces = {
    changeStreamConfigsCollection: { db: "ops_configs", coll: "change_stream_configs" },
} as const satisfies Record<string, ChangeStreamNameSpace>;
