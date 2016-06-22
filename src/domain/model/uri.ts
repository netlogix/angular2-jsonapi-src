export class Uri {
    private _uri:string;
    private _schema:string;
    private _host:string;
    private _path:string;
    private _queryString:string;

    constructor(uri:string) {
        this._uri = uri;
        let matches:string[] = uri.match(/^(https?)?(:\/\/([^/]+))?([^\?]+)?(\?([^#]+))?(#(.*))*$/i);
        if (matches) {
            this._schema = matches[1];
            this._host = matches[3];
            this._path = matches[4];
            this._queryString = matches[6];
        }
    }

    getArguments():any {
        let result = this.parseQueryString(this._queryString);
        return result;
    }

    setArguments(newArgs:any) {
        this._queryString = this.buildQueryString(newArgs);
    }

    toString():string {
        let result = '';
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
    }

    clone():Uri {
        return new Uri(this.toString());
    }

    protected parseQueryString(queryString) {
        queryString = queryString || '';
        let vars = queryString.split('&');

        let paths = [];
        for (let pair of vars) {
            if (pair === '=' || pair === '') {
                continue;
            }
            let value = decodeURIComponent(pair.split('=')[1]);
            let path = pair.split('=')[0];
            if (path.indexOf(']') !== -1) {
                path = path.substr(0, path.length - 1);
            }
            let pathArray = path.split(/[\[\]]+/g);
            for (let offset in pathArray) {
                pathArray[offset] = decodeURIComponent(pathArray[offset]);
            }
            paths.push({
                pathString: path,
                path: pathArray,
                value: value
            });
        }

        let result = {};
        for (let argument of paths) {
            this.addArgumentPathToResult(argument, result);
        }
        return result;
    }

    private addArgumentPathToResult(argument, result) {
        if (argument.path.length === 1) {
            result[argument.path[0]] = argument.value;
        } else {
            let nestedArgument = {
                path: argument.path.filter((a) => {
                    return true
                }),
                value: argument.value,
            };

            let currentSegment = nestedArgument.path.slice(0, 1)[0];
            nestedArgument.path = nestedArgument.path.slice(1);
            if (!result[currentSegment]) {
                result[currentSegment] = {};
            }
            this.addArgumentPathToResult(nestedArgument, result[currentSegment]);
        }
    }

    protected buildQueryString(args:any) {
        let nachher = {};
        this.traverseQueryString(args, nachher, []);

        let result = [];
        for (let key in nachher) {
            let value = nachher[key];
            key = key.replace(']', '');
            if (key.indexOf('[') > 0) {
                key += ']';
            }
            result.push(key + '=' + value);
        }
        return result.join('&');
    }

    private traverseQueryString(vorher, nachher, path) {
        for (let key in vorher) {
            let value = vorher[key];
            path = path.filter((a) => {
                return true
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
    }

}