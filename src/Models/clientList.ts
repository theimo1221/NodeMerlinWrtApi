import { GetClientListResponse } from './getClientListResponse'
import { SingleClientData } from './singleClientData'
import { Client } from './client'

export class ClientList {
  public readonly macList: string[]
  public readonly clientApiLevel: string
  public readonly clients: Map<string, Client> = new Map<string, Client>()

  public constructor(data: GetClientListResponse) {
    this.macList = data.get_clientlist.maclist
    this.clientApiLevel = data.get_clientlist.ClientAPILevel
    for (const mac of this.macList) {
      const clientData: SingleClientData | undefined = data.get_clientlist[mac] as SingleClientData | undefined
      if (clientData === undefined) {
        throw new Error(`Recieved Mac "${mac}" but no corresponding data.`)
      }
      this.clients.set(mac, new Client(clientData))
    }
  }
}
