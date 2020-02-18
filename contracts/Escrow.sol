pragma solidity ^0.4.17;

contract Escrow{
    uint public productId;
    address public seller;
    address public buyer;
    address public arbiter;
    uint public amount;
    
    mapping(address=>bool) releaseAmount;
    uint public releaseCount;//count number of people approved release money to seller

    mapping(address=>bool) refundAmount;
    uint public refoundCount;
    bool public fundsDisbursed;//
    
    event CreateEscrow(uint _productId,address _seller,address _buyer,address _arbiter,uint _amount);
    event UnlockAmount(uint _productId,string _operation,address _operator);
    event DisburseAmount(uint _productId,uint _amount,address _beneficiary);
    
    constructor (uint _productId,address _seller,address _buyer,address _arbiter) public payable{
        productId = _productId;
        seller = _seller;
        buyer = _buyer;
        arbiter = _arbiter;
        amount = msg.value;
        fundsDisbursed = false;
        emit CreateEscrow(productId,seller,buyer,arbiter,amount);
    }
    
    function releaseAmountToSeller(address caller) public{
        require(!fundsDisbursed,"Funds have already been disbursed!");
        require(caller==seller || caller == buyer || caller == arbiter,"invalid caller!");
        if(!releaseAmount[caller]){
            releaseAmount[caller] = true;
            releaseCount += 1;
            emit UnlockAmount(productId,"release to seller",caller);
        }
        if(releaseCount >= 2){
            seller.transfer(amount);
            fundsDisbursed = true;
            emit DisburseAmount(productId,amount,seller);
        }
    }
    
    function refundAmountToBuyer(address caller) public{
        require(!fundsDisbursed,"Funds have already been disbursed!");
        require(caller==seller || caller == buyer || caller == arbiter,"invalid caller!");
        if(!refundAmount[caller]){
            refundAmount[caller] = true;
            refoundCount+=1;
            emit UnlockAmount(productId,"refund to buyer",caller);
        }
        if(releaseCount >= 2){
            buyer.transfer(amount);
            fundsDisbursed = true;
            emit DisburseAmount(productId,amount,buyer);
        }
    }
    
    function escrowInfo() public view returns(address,address,address,bool,uint,uint){
        return (seller,buyer,arbiter,fundsDisbursed,releaseCount,refoundCount);
    }
    
}