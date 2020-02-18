//const ConvertLib = artifacts.require("ConvertLib");
const EcommerceStore = artifacts.require("EcommerceStore");
const Escrow = artifacts.require("Escrow");

module.exports = function(deployer) {
  deployer.deploy(EcommerceStore);
};
