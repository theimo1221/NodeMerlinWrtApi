import { SingleClientData } from './singleClientData';

export class Client {
  public readonly rawData: SingleClientData;

  public constructor(clientData: SingleClientData) {
    // console.log(`Constructing client for ${clientData.mac}`);
    this.rawData = clientData;
  }
}
