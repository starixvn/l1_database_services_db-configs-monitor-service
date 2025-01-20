import type { ChangeStreamNameSpace, Document } from "@ldb/mongo";

export type IndexTemplateData = {
    postfix: string;
    idxs: Record<string, string>;
};

export type ConfigTemplate$2<T extends Document = Document> = {
    category: string;
    type: number;
    targets: ChangeStreamNameSpace[];
    data: T[];
    __v: 2;
};

export type ConfigTemplate$3<C extends string = string, T extends Document = Document> = {
    category: C;
    type: number;
    dbs: string[];
    data: T[];
    targets: ChangeStreamNameSpace[];
    __v: 3;
};

export type ConfigTemplate<C extends string = string, T extends Document = Document, V extends number = number> = (ConfigTemplate$2<T> | ConfigTemplate$3<C, T>) & { __v: V };
