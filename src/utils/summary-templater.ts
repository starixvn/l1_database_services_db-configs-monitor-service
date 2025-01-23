import type { GameConfig } from "../types/game-configs.js";
import type { SummaryConfig, SummaryTemplate } from "../types/summary-configs.js";

export const summaryTemplater = (category: string, db: string, gameConfig: GameConfig, summaryTemplate: SummaryTemplate): SummaryConfig => {
    const { name, gameId, type } = gameConfig;
    const { ...restConfig } = summaryTemplate;

    return {
        category,
        type,
        id: 0,
        gameConfigs: { gameId, name },
        db,
        ...restConfig,
    };
};
