import Web3 from "web3";
import EcommerceStore from "../../build/contracts/EcommerceStore.json";

const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({host: "localhost",port: "5001",protocol: "http"});
const offChainServer = "http://localhost:10000/";
const categories = ["Art","Books","Cameras","Cell Phones & Accessories","Clothing","Computers & Tablets","Gift Cards & Coupons","Musical Instruments & Gear","Pet Supplies","Pottery & Glass","Sporting Goods","Tickets","Toys & Hobbies","Video Games"];
/**
 const IPFS = require('ipfs');
 const { globSource } = IPFS

 const ipfs = await IPFS.create()
 **/

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
			
			//假如在首页
			if($("#gate_new_products").length>0){
				App.buildGate();
			}

            //假如在物品详情页
            if($("#product_details").length > 0){
                let productId = new URLSearchParams(window.location.search).get("id");
                $("#product_id").val(productId);
                this.renderProductDetail(productId);
            }

            const accounts = await web3.eth.getAccounts();
            this.account = accounts[0];
			
			//如果在物品列表页
            if($("#product-list").length > 0){
				let category = new URLSearchParams(window.location.search).get("category");
                this.renderStore(1,8,category);//渲染商品信息
            }
            var reader;
            $("#product-image").change(event=>{
                const file = event.target.files[0];
                reader = new window.FileReader();
                reader.readAsArrayBuffer(file);
            });

            //上传商品信息表单监听
            $("#sub-btn").click(function(){
                //取得表单所有序列化的数据,这个数据是编码后的数据
                const req = $("#add-item-to-store").serialize();
				
                console.log("req",req);
                let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"').replace(/\+/g," ") + '"}')
                console.log("params: ",params);
                let decodedParams = {};
                Object.keys(params).forEach(key=>{
                    decodedParams[key] = decodeURIComponent(decodeURI(params[key]));
                });
                App.saveProduct(reader,decodedParams);
                return false;
            });

            //参与竞价
            $("#bid_btn").click(event=>{
				if(confirm("are you sure you want to bid this product?")){
                    let amount = $("#bid_price").val();
                    let secret = $("#secret").val();
					let sendAmount = $("#bid_price").val();
					if(amount==null||secret==null||sendAmount==null){
						alert("please input relative infomation!");
						return;
					}
                    let rawAmount = App.web3.utils.toWei(amount).toString();
                    let sealdBid = App.web3.utils.sha3(rawAmount+secret);
					let productId = $("#product_id").val();
					App.bid(parseInt(productId),sealdBid,sendAmount);
                }
				/**
                let amount = $("#bid-amount").val();//实际报价
                let sendAmount = $("#bid-send-amount").val();//要发送的以太数额
                let secretText = $("#secret-text").val();
                let productId = $("#product-id").val();
                let bidUnencrupt = web3.utils.toWei(amount,'ether').toString()+secretText;
                let sealedBid = App.web3.utils.sha3(bidUnencrupt);
                **/
                return false;

            });

            //揭示自己的报价
            $("#reveal_btn").click(event=>{
                $("#msg").hide();
                let amount = $("#reveal_bid_price").val();
                let secretText = $("#reveal_bid_secret").val();
                let productId = $("#product_id").val();
				if(amount==null||secretText==null||productId==null){
					alert("please input information");
					return false;
				}
                App.revealBid(productId,amount,secretText);
                return false;

            })

            //结束商品的揭示报价
            $("#shipping_btn").click(event=>{
                try{
                    $("#msg").hide();
                    let productId = $("#product_id").val();
                    App.finalizeAuction(productId);
                    alert("auction finalized!");
                    console.log("finalize auction ",res);
                    //location.reload();

                }catch(err){
                    console.log("finalize error:",err);
                }
                return false;
            })

            //释放资金到卖家
            $("#buyer_release_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToSeller(productId);
            })
			$("#seller_release_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToSeller(productId);
            })
			$("#shipper_release_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToSeller(productId);
            })

            //退还资金到买家
            $("#seller_refund_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToBuyer(productId);
                alert("transaction submitted!");
            })
			$("#buyer_refund_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToBuyer(productId);
                alert("transaction submitted!");
            })
			$("#shipper_refund_btn").click(()=>{
                let productId = $("#product_id").val();
                App.releaseAmountToBuyer(productId);
                alert("transaction submitted!");
            })
			

            //退还未揭示报价的竞价者的钱
            $("#refund_unreveal_btn").click(()=>{
                let productId = $("#product-id").val();
                if(confirm("are you sure you have bid this product?")){
                    let amount = prompt("please input your bid price(ETH)");
                    let secret = prompt("please input your bid secret");
                    let rawAmount = App.web3.utils.toWei(amount).toString();
                    let sealdBid = App.web3.utils.sha3(rawAmount+secret);
                    App.returnInvalidBidMoney(productId,sealdBid);
                }

            })

        } catch (error) {
            console.error("err:",error);
        }
    },
    getProduct : async function(id){//根据id获取商品信息
        const {getProduct} = this.meta.methods;
        var pro = await getProduct(id).call();
        return pro;
    },
    renderStore : async function(pageIndex,pageSize,category){//渲染可以购买的商品信息
        if(pageIndex<=0 || pageIndex==null){
            pageIndex = 1;
        }
        if(pageSize<=0 || pageSize==null){
            pageSize = 8;
        }
        $.ajax({
            url:offChainServer+"getProductListOnSale",
            type:"POST",
            data:{pageIndex:pageIndex,pageSize:pageSize,category:category},
            success:function(data){
                if(data.success){
                    console.log("请求product数据:"+data.toString());
                    if(data.total==0){
                        $("#product-list").html("<h1>Oh!No items are up for auction yet,Please come back later!<h1/>");
                        return;
                    }
                    let tempHtml="";
                    $.each(data.productList,(index,product)=>{
                        tempHtml+='<div class="grid_1_of_4 images_1_of_4">'
                        +'<a href="product_detail.html?id='+product.productId+'" target="_blank"><img src="http://localhost:8080/ipfs/'+product.imageLink+'" width="212px" height="212px"/></a>'
                        +'<h2>'+product.productName+'</h2>'
                        +'<div class="price-details"><div class="price-number"><p><span class="rupees">'
                        +'start price:'+App.web3.utils.fromWei(product.startPrice,'ether')+'  ETH</span></p></div><div class="add-cart">'
                        +'<h4><a href="product_detail.html?id='+product.productId+'">Join Auction</a></h4></div></div></div>'
                    });
                    $("#product-list").html(tempHtml);
					App.buildNav(pageIndex,pageSize,data.total)
                }else{
                    console.log("数据请求失败!");
                }
            }
        })
    },
	buildNav :function(pageIndex,pageSize,total,category){
		if(pageIndex==null||pageIndex<=0){
			pageIndex = 1;
		}
		if(pageSize==null || pageSize<=0){
			pageSize = 8;
		}
		$("#cur-page").html(pageIndex);
		let totalPage = total/pageSize;
		totalPage = Math.floor(totalPage);
		if(total%pageSize!=0) totalPage+=1;
		if(pageIndex==totalPage){
			$("#next-page").removeClass("active");
			$("#next-page").addClass("disabled");
		}else if(pageIndex<totalPage){
			$("#next-page").removeClass("disabled");
			$("#next-page").addClass("active");
		}
		if(pageIndex==1){
			$("#previous-page").removeClass("active");
			$("#previous-page").addClass("disabled");
		}else if(pageIndex>1){
			$("#previous-page").removeClass("disabled");
			$("#previous-page").addClass("active");
		}
		/**
		$("#cur-page").off('click').on('click',function(){
			if($("#cur-page").is("disabled")) return false;
			App.renderStore(pageIndex+1,pageSize,category);
			return false;
		});
		**/
		$("#previous-page").off('click').on('click',function(){
			if($("#previous-page").is("disabled")) return false;
			App.renderStore(pageIndex-1,pageSize,category);
			return false;
		})
		$("#next-page").off('click').on('click',function(){
			if($("#next-page").is("disabled")) return false;
			App.renderStore(pageIndex+1,pageSize,category);
			return false;
		})
	},
    renderAuctionTime : function(endTime){
        let res="";
        let currentTime = Math.round(new Date()/1000);
        let remain_time = endTime - currentTime;
        if(remain_time<=0){
            res += "auction has ended";
        }else{
            let days = Math.trunc(remain_time/(60*60*24));
            remain_time -= days * 60 * 60 * 24;
            let hours = Math.trunc(remain_time/(60*60));
            remain_time -= hours * 60 * 60;
            let minutes = Math.trunc(remain_time / 60);
            if(days > 0){
                res += "Auction will end in "+ days+" days "+hours+" hours "+minutes+" minutes "+remain_time+" seconds";
            }else if(hours>0){
                res += "Auction end in "+hours+" hours "+minutes+" minutes "+remain_time+" seconds";
            }else if(minutes>0){
                res += "Auction end in "+minutes+" minutes "+remain_time+" seconds"
            }else{
                res += "Auction end in "+remain_time+" seconds";
            }
            return res;
        }
    },
	/**
    buildProduct : function(product){//构建商品信息结点
        let node = $("<div></div>");
        node.addClass("col-sm-3 text-center col-margin-bottom-1");
        node.append("<a href='product.html?id="+product[0]+"'><img src='http://localhost:8080/ipfs/"+product[3]+"' width = '150px' /></a>");
        node.append("<div>"+product[1]+"</div>");
        node.append("<div>"+product[2]+"</div>");
        node.append("<div>"+product[5]+"</div>");
        node.append("<div>"+product[6]+"</div>");
        node.append("<div>"+product[7]+" Ether </div>");
        return node;
    },**/
    saveProduct : async function(reader,decodedParams){//保存商品
        try{
            let imageId,descId;
            imageId = await this.saveImageOnIpfs(reader);
            descId = await this.saveTextBlobOnIpfs(decodedParams["product-description"])
            this.saveProductToBlockChain(decodedParams,imageId,descId);//将商品信息和刚刚所得的图片及描述hash存入区块链
        }catch(err){
            console.error("err:",err);
        }
    },
    saveImageOnIpfs : async function(reader){//保存图片ipfs
        let buffer = Buffer.from(reader.result);
        let res;
        for await (const r of ipfs.add(buffer)) {
            console.log(r);
            res = r.path;
        };
        return res;
        /**
         let res = await ipfs.add(buffer);
         console.log("file save on ipfs,res is :",res);
         return res[0].hash;
         **/
    },
    saveTextBlobOnIpfs :async function(blob){
        let res;
        for await (const r of ipfs.add(blob)) {
            console.log(r);
            res = r.path;

        };
        return res;
        /**
         return new Promise((resolve,reject)=>{
		  let buffer = Buffer.from(blob,"utf-8");
		  ipfs.add(buffer).then(res=>{
			  resolve(res[0].hash);
		  }).catch(err=>{
			  reject(err);
		  })
	  })
         **/
    },
    saveProductToBlockChain : async function(p,imageId,descId){//将商品信息保存都区块链
        console.log("params in save product:",p);
        let auctionStartTime = Date.parse(p["product-auction-start"]) / 1000;
        let auctionEndTime = auctionStartTime + parseInt(p["product-auction-end"]) * 24 * 60 * 60;
        let startPrice = App.web3.utils.toBN(App.web3.utils.toWei(p["product-price"],'ether')).toString();//注意要转换为BigNumber，否则js无法处理这样的大数据
        let condition = parseInt(p["product-condition"])
        const {addProductToStore} = this.meta.methods;
        let res = await addProductToStore(p["product-name"],p["product-category"],imageId,descId,auctionStartTime,auctionEndTime,startPrice,condition).send({from:this.account});
        console.log(res);
        $("#msg").show();
        $("#msg").html("Your product has been added to store successfully!");
    },
    renderProductDetail :async function(productId){
        let p = await this.getProduct(productId);
        let desc = "";
        const chunks = [];
        for await (const chunk of ipfs.cat(p[4])) {
            chunks.push(chunk);
            console.log("chunk:",chunk);
        }

        console.log("get description: ",chunks);
        desc = Buffer.concat(chunks).toString();
        $("#product_desc").html(desc);
        $("#product_image").attr('src',"http://localhost:8080/ipfs/"+p[3]);
        $("#product_name").html(p[1]);
        $("#product_price").html('ETH: '+this.web3.utils.fromWei(p[7],'ether'));
        $("#product_id").val(p[0]);


        let currentTime = Math.round(new Date()/1000);
        let remain_time = p[6] - currentTime;
        if(remain_time<=0){
            $("#product_end").html("Auction Has Ended!");
			$("#auction_inf").css("display","inline");
        }else{
            let days = Math.trunc(remain_time/(60*60*24));
            remain_time -= days * 60 * 60 * 24;
            let hours = Math.trunc(remain_time/(60*60));
            remain_time -= hours * 60 * 60;
            let minutes = Math.trunc(remain_time / 60);
			remain_time -= minutes*60;
            if(days > 0){
                $("#product_end").html("Auction end in "+days+" days "+hours+" house "+minutes+" minutes");
            }else if(hours>0){
                $("#product_end").html("Auction end in "+hours+" hours "+minutes+" minutes");
            }else if(minutes>0){
                $("#product_end").html("Auction end in "+minutes+" minutes "+remain_time+" seconds");
            }else{
                $("#product_end").html("Auction end in "+remain_time+" seconds");
            }
        }//标记，待编写，展示竞拍完结后信息
        if(parseInt(p[8]) == 1){//资金托管中，三方中两方同意后释放资金
            let f = await App.highestBidderInfo(productId);
            //console.log(f[2]);
			$("#auction_area").hide;
            let displayPrice = App.web3.utils.fromWei(App.web3.utils.toBN(f[2]),'ether');
            $("#product_desc").html("Auction has ended. Product sold to <b>" +f[0] + "</b> for <b>" + displayPrice +" ETH </b>"+
                ",The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +
                "either release the funds to seller or refund the money to the buyer");
            let info = await App.escrowInfo(productId);
            $("#seller").html(info[0]);
            $("#buyer").html(info[1]);
            $("#shipper").html(info[2]);
			if(App.account==info[0]){
				$("#seller_control").show();
			}
			if(App.account==info[1]){
				$("#buyer_control").show();
			}	
			if(App.account==info[2]){
				$("#shipper_control").show();
			}
            $("#escrow_info").show();
            if(info[3]==true){
                $("#product_desc").html("Amount has released,aution has destroyed!");
				$("#buyer_control").hide();
				$("#seller_control").hide();
				$("#shipper_control").hide();
				$("#auction_area").hide();
                $("#escrow_into").show();
            }else{
				let fund_info_html = '<p>'+info[4]+' of 3 participants have agreed to release funds<p/></p>'+info[5]+' of 3 participants have agreed to refund</p>'
                $("#product_desc").html(fund_info_html);
				$("#auction_area").hide();
            }
            $("#refund_unreveal_bid").show();
        }else if(parseInt(p[8]) == 2){//商品没有卖出去
            $("#product_desc").html("Product not sold");
			$("#auction_area").hide();
			$("#escrow_into").hide();
            $("#refund_unreveal_bid").show();
        }else if(currentTime < p[6]){//商品正在竞拍，还未到竞拍结束时间
            $("#auction_area").show();
        }else if(currentTime - (60) < p[6]){//竞拍结束时间已到，展示揭示报价按钮
            $("#revealing").show();
			$("#auction_area").hide();
            $("#escrow_into").hide();
        }else{//揭示报价时间结束，展示终止揭示报价按钮
            $("#shipping_area").show();
        }
    },
    bid : async function(productId,sealedBid,amount){
        const {bid} = this.meta.methods;
        let rawAmount = this.web3.utils.toBN(this.web3.utils.toWei(amount,'ether')).toString();
        let res = await bid(productId,sealedBid).send({from:this.account,value:rawAmount});
        console.log("bid success!",res);
        alert("your bid has been submitted successfully!");
    },
    revealBid : async function(productId,amount,secretText){
        const {revealBid} = this.meta.methods;
        let rawAmount = this.web3.utils.toBN(this.web3.utils.toWei(amount,'ether')).toString();
        let bidUnencrupt = App.web3.utils.toWei(amount,'ether').toString()+secretText;
        let sealedBid = App.web3.utils.sha3(bidUnencrupt);
        let res = await revealBid(productId,rawAmount,sealedBid)
            .send({from:this.account});

        console.log("revealed res:",res);
        alert("revealed success!");
    },
    finalizeAuction : async function(productId){
        const {finalizeAuction} = this.meta.methods;
        let res = await finalizeAuction(parseInt(productId)).send({from:this.account});
        return res;
    },
    highestBidderInfo : async function(productId){
        const {highestBidderInfo} = this.meta.methods;
        let res = await highestBidderInfo(productId).call();
        return res;
    },
    escrowInfo :async function(productId){
        const {escrowInfo} = this.meta.methods;
        let res = await escrowInfo(productId).call();
        return res;
    },
    releaseAmountToSeller : async function(productId){
        const {releaseAmountToSeller} = this.meta.methods;
        await releaseAmountToSeller(productId).send({from:this.account});
        alert("transaction submitted!");
    },
    releaseAmountToBuyer : async function(productId){
        const {releaseAmountToBuyer} = this.meta.methods;
        await releaseAmountToBuyer(productId).send({from:this.account});
    },
    returnInvalidBidMoney : async function(productId,sealdBid){
        const {returnInvalidBidMoney} = this.meta.methods;
        await returnInvalidBidMoney(productId,sealdBid).send({from:this.account});
    },
	buildGate : async function(){
		const {productIndex} = this.meta.methods;
		let index = await productIndex().call();
		let pArray = new Array();
		let count=3;
		while(index>0 && count>0){
			let product = await this.getProduct(index);
			pArray.push(product);
			index-=1;
			count-=1;
		}
		this.buildGateBottom(pArray);
		this.buildGateSlide(pArray);
	},
	buildGateBottom : function(pArray){
		let tempHtml = "";
		$.each(pArray,(index,obj)=>{
			tempHtml += '<div class="grid_1_of_4 images_1_of_4"><a href="product_detail.html?id='+obj[0]+'" target="_blank"><img src="http://localhost:8080/ipfs/'+obj[3]+'" width="212px" height="212px"/></a>'
						+'<h2>'+obj[1]+'</h2><div class="price-details"><div class="price-number"><p><span class="rupees">ETH: '+App.web3.utils.fromWei(obj[7],'ether') 
						+'</span></p></div><div class="add-cart"><h4><a href="product_detail.html?id='+obj[0]+'" target="_blank" /></h4></div><div class="clear"></div></div></div>';
		})
		$("#gate_new_products").html(tempHtml);
	},
	buildGateSlide : function(pArray){
		let tempHtml="";
		$.each(pArray,(index,obj)=>{
			tempHtml += ' <div id="slide-1" class="slide">'+
							'<div class="slider-img">'+
								'<a href="product_detail.html?id='+obj[0]+'" target="_blank"><img src="http://localhost:8080/ipfs/'+obj[3]+'" width="368px" height="386px"/></a>'
							+'</div>'+
							'<div class="slider-text">'
								+'<h1>Clearance<br><span>SALE</span></h1><div class="features_list"><h4>Join Auction Now</h4></div><a href="product_detail.html?id='+obj[0]+'" class="button" target="_blank" >Go</a>'
					+'</div><div class="clear"></div></div>'
		})
		$("#mover").html(tempHtml);
	}
};

window.App = App;

window.addEventListener("load", function() {

    if (window.ethereum) {
        // use MetaMask's provider
        App.web3 = new Web3(window.ethereum);
        window.ethereum.enable(); // get permission to access accounts
    } else {
        console.warn(
            "No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",
        );
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        App.web3 = new Web3(
            new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
        );
    }

    App.start();
});

/**
 function renderStore(){
	let product = App.getProduct(1);
	$("#product-list").append(buildProduct(product));

	product = App.getProduct(2);
	$("#product-list").append(buildProduct(product));
}

 function buildProduct(){
	let node = $("<div></div>");
	node.addClass("col-sm-3 text-center col-margin-bottom-1");
	node.append("<imag src='http://localhost:9001/ipfs/'"+product[3]+"' width = '150px' />");
	node.append("<div>"+product[1]+"</div>");
	node.append("<div>"+product[2]+"</div>");
	node.append("<div>"+product[5]+"</div>");
	node.append("<div>"+product[6]+"</div>");
	node.append("<div>"+product[7]+" Ether </div>");
	return node;
}
 **/
