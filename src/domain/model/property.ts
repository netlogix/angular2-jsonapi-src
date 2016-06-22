export interface PropertyInterface {
    type:string;
    name:string;
}
export interface PropertyAttributeInterface extends PropertyInterface {
}
export interface PropertyRelationInterface extends PropertyInterface {
}
export class Property {

    /**
     * Those properties are "attributes" as of jsonapi.org
     */
    public static UNDEFINED_TYPE = null;

    /**
     * Those properties are "attributes" as of jsonapi.org
     */
    public static ATTRIBUTE_TYPE = 'attribute';

    /**
     * Those properties are a relationship to a single Resource
     */
    public static SINGLE_RELATIONSHIP_TYPE = 'single';

    /**
     * Those properties are a relationship to a collection of other resources
     */
    public static COLLECTION_RELATIONSHIP_TYPE = 'collection';

    public static attr(name:string, options?):PropertyAttributeInterface {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        } else {
            return {
                type: Property.ATTRIBUTE_TYPE,
                name: name
            };
        }
    }

    public static hasOne(name:string, options?):PropertyRelationInterface {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        } else {
            return {
                type: Property.SINGLE_RELATIONSHIP_TYPE,
                name: name
            };
        }
    }

    public static hasMany(name:string, options?):PropertyRelationInterface {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        } else {
            return {
                type: Property.COLLECTION_RELATIONSHIP_TYPE,
                name: name
            };
        }
    }

    public static undefined(name:string, options?):PropertyRelationInterface {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        } else {
            return {
                type: Property.UNDEFINED_TYPE,
                name: name
            };
        }
    }
}