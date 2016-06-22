"use strict";
var Uri = (function () {
    function Uri(uri) {
        this._uri = uri;
        var matches = uri.match(/^(https?)?(:\/\/([^/]+))?([^\?]+)?(\?([^#]+))?(#(.*))*$/i);
        if (matches) {
            this._schema = matches[1];
            this._host = matches[3];
            this._path = matches[4];
            this._queryString = matches[6];
        }
    }
    Uri.prototype.getArguments = function () {
        var result = this.parseQueryString(this._queryString);
        return result;
    };
    Uri.prototype.setArguments = function (newArgs) {
        this._queryString = this.buildQueryString(newArgs);
    };
    Uri.prototype.toString = function () {
        var result = '';
        if (this._host) {
            result += this._schema + '://' + this._host;
        }
        if (this._path) {
            result += this._path;
        }
        if (this._queryString) {
            result += '?' + this._queryString;
        }
        return result;
    };
    Uri.prototype.clone = function () {
        return new Uri(this.toString());
    };
    Uri.prototype.parseQueryString = function (queryString) {
        queryString = queryString || '';
        var vars = queryString.split('&');
        var paths = [];
        for (var _i = 0, vars_1 = vars; _i < vars_1.length; _i++) {
            var pair = vars_1[_i];
            if (pair === '=' || pair === '') {
                continue;
            }
            var value = decodeURIComponent(pair.split('=')[1]);
            var path = pair.split('=')[0];
            if (path.indexOf(']') !== -1) {
                path = path.substr(0, path.length - 1);
            }
            var pathArray = path.split(/[\[\]]+/g);
            for (var offset in pathArray) {
                pathArray[offset] = decodeURIComponent(pathArray[offset]);
            }
            paths.push({
                pathString: path,
                path: pathArray,
                value: value
            });
        }
        var result = {};
        for (var _a = 0, paths_1 = paths; _a < paths_1.length; _a++) {
            var argument = paths_1[_a];
            this.addArgumentPathToResult(argument, result);
        }
        return result;
    };
    Uri.prototype.addArgumentPathToResult = function (argument, result) {
        if (argument.path.length === 1) {
            result[argument.path[0]] = argument.value;
        }
        else {
            var nestedArgument = {
                path: argument.path.filter(function (a) {
                    return true;
                }),
                value: argument.value,
            };
            var currentSegment = nestedArgument.path.slice(0, 1)[0];
            nestedArgument.path = nestedArgument.path.slice(1);
            if (!result[currentSegment]) {
                result[currentSegment] = {};
            }
            this.addArgumentPathToResult(nestedArgument, result[currentSegment]);
        }
    };
    Uri.prototype.buildQueryString = function (args) {
        var nachher = {};
        this.traverseQueryString(args, nachher, []);
        var result = [];
        for (var key in nachher) {
            var value = nachher[key];
            key = key.replace(']', '');
            if (key.indexOf('[') > 0) {
                key += ']';
            }
            result.push(key + '=' + value);
        }
        return result.join('&');
    };
    Uri.prototype.traverseQueryString = function (vorher, nachher, path) {
        for (var key in vorher) {
            var value = vorher[key];
            path = path.filter(function (a) {
                return true;
            });
            path.push(encodeURIComponent(key));
            switch (typeof value) {
                case 'object':
                case 'array':
                    this.traverseQueryString(value, nachher, path);
                    break;
                default:
                    nachher[path.join('][')] = encodeURIComponent(value);
                    break;
            }
            path.pop();
        }
    };
    return Uri;
}());
exports.Uri = Uri;
//# sourceMappingURL=uri.js.map