export default {
  input: './build/jsonapi.js',
  name: 'netlogix.jsonapi',
  output: {
    file: './dist/jsonapi.js',
    format: 'es',
  },
  external: [
    '@angular/core',
    '@angular/common',
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
    '@angular/common': 'ng.common',
    '@angular/common/http': 'ng.common.http',
    'rxjs/Observable': 'Rx',
    'rxjs/Subject': 'Rx',
    'rxjs/ReplaySubject': 'Rx',
    'rxjs/operator/share': 'Rx.Observable.prototype',
    'rxjs/operator/map': 'Rx.Observable.prototype',
    'rxjs/operator/mergeMap': 'Rx.Observable.prototype'
  }
}
