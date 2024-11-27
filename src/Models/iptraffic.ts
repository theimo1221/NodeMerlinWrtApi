export type IpTraffic = {
    clients: (Traffic & { mac: string })[]
    router: Traffic
} 

type Traffic = {
    rx: number
    tx: number
}