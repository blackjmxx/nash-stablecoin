const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('../client/accounts.json');


class Initialization extends BaseTransaction {

	static get TYPE () {
		return 206;
	};

	static get FEE () {
		return `0`;
	};

	async prepare(store) {
		await store.account.cache([
            {
                address: this.senderId,
            }
		]);
	}

	validateAsset() {

		const errors = [];
        if ( !this.asset.type ) {
			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'Account type must be provided'));
		}
		return errors;
	}

	applyAsset(store)  {


        

        if( this.asset.type === 'manager'){

            const Manager = store.account.get(manager.address); 
            const updated_Manager = {...Manager, asset: {...Manager.asset, type:'manager', nash: '10000', nashSupply: '10000'}} ;
            store.account.set(updated_Manager.address,updated_Manager);

        }

        else if ( this.asset.type === 'bond'){

            if(!this.asset.price){
                errors.push(new TransactionError(
                    'invalid transaction asset',
                    this.id,
                    '.asset',
                    this.asset,
                    'price must be provided'));
            }
            else{

                const bond = store.account.get(this.senderId);
                const updated_bond = {...bond, asset: { price: this.asset.price, status: 'not sold', type: 'bond', ownerId: manager.address}} ;
                store.account.set(updated_bond.address,updated_bond);
            }
        }

        return [];

    }

	undoAsset(store) {


        if(this.asset.type === 'bond'){
            
            const bond = store.account.get(this.senderId);
            const updated_bond = {...bond, asset: {}} ;
            store.account.set(updated_bond.address,updated_bond);
        }
        return [];

        }
	}

module.exports = Initialization;
