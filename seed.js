EcommerceStore = artifacts.require("./EcommerceStore.sol");

module.exports = function(){
	amt_1 = web3.utils.toWei("1",'ether');
	current_time = Math.round(new Date()/1000);
	//web3.personal.unlockAccount(eth.accounts[0],'1');
	EcommerceStore.deployed().then(i=>{
		i.addProductToStore('iphone', 'Cell Phones & Accessories', 'QmdxYk7HXqkxTEWheXPBGU3nZuYCsBtjeW8cCMsxoehL98',
		'QmWCor6JWivSjqzfHTqLjG9nrfaZnSgncZ7xBpTCqJv5oh', current_time, current_time + 200, web3.utils.toBN(2*amt_1), 0).then((err,res)=>{
			if(err)
				console.log("error:",err);
			else
				console.log("res:",res);
		})
	})
	EcommerceStore.deployed().then(i=>{
		i.revealBid(17,'2000000000000000000','1',{from:"0xD3970B1A8945ddB3744bA16DdF7Fa296c99F6016"}).then((err,res)=>{
			if(err)
				console.log("error:",err);
			else
				console.log("res:",res);
		})
	})
	EcommerceStore.deployed().then(function(i) {i.addProductToStore('vivo', 'Cell Phones & Accessories', 'QmWVAMZrZprcCeXbcN62KWwUNZu23529xPN3iozwBcCmPg', 'Qmat78diLYkUjG9mWZB5SP5AZX6RLHLFxTek3DWexRWqLS', current_time, current_time + 400, web3.utils.toBN(3*amt_1), 1).then(function(f) {console.log(f)})});
	EcommerceStore.deployed().then(function(i) {i.addProductToStore('oppo', 'Cell Phones & Accessories', 'QmVbyiAzMfhnz2B56ueKmLrpM7ggUgiYK2Z1A17H8rfq6w', 'QmT816Cr3HKJ3o1Bv87XGRCvaQExy4BLesTVkhWCzLu7zq', current_time, current_time + 600, web3.utils.toBN(4*amt_1), 0).then(function(f) {console.log(f)})}); 
	
	EcommerceStore.deployed().then(function(i) {i.productIndex.call().then(function(f){console.log(f)})});
};
