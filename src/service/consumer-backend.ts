import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { Payload } from '../domain/model/payload';
import { Property } from '../domain/model/property';
import { ResourceProxy } from '../domain/model/resource-proxy';
import { ResultPage } from '../domain/model/result-page';
import { Type } from '../domain/model/type';
import { Uri } from '../domain/model/uri';

export class ConsumerBackend {

  public contentType = 'application/vnd.api+json';

  protected types: { [typeName: string]: Type } = {};

  protected typeObservables: { [typeName: string]: ReplaySubject<Type> } = {};

  protected unitOfWork: { [cacheIdentifier: string]: ResourceProxy } = {};

  constructor(protected httpClient: HttpClient) {
  }

  addType(type: Type) {
    type.consumerBackend = this;
    this.types[type.getTypeName()] = type;
  }

  registerEndpointsByEndpointDiscovery(endpointDiscovery: Uri): Promise<any> {
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

  registerEndpoint(typeName: string, href: string) {
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
      const type = <Type> this.types[typeName];
      if (!type.getUri()) {
        let typeObservable = this.getType(typeName);
        type.setUri(new Uri('#'));
        typeObservable.next(type);
        typeObservable.complete();
      }
    }
  }

  fetchFromUri(queryUri: Uri): Observable<ResultPage> {
    return map.call(this.requestJson(queryUri), (jsonResult: any) => {
      this.addJsonResultToCache(jsonResult);

      const result: ResourceProxy[] = [];

      if (!jsonResult.data) {
      } else if (!!jsonResult.data.type && !!jsonResult.data.id) {
        result.push(this.getFromUnitOfWork(jsonResult.data.type, jsonResult.data.id));
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

  fetchContentFromUri(queryUri: Uri): Observable<ResourceProxy[]> {
    return map.call(this.fetchFromUri(queryUri), (resultPage: ResultPage) => resultPage.data);
  }

  findResultPageByTypeAndFilter(typeName: string, filter?: { [key: string]: any }, include?: string[]): Observable<ResultPage> {
    return mergeMap.call(map.call(this.getType(typeName), (type: Type) => {
      let queryUri = type.getUri();
      let queryArguments: any = queryUri.getArguments();
      queryArguments['filter'] = queryArguments['filter'] || {};
      for (let key in (filter || {})) {
        queryArguments['filter'][key] = filter[key];
      }
      if (queryArguments['filter'] === {}) {
        delete queryArguments['filter'];
      }
      queryArguments['include'] = (include || []).join(',');
      if (!queryArguments['include']) {
        delete queryArguments['include'];
      }
      queryUri.setArguments(queryArguments);

      return this.fetchFromUri(queryUri);
    }), ((value: any) => value));
  }

  findByTypeAndFilter(typeName: string, filter?: { [key: string]: any }, include?: string[]): Observable<ResourceProxy[]> {
    return map.call(this.findResultPageByTypeAndFilter(typeName, filter, include), (resultPage: ResultPage) => {
      return resultPage.data;
    });
  }

  getFromUnitOfWork(type: string, id: string): ResourceProxy {
    const cacheIdentifier = this.calculateCacheIdentifier(type, id);
    return this.unitOfWork[cacheIdentifier];
  }

  add(resource: ResourceProxy): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getType(resource.$type.getTypeName()).asObservable().subscribe(() => {
        let targetUri = resource.$type.getUri().toString();
        this.addToUri(resource, targetUri)
          .then(response => resolve(response))
          .catch(error => reject(error));
      });
    });
  }

  addToUri(resource: ResourceProxy, targetUri: string) {
    return new Promise((resolve, reject) => {
      let postBody = JSON.stringify({data: resource.payload});
      this.httpClient.post(targetUri, postBody, {
        headers: new HttpHeaders({'Content-Type': this.contentType})
      }).subscribe(response => resolve(response), response => reject(response));
    });
  }

  create(type: string, id: string, defaultValue: { [key: string]: any } = {}, initializeEmptyRelationships: boolean = true): ResourceProxy {
    this.addJsonResultToCache({data: {type: type, id: id}}, initializeEmptyRelationships);
    let result = this.getFromUnitOfWork(type, id);
    for (let propertyName in defaultValue) {
      result.offsetSet(propertyName, defaultValue[propertyName]);
    }
    return result;
  }

  getResourceType(typeName: string): Observable<Type> {
    return this.getType(typeName).asObservable();
  }

  protected getType(typeName: string): ReplaySubject<Type> {
    if (!this.typeObservables[typeName]) {
      this.typeObservables[typeName] = new ReplaySubject<Type>(1);
    }
    return this.typeObservables[typeName];
  }

  protected requestJson(uri: Uri): Observable<any> {
    const uriString = uri.toString();

    return this.httpClient.get(uriString, {
      headers: new HttpHeaders({'Accept': this.contentType})
    });
  }

  protected addJsonResultToCache(result: any, initializeEmptyRelationships: boolean = false) {
    let postProcessing: any = [];

    ['data', 'included'].forEach((slotName: string) => {
      if (!result[slotName]) {
        return;
      }
      let slotContent = [];
      if (result[slotName].hasOwnProperty('id') && result[slotName].hasOwnProperty('type')) {
        slotContent = [result[slotName]];
      } else {
        slotContent = result[slotName];
      }
      slotContent.forEach((resourceDefinition: Payload) => {
        let typeName: string = resourceDefinition.type;
        let id: string = resourceDefinition.id;
        this.getType(typeName).subscribe((type: Type) => {
          let resource = <ResourceProxy>this.getFromUnitOfWork(typeName, id);
          if (!resource) {
            resource = type.createNewObject(this, initializeEmptyRelationships);
            let cacheIdentifier = this.calculateCacheIdentifier(typeName, id);
            this.unitOfWork[cacheIdentifier] = resource;
            resource.payload.id = id;
          }
          postProcessing = [...postProcessing, ...this.assignResourceDefinitionToPayload(resource.payload, resourceDefinition, type)];
        });
      });
    });

    postProcessing.forEach((callable: { (): void }) => {
      callable();
    });
  }

  protected assignResourceDefinitionToPayload(payload: Payload, resourceDefinition: Payload, type: Type): (any[]) {
    let postProcessing: any = [];

    if (resourceDefinition.hasOwnProperty('links')) {
      payload.links = resourceDefinition.links;
    }
    if (resourceDefinition.hasOwnProperty('meta')) {
      payload.meta = resourceDefinition.meta;
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

  protected calculateCacheIdentifier(type: string, id: string): string {
    return `${type}\n${id}`;
  }

}
