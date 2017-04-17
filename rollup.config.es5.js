export default {
  entry: './build/jsonapi.js',
  dest: './dist/jsonapi.es5.js',
  format: 'es',
  moduleName: 'netlogix.jsonapi',
  external: [
    '@angular/core',
    '@angular/http',
    'Rx',
    'rxjs/Observable',
    'rxjs/Subject',
    'rxjs/ReplaySubject',
    'rxjs/operator/share',
    'rxjs/operator/map',
    'rxjs/operator/mergeMap'
  ],
  globals: {
    '@angular/core': 'ng.core',
    '@angular/http': 'ng.http',
    'rxjs/Observable': 'Rx',
    'rxjs/Subject': 'Rx',
    'rxjs/ReplaySubject': 'Rx',
    'rxjs/operator/share': 'Rx.Observable.prototype',
    'rxjs/operator/map': 'Rx.Observable.prototype',
    'rxjs/operator/mergeMap': 'Rx.Observable.prototype'
  }
}
