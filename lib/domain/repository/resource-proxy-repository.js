"use strict";
var resource_proxy_1 = require("../model/resource-proxy");
var ResourceProxyRepository = (function () {
    function ResourceProxyRepository(_consumerBackend) {
        this._consumerBackend = _consumerBackend;
        this.resource = resource_proxy_1.ResourceProxy;
    }
    ResourceProxyRepository.prototype.findAll = function (filter, include) {
        return this._consumerBackend.findByTypeAndFilter(this.resource._typeName, filter, include);
    };
    ResourceProxyRepository.prototype.findOne = function (filter, include) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.findAll(filter, include).then(function (seminars) {
                if (seminars.length) {
                    resolve(seminars[0]);
                }
                else {
                    reject('The object of type "' + _this.resource._typeName + '" does not exist.');
                }
            });
        });
    };
    ResourceProxyRepository.prototype.findByIdentifier = function (identifier, include) {
        return this.findOne({ __identity: identifier }, include);
    };
    return ResourceProxyRepository;
}());
exports.ResourceProxyRepository = ResourceProxyRepository;
//# sourceMappingURL=resource-proxy-repository.js.map