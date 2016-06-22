import { ResourceProxy } from "../model/resource-proxy";
import { ConsumerBackend } from "../../service/consumer-backend";
export declare abstract class ResourceProxyRepository {
    protected _consumerBackend: ConsumerBackend;
    protected resource: typeof ResourceProxy;
    constructor(_consumerBackend: ConsumerBackend);
    findAll(filter?: {
        [key: string]: any;
    }, include?: string[]): Promise<ResourceProxy[]>;
    findOne(filter?: {
        [key: string]: any;
    }, include?: string[]): Promise<ResourceProxy>;
    findByIdentifier(identifier: string, include?: string[]): Promise<ResourceProxy>;
}
