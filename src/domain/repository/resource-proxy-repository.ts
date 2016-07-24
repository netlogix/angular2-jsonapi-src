import {Observable} from "rxjs/Rx";
import {ConsumerBackend, ResourceProxy} from "../../";

export abstract class ResourceProxyRepository {
    protected resource = ResourceProxy;

    constructor(protected _consumerBackend:ConsumerBackend) {
    }

    findAll(filter?:{[key:string]:any}, include?:string[]):Observable<ResourceProxy[]> {
        return this._consumerBackend.findByTypeAndFilter(this.resource._typeName, filter, include);
    }

    findOne(filter?:{[key:string]:any}, include?:string[]):Observable<ResourceProxy> {
        return this.findAll(filter, include).map((values) => {
            if (values.length) {
                return values[0];
            }
            throw 'The object of type "' + this.resource._typeName + '" does not exist.';
        });
    }

    findByIdentifier(identifier:string, include?:string[]):Observable<ResourceProxy> {
        return this.findOne({__identity: identifier}, include);
    }
}
