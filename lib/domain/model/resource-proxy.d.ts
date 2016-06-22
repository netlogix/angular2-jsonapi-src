import { Type } from "./type";
import { Payload } from "./payload";
export declare abstract class ResourceProxy {
    static _typeName: string;
    static _properties: any;
    protected _type: Type;
    protected _payload: Payload;
    private _propertyValue;
    private _relationshipLoaded;
    private _relatedDataLoaded;
    private _propertyBasedCacheState;
    $type: Type;
    $identity: {
        id: string;
        type: string;
    };
    toString(): string;
    constructor();
    payload: any;
    offsetLoadedEvent(propertyName: any): Promise<any>;
    private getLoadedEventPrimiseAndResolver(propertyName);
    offsetExists(propertyName: any): boolean;
    offsetGet(propertyName: any): any;
    offsetSet(propertyName: any, value: any): void;
    private offsetGetForAttribute(propertyName);
    private offsetGetForSingleRelationship(propertyName);
    private offsetGetForCollectionelationship(propertyName);
    private loadRelationship(propertyName);
    private offsetSetForAttribute(propertyName, value);
    private offsetSetForSingleRelationship(propertyName, value);
    private offsetSetForCollectionelationship(propertyName, value);
    private resetPropertyBasedCaches();
}
