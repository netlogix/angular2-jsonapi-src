import {ResourceProxy} from "../model/resource-proxy";
import {ConsumerBackend} from "../../service/consumer-backend";

export abstract class ResourceProxyRepository {
    protected resource = ResourceProxy;

    constructor(protected _consumerBackend:ConsumerBackend) {
    }

    findAll(filter?:{[key:string]:any}, include?:string[]):Promise<ResourceProxy[]> {
        return this._consumerBackend.findByTypeAndFilter(this.resource._typeName, filter, include);
    }

    findOne(filter?:{[key:string]:any}, include?:string[]):Promise<ResourceProxy> {
        return new Promise((resolve, reject) => {
            this.findAll(filter, include).then((seminars:ResourceProxy[]) => {
                if (seminars.length) {
                    resolve(seminars[0]);
                } else {
                    reject('The object of type "' + this.resource._typeName + '" does not exist.');
                }
            });
        });
    }

    findByIdentifier(identifier:string, include?:string[]):Promise<ResourceProxy> {
        return this.findOne({__identity: identifier}, include);
    }
}
