import { ResourceProxy } from './resource-proxy';

export class ResultPage {

  constructor(public data: ResourceProxy[] = [],
              public links: { [linkName: string]: string } = {}) {
    if (!links) {
      this.links = {};
    }
  }
}
