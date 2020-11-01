const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('./accounts');
const BigNum = require("@liskhq/bignum");

class BuyBond extends BaseTransaction {

	static get TYPE () {
		return 204;
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
                address: this.asset.bondId,
            },
            {
                address: manager.address,
            }
		]);
	}

	validateAsset() {

        const errors = [];

        if ( !this.asset.bondId ) {

			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'bondId and hash must be provided'));

        }

		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const bond = store.account.get(this.asset.bondId)
        const sender = store.account.get(this.senderId);
        const Manager = store.account.get(manager.address);


        if ( bond.asset.ownerId !== Manager.address || bond.asset.status === 'sold'){
            errors.push(new TransactionError(
                'this bond have been sold',
                this.asset.bondId,
                '.asset.status',
                bond.asset.status,
                'not sold'));
        }
        else{
                
                
                if( new BigNum(sender.asset.nash).lt(bond.asset.price) ){
                    errors.push(new TransactionError(
                        'Not enough nash',
                        this.id,
                        'sender.asset.nash',
                        sender.asset.nash,
                        bond.price));

                    return errors;
                }
                
                //update sender's account
                const new_sender_nash = new BigNum(sender.asset.nash).sub(bond.asset.price).toString() ;
                const updated_sender = {...sender, asset: {...sender.asset, nash: new_sender_nash} }; 
                store.account.set(updated_sender.address, updated_sender);
                //update bond's account
                const updated_bond = {...bond, asset: {...bond.asset, ownerId:sender.address, status: 'sold'}};
                store.account.set(updated_bond.address, updated_bond);
                //update Manager's account
                const new_supply =  new BigNum(Manager.asset.nashSupply).sub(bond.asset.price).toString();
                var new_bondsList = (!Manager.asset.bondsList) ? [] : Manager.asset.bondsList;
                new_bondsList.push(bond.address);
                const updated_Manager = {...Manager,asset : {...Manager.asset, bondsList : new_bondsList , nashSupply: new_supply}};
                store.account.set(updated_Manager.address, updated_Manager);
        }
        return errors;
    }

	undoAsset(store) {

        const bond = store.account.get(this.asset.bondId)
        const sender = store.account.get(this.senderId);
        const Manager = store.account.get(manager.address);
        
           //update sender's account
           const new_sender_nash = new  BigNum(sender.asset.nsash).add(bond.asset.price).toString() ;
           const updated_sender = { ...sender, asset: { ...sender.asset, nash : new_sender_nash} };
            store.account.set(updated_sender.address, updated_sender);
           //update bond's account
           const updated_bond = {...bond, asset: {...bond.asset, ownerId:Manager.address, status: 'not sold'}};
           store.account.set(updated_bond.address, updated_bond);
           //update Manager's account
           const new_supply =  new BigNum(Manager.asset.nashSupply).add(bond.asset.price).toString();
           const new_bondsList = Manager.asset.bondsList.filter( item => item !== bond.address );
           const updated_Manager = {...Manager,asset : {...Manager.asset, bondsList : new_bondsList , nashSupply: new_supply}};
           store.account.set(updated_Manager.address, updated_Manager);

           return [];
        }
	}

module.exports = BuyBond;
