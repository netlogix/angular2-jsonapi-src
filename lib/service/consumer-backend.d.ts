import { Http, RequestOptions } from '@angular/http';
import { Observable, Subscriber } from "rxjs/Rx";
import { ResourceProxy } from "../domain/model/resource-proxy";
import { Type } from "../domain/model/type";
import { Uri } from "../domain/model/uri";
import { Payload } from "../domain/model/payload";
export declare class ConsumerBackend {
    private http;
    private requestOptions;
    protected static contentType: string;
    protected types: {};
    protected typeObservables: {};
    protected headers: {
        [uriPattern: string]: {
            [header: string]: string;
        };
    };
    protected resources: {
        [cacheIdentifier: string]: ResourceProxy;
    };
    constructor(http: Http, requestOptions: RequestOptions);
    addType(type: Type): void;
    getType(typeName: string): Type;
    getTypeObservable(typeName: string): {
        observable: Observable<Type>;
        subscriber: Subscriber<Type>;
    };
    getTypePromise(typeName: string): {
        promise: Promise<Type>;
        resolve: any;
    };
    registerEndpointsByEndpointDiscovery(endpointDiscovery: Uri): void;
    findByTypeAndFilter(typeName: string, filter?: {
        [key: string]: any;
    }, include?: string[]): Promise<any>;
    fetchFromUri(queryUri: Uri): Promise<any>;
    fetchByTypeAndId(type: string, id: string): Promise<any>;
    getPlaceholderForTypeAndId(placeholder: any, type: string, id: string): Promise<any>;
    add(resource: ResourceProxy): Promise<any>;
    protected requestJson(uri: Uri): Promise<any>;
    protected addJsonResultToCache(result: any): void;
    protected assignResourceDefinitionToPayload(payload: Payload, resourceDefinition: Payload, type: Type): void;
    protected getResourceProxyFromCache(type: string, id: string): ResourceProxy;
    protected calculateCacheIdentifier(type: string, id: string): string;
    protected getRequestOptions(method: string, requestUri?: string): RequestOptions;
}
