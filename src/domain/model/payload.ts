import {EventEmitter} from '@angular/core';
export interface Payload {
    id?: string,
    type: string,
    attributes?:{[propertyName:string]:any},
    relationships?:{[propertyName:string]:any}
    links?:{[propertyName:string]:any},
    meta?:{[propertyName:string]:any},
    propertyChanged?:EventEmitter<string>;
}
