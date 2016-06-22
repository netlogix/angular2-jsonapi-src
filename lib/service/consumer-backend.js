"use strict";
var http_1 = require('@angular/http');
var Rx_1 = require("rxjs/Rx");
var uri_1 = require("../domain/model/uri");
var property_1 = require("../domain/model/property");
var ConsumerBackend = (function () {
    function ConsumerBackend(http, requestOptions) {
        this.http = http;
        this.requestOptions = requestOptions;
        this.types = {};
        this.typeObservables = {};
        this.headers = {};
        this.resources = {};
    }
    ConsumerBackend.prototype.addType = function (type) {
        type.consumerBackend = this;
        this.types[type.getTypeName()] = type;
    };
    ConsumerBackend.prototype.getType = function (typeName) {
        return this.types[typeName];
    };
    ConsumerBackend.prototype.getTypeObservable = function (typeName) {
        var _this = this;
        if (!this.typeObservables[typeName]) {
            this.typeObservables[typeName] = {
                observable: false,
                subscriber: false
            };
            var observable_1 = Rx_1.Observable.create(function (subscriber) {
                _this.typeObservables[typeName].observable = observable_1;
                _this.typeObservables[typeName].subscriber = subscriber;
            });
            observable_1.subscribe();
        }
        return this.typeObservables[typeName];
    };
    ConsumerBackend.prototype.getTypePromise = function (typeName) {
        var _this = this;
        if (!this.typeObservables[typeName]) {
            this.typeObservables[typeName] = {
                promise: false,
                resolve: false
            };
            var promise = new Promise(function (resolve) {
                _this.typeObservables[typeName].resolve = resolve;
            });
            this.typeObservables[typeName].promise = promise;
        }
        return this.typeObservables[typeName];
    };
    ConsumerBackend.prototype.registerEndpointsByEndpointDiscovery = function (endpointDiscovery) {
        var _this = this;
        this.requestJson(endpointDiscovery).then(function (result) {
            for (var _i = 0, _a = result['links']; _i < _a.length; _i++) {
                var link = _a[_i];
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
                var typeName = link.meta.resourceType;
                var type = _this.getType(typeName);
                if (!type) {
                    continue;
                }
                type.setUri(new uri_1.Uri(link.href));
                _this.getTypePromise(typeName).resolve(type);
            }
        });
    };
    ConsumerBackend.prototype.findByTypeAndFilter = function (typeName, filter, include) {
        var _this = this;
        if (!filter) {
            filter = {};
        }
        if (!include) {
            include = [];
        }
        return new Promise(function (resolve) {
            var subscription = function (x) {
                var type = _this.getType(typeName);
                var queryUri = type.getUri();
                var queryArguments = queryUri.getArguments();
                queryArguments['filter'] = queryArguments['filter'] || {};
                for (var key in filter) {
                    var value = filter[key];
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
                _this.fetchFromUri(queryUri).then(function (result) {
                    resolve(result);
                });
            };
            _this.getTypePromise(typeName).promise.then(subscription);
        });
    };
    ConsumerBackend.prototype.fetchFromUri = function (queryUri) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.requestJson(queryUri).then(function (jsonResult) {
                _this.addJsonResultToCache(jsonResult);
                if (!jsonResult.data) {
                    resolve([]);
                    return;
                }
                if (!!jsonResult.data.type && !!jsonResult.data.id) {
                    resolve(_this.getResourceProxyFromCache(jsonResult.data.type, jsonResult.data.id));
                    return;
                }
                else {
                    var result = [];
                    for (var _i = 0, _a = jsonResult['data']; _i < _a.length; _i++) {
                        var resourceDefinition = _a[_i];
                        var resource = _this.getResourceProxyFromCache(resourceDefinition.type, resourceDefinition.id);
                        if (resource) {
                            result.push(resource);
                        }
                    }
                    resolve(result);
                    return;
                }
            });
        });
    };
    ConsumerBackend.prototype.fetchByTypeAndId = function (type, id) {
        var _this = this;
        return new Promise(function (resolve) {
            resolve(_this.getResourceProxyFromCache(type, id));
        });
    };
    ConsumerBackend.prototype.getPlaceholderForTypeAndId = function (placeholder, type, id) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.fetchByTypeAndId(type, id).then(function (object) {
                Object.setPrototypeOf(placeholder, object);
                resolve(placeholder);
            });
        });
    };
    ConsumerBackend.prototype.add = function (resource) {
        var _this = this;
        var requestOptions = this.requestOptions.merge({});
        return new Promise(function (resolve) {
            var postBody = {
                data: resource.payload
            };
            _this.http.post(resource.$type.getUri().toString(), JSON.stringify(postBody), _this.getRequestOptions('post')).subscribe(function (response) {
                resolve(response);
            });
        });
    };
    ConsumerBackend.prototype.requestJson = function (uri) {
        var _this = this;
        var uriString = uri.toString();
        var requestOptions = this.getRequestOptions('get', uriString);
        var headers = JSON.stringify(requestOptions.headers.toJSON());
        var cacheIdentifier = JSON.stringify(headers) + '|' + uriString;
        return new Promise(function (resolve) {
            _this.http.get(uriString, requestOptions).subscribe(function (result) {
                var body = result.text();
                resolve(JSON.parse(body));
            });
        });
    };
    ConsumerBackend.prototype.addJsonResultToCache = function (result) {
        for (var _i = 0, _a = ['data', 'included']; _i < _a.length; _i++) {
            var slotName = _a[_i];
            if (!result[slotName]) {
                continue;
            }
            for (var _b = 0, _c = result[slotName]; _b < _c.length; _b++) {
                var resourceDefinition = _c[_b];
                var typeName = resourceDefinition.type;
                var id = resourceDefinition.id;
                var type = this.getType(typeName);
                if (!type) {
                    continue;
                }
                var resource = this.getResourceProxyFromCache(typeName, id);
                if (!resource) {
                    resource = type.createNewObject(this);
                    var cacheIdentifier = this.calculateCacheIdentifier(typeName, id);
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
    };
    ConsumerBackend.prototype.assignResourceDefinitionToPayload = function (payload, resourceDefinition, type) {
        if (resourceDefinition.hasOwnProperty('links')) {
            payload.links = Object.assign(payload.links, resourceDefinition.links);
        }
        if (resourceDefinition.hasOwnProperty('meta')) {
            payload.meta = Object.assign(payload.meta, resourceDefinition.meta);
        }
        for (var propertyName in type.getProperties()) {
            var property = type.getPropertyDefinition(propertyName);
            if (property.type === property_1.Property.ATTRIBUTE_TYPE) {
                if (!resourceDefinition.hasOwnProperty('attributes')) {
                    continue;
                }
                if (!resourceDefinition.attributes.hasOwnProperty(property.name)) {
                    continue;
                }
                payload.attributes[property.name] = resourceDefinition.attributes[property.name];
            }
            else {
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
    };
    ConsumerBackend.prototype.getResourceProxyFromCache = function (type, id) {
        var cacheIdentifier = this.calculateCacheIdentifier(type, id);
        return this.resources[cacheIdentifier];
    };
    ConsumerBackend.prototype.calculateCacheIdentifier = function (type, id) {
        return type + "\n" + id;
    };
    ConsumerBackend.prototype.getRequestOptions = function (method, requestUri) {
        var requestOptions = this.requestOptions.merge({
            headers: new http_1.Headers(this.requestOptions.headers.toJSON())
        });
        switch (method.toLocaleLowerCase()) {
            case 'post':
                requestOptions.headers.set('Content-Type', ConsumerBackend.contentType);
            case 'get':
                requestOptions.headers.set('Accept', ConsumerBackend.contentType);
                break;
        }
        if (requestUri) {
            for (var uriPattern in this.headers) {
                var headersForUriPattern = this.headers[uriPattern];
                for (var key in headersForUriPattern) {
                    var value = headersForUriPattern[key];
                    requestOptions.headers.set(key, value);
                }
            }
        }
        return requestOptions;
    };
    ConsumerBackend.contentType = 'application/vnd.api+json';
    return ConsumerBackend;
}());
exports.ConsumerBackend = ConsumerBackend;
//# sourceMappingURL=consumer-backend.js.map