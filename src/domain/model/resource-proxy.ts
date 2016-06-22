import {Type, Payload, Property} from "../../";

export abstract class ResourceProxy {
    public static _typeName:string = 'netlogix/resource';

    public static _properties:any = {};

    protected _type:Type;

    protected _payload:Payload;

    /**
     * This holds the result of every property of this resource object,
     * no matter it the requested property is an attribute of any type
     * of relationship. The value is the plain result without promises
     * or observables.
     */
    private _propertyValue:{[propertyName:string]:any} = {};

    /**
     * In the case of having relationship data not included, this promise
     * cache makes sure to have the local "data" (which just is the id and
     * the type value of the related objects, not the actual objects)
     * available and requests the "self" URL of the relationship if
     * necessary.
     */
    private _relationshipLoaded:{[propertyName:string]:Promise<any>} = {};

    /**
     * Since the local "data" only contains id and type of related objects,
     * promises are required to fetch related objects asynchronously. This
     * promise reflects if all related objects of the mentioned property
     * are available.
     */
    private _relatedDataLoaded:{[propertyName:string]:{promise:Promise<any>, resolve:any}} = {};

    private _propertyBasedCacheState:string = '';

    get $type():Type {
        return this._type;
    }

    get $identity():{id:string, type:string} {
        return {
            id: this._payload.id,
            type: this._payload.type
        };
    }

    public toString():string {
        return '[[' + this.$identity.type + '][' + this.$identity.id + ']]';
    }

    constructor() {
        this._type = this.constructor['_type'];
        if (!this._type) {
            throw 'This object is not registered as jsonapi resource: ' + this.constructor;
        }
        this._type.registerAccessesors(this);
        this.payload = this._type.getPayloadTemplate();
    }

    get payload():any {
        return this._payload;
    }

    set payload(payload:any) {
        this._payload = payload;
    }

    public offsetLoadedEvent(propertyName):Promise<any> {
        return this.getLoadedEventPrimiseAndResolver(propertyName).promise;
    }

    private getLoadedEventPrimiseAndResolver(propertyName):{promise:Promise<any>, resolve:any} {
        this.resetPropertyBasedCaches();
        if (!this._relatedDataLoaded[propertyName]) {
            this._relatedDataLoaded[propertyName] = {
                promise: null,
                resolve: null
            };
            this._relatedDataLoaded[propertyName].promise = new Promise((resolve) => {
                this._relatedDataLoaded[propertyName].resolve = resolve;
            });
        }
        return this._relatedDataLoaded[propertyName];
    }

    public offsetExists(propertyName) {
        return !!this._type.getPropertyDefinition(propertyName);
    }

    public offsetGet(propertyName) {
        this.resetPropertyBasedCaches();
        if (this._propertyValue[propertyName]) {
            return this._propertyValue[propertyName];
        } else {
            let result;
            let property = this._type.getPropertyDefinition(propertyName);
            switch (property.type) {
                case Property.ATTRIBUTE_TYPE:
                    result = this.offsetGetForAttribute(property.name);
                    break;
                case Property.SINGLE_RELATIONSHIP_TYPE:
                    result = this.offsetGetForSingleRelationship(property.name);
                    break;
                case Property.COLLECTION_RELATIONSHIP_TYPE:
                    result = this.offsetGetForCollectionelationship(property.name);
                    break;
            }
            this._propertyValue[propertyName] = result;
            return this._propertyValue[propertyName];
        }
    }

    public offsetSet(propertyName, value) {
        let property = this._type.getPropertyDefinition(propertyName);
        switch (property.type) {
            case Property.ATTRIBUTE_TYPE:
                this.offsetSetForAttribute(property.name, value);
                break;
            case Property.SINGLE_RELATIONSHIP_TYPE:
                this.offsetSetForSingleRelationship(property.name, value);
                break;
            case Property.COLLECTION_RELATIONSHIP_TYPE:
                this.offsetSetForCollectionelationship(property.name, value);
                break;
        }
        this.resetPropertyBasedCaches();
    }

    private offsetGetForAttribute(propertyName) {
        return this._payload['attributes'][propertyName];
    }

    private offsetGetForSingleRelationship(propertyName) {
        let result = {};
        this.loadRelationship(propertyName).then((payload) => {
            this._type.consumerBackend.getPlaceholderForTypeAndId(result, payload['type'], payload['id']).then(() => {
                this.getLoadedEventPrimiseAndResolver(propertyName).resolve(result);
            });
        });
        return result;
    }

    private offsetGetForCollectionelationship(propertyName) {
        let results = [];
        this.loadRelationship(propertyName).then(() => {
            var queue = [];
            for (let payload of this._payload['relationships'][propertyName]['data']) {
                let result = {};
                results.push(result);
                queue.push(this._type.consumerBackend.getPlaceholderForTypeAndId(result, payload['type'], payload['id']));
            }
            Promise.all(queue).then(() => {
                this.getLoadedEventPrimiseAndResolver(propertyName).resolve(results);
            });
        });
        return results;
    }

    private loadRelationship(propertyName:string):Promise<any> {
        this.resetPropertyBasedCaches();
        if (this._relationshipLoaded[propertyName]) {
            return this._relationshipLoaded[propertyName];
        }

        if (this._payload['relationships'][propertyName].hasOwnProperty('data') || !this._payload['relationships'][propertyName]['links'].hasOwnProperty('related')) {
            this._relationshipLoaded[propertyName] = new Promise((resolve) => {
                resolve(this._payload['relationships'][propertyName]['data']);
            });
            return this._relationshipLoaded[propertyName];
        } else {
            this._relationshipLoaded[propertyName] = new Promise((resolve) => {
                if (this._type.getPropertyDefinition(propertyName).type == Property.COLLECTION_RELATIONSHIP_TYPE) {
                    this._payload['relationships'][propertyName]['data'] = [];
                    this._type.consumerBackend.fetchFromUri(this._payload['relationships'][propertyName]['links']['related']).then((results:ResourceProxy[]) => {
                        for (let option of results) {
                            this._payload['relationships'][propertyName]['data'].push(option.$identity);
                        }
                    });
                    resolve(this._payload['relationships'][propertyName]['data']);
                } else if (this._type.getPropertyDefinition(propertyName).type == Property.SINGLE_RELATIONSHIP_TYPE) {
                    this._type.consumerBackend.fetchFromUri(this._payload['relationships'][propertyName]['links']['related']).then((results:ResourceProxy) => {
                        this._payload['relationships'][propertyName]['data'] = results.$identity;
                    });
                    resolve(this._payload['relationships'][propertyName]['data']);
                }
            });
            return this._relationshipLoaded[propertyName];
        }
    }

    private offsetSetForAttribute(propertyName, value) {
        this._payload['attributes'][propertyName] = value;
    }

    private offsetSetForSingleRelationship(propertyName, value:ResourceProxy) {
        this._payload['relationships'][propertyName]['data'] = value.$identity;
    }

    private offsetSetForCollectionelationship(propertyName, value:ResourceProxy[]) {
        this._payload['relationships'][propertyName]['data'] = [];
        for (let object of value) {
            this._payload['relationships'][propertyName]['data'].push(object.$identity);
        }
    }

    private resetPropertyBasedCaches() {
        let currentState = JSON.stringify(this._payload);
        if (this._propertyBasedCacheState === currentState) {
            return;
        }
        this._propertyValue = {};
        this._relationshipLoaded = {};
        this._relatedDataLoaded = {};
        this._propertyBasedCacheState = currentState;
    }
}
