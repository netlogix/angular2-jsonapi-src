export default {
    entry: './release/index.js',
    dest: './release/bundles/jsonapi.umd.js',
    format: 'umd',
    moduleName: 'netlogix.jsonapi',
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
