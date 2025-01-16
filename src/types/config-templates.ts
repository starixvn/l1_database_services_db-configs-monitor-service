import type { ChangeStreamNameSpace, Document } from "@ldb/mongo";

export type IndexTemplateData = {
    postfix: string;
    idxs: Record<string, string>;
};

export type ConfigTemplate<C extends string = string, T extends Document = Document> = {
    category: C;
    type: number;
    dbs: string[];
    data: T[];
    targets: ChangeStreamNameSpace[];
    __v: 3;
};
