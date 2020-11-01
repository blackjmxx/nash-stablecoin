const BigNum = require("@liskhq/bignum");
const {BaseTransaction, TransactionError} = require('@liskhq/lisk-transactions');
const {manager} = require('./accounts');

class Bond2Nash extends BaseTransaction {

	static get TYPE () {
		return 205;
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
                address: this.asset.ownerId,
            },
            {
                address: manager.address,
            }
		]);
	}

	validateAsset() {

		const errors = [];
		if ( !this.asset.bondId || !this.asset.ownerId ) {
			errors.push(new TransactionError(
                'invalid transaction asset',
                this.id,
                '.asset',
                this.asset,
                'Ids of Bond and Owner must be provided'));
		}
		return errors;
	}

	applyAsset(store)  {
        
        const errors = [];
        const bond = store.account.get(this.asset.bondId);
        const owner = store.account.get(this.asset.ownerId);
        const Manager = store.account.get(manager.address);

        if ( this.senderId !== manager.address ){
            errors.push(new TransactionError(
                'invalid sender',
                this.id,
                '.senderId',
                this.senderId,
                manager.address));
        }
        else if ( bond.asset.ownerId !== owner.address  ){

            errors.push(new TransactionError(
                'owner is not correct',
                bond.address,
                '.ownerId',
                owner.address,
                bond.asset.ownerId
                ));
        }
        else{

        //update bond's account
        const updated_bond = { ...bond, asset: { ...bond.asset, ownerId: '', status: 'expired'} };
        store.account.set(updated_bond.address, updated_bond);
        //update owner's account
        const new_owner_nash = (!owner.asset.nash)? '100' :  new BigNum(owner.asset.nash).add('100').toString();
        const updated_owner = { ...owner, asset: { ...owner.asset, nash : new_owner_nash } };
        store.account.set(updated_owner.address, updated_owner);
        //update Manager's account
        const new_supply = (!Manager.asset.nashSupply) ? '100' : new BigNum(Manager.asset.nashSupply).add('100').toString();
        const new_bondsList = Manager.asset.bondsList.filter( item => item !== bond.address );
        const updated_Manager = {...Manager,asset : {...Manager.asset, bondsList : new_bondsList, nashSupply: new_supply}};
        store.account.set(updated_Manager.address, updated_Manager);
            
        }
        
        return errors;
    }

	undoAsset(store) {

        const bond = store.account.get(this.asset.id);
        const owner = store.account.get(this.asset.owner);
        const Manager = store.account.get(manager.address);
    
    
        //update bond's account
        const updated_bond = { ...bond, asset: {...bond.asset, ownerId: owner.address, status: 'sold'} };
        store.account.set(updated_bond.address, updated_bond);
        //update owner's account
        const new_owner_nash = new BigNum(owner.asset.nash).sub('100').toString();
        const updated_owner = {...owner, asset: {...owner.asset, nash: new_owner_nash, bond: { amount: new_owner_bondAmount, Ids: new_owner_bondIds}} }; 
        store.account.set(updated_owner.address, updated_owner);
         //update Manager's account
         const new_supply =  new BigNum(Manager.asset.NashSupply).sub(bond.asset.price).toString();
         const new_bondsList = Manager.asset.bondsList.concat(bond.address);
         const updated_Manager = {...Manager,asset : {...Manager.asset, bondsList : new_bondsList, nashSupply: new_supply}};
         store.account.set(updated_Manager.address, updated_Manager);

        
        return [];
        }
	}

module.exports = Bond2Nash;
