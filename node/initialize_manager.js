const { APIClient } = require('@liskhq/lisk-api-client');
const Initialization = require('../transactions/initialization');
const {getNetworkIdentifier} = require('@liskhq/lisk-cryptography');

const networkIdentifier = getNetworkIdentifier(
    "23ce0366ef0a14a91e5fd4b1591fc880ffbef9d988ff8bebf8f3666b0c09597d",
    "Lisk",
);

const API_BASEURL = "http://localhost:4000";
const api = new APIClient([API_BASEURL]);



let tx = new Initialization({
    asset: {
        type: 'manager',
    },
    networkIdentifier: networkIdentifier,
});



tx.sign('creek own stem final gate scrub live shallow stage host concert they');



api.transactions.broadcast(tx.toJSON()).then(res => {
    console.log("++++++++++++++++ API Response +++++++++++++++++");
    console.log(res.data);
    console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
    console.log(tx.stringify());
    console.log("++++++++++++++++ End Script +++++++++++++++++");
}).catch(err => {
    console.log(JSON.stringify(err.errors, null, 2));
});
