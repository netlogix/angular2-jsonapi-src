import {EventEmitter} from '@angular/core';
import {ConsumerBackend, Payload, Property, PropertyInterface, ResourceProxy, Uri} from "../../";
import {Observable} from "rxjs/Rx";

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
        return this._uri ? this._uri.clone() : null;
    }

    getTypeName():string {
        return this._typeName;
    }

    getResourceProxy():any {
        return this._resourceProxy;
    }

    createNewObject(consumerBackend:ConsumerBackend, initializeEmptyRelationships:boolean=false):any {
        let payload = this.getPayloadTemplate();
        let resource = <ResourceProxy> (new this._resourceProxy());
        let relationships = payload.relationships;
        if (!initializeEmptyRelationships) {
            for (let propertyName in relationships) {
                delete relationships[propertyName].data;
            }
        }
        resource.payload = payload;
        return resource;
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
        for (let propertyName in this._properties) {
            this.registerAccessesorsForProperty(object, propertyName);
        }
    }

    getPayloadTemplate():Payload {
        let payload = {
            type: this.getTypeName(),
            attributes: {},
            relationships: {},
            links: {},
            meta: {}
        };
        let propertyChanged = new EventEmitter<string>();
        Object.defineProperty(payload, 'propertyChanged', {
            value: propertyChanged,
            enumerable: false,
            writable: false
        });
        for (let propertyName in this.getProperties()) {
            let property = this.getPropertyDefinition(propertyName);
            switch (property.type) {
                case Property.ATTRIBUTE_TYPE:
                    payload.attributes[property.name] = null;
                    break;
                case Property.SINGLE_RELATIONSHIP_TYPE:
                    payload.relationships[property.name] = {
                        data: null
                    };
                    break;
                case Property.COLLECTION_RELATIONSHIP_TYPE:
                    payload.relationships[property.name] = {
                        data: []
                    };
                    break;
            }
        }
        return payload;
    }

    private registerAccessesorsForProperty(object:ResourceProxy, propertyName) {
        let property = <PropertyInterface>this._properties[propertyName];

        Object.defineProperty(object, propertyName, {
            get: () => {
                return object.offsetGet(propertyName);
            },
            set: (value) => {
                return object.offsetSet(propertyName, value);
            }
        });

        if (property.type === Property.SINGLE_RELATIONSHIP_TYPE || property.type === Property.COLLECTION_RELATIONSHIP_TYPE) {
            Object.defineProperty(object, propertyName + 'Loaded', {
                get: ():(Promise<ResourceProxy|ResourceProxy[]>) => {
                    return object.offsetGetLoaded(propertyName);
                }
            });

            Object.defineProperty(object, propertyName + 'Async', {
                get: ():(Observable<ResourceProxy|ResourceProxy[]>) => {
                    return object.offsetGetAsync(propertyName);
                }
            });
        }
    }
}