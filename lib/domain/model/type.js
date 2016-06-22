"use strict";
var property_1 = require("./property");
var Type = (function () {
    function Type(typeName, resourceProxy, properties, uri) {
        if (properties === void 0) { properties = {}; }
        if (uri === void 0) { uri = null; }
        this._typeName = typeName;
        this._resourceProxy = resourceProxy;
        this._properties = properties;
        this._properties = JSON.parse(JSON.stringify(properties));
        resourceProxy._type = this;
        if (uri) {
            this.setUri(uri);
        }
    }
    Type.prototype.setUri = function (uri) {
        this._uri = uri;
    };
    Type.prototype.getUri = function () {
        return this._uri.clone();
    };
    Type.prototype.getTypeName = function () {
        return this._typeName;
    };
    Type.prototype.getResourceProxy = function () {
        return this._resourceProxy;
    };
    Type.prototype.createNewObject = function (consumerBackend) {
        return new this._resourceProxy();
    };
    Type.prototype.getPropertyDefinition = function (propertyName) {
        if (this._properties[propertyName]) {
            return this._properties[propertyName];
        }
        else {
            return property_1.Property.undefined(propertyName);
        }
    };
    Type.prototype.getProperties = function () {
        return this._properties;
    };
    Type.prototype.registerAccessesors = function (object) {
        var payload = object.payload;
        var _loop_1 = function(propertyName) {
            var property = this_1._properties[propertyName];
            Object.defineProperty(object, propertyName, {
                get: function () {
                    return object.offsetGet(propertyName);
                },
                set: function (value) {
                    object.offsetSet(propertyName, value);
                }
            });
            if (property.type === property_1.Property.SINGLE_RELATIONSHIP_TYPE || property.type === property_1.Property.COLLECTION_RELATIONSHIP_TYPE) {
                Object.defineProperty(object, propertyName + 'Loaded', {
                    get: function () {
                        object.offsetGet(propertyName);
                        return object.offsetLoadedEvent(propertyName);
                    }
                });
            }
        };
        var this_1 = this;
        for (var propertyName in this._properties) {
            _loop_1(propertyName);
        }
    };
    Type.prototype.getPayloadTemplate = function () {
        var payload = {
            type: this.getTypeName(),
            attributes: {},
            relationships: {}
        };
        for (var propertyName in this._properties) {
            switch (this._properties[propertyName].type) {
                case property_1.Property.ATTRIBUTE_TYPE:
                    payload.attributes[propertyName] = null;
                    break;
                case property_1.Property.SINGLE_RELATIONSHIP_TYPE:
                    payload.relationships[propertyName] = { data: null };
                    break;
                case property_1.Property.COLLECTION_RELATIONSHIP_TYPE:
                    payload.relationships[propertyName] = { data: [] };
                    break;
            }
        }
        return payload;
    };
    return Type;
}());
exports.Type = Type;
//# sourceMappingURL=type.js.map