import {Observable, ReplaySubject} from 'rxjs';
import {ResourceProxy, ConsumerBackend, ResultPage, Uri} from "../../";

export class Paginator {

    protected resultPage: ResultPage;

    protected subject: ReplaySubject<any>;

    constructor(protected firstPage: string, protected consumerBackend: ConsumerBackend) {
        this.subject = new ReplaySubject<ResultPage>(1);
        this.resultPage$.subscribe((resultPage) => {
            this.resultPage = resultPage;
        });
        this.next();
    }

    get resultPage$(): Observable<ResultPage> {
        return this.subject.asObservable();
    }

    get data(): ResourceProxy[] {
        if (this.hasLink('next')) {
            return this.resultPage.data;
        } else {
            return [];
        }
    }

    get hasNext(): boolean {
        return this.hasLink('next');
    }

    public next() {
        let nextLink = this.firstPage;
        if (this.hasLink('next')) {
            nextLink = this.resultPage.links['next'];
        }
        this.consumerBackend.fetchFromUri(new Uri(nextLink)).subscribe((resultPage: ResultPage) => {
            this.subject.next(resultPage);
        });
    }

    protected hasLink(linkName: string): boolean {
        return !!this.resultPage && !!this.resultPage.links && !!this.resultPage.links[linkName];
    }
}
