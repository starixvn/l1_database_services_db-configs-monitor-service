import type { ArchiveConfig, ArchiveTemplate } from "../types/archive-configs.js";
import type { GameConfig } from "../types/game-configs.js";

export const archiveTemplater = (category: string, db: string, gameConfig: GameConfig, archiveTemplate: ArchiveTemplate): ArchiveConfig => {
    const { name, gameId, type } = gameConfig;
    const { id, from, to, childs, ...restParentConfig } = archiveTemplate;
    const mappedChilds: ArchiveConfig["childs"] = [];

    for (const child of childs) {
        const { from: childFrom, to: childTo, ...restChildConfig } = child;
        mappedChilds.push({
            from: { db: `${db}${childFrom.db}`, postfix: childFrom.postfix },
            to: { db: `${db}${childTo.db}`, postfix: childTo.postfix },
            ...restChildConfig,
        });
    }
    return {
        category,
        type,
        id,
        gameConfigs: { gameId, name },
        from: { db: `${db}${from.db}`, postfix: from.postfix },
        to: { db: `${db}${to.db}`, postfix: to.postfix },
        childs: mappedChilds,
        ...restParentConfig,
    };
};
