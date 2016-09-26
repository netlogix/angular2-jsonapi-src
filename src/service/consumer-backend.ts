import {Http, RequestOptions, Headers} from '@angular/http';
import {Observable, ReplaySubject} from "rxjs/Rx";
import {ResourceProxy, Type, Uri, Property, Payload} from "../";
import {ResultPage} from "../domain/model/result-page";

export class ConsumerBackend {

    public contentType = 'application/vnd.api+json';

    protected types = {};

    protected typeObservables:{[typeName:string]:ReplaySubject<Type>} = {};

    protected headers:{[uriPattern:string]:{[header:string]:string}} = {};

    protected unitOfWork:{[cacheIdentifier:string]:ResourceProxy} = {};

    constructor(protected http:Http, protected requestOptions:RequestOptions) {
    }

    addType(type:Type) {
        type.consumerBackend = this;
        this.types[type.getTypeName()] = type;
    }

    registerEndpointsByEndpointDiscovery(endpointDiscovery:Uri):Promise<any> {
        return new Promise((resolve) => {
            this.requestJson(endpointDiscovery).subscribe((result) => {
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

                    this.registerEndpoint(link.meta.resourceType, link.href);
                }
                resolve();
            });
        });
    }

    registerEndpoint(typeName:string, href:string) {
        let type = this.types[typeName];
        if (!type || type.getUri()) {
            return;
        }
        let typeObservable = this.getType(typeName);
        type.setUri(new Uri(href));
        typeObservable.next(type);
        typeObservable.complete();
    }

    closeEndpointDiscovery() {
        for (let typeName in this.types) {
            let type = <Type> this.types[typeName];
            if (!type.getUri()) {
                let typeObservable = this.getType(typeName);
                type.setUri(new Uri('#'));
                typeObservable.next(type);
                typeObservable.complete();
            }
        }
    }

    fetchFromUri(queryUri:Uri):Observable<ResultPage> {
        return this.requestJson(queryUri).map((jsonResult:any) => {
            this.addJsonResultToCache(jsonResult);

            let result = [];

            if (!jsonResult.data) {
            }
            else if (!!jsonResult.data.type && !!jsonResult.data.id) {
                result = [this.getFromUnitOfWork(jsonResult.data.type, jsonResult.data.id)];

            } else {
                for (let resourceDefinition of jsonResult['data']) {
                    let resource = this.getFromUnitOfWork(resourceDefinition.type, resourceDefinition.id);
                    if (resource) {
                        result.push(resource);
                    }
                }
            }

            return new ResultPage(result, jsonResult.links);
        });
    }

    fetchContentFromUri(queryUri:Uri):Observable<ResourceProxy[]> {
        return this.fetchFromUri(queryUri).map((resultPage:ResultPage) => {
            return resultPage.data;
        });
    }

    findResultPageByTypeAndFilter(typeName:string, filter?:{[key:string]:any}, include?:string[]):Observable<ResultPage> {
        return this.getType(typeName).map((type) => {
            let queryUri = type.getUri();
            let queryArguments = queryUri.getArguments();
            queryArguments['filter'] = queryArguments['filter'] || {};
            for (let key in (filter || {})) {
                queryArguments['filter'][key] = filter[key];
            }
            if (queryArguments['filter'] == {}) {
                delete queryArguments['filter'];
            }
            queryArguments['include'] = (include || []).join(',');
            if (!queryArguments['include']) {
                delete queryArguments['include'];
            }
            queryUri.setArguments(queryArguments);

            return this.fetchFromUri(queryUri);

        }).flatMap(value => value);
    }

    findByTypeAndFilter(typeName:string, filter?:{[key:string]:any}, include?:string[]):Observable<ResourceProxy[]> {
        return this.findResultPageByTypeAndFilter(typeName, filter, include).map((resultPage:ResultPage) => {
            return resultPage.data;
        });
    }

    getFromUnitOfWork(type:string, id:string):ResourceProxy {
        let cacheIdentifier = this.calculateCacheIdentifier(type, id);
        return this.unitOfWork[cacheIdentifier];
    }

    add(resource:ResourceProxy):Promise<any> {
        return new Promise((resolve, reject) => {
            let postBody = JSON.stringify({data: resource.payload});
            let targetUri = resource.$type.getUri().toString();
            this.http.post(targetUri, postBody, this.getRequestOptions('post')).subscribe(
                (response) => {
                    resolve(response);
                }, (response) => {
                    reject(response);
                });
        });
    }

    create(type:string, id:string, defaultValue:{[key:string]:any} = {}, initializeEmptyRelationships:boolean = true):ResourceProxy {
        this.addJsonResultToCache({data: {type: type, id: id}}, initializeEmptyRelationships);
        let result = this.getFromUnitOfWork(type, id);
        for (let propertyName in defaultValue) {
            result.offsetSet(propertyName, defaultValue[propertyName]);
        }
        return result;
    }

    protected getType(typeName:string):ReplaySubject<Type> {
        if (!this.typeObservables[typeName]) {
            this.typeObservables[typeName] = new ReplaySubject<Type>(1);
        }
        return this.typeObservables[typeName];
    }

    protected requestJson(uri:Uri):Observable<any> {
        let uriString = uri.toString();

        let requestOptions = this.getRequestOptions('get', uriString);

        return this.http.get(uriString, requestOptions).map((result) => {
            let body:string = result.text();
            return JSON.parse(body);
        });
    }

    protected addJsonResultToCache(result:any, initializeEmptyRelationships:boolean = false) {
        let postProcessing = [];

        for (let slotName of ['data', 'included']) {
            if (!result[slotName]) {
                continue;
            }
            let slotContent = [];
            if (result[slotName].hasOwnProperty('id') && result[slotName].hasOwnProperty('type')) {
                slotContent = [result[slotName]];
            } else {
                slotContent = result[slotName];
            }
            for (let resourceDefinition of slotContent) {
                let typeName = resourceDefinition.type;
                let id = resourceDefinition.id;
                this.getType(typeName).subscribe((type) => {
                    let resource = this.getFromUnitOfWork(typeName, id);
                    if (!resource) {
                        resource = type.createNewObject(this, initializeEmptyRelationships);
                        let cacheIdentifier = this.calculateCacheIdentifier(typeName, id);
                        this.unitOfWork[cacheIdentifier] = resource;
                        resource.payload.id = id;
                    }
                    postProcessing = [...postProcessing, ...this.assignResourceDefinitionToPayload(resource.payload, resourceDefinition, type)];
                });
            }
        }

        postProcessing.forEach((callable) => {
            callable();
        });
    }

    protected assignResourceDefinitionToPayload(payload:Payload, resourceDefinition:Payload, type:Type):(any[]) {
        let postProcessing = [];

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
                if (!payload.relationships.hasOwnProperty(property.name)) {
                    payload.relationships[property.name] = {};
                }
                if (resourceDefinition.relationships[property.name].hasOwnProperty('links')) {
                    if (!payload.relationships[property.name].hasOwnProperty('links')) {
                        payload.relationships[property.name]['links'] = {};
                        for (let linkName in resourceDefinition.relationships[property.name].links) {
                            payload.relationships[property.name].links[linkName] = resourceDefinition.relationships[property.name].links[linkName];
                        }
                    }
                }
                if (resourceDefinition.relationships[property.name].hasOwnProperty('data')) {
                    payload.relationships[property.name]['data'] = resourceDefinition.relationships[property.name]['data'];
                    postProcessing.push(() => {
                        payload.propertyChanged.emit(property.name);
                    });
                }
            }
        }
        return postProcessing;
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
                requestOptions.headers.set('Content-Type', this.contentType);
            case 'get':
                requestOptions.headers.set('Accept', this.contentType);
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
