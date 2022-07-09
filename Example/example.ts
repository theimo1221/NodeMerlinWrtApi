import config from "./privateConfig.json";
import { NodeMerlinWrtApi } from "../src";

const api = new NodeMerlinWrtApi(config.username, config.password, config.address, true);
console.log('Api created');
api.getAuthToken().then((token) => {
  console.log(`New Auth Token: "${token}"`);
  api.getClientList().then((data) => {
    console.log(`Recieved client List: ${JSON.stringify(data)}`);
    api.logout().then(() => {
      process.exit(1);
    });
  });
});

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});