"use strict";
var Property = (function () {
    function Property() {
    }
    Property.attr = function (name, options) {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        }
        else {
            return {
                type: Property.ATTRIBUTE_TYPE,
                name: name
            };
        }
    };
    Property.hasOne = function (name, options) {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        }
        else {
            return {
                type: Property.SINGLE_RELATIONSHIP_TYPE,
                name: name
            };
        }
    };
    Property.hasMany = function (name, options) {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        }
        else {
            return {
                type: Property.COLLECTION_RELATIONSHIP_TYPE,
                name: name
            };
        }
    };
    Property.undefined = function (name, options) {
        if (name && typeof name === 'object') {
            return Property.attr(null, name);
        }
        else {
            return {
                type: Property.UNDEFINED_TYPE,
                name: name
            };
        }
    };
    Property.UNDEFINED_TYPE = null;
    Property.ATTRIBUTE_TYPE = 'attribute';
    Property.SINGLE_RELATIONSHIP_TYPE = 'single';
    Property.COLLECTION_RELATIONSHIP_TYPE = 'collection';
    return Property;
}());
exports.Property = Property;
//# sourceMappingURL=property.js.map