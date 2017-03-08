import { Observable } from 'rxjs/Observable';
import { Paginator } from './paginator';
import { ResourceProxy } from '../model/resource-proxy';
import { ConsumerBackend } from '../../service/consumer-backend';
import { ResultPage } from '../model/result-page';

const noop = () => {
};

export class LoadMorePaginator {

  protected paginator: Paginator;
  protected _data: ResourceProxy[] = [];

  constructor(protected firstPage: string, protected consumerBackend: ConsumerBackend) {
    this.paginator = new Paginator(firstPage, consumerBackend);
    this.paginator.resultPage$.subscribe((resultPage: ResultPage) => {
      this._data = [...this._data, ...resultPage.data];
    }, noop);
  }

  more() {
    if (this.hasMore) {
      this.paginator.next();
    }
    return this._data;
  }

  get loading(): boolean {
    return this.paginator.loading;
  }

  get error(): boolean {
    return this.paginator.error;
  }

  get loading$(): Observable<boolean> {
    return this.paginator.loading$;
  }

  get hasMore(): boolean {
    return this.paginator.hasNext;
  }

  get data(): ResourceProxy[] {
    return [...this._data];
  }

}
