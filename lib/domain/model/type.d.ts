import { PropertyInterface } from "./property";
import { Uri } from "./uri";
import { ConsumerBackend } from "../../service/consumer-backend";
import { ResourceProxy } from "./resource-proxy";
import { Payload } from "./payload";
export declare class Type {
    private _typeName;
    private _resourceProxy;
    private _properties;
    private _uri;
    consumerBackend: ConsumerBackend;
    constructor(typeName: string, resourceProxy: any, properties?: {
        [propertyName: string]: PropertyInterface;
    }, uri?: Uri);
    setUri(uri: Uri): void;
    getUri(): Uri;
    getTypeName(): string;
    getResourceProxy(): any;
    createNewObject(consumerBackend: ConsumerBackend): any;
    getPropertyDefinition(propertyName: string): PropertyInterface;
    getProperties(): {
        [propertyName: string]: PropertyInterface;
    };
    registerAccessesors(object: ResourceProxy): void;
    getPayloadTemplate(): Payload;
}
