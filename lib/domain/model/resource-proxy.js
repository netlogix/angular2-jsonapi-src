"use strict";
var property_1 = require("./property");
var ResourceProxy = (function () {
    function ResourceProxy() {
        this._propertyValue = {};
        this._relationshipLoaded = {};
        this._relatedDataLoaded = {};
        this._propertyBasedCacheState = '';
        this._type = this.constructor['_type'];
        if (!this._type) {
            throw 'This object is not registered as jsonapi resource: ' + this.constructor;
        }
        this._type.registerAccessesors(this);
        this.payload = this._type.getPayloadTemplate();
    }
    Object.defineProperty(ResourceProxy.prototype, "$type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ResourceProxy.prototype, "$identity", {
        get: function () {
            return {
                id: this._payload.id,
                type: this._payload.type
            };
        },
        enumerable: true,
        configurable: true
    });
    ResourceProxy.prototype.toString = function () {
        return '[[' + this.$identity.type + '][' + this.$identity.id + ']]';
    };
    Object.defineProperty(ResourceProxy.prototype, "payload", {
        get: function () {
            return this._payload;
        },
        set: function (payload) {
            this._payload = payload;
        },
        enumerable: true,
        configurable: true
    });
    ResourceProxy.prototype.offsetLoadedEvent = function (propertyName) {
        return this.getLoadedEventPrimiseAndResolver(propertyName).promise;
    };
    ResourceProxy.prototype.getLoadedEventPrimiseAndResolver = function (propertyName) {
        var _this = this;
        this.resetPropertyBasedCaches();
        if (!this._relatedDataLoaded[propertyName]) {
            this._relatedDataLoaded[propertyName] = {
                promise: null,
                resolve: null
            };
            this._relatedDataLoaded[propertyName].promise = new Promise(function (resolve) {
                _this._relatedDataLoaded[propertyName].resolve = resolve;
            });
        }
        return this._relatedDataLoaded[propertyName];
    };
    ResourceProxy.prototype.offsetExists = function (propertyName) {
        return !!this._type.getPropertyDefinition(propertyName);
    };
    ResourceProxy.prototype.offsetGet = function (propertyName) {
        this.resetPropertyBasedCaches();
        if (this._propertyValue[propertyName]) {
            return this._propertyValue[propertyName];
        }
        else {
            var result = void 0;
            var property = this._type.getPropertyDefinition(propertyName);
            switch (property.type) {
                case property_1.Property.ATTRIBUTE_TYPE:
                    result = this.offsetGetForAttribute(property.name);
                    break;
                case property_1.Property.SINGLE_RELATIONSHIP_TYPE:
                    result = this.offsetGetForSingleRelationship(property.name);
                    break;
                case property_1.Property.COLLECTION_RELATIONSHIP_TYPE:
                    result = this.offsetGetForCollectionelationship(property.name);
                    break;
            }
            this._propertyValue[propertyName] = result;
            return this._propertyValue[propertyName];
        }
    };
    ResourceProxy.prototype.offsetSet = function (propertyName, value) {
        var property = this._type.getPropertyDefinition(propertyName);
        switch (property.type) {
            case property_1.Property.ATTRIBUTE_TYPE:
                this.offsetSetForAttribute(property.name, value);
                break;
            case property_1.Property.SINGLE_RELATIONSHIP_TYPE:
                this.offsetSetForSingleRelationship(property.name, value);
                break;
            case property_1.Property.COLLECTION_RELATIONSHIP_TYPE:
                this.offsetSetForCollectionelationship(property.name, value);
                break;
        }
        this.resetPropertyBasedCaches();
    };
    ResourceProxy.prototype.offsetGetForAttribute = function (propertyName) {
        return this._payload['attributes'][propertyName];
    };
    ResourceProxy.prototype.offsetGetForSingleRelationship = function (propertyName) {
        var _this = this;
        var result = {};
        this.loadRelationship(propertyName).then(function (payload) {
            _this._type.consumerBackend.getPlaceholderForTypeAndId(result, payload['type'], payload['id']).then(function () {
                _this.getLoadedEventPrimiseAndResolver(propertyName).resolve(result);
            });
        });
        return result;
    };
    ResourceProxy.prototype.offsetGetForCollectionelationship = function (propertyName) {
        var _this = this;
        var results = [];
        this.loadRelationship(propertyName).then(function () {
            var queue = [];
            for (var _i = 0, _a = _this._payload['relationships'][propertyName]['data']; _i < _a.length; _i++) {
                var payload = _a[_i];
                var result = {};
                results.push(result);
                queue.push(_this._type.consumerBackend.getPlaceholderForTypeAndId(result, payload['type'], payload['id']));
            }
            Promise.all(queue).then(function () {
                _this.getLoadedEventPrimiseAndResolver(propertyName).resolve(results);
            });
        });
        return results;
    };
    ResourceProxy.prototype.loadRelationship = function (propertyName) {
        var _this = this;
        this.resetPropertyBasedCaches();
        if (this._relationshipLoaded[propertyName]) {
            return this._relationshipLoaded[propertyName];
        }
        if (this._payload['relationships'][propertyName].hasOwnProperty('data') || !this._payload['relationships'][propertyName]['links'].hasOwnProperty('related')) {
            this._relationshipLoaded[propertyName] = new Promise(function (resolve) {
                resolve(_this._payload['relationships'][propertyName]['data']);
            });
            return this._relationshipLoaded[propertyName];
        }
        else {
            this._relationshipLoaded[propertyName] = new Promise(function (resolve) {
                if (_this._type.getPropertyDefinition(propertyName).type == property_1.Property.COLLECTION_RELATIONSHIP_TYPE) {
                    _this._payload['relationships'][propertyName]['data'] = [];
                    _this._type.consumerBackend.fetchFromUri(_this._payload['relationships'][propertyName]['links']['related']).then(function (results) {
                        for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                            var option = results_1[_i];
                            _this._payload['relationships'][propertyName]['data'].push(option.$identity);
                        }
                    });
                    resolve(_this._payload['relationships'][propertyName]['data']);
                }
                else if (_this._type.getPropertyDefinition(propertyName).type == property_1.Property.SINGLE_RELATIONSHIP_TYPE) {
                    _this._type.consumerBackend.fetchFromUri(_this._payload['relationships'][propertyName]['links']['related']).then(function (results) {
                        _this._payload['relationships'][propertyName]['data'] = results.$identity;
                    });
                    resolve(_this._payload['relationships'][propertyName]['data']);
                }
            });
            return this._relationshipLoaded[propertyName];
        }
    };
    ResourceProxy.prototype.offsetSetForAttribute = function (propertyName, value) {
        this._payload['attributes'][propertyName] = value;
    };
    ResourceProxy.prototype.offsetSetForSingleRelationship = function (propertyName, value) {
        this._payload['relationships'][propertyName]['data'] = value.$identity;
    };
    ResourceProxy.prototype.offsetSetForCollectionelationship = function (propertyName, value) {
        this._payload['relationships'][propertyName]['data'] = [];
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var object = value_1[_i];
            this._payload['relationships'][propertyName]['data'].push(object.$identity);
        }
    };
    ResourceProxy.prototype.resetPropertyBasedCaches = function () {
        var currentState = JSON.stringify(this._payload);
        if (this._propertyBasedCacheState === currentState) {
            return;
        }
        this._propertyValue = {};
        this._relationshipLoaded = {};
        this._relatedDataLoaded = {};
        this._propertyBasedCacheState = currentState;
    };
    ResourceProxy._typeName = 'netlogix/resource';
    ResourceProxy._properties = {};
    return ResourceProxy;
}());
exports.ResourceProxy = ResourceProxy;
//# sourceMappingURL=resource-proxy.js.map