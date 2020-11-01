const NashTransfer = require('../transactions/nash_transfer');
const BuyShare = require('../transactions/buy_share');
const SellShare = require('../transactions/sell_share');
const BuyBond = require('../transactions/buy_bond');
const Initialization = require('../transactions/initialization');
const BigNum = require("@liskhq/bignum");
const Bond2Nash = require('../transactions/bond2nash');
const BondTransfer = require('../transactions/bond_transfer');
const NewNash = require('../transactions/new_nash');

const express = require('express');
const bodyParser = require('body-parser');
const transactions = require('@liskhq/lisk-transactions');
const cryptography = require('@liskhq/lisk-cryptography');
const { APIClient } = require('@liskhq/lisk-api-client');
const { Mnemonic } = require('@liskhq/lisk-passphrase');
const accounts = require('../client/accounts.json');
const networkIdentifier = cryptography.getNetworkIdentifier(
    "23ce0366ef0a14a91e5fd4b1591fc880ffbef9d988ff8bebf8f3666b0c09597d",
    "Lisk",
);
const API_BASEURL = 'http://localhost:4000';
const PORT = 3000;
const app = express();
const api = new APIClient([API_BASEURL]);
app.locals.payload = {
    tx: null,
    res: null,
};
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//////////////////////////////////////////////////////////Functions//////////////////////////////////////////////////////////////////////////

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function createCredentials() {
    const passphrase = Mnemonic.generateMnemonic();
    const keys = cryptography.getPrivateAndPublicKeyFromPassphrase(
        passphrase
    );
    const credentials = {
        address: cryptography.getAddressFromPublicKey(keys.publicKey),
        passphrase: passphrase,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey
    };
    return credentials;
};

async function ContranctSupply( price, delta) {


    var api = new APIClient([API_BASEURL]);
    let res = await api.accounts.get({ address: accounts.manager.address });
    const Manager = res.data[0];
    var temp;

    const total_supply = Number(Manager.asset.nashSupply);
    var new_bond_supply = Math.ceil(delta*total_supply/100);
    const new_price = Math.floor(0.8*price*100);
    var new_bonds = [];

    while(new_bond_supply !== 0){

        var credentials = createCredentials();

        api = new APIClient([API_BASEURL]);
        let tx = new transactions.TransferTransaction({
            asset: {
                amount: '1',
                recipientId: credentials.address,
            },
            networkIdentifier: networkIdentifier,
        });
        tx.sign(accounts.manager.passphrase);
        
        res = await api.transactions.broadcast(tx.toJSON());
        console.log(res.data);
        console.log(tx.stringify());
    
        new_bonds.push(credentials);
        new_bond_supply--;
        
    }


    await sleep(11000);

    while( new_bonds.length !== 0){

        temp = new_bonds.pop();
        api = new APIClient([API_BASEURL]);
        let tx = new Initialization({
            asset: {
                type: 'bond',
                price : new_price.toString(),
            },
            networkIdentifier: networkIdentifier,
        });
        tx.sign(temp.passphrase);
        
        res = await api.transactions.broadcast(tx.toJSON());
        console.log(res.data);
        console.log(tx.stringify());
    }


    return [];

}


async function ExpandSupply( delta) {


    var api = new APIClient([API_BASEURL]);
    let res = await api.accounts.get({ address: accounts.manager.address });
    const Manager = res.data[0];


    var BondsList = (!Manager.asset.bondsList) ? [] : Manager.asset.bondsList;
    const total_supply = Number(Manager.asset.nashSupply);
    var new_nash_supply = Math.ceil(delta*total_supply);
    var new_bond2nash = Math.floor(0.8*new_nash_supply/100);

    var Id;
    var bond;
    
    
    //bond2nash
    
    
    while( new_bond2nash !== 0 && BondsList.length !== 0 ){

        Id = BondsList.shift();
        api = new APIClient([API_BASEURL]);
        res = await api.accounts.get({ address: Id });
        bond = res.data[0];
        
        let tx = new Bond2Nash({
            asset: {
                bondId: Id,
                ownerId : bond.asset.ownerId,
            },
            networkIdentifier: networkIdentifier,
        });
        tx.sign(accounts.manager.passphrase);
        
        api = new APIClient([API_BASEURL]);
        res = await api.transactions.broadcast(tx.toJSON());
        console.log(res.data);
        console.log(tx.stringify());
        
      

        new_nash_supply = new_nash_supply - 100;
        new_bond2nash --;	
        
    }
    
    

    //distribute remained nashs to share holders
    const nashPerNDS = (!Manager.asset.shareSupply || Manager.asset.shareSupply === 0)? '0' : Math.floor(new_nash_supply/Manager.asset.shareSupply).toString();

    if( BigNum(nashPerNDS).gt('0') ){


        for( var key in Manager.asset.holders){

            var tx = new NewNash({
                asset: {
                    recipientId: key,
                    amount : new BigNum(nashPerNDS).mul(Manager.asset.holders[key]).toString(),
                },
                networkIdentifier: networkIdentifier,
            });
            tx.sign(accounts.manager.passphrase);

            res = await api.transactions.broadcast(tx.toJSON());
            console.log(res.data);
            console.log(tx.stringify());

            }  
            
    }
    
    return [];

}
//////////////////////////////////////////////////////////Utils//////////////////////////////////////////////////////////////////////////////

const getAccounts = async () => {
    let offset = 0;
    let accounts = [];
    const accountsArray = [];

    do {
        const retrievedAccounts = await api.accounts.get({ limit: 100, offset });
        accounts = retrievedAccounts.data;
        accountsArray.push(...accounts);

        if (accounts.length === 100) {
            offset += 100;
        }
    } while (accounts.length === 100);

    let relevantAccounts = [];
    for (var i = 0; i < accountsArray.length; i++) {
        let accountAsset = accountsArray[i].asset;
        if (accountsArray[i].balance > 0 || (accountAsset && Object.keys(accountAsset).length > 0) ){
            relevantAccounts.push(accountsArray[i]);
        }
    }

    return relevantAccounts;
}


const getBonds = async () => {
    let offset = 0;
    let accounts = [];
    const accountsArray = [];

    do {
        const retrievedAccounts = await api.accounts.get({ limit: 100, offset });
        accounts = retrievedAccounts.data;
        accountsArray.push(...accounts);

        if (accounts.length === 100) {
            offset += 100;
        }
    } while (accounts.length === 100);

    let relevantAccounts = [];
    for (var i = 0; i < accountsArray.length; i++) {
        let accountAsset = accountsArray[i].asset;
        if ( (accountAsset && Object.keys(accountAsset).length > 0) && accountAsset.type === 'bond' &&  accountAsset.status === 'not sold'){
            relevantAccounts.push(accountsArray[i]);
        }
    }

    return relevantAccounts;
}

/////////////////////////////////////////////////////Routes//////////////////////////////////////////////////////////////////////////////////////////
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/accounts', async(req, res) => {
    const relevantAccounts = await getAccounts();
    res.render('accounts', { accounts: relevantAccounts });
});

app.get('/accounts/:address', async(req, res) => {
    const { data: accounts } = await api.accounts.get({ address: req.params.address });
    res.render('accounts', { accounts });
});

app.get('/faucet', async(req, res) => {
    res.render('faucet', { accounts: accounts });
});

app.get('/transfer', async(req, res) => {
    res.render('transfer');
});

app.get('/bondTransfer', async(req, res) => {
    res.render('bondTransfer');
});

app.get('/share', async(req, res) => {
    res.render('share');
});

app.get('/bond', async(req, res) => {
    const relevantAccounts = await getBonds();
    res.render('bond', {accounts: relevantAccounts});
});


app.get('/pricing', async(req, res) => {
    res.render('pricing');
});


app.get('/payload', async(req, res) => {
    res.render('payload', { transaction: res.app.locals.payload.tx, response: res.app.locals.payload.res });
});


////////////////////////////////////////////////////GeneratingAccount/////////////////////////////////////////////////////////////////////////////////

app.get('/generate', async(req, res) => {

    const accountCredentials = createCredentials();

    let tx = new transactions.TransferTransaction({
        asset: {
            amount: '1',
            recipientId: accountCredentials.address,
        },
        networkIdentifier: networkIdentifier,
    });

    tx.sign(accounts.genesis.passphrase);
    res.render('generate', { accountCredentials });

    api.transactions.broadcast(tx.toJSON()).then(res => {
        console.log("++++++++++++++++ API Response +++++++++++++++++");
        console.log(res.data);
        console.log("++++++++++++++++ Credentials +++++++++++++++++");
        console.dir(accountCredentials);
        console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
        console.log(tx.stringify());
        console.log("++++++++++++++++ End Script +++++++++++++++++");
    }).catch(err => {
        console.log(JSON.stringify(err.errors, null, 2));
    });


    res.end()
});

/////////////////////////////////////////////////////////////////Faucet////////////////////////////////////////////////////////////////////////////////

app.post('/faucet', function (req, res) {
    
    const address = req.body.address;
    const amount = req.body.amount;
    const type = req.body.type;

    if(  type === 'lisk' ){

        const tx1 = new transactions.TransferTransaction({
            asset: {
                amount: transactions.utils.convertLSKToBeddows(amount),
                recipientId: address,
            },
            networkIdentifier: networkIdentifier,
        });
    
        tx1.sign(accounts.genesis.passphrase);
    
        api.transactions.broadcast(tx1.toJSON()).then(response => {

            res.app.locals.payload = {
                res: response.data,
                tx: tx1.toJSON(),
            };
    
            console.log("++++++++++++++++ API Response +++++++++++++++++");
            console.log(response.data);
            console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
            console.log(tx1.stringify());
            console.log("++++++++++++++++ End Script +++++++++++++++++");
    
            res.redirect('/payload');
    
        }).catch(err => {
    
            console.log(JSON.stringify(err.errors, null, 2));
            res.app.locals.payload = {
                res: err,
                tx: tx1.toJSON(),
            };
            res.redirect('/payload');
        });

    }

    else if( type === 'nash'){

        const tx2 = new NashTransfer({
            asset: {
                recipientId: address,
                amount: amount,
            },
            networkIdentifier: networkIdentifier,
        });

        tx2.sign(accounts.genesis.passphrase);
        api.transactions.broadcast(tx2.toJSON()).then(response => {

            res.app.locals.payload = {
                res: response.data,
                tx: tx2.toJSON(),
            };
    
            console.log("++++++++++++++++ API Response +++++++++++++++++");
            console.log(response.data);
            console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
            console.log(tx2.stringify());
            console.log("++++++++++++++++ End Script +++++++++++++++++");
    
            res.redirect('/payload');
    
        }).catch(err => {
    
            console.log(JSON.stringify(err.errors, null, 2));
            res.app.locals.payload = {
                res: err,
                tx: tx2.toJSON(),
            };
            res.redirect('/payload');
        });

    }

    else {

        res.render('index')
    }

});


/////////////////////////////////////////////////////////////////Transfer////////////////////////////////////////////////////////////////////////////////

app.post('/transfer', function (req, res) {
    
    const address = req.body.address;
    const amount = req.body.amount;
    const type = req.body.type;
    const passphrase = req.body.passphrase;

    if( type === 'lisk'){

        const tx1 = new transactions.TransferTransaction({
            asset: {

                recipientId: address,
                amount: transactions.utils.convertLSKToBeddows(amount),
                
            },
            networkIdentifier: networkIdentifier,
        });

        tx1.sign(passphrase);
        api.transactions.broadcast(tx1.toJSON()).then(response => {

            res.app.locals.payload = {
                res: response.data,
                tx: tx1.toJSON(),
            };
    
            console.log("++++++++++++++++ API Response +++++++++++++++++");
            console.log(response.data);
            console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
            console.log(tx1.stringify());
            console.log("++++++++++++++++ End Script +++++++++++++++++");
    
            res.redirect('/payload');
    
        }).catch(err => {
    
            console.log(JSON.stringify(err.errors, null, 2));
            res.app.locals.payload = {
                res: err,
                tx: tx1.toJSON(),
            };
            res.redirect('/payload');
        });
    }

    else if ( type === 'nash'){

        const tx2 = new NashTransfer({
            asset: {
                recipientId: address,
                amount: amount,
            },
            networkIdentifier: networkIdentifier,
        });

        tx2.sign(passphrase);
        api.transactions.broadcast(tx2.toJSON()).then(response => {

                res.app.locals.payload = {
                    res: response.data,
                    tx: tx2.toJSON(),
                };
        
                console.log("++++++++++++++++ API Response +++++++++++++++++");
                console.log(response.data);
                console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
                console.log(tx2.stringify());
                console.log("++++++++++++++++ End Script +++++++++++++++++");
        
                res.redirect('/payload');
        
            }).catch(err => {
        
                console.log(JSON.stringify(err.errors, null, 2));
                res.app.locals.payload = {
                    res: err,
                    tx: tx2.toJSON(),
                };
                res.redirect('/payload');
            });

    }

    else{
    res.render('index')
    }

});


/////////////////////////////////////////////////////////////////Bond////////////////////////////////////////////////////////////////////////////////

app.post('/bondTransfer', function (req, res) {
    
    const bondId = req.body.bondId;
    const newOwner = req.body.newOwner;
    const passphrase = req.body.passphrase;

    const tx1 = new BondTransfer({
        asset: {
            newOwnerId : newOwner,
            bondId : bondId,
        },
        networkIdentifier: networkIdentifier,
    });

    tx1.sign(passphrase);
    api.transactions.broadcast(tx1.toJSON()).then(response => {

        res.app.locals.payload = {
            res: response.data,
            tx: tx1.toJSON(),
        };

        console.log("++++++++++++++++ API Response +++++++++++++++++");
        console.log(response.data);
        console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
        console.log(tx1.stringify());
        console.log("++++++++++++++++ End Script +++++++++++++++++");

        res.redirect('/payload');

    }).catch(err => {

        console.log(JSON.stringify(err.errors, null, 2));
        res.app.locals.payload = {
            res: err,
            tx: tx1.toJSON(),
        };
        res.redirect('/payload');
    });

});

/////////////////////////////////////////////////////////////////Share////////////////////////////////////////////////////////////////////////////////

app.post('/share', function (req, res) {
    
    const amount = req.body.amount;
    const type = req.body.type;
    const passphrase = req.body.passphrase;

    if( type === 'Buy' && Number.isInteger(Number(amount))){
        const tx1 = new BuyShare({
            asset: {
                amount: amount,
            },
            networkIdentifier: networkIdentifier,
        });

        tx1.sign(passphrase);
        api.transactions.broadcast(tx1.toJSON()).then(response => {

            res.app.locals.payload = {
                res: response.data,
                tx: tx1.toJSON(),
            };
    
            console.log("++++++++++++++++ API Response +++++++++++++++++");
            console.log(response.data);
            console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
            console.log(tx1.stringify());
            console.log("++++++++++++++++ End Script +++++++++++++++++");
    
            res.redirect('/payload');
    
        }).catch(err => {
    
            console.log(JSON.stringify(err.errors, null, 2));
            res.app.locals.payload = {
                res: err,
                tx: tx1.toJSON(),
            };
            res.redirect('/payload');
        });

    }

    else if( type === 'Sell' && Number.isInteger(Number(amount) )){

        const tx2 = new SellShare({
            asset: {
                amount: amount,
            },
            networkIdentifier: networkIdentifier,
        });

        tx2.sign(passphrase);
        api.transactions.broadcast(tx2.toJSON()).then(response => {

        res.app.locals.payload = {
            res: response.data,
            tx: tx2.toJSON(),
        };

        console.log("++++++++++++++++ API Response +++++++++++++++++");
        console.log(response.data);
        console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
        console.log(tx2.stringify());
        console.log("++++++++++++++++ End Script +++++++++++++++++");

        res.redirect('/payload');

    }).catch(err => {

        console.log(JSON.stringify(err.errors, null, 2));
        res.app.locals.payload = {
            res: err,
            tx: tx2.toJSON(),
        };
        res.redirect('/payload');
    });

    }

    else{

        res.render('index')
    }

});


/////////////////////////////////////////////////////////////////Bond////////////////////////////////////////////////////////////////////////////////

app.post('/bond', function (req, res) {
    
    const id = req.body.id;
    const passphrase = req.body.passphrase;

    const tx1 = new BuyBond({
        asset: {
            bondId: id,
        },
        networkIdentifier: networkIdentifier,
    });

    tx1.sign(passphrase);
    api.transactions.broadcast(tx1.toJSON()).then(response => {

        res.app.locals.payload = {
            res: response.data,
            tx: tx1.toJSON(),
        };

        console.log("++++++++++++++++ API Response +++++++++++++++++");
        console.log(response.data);
        console.log("++++++++++++++++ Transaction Payload +++++++++++++++++");
        console.log(tx1.stringify());
        console.log("++++++++++++++++ End Script +++++++++++++++++");

        res.redirect('/payload');

    }).catch(err => {

        console.log(JSON.stringify(err.errors, null, 2));
        res.app.locals.payload = {
            res: err,
            tx: tx1.toJSON(),
        };
        res.redirect('/payload');
    });

});


/////////////////////////////////////////////////////////////////Pricing////////////////////////////////////////////////////////////////////////////////

app.post('/pricing', async function (req, res) {
    
    const price = req.body.price;

    if(Number(price) <= 1 && Number(price) >= 0.9){

        const delta = (1 - Number(price));
        ContranctSupply(price,delta);
        
    }

    else if(Number(price) >= 1 && Number(price) <= 1.1){
            
        const delta = (Number(price) - 1);
        ExpandSupply(delta);
        
    }

    res.render('index')
});



/////////////////////////////////////////////////////////////////////End//////////////////////////////////////////////////////////////////////////////
app.listen(PORT, () => console.info(`Explorer app listening on port ${PORT}!`));
