import config from './privateConfig.json';
import { DeviceAction, NodeMerlinWrtApi } from '../src';

(async () => {

  const api = new NodeMerlinWrtApi(config.username, config.password, config.address, true);
  console.log('Api created');

  const token = await api.getAuthToken();
  console.log(`New Auth Token: "${token}"`);

  const data = await api.getClientList();
  console.log(`Recieved clients macs: ${JSON.stringify(data.macList)}`);
  console.log(`First client: ${JSON.stringify(data.clients.values().next())}`);

  const iptraffic = await api.getIpTraffic();
  console.log(`Recieved iptraffic: ${JSON.stringify(iptraffic)}`);

  const result = await api.performDeviceActionByMac('20:4E:F6:66:38:D0', DeviceAction.RECONNECT);
  console.log(`Restarting device resulted in: ${result}`);

  await api.logout();
})().then(() => {
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
