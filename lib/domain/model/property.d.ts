export interface PropertyInterface {
    type: string;
    name: string;
}
export interface PropertyAttributeInterface extends PropertyInterface {
}
export interface PropertyRelationInterface extends PropertyInterface {
}
export declare class Property {
    static UNDEFINED_TYPE: any;
    static ATTRIBUTE_TYPE: string;
    static SINGLE_RELATIONSHIP_TYPE: string;
    static COLLECTION_RELATIONSHIP_TYPE: string;
    static attr(name: string, options?: any): PropertyAttributeInterface;
    static hasOne(name: string, options?: any): PropertyRelationInterface;
    static hasMany(name: string, options?: any): PropertyRelationInterface;
    static undefined(name: string, options?: any): PropertyRelationInterface;
}
