import {Http, RequestOptions, Headers} from '@angular/http';
import {Observable, Subscriber} from "rxjs/Rx";
import {ResourceProxy} from "../domain/model/resource-proxy";
import {Type} from "../domain/model/type";
import {Uri} from "../domain/model/uri";
import {Payload} from "../domain/model/payload";
import {Property} from "../domain/model/property";

export class ConsumerBackend {

    protected static contentType = 'application/vnd.api+json';

    protected types = {};

    protected typeObservables = {};

    protected headers:{[uriPattern:string]:{[header:string]:string}} = {};

    protected resources:{[cacheIdentifier:string]:ResourceProxy} = {};

    constructor(private http:Http, private requestOptions:RequestOptions) {
    }

    addType(type:Type) {
        type.consumerBackend = this;

        this.types[type.getTypeName()] = type;
    }

    getType(typeName:string):Type {
        return this.types[typeName];
    }

    getTypeObservable(typeName:string):{observable:Observable<Type>, subscriber:Subscriber<Type>} {
        if (!this.typeObservables[typeName]) {
            this.typeObservables[typeName] = {
                observable: false,
                subscriber: false
            };
            let observable = Observable.create((subscriber) => {
                this.typeObservables[typeName].observable = observable;
                this.typeObservables[typeName].subscriber = subscriber;
            });
            observable.subscribe();
        }
        return this.typeObservables[typeName];
    }

    getTypePromise(typeName:string):{promise:Promise<Type>, resolve:any} {
        if (!this.typeObservables[typeName]) {
            this.typeObservables[typeName] = {
                promise: false,
                resolve: false
            };
            let promise = new Promise((resolve) => {
                this.typeObservables[typeName].resolve = resolve;
            });
            this.typeObservables[typeName].promise = promise;
        }
        return this.typeObservables[typeName];
    }

    registerEndpointsByEndpointDiscovery(endpointDiscovery:Uri) {
        this.requestJson(endpointDiscovery).then((result) => {
            for (let link of result['links']) {
                if (!(link instanceof Object) || !link.meta) {
                    continue;
                }
                if (!link.meta.type || link.meta.type !== 'resourceUri') {
                    continue;
                }
                if (!link.meta.resourceType) {
                    continue;
                }
                if (!link.href) {
                    continue;
                }

                let typeName:string = link.meta.resourceType;
                let type = this.getType(typeName);
                if (!type) {
                    continue;
                }
                type.setUri(new Uri(link.href));
                this.getTypePromise(typeName).resolve(type);
            }
        });
    }

    findByTypeAndFilter(typeName:string, filter?:{[key:string]:any}, include?:string[]):Promise<any> {
        if (!filter) {
            filter = {};
        }
        if (!include) {
            include = [];
        }
        return new Promise((resolve) => {
            let subscription = (x) => {
                let type = this.getType(typeName);
                let queryUri = type.getUri();

                let queryArguments = queryUri.getArguments();
                queryArguments['filter'] = queryArguments['filter'] || {};
                for (let key in filter) {
                    let value = filter[key];
                    queryArguments['filter'][key] = value;
                }
                if (queryArguments['filter'] == {}) {
                    delete queryArguments['filter'];
                }

                queryArguments['include'] = include.join(',');
                if (!queryArguments['include']) {
                    delete queryArguments['include'];
                }
                queryUri.setArguments(queryArguments);

                this.fetchFromUri(queryUri).then((result) => {
                    resolve(result);
                });
            };
            this.getTypePromise(typeName).promise.then(subscription);
        });
    }

    fetchFromUri(queryUri:Uri):Promise<any> {
        return new Promise((resolve) => {
            this.requestJson(queryUri).then((jsonResult) => {
                this.addJsonResultToCache(jsonResult);
                if (!jsonResult.data) {
                    resolve([]);
                    return;
                }
                if (!!jsonResult.data.type && !!jsonResult.data.id) {
                    resolve(this.getResourceProxyFromCache(jsonResult.data.type, jsonResult.data.id));
                    return;

                } else {
                    let result = [];
                    for (let resourceDefinition of jsonResult['data']) {
                        let resource = this.getResourceProxyFromCache(resourceDefinition.type, resourceDefinition.id);
                        if (resource) {
                            result.push(resource);
                        }
                    }
                    resolve(result);
                    return;
                }
            });
        });
    }

    fetchByTypeAndId(type:string, id:string):Promise<any> {
        return new Promise((resolve) => {
            resolve(this.getResourceProxyFromCache(type, id));
        });
    }


    getPlaceholderForTypeAndId(placeholder:any, type:string, id:string):Promise<any> {
        return new Promise((resolve) => {
            this.fetchByTypeAndId(type, id).then((object) => {
                Object.setPrototypeOf(placeholder, object);
                resolve(placeholder);
            });
        });
    }

    add(resource:ResourceProxy):Promise<any> {
        let requestOptions = this.requestOptions.merge({});
        return new Promise((resolve) => {
            let postBody = {
                data: resource.payload
            };
            this.http.post(resource.$type.getUri().toString(), JSON.stringify(postBody), this.getRequestOptions('post')).subscribe((response) => {
                resolve(response);
            });
        });
    }

    protected requestJson(uri:Uri):Promise<any> {
        let uriString = uri.toString();

        let requestOptions = this.getRequestOptions('get', uriString);
        let headers = JSON.stringify(requestOptions.headers.toJSON());
        let cacheIdentifier = JSON.stringify(headers) + '|' + uriString;

        return new Promise((resolve) => {
            this.http.get(uriString, requestOptions).subscribe((result) => {
                let body:string = result.text();
                resolve(JSON.parse(body));
            });
        });
    }

    protected addJsonResultToCache(result:any) {

        for (let slotName of ['data', 'included']) {
            if (!result[slotName]) {
                continue;
            }
            for (let resourceDefinition of result[slotName]) {
                let typeName = resourceDefinition.type;
                let id = resourceDefinition.id;
                let type = this.getType(typeName);
                if (!type) {
                    continue;
                }
                let resource = this.getResourceProxyFromCache(typeName, id);
                if (!resource) {
                    resource = type.createNewObject(this);
                    let cacheIdentifier = this.calculateCacheIdentifier(typeName, id);
                    this.resources[cacheIdentifier] = resource;
                    resource.payload = {
                        id: id,
                        type: typeName,
                        attributes: {},
                        relationships: {},
                        links: {},
                        meta: {}
                    };
                }
                this.assignResourceDefinitionToPayload(resource.payload, resourceDefinition, type);
            }
        }
    }

    protected assignResourceDefinitionToPayload(payload:Payload, resourceDefinition:Payload, type:Type) {

        if (resourceDefinition.hasOwnProperty('links')) {
            payload.links = Object.assign(payload.links, resourceDefinition.links);
        }
        if (resourceDefinition.hasOwnProperty('meta')) {
            payload.meta = Object.assign(payload.meta, resourceDefinition.meta);
        }

        for (let propertyName in type.getProperties()) {
            let property = type.getPropertyDefinition(propertyName);
            if (property.type === Property.ATTRIBUTE_TYPE) {
                if (!resourceDefinition.hasOwnProperty('attributes')) {
                    continue;
                }
                if (!resourceDefinition.attributes.hasOwnProperty(property.name)) {
                    continue;
                }
                payload.attributes[property.name] = resourceDefinition.attributes[property.name];

            } else {
                if (!resourceDefinition.hasOwnProperty('relationships')) {
                    continue;
                }
                if (!resourceDefinition.relationships.hasOwnProperty(property.name)) {
                    continue;
                }
                if (!payload.relationships.hasOwnProperty(property.name) && resourceDefinition.relationships[property.name].hasOwnProperty('links')) {
                    payload.relationships[property.name] = {
                        links: {
                            self: resourceDefinition.relationships[property.name].links.self,
                            related: resourceDefinition.relationships[property.name].links.related
                        }
                    };
                }
                if (!resourceDefinition.relationships[property.name].hasOwnProperty('data')) {
                    continue;
                }
                payload.relationships[property.name]['data'] = resourceDefinition.relationships[property.name]['data'];
            }
        }
    }

    protected getResourceProxyFromCache(type:string, id:string):ResourceProxy {
        let cacheIdentifier = this.calculateCacheIdentifier(type, id);
        return this.resources[cacheIdentifier];
    }

    protected calculateCacheIdentifier(type:string, id:string) {
        return type + "\n" + id;
    }

    protected getRequestOptions(method:string, requestUri?:string):RequestOptions {

        let requestOptions = this.requestOptions.merge({
            headers: new Headers(this.requestOptions.headers.toJSON())
        });
        switch (method.toLocaleLowerCase()) {
            case 'post':
                requestOptions.headers.set('Content-Type', ConsumerBackend.contentType);
            case 'get':
                requestOptions.headers.set('Accept', ConsumerBackend.contentType);
                break;
        }


        if (requestUri) {
            for (let uriPattern in this.headers) {
                let headersForUriPattern = this.headers[uriPattern];
//                if (!preg_match(uriPattern, uriString)) {
//                    continue;
//                }
                for (let key in headersForUriPattern) {
                    let value = headersForUriPattern[key];
                    requestOptions.headers.set(key, value);
                }
            }
        }

        return requestOptions;
    }
}
