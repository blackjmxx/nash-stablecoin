const BigNum = require("@liskhq/bignum");
const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('./accounts');


class BuyShare extends BaseTransaction {

	static get TYPE () {
		return 202;
	};

	static get FEE () {
		return `0`;
	};

	async prepare(store) {
		await store.account.cache([
			{
                address: this.senderId,

            },
            {
                address: manager.address,
            }

		]);
	}

	validateAsset() {

        const errors = [];

        if ( !this.asset.amount) {

			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'amount must be provided'));

		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const sender = store.account.get(this.senderId);
        const Manager = store.account.get(manager.address);
        const lisk_amount = new BigNum(this.asset.amount).mul('1000000000');


        if ( lisk_amount.gt(sender.balance) ){
            errors.push(new TransactionError(
                'not enough balance',
                this.id,
                '.balance',
                lisk_amount.toString(),
                sender.balance ));
        }

        else{

            //update sender's account
            const new_sender_balance = new BigNum(sender.balance).sub(lisk_amount).toString();

            const new_sender_share = (!sender.asset.share)? this.asset.amount : new BigNum(sender.asset.share).add(this.asset.amount).toString();

            const updated_sender = { ...sender, balance: new_sender_balance, asset: { ...sender.asset, share: new_sender_share}};

            store.account.set(sender.address, updated_sender);


            //update manager's account
            const new_manager_balance = new BigNum(Manager.balance).add(lisk_amount).toString();

            var new_holders = (!Manager.asset.holders) ? {} : Manager.asset.holders;

            new_holders[sender.address] = new_sender_share;

            const new_share_supply = (!Manager.asset.shareSupply) ? this.asset.amount : new BigNum(Manager.asset.shareSupply).add(this.asset.amount).toString();

            const updated_manager = {...Manager, balance : new_manager_balance, asset:{...Manager.asset,  holders: new_holders, shareSupply: new_share_supply}};
                
            store.account.set(updated_manager.address, updated_manager);

        }
        return errors;
    }

	undoAsset(store) {

        const errors = [];
        const sender = store.account.get(this.senderId);
        const Manager = store.account.get(manager.address);
        const lisk_amount = new BigNum(this.asset.amount).mul('1000000000');
        
        if ( !sender.asset.share || BigNum(sender.asset.share).lt(this.asset.amount)){
            errors.push(new TransactionError(
                'impossible to undo transaction',
                this.id,
                '.asset',
                this.asset,
                'sender does not have enough share'));
        }
        else{

            //update sender's account
            const new_sender_balance = new BigNum(sender.balance).sub(lisk_amount).toString();
            const new_sender_share = new BigNum(Manager.asset.share).add(this.asset.amount).toString();
            const updated_sender = { ...sender, balance: new_sender_balance, asset: { ...sender.asset, share: new_sender_share} };
            store.account.set(updated_sender.address, updated_sender);
            //update manager's account
            const new_manager_balance = new BigNum(Manager.balance).sub(lisk_amount).toString();
            var new_holders = Manager.asset.holders;
            new_holders[sender.address] = new_sender_share;
            if(new_sender_share === '0'){
                delete lis[sender.address];
            }
            const new_share_supply = new BigNum(Manager.asset.shareSupply).sub(this.asset.amount).toString();
            const updated_manager = {...Manager, balance: new_manager_balance, asset:{...Manager.asset, holders: new_holders, shareSupply: new_share_supply}};
            store.account.set(updated_manager.address, updated_manager);

            }
        }
	}

module.exports = BuyShare;
