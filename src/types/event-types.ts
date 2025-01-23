import type { Satisfies } from "@ldb/utils";
import type { ArchiveTemplate } from "./archive-configs.js";
import type { ConfigTemplate, IndexTemplateData } from "./config-templates.js";
import type { GameConfig } from "./game-configs.js";
import type { SummaryTemplate } from "./summary-configs.js";

export type GameEventType = "GAME";
export type TemplateEventType = "INDEX" | "SUMMARY" | "ARCHIVE";
export type WatcherEventType = GameEventType | TemplateEventType;

export type EventSchema = Satisfies<
    {
        GAME: GameConfig;
        INDEX: ConfigTemplate<"games", IndexTemplateData>;
        SUMMARY: ConfigTemplate<string, SummaryTemplate>;
        ARCHIVE: ConfigTemplate<string, ArchiveTemplate>;
    },
    Record<GameEventType, GameConfig> & Record<TemplateEventType, ConfigTemplate>
>;
