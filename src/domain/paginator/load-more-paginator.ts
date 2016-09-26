import {ResourceProxy, ConsumerBackend, ResultPage} from "@netlogix/jsonapi";
import {Paginator} from './paginator';

export class LoadMorePaginator {

    protected paginator:Paginator;
    protected _data:ResourceProxy[] = [];

    constructor(protected firstPage: string, protected consumerBackend: ConsumerBackend) {
        this.paginator = new Paginator(firstPage, consumerBackend);
        this.paginator.resultPage$.subscribe((resultPage:ResultPage) => {
            this._data = [...this._data, ...resultPage.data];
        });
    }

    more() {
        if(this.hasMore) {
            this.paginator.next();
        }
        return this._data;
    }

    get hasMore(): boolean {
        return this.paginator.hasNext;
    }

    get data():ResourceProxy[] {
        return [...this._data];
    }

}
