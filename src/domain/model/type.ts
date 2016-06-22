import {PropertyInterface, Property} from "./property";
import {Uri} from "./uri";
import {ConsumerBackend} from "../../service/consumer-backend";
import {ResourceProxy} from "./resource-proxy";
import {Payload} from "./payload";

export class Type {
    private _typeName:string;

    private _resourceProxy:any;

    private _properties:{[propertyName:string]:PropertyInterface};

    private _uri:Uri;

    public consumerBackend:ConsumerBackend;

    constructor(typeName:string,
                resourceProxy:any,
                properties:{[propertyName:string]:PropertyInterface} = {},
                uri:Uri = null) {
        this._typeName = typeName;
        this._resourceProxy = resourceProxy;
        this._properties = properties;
        this._properties = JSON.parse(JSON.stringify(properties));
        resourceProxy._type = this;
        if (uri) {
            this.setUri(uri);
        }
    }

    setUri(uri:Uri) {
        this._uri = uri;
    }

    getUri():Uri {
        return this._uri.clone();
    }

    getTypeName():string {
        return this._typeName;
    }

    getResourceProxy():any {
        return this._resourceProxy;
    }

    createNewObject(consumerBackend:ConsumerBackend):any {
        return new this._resourceProxy();
    }

    getPropertyDefinition(propertyName:string):PropertyInterface {
        if (this._properties[propertyName]) {
            return this._properties[propertyName];
        } else {
            return Property.undefined(propertyName);
        }
    }

    getProperties():{[propertyName:string]:PropertyInterface} {
        return this._properties;
    }

    registerAccessesors(object:ResourceProxy) {
        let payload = object.payload;
        for (let propertyName in this._properties) {
            let property = <PropertyInterface>this._properties[propertyName];
            Object.defineProperty(object, propertyName, {
                get: function () {
                    return object.offsetGet(propertyName);
                },
                set: function (value) {
                    object.offsetSet(propertyName, value);
                }
            });
            if (property.type === Property.SINGLE_RELATIONSHIP_TYPE || property.type === Property.COLLECTION_RELATIONSHIP_TYPE) {
                Object.defineProperty(object, propertyName + 'Loaded', {
                    get: function () {
                        object.offsetGet(propertyName);
                        return object.offsetLoadedEvent(propertyName);
                    }
                });
            }
        }
    }

    getPayloadTemplate():Payload {
        let payload = {
            type: this.getTypeName(),
            attributes: {},
            relationships: {}
        };
        for (let propertyName in this._properties) {
            switch (this._properties[propertyName].type) {
                case Property.ATTRIBUTE_TYPE:
                    payload.attributes[propertyName] = null;
                    break;
                case Property.SINGLE_RELATIONSHIP_TYPE:
                    payload.relationships[propertyName] = {data: null};
                    break;
                case Property.COLLECTION_RELATIONSHIP_TYPE:
                    payload.relationships[propertyName] = {data: []};
                    break;
            }
        }
        return payload;
    }
}