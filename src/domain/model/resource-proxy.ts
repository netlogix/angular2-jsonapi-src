import {Observable, ReplaySubject} from "rxjs/Rx";
import {Type, Payload, Property} from "../../";

export abstract class ResourceProxy {
    public static _typeName:string = 'netlogix/resource';

    public static _properties:any = {};

    private _type:Type;

    private _payload:Payload;

    /**
     * Since the local "data" only contains id and type of related objects,
     * promises are required to fetch related objects asynchronously. This
     * promise reflects if all related objects of the mentioned property
     * are available.
     */
    private _relationshipLoadedSubject:{[propertyName:string]:ReplaySubject<any>} = {};

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
        this.registerTypeName();
        this._type.registerAccessesors(this);
        this.payload = this._type.getPayloadTemplate();
    }

    get payload():Payload {
        return this._payload;
    }

    set payload(payload:Payload) {
        this._payload = payload;
        this.registerEventEmitters();
        this._payload.propertyChanged.subscribe((propertyName) => {
            this.emitRelationshipLoaded(propertyName)
        });
    }

    offsetExists(propertyName) {
        return !!this._type.getPropertyDefinition(propertyName);
    }

    offsetGet(propertyName) {
        let property = this._type.getPropertyDefinition(propertyName);
        switch (property.type) {
            case Property.ATTRIBUTE_TYPE:
                return this.offsetGetForAttribute(property.name);
            case Property.SINGLE_RELATIONSHIP_TYPE:
                return this.offsetGetForSingleRelationship(property.name);
            case Property.COLLECTION_RELATIONSHIP_TYPE:
                return this.offsetGetForCollectionRelationship(property.name);
        }
    }

    offsetGetLoaded(propertyName:string) {
        return new Promise((resolve) => {
            try {
                resolve(this.offsetGet(propertyName));
            } catch (e) {
                let subscription = this.loadRelationship(propertyName).subscribe(() => {
                    subscription.unsubscribe();
                    resolve(this.offsetGet(propertyName));
                })
            }
        });
    }

    offsetGetAsync(propertyName:string):(Observable<ResourceProxy|ResourceProxy[]>) {
        return this.getRelationshipLoadedSubject(propertyName).asObservable();
    }

    offsetSet(propertyName, value) {
        let property = this._type.getPropertyDefinition(propertyName);
        switch (property.type) {
            case Property.ATTRIBUTE_TYPE:
                this.offsetSetForAttribute(property.name, value);
                break;
            case Property.SINGLE_RELATIONSHIP_TYPE:
                this.offsetSetForSingleRelationship(property.name, value);
                this.emitRelationshipLoaded(property.name);
                break;
            case Property.COLLECTION_RELATIONSHIP_TYPE:
                this.offsetSetForCollectionelationship(property.name, value);
                this.emitRelationshipLoaded(property.name);
                break;
        }
    }

    loadRelationship(propertyName:string):Observable<ResourceProxy|ResourceProxy[]> {
        let property = this._type.getPropertyDefinition(propertyName);
        switch (property.type) {
            case Property.COLLECTION_RELATIONSHIP_TYPE:
                if (!this._payload['relationships'][property.name].hasOwnProperty('data')) {
                    this._payload['relationships'][property.name].data = [];
                }
                break;
            case Property.SINGLE_RELATIONSHIP_TYPE:
                if (!this._payload['relationships'][property.name].hasOwnProperty('data')) {
                    this._payload['relationships'][property.name].data = null;
                }
                break;
        }
        return this._type.consumerBackend.fetchContentFromUri(this._payload['relationships'][property.name]['links']['related']).map((results) => {
            switch (property.type) {
                case Property.COLLECTION_RELATIONSHIP_TYPE:
                    this._payload['relationships'][property.name]['data'] = [];
                    results.forEach((option:ResourceProxy) => {
                        this._payload['relationships'][property.name]['data'].push(option.$identity);
                    });
                    break;
                case Property.SINGLE_RELATIONSHIP_TYPE:
                    let result = results[0];
                    if (result) {
                        this._payload['relationships'][property.name]['data'] = result.$identity;
                    } else {
                        this._payload['relationships'][property.name]['data'] = null;
                    }
                    break;
            }
            this.emitRelationshipLoaded(property.name);
            return this.offsetGet(propertyName);
        });
    }

    private offsetGetForAttribute(propertyName):any {
        return this._payload['attributes'][propertyName];
    }

    private offsetGetForSingleRelationship(propertyName):ResourceProxy {
        let payload = <Payload> this.getRelationshipPayloadData(propertyName);
        if (payload === null) {
            return null;
        }
        return this._type.consumerBackend.getFromUnitOfWork(payload.type, payload.id);
    }

    private offsetGetForCollectionRelationship(propertyName):ResourceProxy[] {
        let results = [];
        let payloads = <Payload[]> this.getRelationshipPayloadData(propertyName);
        (payloads || []).forEach((payload) => {
            results.push(this._type.consumerBackend.getFromUnitOfWork(payload.type, payload.id));
        });
        return results;
    }

    private getRelationshipPayloadData(propertyName):(Payload|Payload[]) {
        if (!this._payload.relationships) {
            throw ["The object has no relationships: ", this].join(' ');
        }
        if (!this._payload.relationships.hasOwnProperty(propertyName)) {
            throw ["The object has no relationship named '", propertyName, "': ", this].join(' ');
        }
        if (!this._payload.relationships[propertyName].hasOwnProperty('data')) {
            throw ["The object has an unitialized relationship named '", propertyName, "': ", this].join(' ');
        }
        return this._payload.relationships[propertyName]['data'];
    }

    private offsetSetForAttribute(propertyName, value) {
        this._payload['attributes'][propertyName] = value;
    }

    private offsetSetForSingleRelationship(propertyName, value:ResourceProxy) {
        let identity = value ? value.$identity : null;
        if (!this._payload['relationships'][propertyName]) {
            this._payload['relationships'][propertyName] = {data: identity};
        } else {
            this._payload['relationships'][propertyName]['data'] = identity;
        }
    }

    private offsetSetForCollectionelationship(propertyName, value:ResourceProxy[]) {
        if (!this._payload['relationships'][propertyName]) {
            this._payload['relationships'][propertyName] = {data: []};
        } else {
            this._payload['relationships'][propertyName]['data'] = [];
        }
        for (let object of value) {
            this._payload['relationships'][propertyName]['data'].push(object.$identity);
        }
    }

    private registerTypeName() {
        this._type = this.constructor['_type'];
        if (!this._type) {
            throw 'This object is not registered as jsonapi resource: ' + this.constructor;
        }
    }

    private registerEventEmitters() {
        for (let propertyName in this._type.getProperties()) {
            let property = this._type.getPropertyDefinition(propertyName);
            switch (property.type) {
                case Property.SINGLE_RELATIONSHIP_TYPE:
                case Property.COLLECTION_RELATIONSHIP_TYPE:
                    this._relationshipLoadedSubject[property.name] = new ReplaySubject<any>(1);
                    try {
                        this.offsetGet(propertyName);
                        this.emitRelationshipLoaded(propertyName);
                    } catch (e) {
                    }
                    break;
            }
        }
    }

    private emitRelationshipLoaded(propertyName) {
        this.getRelationshipLoadedSubject(this._type.getPropertyDefinition(propertyName).name).next(this.offsetGet(propertyName));
    }

    private getRelationshipLoadedSubject(propertyName):ReplaySubject<any> {
        return this._relationshipLoadedSubject[propertyName];
    }
}
