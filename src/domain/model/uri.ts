export class Uri {
  private _uri: string;
  private _schema: string;
  private _host: string;
  private _path: string;
  private _queryString: string;

  constructor(uri: string) {
    this._uri = uri;
    let matches: string[] | null = uri.match(/^(https?)?(:\/\/([^/]+))?([^\?]+)?(\?([^#]+))?(#(.*))*$/i);
    if (matches) {
      this._schema = matches[1];
      this._host = matches[3];
      this._path = matches[4];
      this._queryString = matches[6];
    }
  }

  getArguments(): Object {
    return this.parseQueryString(this._queryString);
  }

  setArguments(newArgs: any) {
    this._queryString = this.buildQueryString(newArgs);
  }

  toString(): string {
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

  clone(): Uri {
    return new Uri(this.toString());
  }

  protected parseQueryString(queryString: string): Object {
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

  private addArgumentPathToResult(argument: any, result: any) {
    if (argument.path.length === 1) {
      result[argument.path[0]] = argument.value;
    } else {
      let nestedArgument = {
        path: argument.path.filter((_: any) => true),
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

  protected buildQueryString(args: any) {
    let after: any = {};
    this.traverseQueryString(args, after, []);

    let result = [];
    for (let key in after) {
      let value = after[key];
      key = key.replace(']', '');
      if (key.indexOf('[') > 0) {
        key += ']';
      }
      result.push(key + '=' + value);
    }
    return result.join('&');
  }

  private traverseQueryString(before: any, after: any, path: any) {
    for (let key in before) {
      let value = before[key];
      path = path.filter((_: any) => true);
      path.push(encodeURIComponent(key));
      switch (typeof value) {
        case 'object':
          this.traverseQueryString(value, after, path);
          break;
        default:
          after[path.join('][')] = encodeURIComponent(value);
          break;
      }
      path.pop();
    }
  }

}
