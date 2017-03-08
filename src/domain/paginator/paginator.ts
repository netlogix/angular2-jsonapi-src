import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { ResultPage } from '../model/result-page';
import { ConsumerBackend } from '../../service/consumer-backend';
import { ResourceProxy } from '../model/resource-proxy';
import { Uri } from '../model/uri';
import { share } from 'rxjs/operator/share';

export class Paginator {

  protected resultPage: ResultPage;

  protected subject: ReplaySubject<any>;

  protected _loading: number = 0;
  protected _error: boolean = false;
  protected loadingChange: Subject<boolean> = new Subject<boolean>();

  constructor(protected firstPage: string, protected consumerBackend: ConsumerBackend) {
    this.subject = new ReplaySubject<ResultPage>(1);
    this.resultPage$.subscribe((resultPage) => {
      this.resultPage = resultPage;
    });
    this.next();
  }

  get resultPage$(): Observable<ResultPage> {
    return share.call(this.subject.asObservable());
  }

  get data(): ResourceProxy[] {
    if (this.hasLink('next')) {
      return this.resultPage.data;
    } else {
      return [];
    }
  }

  get loading(): boolean {
    return !!this._loading;
  }

  get error(): boolean {
    return this._error;
  }

  get loading$(): Observable<boolean> {
    return this.loadingChange.asObservable();
  }

  get hasNext(): boolean {
    return this.hasLink('next');
  }

  public next() {
    if (this.loading || this.error) {
      return;
    }
    this.changeLoading(1);
    let nextLink = this.firstPage;
    if (this.hasLink('next')) {
      nextLink = this.resultPage.links['next'];
    }
    this.consumerBackend.fetchFromUri(new Uri(nextLink)).subscribe((resultPage: ResultPage) => {
      this.subject.next(resultPage);
      this.changeLoading(-1);
    }, () => {
      this._error = true;
      this.subject.next([]);
      this.changeLoading(-1);
    });
  }

  protected changeLoading(direction: number) {
    let loading = this.loading;
    this._loading += direction;
    if (loading !== this.loading) {
      this.loadingChange.next(this.loading);
    }
  }

  protected hasLink(linkName: string): boolean {
    return !!this.resultPage && !!this.resultPage.links && !!this.resultPage.links[linkName];
  }
}
