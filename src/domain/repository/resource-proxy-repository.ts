import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operator/map';
import { ResourceProxy } from '../model/resource-proxy';
import { ConsumerBackend } from '../../service/consumer-backend';

export abstract class ResourceProxyRepository {
  protected resource = ResourceProxy;

  constructor(protected _consumerBackend: ConsumerBackend) {
  }

  findAll(filter?: { [key: string]: any }, include?: string[]): Observable<ResourceProxy[]> {
    return this._consumerBackend.findByTypeAndFilter(this.resource._typeName, filter, include);
  }

  findOne(filter?: { [key: string]: any }, include?: string[]): Observable<ResourceProxy> {
    return map.call(this.findAll(filter, include), (values) => {
      if (values.length) {
        return values[0];
      }
      throw 'The object of type "' + this.resource._typeName + '" does not exist.';
    });
  }

  findByIdentifier(identifier: string, include?: string[]): Observable<ResourceProxy> {
    return this.findOne({__identity: identifier}, include);
  }
}
