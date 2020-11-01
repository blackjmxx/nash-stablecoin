const BigNum = require("@liskhq/bignum");
const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('./accounts');

class ShareSell extends BaseTransaction {

	static get TYPE () {
		return 203;
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
                'amount must be valid'));

		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const sender = store.account.get(this.senderId);
        const recipient = store.account.get(manager.address);
        const lisk_amount = new BigNum(this.asset.amount).mul('1000000000').toString();

        if ( new BigNum(this.asset.amount).gt(sender.asset.share) ){
            errors.push(new TransactionError(
                'not enough share balance',
                sender.asset.share,
                '.balance',
                this.asset.amount,
                'share amount in transaction'));
        }
        else{

            //update sender's account
            const new_sender_balance = new BigNum(sender.balance).add(lisk_amount).toString();

            const new_sender_share = (!sender.asset.share)? this.asset.amount: 
            new BigNum(sender.asset.share).sub(this.asset.amount).toString();

            const updated_sender = { ...sender, balance: new_sender_balance,
                asset: { ...sender.asset, share: new_sender_share} };

            store.account.set(updated_sender.address, updated_sender);

            //update Manager's account

            const new_recipient_balance = new BigNum(recipient.balance).sub(lisk_amount).toString();

            var new_holders = recipient.asset.holders;
            new_holders[sender.address] = new_sender_share;
            if(new_sender_share === '0'){
                delete new_holders[sender.address];
            }

            const new_share_supply = new BigNum(recipient.asset.shareSupply).sub(this.asset.amount).toString();

            const updated_recipient = {...recipient, balance : new_recipient_balance, asset:{...recipient.asset, holders: new_holders, shareSupply: new_share_supply}};
                
            store.account.set(updated_recipient.address, updated_recipient);

        }
        return errors;
    }

	undoAsset(store) {

        const errors = [];
        const sender = store.account.get(this.senderId);
        const recipient = store.account.get(manager.address);
        const lisk_amount = new BigNum(this.asset.amount).mul('1000000000').toString();

        
        if ( BigNum(sender.balance).lt(lisk_amount)){
            errors.push(new TransactionError(
                'impossible to undo transaction',
                this.id,
                '.asset',
                this.asset,
                'sender does not have enough lisk'));
        }
        else{


            //update sender's account
            const new_sender_balance = new BigNum(sender.balance).sub(lisk_amount).toString();
            const new_sender_share = new BigNum(recipient.asset.share).add(this.asset.amount).toString();
            const updated_sender = { ...sender, balance: new_sender_balance, asset: { ...sender.asset, share: new_sender_share} };
            store.account.set(updated_sender.address, updated_sender);


            //update Manager's account

            const new_recipient_balance = new BigNum(recipient.balance).add(lisk_amount).toString();

            var new_holders = (!recipient.asset.holders) ? {} : recipient.asset.holders;
            new_holders[sender.address] = new_sender_share;

            const new_share_supply = (!recipient.asset.shareSupply)? this.asset.amount :  new BigNum(recipient.asset.shareSupply).add(this.asset.amount).toString();
            const updated_recipient = {...recipient, balance:new_recipient_balance, asset:{...recipient.asset, holders: new_holders, shareSupply: new_share_supply}};
            store.account.set(updated_recipient.address, updated_recipient);
            }
        }
	}

module.exports = ShareSell;
