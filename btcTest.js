const isTest = true
const axios = require('axios')
const bitcoin = require('bitcoinjs-lib');
let pushtx = isTest ? require('blockchain.info/pushtx').usingNetwork(3) : require('blockchain.info/pushtx')   // 3 testnet 
var blockexplorer = isTest ? require('blockchain.info/blockexplorer').usingNetwork(3) : require('blockchain.info/blockexplorer')
const NETWORK = isTest ? bitcoin.networks.testnet : bitcoin.networks.bitcoin

//let be = require('blockexplorer')

//let privateKey = new bitcore.PrivateKey();

//const myAddress = privateKey.toAddress();
/**
 * 
 * const keyPair = bitcoin.ECPair.makeRandom({ network: NETWORK })
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: NETWORK })

    // bitcoin NETWORK P2PKH addresses start with a 'm' or 'n'
    assert.strictEqual(address.startsWith('m') || address.startsWith('n'), true)
 * 
 *  */

 /**create NETWORK address */
//  function CreateBitcoinAccount() {
//      console.log("CreateBitcoinAccount")
//     let keyPair = null
//     let address = null
//     if (isTest) {
//         keyPair = bitcoin.ECPair.makeRandom({newwork: NETWORK})
//         address = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network: NETWORK}).address
//     } else {
//         keyPair = bitcoin.ECPair.makeRandom()
//         address = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey}).address
//     }

//     //console.log("keypair: ",  keyPair)
//     console.log("pk wif: ", keyPair.toWIF())
//     console.log("address: ", address)

//     return { wif: keyPair.toWIF(),
//                 address: address }
//  }

//https://api.blockcypher.com/v1/btc/test3/addrs
async function CreateBitcoinAccount() {
    try {
        let reqURL = isTest ? 'https://api.blockcypher.com/v1/btc/test3/addrs' : 'https://api.blockcypher.com/v1/btc/main/addrs'
        let postResp = await axios.post(reqURL, null)
        
        console.log("create bitcoin account response: ", postResp.data)
        return { wif: postResp.data.wif,
                            address: postResp.data.address }
    } catch (error) {
        console.log("create bitcoin account error: ", error)   
    }
}

 //CreateBitcoinAccount();

/**
 * 
 * @param {*} addr 
 */
async function GetAccountPreviousOutputAndBalance(addr) {
    try {
        let reqString = isTest ? ('https://api.blockcypher.com/v1/btc/test3/addrs/'+addr+'?unspentOnly=true') :('https://api.blockcypher.com/v1/btc/main/addrs/'+addr+'?unspentOnly=true')
        let response = await axios.get(reqString)
        console.log("get act info response: ", response.data)
        let lastOutput = null
        let balVal = null
        let voutn = 0
        let hasUnconfirmTx = false
        if (response.data.n_tx == 0) {
            lastOutput = 0
            balVal = 0
        } else {
            for (let idx=0; idx<response.data.txrefs.length; idx++) {
                if (response.data.txrefs[idx].ref_balance == response.data.final_balance) {
                    lastOutput  = response.data.txrefs[idx].tx_hash
                    balVal = response.data.txrefs[idx].value   // satoshi
                    voutn = response.data.txrefs[idx].tx_output_n

                    break;
                }
            }
        }
        return {
            preOutput: lastOutput,
            balance: balVal,
            voutn : voutn
        }
    } catch (error) {
        console.log("get act info error:", error);
    }
    
}

/**
 * 
 * @param {*} addr 
 * { final_balance: 4816087, n_tx: 11, total_received: 28841741 } }
 */
async function GetAccountBalance(addr) {
    let rst = await blockexplorer.getBalance(addr);
    console.log("balance info: ", rst);
    return rst[addr].final_balance;
}

/**
 * 
 * @param {*} addr 
 * { notice: '',
>   unspent_outputs:
>    [{ tx_hash:
>         'ac99be70af646ca4f75f9c343e8759c7d32de1d9a60f90f9bf3109985b47c21e',
>        tx_hash_big_endian:
>         '1ec2475b980931bff9900fa6d9e12dd3c759873e349c5ff7a46c64af70be99ac',
>        tx_output_n: 0,
>        script: '76a914783a9c0b1af500110c43144da787436db9c27ffc88ac',
>        value: 0,
>        value_hex: '00',
>        confirmations: 2260,
>        tx_index: 0 } ] }
 */
async function GetAccountUnspentInfo(addr) {
    let uspt = await blockexplorer.getUnspentOutputs(addr);
    console.log("unspent info: ", uspt);
    if (uspt.unspent_outputs.length > 0) {
        return uspt.unspent_outputs
    } else {
        return [];
    }
}

async function GetUnconfirmedTrx(addr) {
    try {
        let rst = await blockexplorer.getAddress(addr);
        console.log("unconfirm trx: ", rst);
    } catch (error) {
        console.log("GetUnconfirmedTrx error: ", error);
    }
}



// async function BroadcastTransaction(trxData) {
//     try {
//         let reqURL = isTest ? 'https://api.blockcypher.com/v1/bcy/test/txs/push/' : 'https://api.blockcypher.com/v1/btc/main/txs/push/'
//         var pushtx = { tx : trxData}
//         let postResp = await axios.post(reqURL, JSON.stringify(pushtx))
        
//         console.log("broadcast response: ", postResp.data)
//     } catch (error) {
//         console.log("broadcast error: ", error)   
//     }
// }

async function BroadcastTransaction(trxData) {
    try {
        let trxRst = await pushtx.pushtx(trxData)
        
        console.log("broadcast response: ", trxRst)
        return true;
    } catch (error) {
        console.log("broadcast error: ", error)   
        return false;
    }
}

/**
 * 
 * @param {*} srcWIF  sender's WIF pk
 * @param {*} sendVal   satoshis
 */
async function SendBitcoinToCashier(srcWIF, srcAddr, dstAddr, sendVal) {
    let actInfo = await GetAccountPreviousOutputAndBalance(srcAddr)
    //const unspent = await regtestUtils.unspents(srcAddr)
    console.log("actInfo: ", actInfo)
    let minigFee = 10000

    if (actInfo.balance > minigFee) { // larger than miner fee
        const alice = bitcoin.ECPair.fromWIF(srcWIF, NETWORK)
        const txb = new bitcoin.TransactionBuilder(NETWORK)
    
        //txb.setVersion(1)
        txb.addInput(actInfo.preOutput, actInfo.voutn)
        txb.addOutput(dstAddr, actInfo.balance - minigFee)
        //txb.addOutput(srcAddr, actInfo.balance - sendVal )  // 10000 for mining fee
        // (in)15000 - (out)12000 = (fee)3000, this is the miner fee
    
        txb.sign({
          prevOutScriptType: 'p2pkh',
          vin: 0,
          keyPair: alice
        })
    
        // prepare for broadcast to the Bitcoin network, see "can broadcast a Transaction" below
        let trxRst = await BroadcastTransaction(txb.build().toHex())
        console.log("trxRst: ", trxRst)
    }
}

/*
{ tx_hash:
>         'ac99be70af646ca4f75f9c343e8759c7d32de1d9a60f90f9bf3109985b47c21e',
>        tx_hash_big_endian:
>         '1ec2475b980931bff9900fa6d9e12dd3c759873e349c5ff7a46c64af70be99ac',
>        tx_output_n: 0,
>        script: '76a914783a9c0b1af500110c43144da787436db9c27ffc88ac',
>        value: 0,
>        value_hex: '00',
>        confirmations: 2260,
>        tx_index: 0 }
*/

async function CashoutToOtherAccount(cashierWIF, cashierAddr, dstAddr, sendVal) {
    let bal = await GetAccountBalance(cashierAddr);
    let uspt = await GetAccountUnspentInfo(cashierAddr);

    console.log("balance: ", bal);
    console.log("uspt: ", uspt);

    let minigFee = 5000

    if (bal > minigFee && uspt.length > 0) { // larger than miner fee
        const cashier = bitcoin.ECPair.fromWIF(cashierWIF, NETWORK)
        const txb = new bitcoin.TransactionBuilder(NETWORK)
    
        for (var idx = 0; idx<uspt.length; idx++) {
            txb.addInput(uspt[idx].tx_hash_big_endian, uspt[idx].tx_output_n)
        }
        
        //txb.addInput("1ec2475b980931bff9900fa6d9e12dd3c759873e349c5ff7a46c64af70be99ac", 0)
        txb.addOutput(dstAddr, sendVal)
        txb.addOutput(cashierAddr, bal - sendVal - minigFee)
        // (in)15000 - (out)12000 = (fee)3000, this is the miner fee
    
        for (var idx = 0; idx<uspt.length; idx++) {
            txb.sign({
                prevOutScriptType: 'p2pkh',
                vin: idx,
                keyPair: cashier
              })
        }
    
        // prepare for broadcast to the Bitcoin network, see "can broadcast a Transaction" below
        let trxRst = await BroadcastTransaction(txb.build().toHex())
        console.log("trxRst: ", trxRst)
    }
}

//CashoutToOtherAccount("cPgsL6CvcgJC6MQ6fYsk6wNQasboC3iRY4pMFV1j9rppLpxedZ3V", "mrUfbLTGa8wHCYdtk2CcFvDCGtz1FodoY6", 'mxdPy3K9E595voBC1BCEvRQEHBE3skRMDt', 20000);
//SendBitcoinToCashier("cUiyTM6TtNa5nhG5Pct5Sk5hRzDzyo1idC8Z1Da759V214YUEPuF", "mgnxrDBwSD3kQ9f7fE5kFB9Gfgnd1Y4k34", 'mrUfbLTGa8wHCYdtk2CcFvDCGtz1FodoY6', 5000);
//mxdPy3K9E595voBC1BCEvRQEHBE3skRMDt

//GetUnconfirmedTrx("mrUfbLTGa8wHCYdtk2CcFvDCGtz1FodoY6");

//GetAccountUnspentInfo("mrUfbLTGa8wHCYdtk2CcFvDCGtz1FodoY6");
//GetUnconfirmedTrx("mrUfbLTGa8wHCYdtk2CcFvDCGtz1FodoY6");
CreateBitcoinAccount();