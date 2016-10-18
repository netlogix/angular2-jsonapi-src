import {Observable} from 'rxjs';
import {ResourceProxy, ConsumerBackend, ResultPage, Paginator} from "../../";

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

    get loading(): boolean {
        return this.paginator.loading;
    }

    get loading$(): Observable<boolean> {
        return this.paginator.loading$;
    }

    get hasMore(): boolean {
        return this.paginator.hasNext;
    }

    get data():ResourceProxy[] {
        return [...this._data];
    }

}
