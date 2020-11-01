const { Application, genesisBlockDevnet, configDevnet} = require('lisk-sdk');
const Initialization = require('../transactions/initialization');
const NashTransfer = require('../transactions/nash_transfer');
const BondeTransfer = require('../transactions/bond_transfer');
const BuyShare = require('../transactions/buy_share');
const SellShare = require('../transactions/sell_share');
const Bond2Nash = require('../transactions/bond2nash');
const BuyBond = require('../transactions/buy_bond');
const NewNash = require('../transactions/new_nash');



configDevnet.app.label = 'Nash';


const app = new Application(genesisBlockDevnet, configDevnet);
app.registerTransaction(Initialization);
app.registerTransaction(NashTransfer);
app.registerTransaction(BondeTransfer);
app.registerTransaction(BuyShare);
app.registerTransaction(SellShare);
app.registerTransaction(Bond2Nash);
app.registerTransaction(BuyBond);
app.registerTransaction(NewNash);




app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
