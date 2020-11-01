const BigNum = require("@liskhq/bignum");
const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');

class NashTransfer extends BaseTransaction {

	static get TYPE () {
		return 200;
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
                address: this.asset.recipientId,
            }
		]);
	}

	validateAsset() {

		const errors = [];
		if (!this.asset.recipientId || !this.asset.amount) {
			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'receipientID and amount must br provided and amount must be valid'));
		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const sender = store.account.get(this.senderId);
        const recipient = store.account.get(this.asset.recipientId);

        if ( !sender.asset.nash || new BigNum(sender.asset.nash).lt(this.asset.amount) ){
            errors.push(new TransactionError(
                'not enough balance',
                this.id,
                'balance',
                sender.asset.nash,
                this.asset.amount,
                ));
        }
        else{

            //update recipient's account
            const new_recipient_nash = (!recipient.asset.nash)? this.asset.amount : new BigNum(recipient.asset.nash).add(this.asset.amount).toString();
            const updated_recipient = { ...recipient, asset: { ...recipient.asset, nash: new_recipient_nash} };
            store.account.set(updated_recipient.address, updated_recipient);

             //update sender's account
             const new_sender_nash = new BigNum(sender.asset.nash).sub(this.asset.amount).toString();
             const updated_sender = { ...sender, asset: { ...sender.asset, nash: new_sender_nash} };   
             store.account.set(updated_sender.address, updated_sender);
        }
        return errors;
    }

	undoAsset(store) {

        const sender = store.account.get(this.senderId);
        const recipient = store.account.get(this.asset.recipientId);
        //update recipient's account
        const new_recipient_nash = new BigNum(recipient.asset.nash).sub(this.asset.amount).toString();
        const updated_recipient = {...recipient, asset: {...recipient.asset, nash: new_recipient_nash}};
        store.account.set(updated_recipient.address, updated_recipient);
        //update sender's account
        const new_sender_nash = new BigNum(sender.asset.nash).add(this.asset.amount).toString();
        const updated_sender = { ...sender, asset: { ...sender.asset, nash: new_sender_nash} };   

        store.account.set(updated_sender.address, updated_sender);    

        return [];
        }
	}

module.exports = NashTransfer;
