const BigNum = require("@liskhq/bignum");
const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('./accounts');

class NewNash extends BaseTransaction {

	static get TYPE () {
		return 207;
	};

	static get FEE () {
		return `0`;
	};

	async prepare(store) {
		await store.account.cache([
            {
                address: this.asset.recipientId,
            },
            {
                address: manager.address,
            }
		]);
	}

	validateAsset() {

		const errors = [];
		if (!this.asset.recipientId || !this.asset.amount || this.senderId !== manager.address) {
			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'receipientID and amount must br provided and amount must be valid and sender sut be manager'));
		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const recipient = store.account.get(this.asset.recipientId);
        const Manager = store.account.get(manager.address);


            //update recipient's account
            const new_recipient_nash = (!recipient.asset.nash)? this.asset.amount : new BigNum(recipient.asset.nash).add(this.asset.amount).toString();
            const updated_recipient = { ...recipient, asset: { ...recipient.asset, nash: new_recipient_nash} };
            store.account.set(updated_recipient.address, updated_recipient);

            //update Manager's account
            const new_supply = (!Manager.asset.nashSupply) ? this.asset.amount : new BigNum(Manager.asset.nashSupply).add(this.asset.amount).toString();
            const updated_Manager = {...Manager,asset : {...Manager.asset, nashSupply: new_supply}};
            store.account.set(updated_Manager.address, updated_Manager);


    
        return errors;
    }

	undoAsset(store) {

        const errors = [];
        const recipient = store.account.get(this.asset.recipientId);
        const Manager = store.account.get(manager.address);


            //update recipient's account
            const new_recipient_nash = new BigNum(recipient.asset.nash).sub(this.asset.amount).toString();
            const updated_recipient = { ...recipient, asset: { ...recipient.asset, nash: new_recipient_nash} };
            store.account.set(updated_recipient.address, updated_recipient);

            //update Manager's account
            const new_supply = new BigNum(Manager.asset.nashSupply).sub(this.asset.amount).toString();
            const updated_Manager = {...Manager,asset : {...Manager.asset, nashSupply: new_supply}};
            store.account.set(updated_Manager.address, updated_Manager);

        return [];
        }
	}

module.exports = NewNash;
