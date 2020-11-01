const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');

class BondTransfer extends BaseTransaction {

	static get TYPE () {
		return 201;
	};

	static get FEE () {
		return `0`;
	};

	async prepare(store) {
		await store.account.cache([
            {
                address: this.asset.bondId,
            },
            {
                address: this.senderId,
            },
            {
                address: this.asset.newOwnerId,
            }
		]);
	}

	validateAsset() {

		const errors = [];
		if ( !this.asset.newOwnerId || !this.asset.bondId  ) {
			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'newOwnerId and bondId must be provided'));
		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const bond = store.account.get(this.asset.bondId);
        const sender = store.account.get(this.senderId);
        
        if ( bond.asset.ownerId !== sender.address ){
            errors.push(new TransactionError(
                'incorrect owner',
                this.id,
                'bond owner',
                bond.asset.ownerId,
                this.senderId
                ));
        }
        else{

            //update bond's account
            const updated_bond = {...bond, asset: {...bond.asset, ownerId: this.asset.newOwnerId}};
            store.account.set(updated_bond.address, updated_bond);
        }
        return errors;
    }

	undoAsset(store) {

        const bond = store.account.get(this.asset.bondId);

        //update bond's account
        const updated_bond = {...bond, asset: {...bond.asset, owner: this.asset.senderId}};
        store.account.set(updated_bond.address, updated_bond);
        
        return [];
        }
	}

module.exports = BondTransfer;
