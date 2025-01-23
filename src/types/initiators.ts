import type { ChangeStreamNameSpace } from "@ldb/mongo";
import type { ArchiveConfig } from "./archive-configs.js";
import type { SummaryConfig } from "./summary-configs.js";

type IndexDescriptionString = string & {};
type DeployConfig<T> = (ns: ChangeStreamNameSpace, configs: T[], quiet: boolean) => void;

export type GameInitiatorEvents = {
    DEPLOY_INDEX: DeployConfig<IndexDescriptionString>;
    DEPLOY_ARCHIVE: DeployConfig<ArchiveConfig>;
    DEPLOY_SUMMARY: DeployConfig<SummaryConfig>;
};

export type IndexInitiatorEvents = {
    DEPLOY_INDEX: DeployConfig<IndexDescriptionString>;
};

export type ArchiveInitiatorEvents = {
    DEPLOY_ARCHIVE: DeployConfig<ArchiveConfig>;
};

export type SummaryInitiatorEvents = {
    DEPLOY_SUMMARY: DeployConfig<SummaryConfig>;
};
