import type { ChangeStreamNameSpace } from "@ldb/mongo";
import type { ArchiveConfig } from "./archive-configs.js";
import type { SummaryConfig } from "./summary-configs.js";

export type GameInitiatorEvents = {
    DEPLOY_INDEX: (ns: ChangeStreamNameSpace, idxs: string[], quiet: boolean) => void;
    DEPLOY_ARCHIVE: (ns: ChangeStreamNameSpace, configs: ArchiveConfig[], quiet: boolean) => void;
    DEPLOY_SUMMARY: (ns: ChangeStreamNameSpace, configs: SummaryConfig[], quiet: boolean) => void;
};
