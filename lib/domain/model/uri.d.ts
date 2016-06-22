export declare class Uri {
    private _uri;
    private _schema;
    private _host;
    private _path;
    private _queryString;
    constructor(uri: string);
    getArguments(): any;
    setArguments(newArgs: any): void;
    toString(): string;
    clone(): Uri;
    protected parseQueryString(queryString: any): {};
    private addArgumentPathToResult(argument, result);
    protected buildQueryString(args: any): string;
    private traverseQueryString(vorher, nachher, path);
}
