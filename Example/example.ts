import config from './privateConfig.json';
import { DeviceAction, NodeMerlinWrtApi } from '../src';

const api = new NodeMerlinWrtApi(config.username, config.password, config.address, true);
console.log('Api created');
api.getAuthToken().then((token) => {
  console.log(`New Auth Token: "${token}"`);
  api.getClientList().then((data) => {
    console.log(`Recieved clients macs: ${JSON.stringify(data.macList)}`);
    console.log(`First client: ${JSON.stringify(data.clients.values().next())}`);
    api.performDeviceActionByMac('7C:10:C9:30:61:70', DeviceAction.REBOOT).then((result) => {
      console.log(`Restarting device resulted in: ${result}`);
      api.logout().then(() => {
        process.exit(1);
      });
    });
  });
});

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
