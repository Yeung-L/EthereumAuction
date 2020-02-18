var Web3 = require("web3");
//import EcommerceStore from "../../build/contra cts/EcommerceStore.json";
const EcommerceStore = artifacts.require("EcommerceStore");
/**
var web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"))

const networkId = await web3.eth.net.getId();
const deployedNetwork = EcommerceStore.networks[networkId];
const meta = new web3.eth.Contract(
	EcommerceStore.abi,
	deployedNetwork.address,
);
**/

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const ProductModel = require("./product.js");

mongoose.connect("mongodb://localhost:27017/ebay_dapp");
const db = mongoose.connection;
db.on("error",console.error.bind(console,"MongoDB connection error:"));

var express = require("express");
var app = express();
app.use(function(req,res,next){
	res.header("Access-Control-Allow-Origin","*");
	res.header("Access-Control-Allow-Headers","Origin,X-Requested-With,Content-Type,Accept");
	next();
})

const App = {
  web3: null,
  account: null,
  meta: null,

  start : async function() {
	  
    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = EcommerceStore.networks[networkId];
      this.meta = new web3.eth.Contract(
        EcommerceStore.abi,
        deployedNetwork.address,
      );
	  const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];
	  this.newProductEventListener();
	} catch (error) {
      console.error("err:",error);
    }
  },
  newProductEventListener : function(){
	  const {newProductEvent} = this.meta.events;
	  newProductEvent({fromBlock:0,toBlock:'latest'},(err,res)=>{
		  if(err){
			  console.log(err);
			  return;
		  }
		  this.saveProduct(res.args);
	  })
  },
  saveProduct : function(product){
	  ProductModel.findOne({'blockChainId':product._productId.toLocaleString()},(err,dbProject)=>{
		  if(err){
			  console.log(err);
			  return;
		  }
		  if(dbProject!=null){
			  return;
		  }
		  let p = new ProductModel({
			  blockChainId:product._productId,
			  name:product._name,
			  category:product._category,
			  ipfsImageHash:product._imageLink,
			  ipfsDescHash:product._descLink,
			  auctionStartTime:product._auctionStartTime,
			  auctionEndTime:product._auctionEndTime,
			  price:product._startPrice,
			  condition:product._productCondition,
			  productStatus:0
		  });
		  p.save(err=>{
			  if(err){
				  console.log(err);
			  }else{
				  ProductModel.count({},function(err,count){
					  console.log("count is "+count);
				  });
			  }
		  });
	  });
  }
}


window.App = App;

App.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
);
App.start();


app.listen(3000,()=>{
	console.log("Ebay server started,listening port 3000...");
})
