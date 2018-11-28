var bitcore = require('ximcore-lib');
window.generatePrivateKey = function() {
	return new bitcore.PrivateKey().toString();
}
window.fromWifKey = function(key) {
	return bitcore.PrivateKey.fromWIF(key);
}
window.toWifKey = function(key) {
	return new bitcore.PrivateKey(key).toWIF();
}
window.getDecryptedAddress = function(key) {
	return new bitcore.PrivateKey(key).toAddress().toString();
}
window.signRawTx = function(rawUtxosHashes, rawUtxosOutputIndex, rawTx, txFeeInDuffs, key) {
  try {
    // Due to a tx sign bug where ouput (script and satoshi amount) get lost when using our rawTx
		// we need to recreate the whole transaction: https://github.com/bitpay/bitcore/issues/1199
    var transaction = new bitcore.Transaction();
		bitcore.Transaction.DUST_AMOUNT = 0;
		bitcore.Transaction.FEE_PER_KB = 0;
		bitcore.Transaction.FEE_SECURITY_MARGIN = 0;
    transaction.fee(txFeeInDuffs);
    for (var i=0; i<rawUtxosHashes.length; i++) {
      var inputTransaction = new bitcore.Transaction(rawUtxosHashes[i]);
      //console.log("inputTransaction %O", inputTransaction);
			// Recreate utxo from existing data, address is not needed, output index is obviously important
			var utxo = {
				txId: inputTransaction.hash,
				outputIndex: rawUtxosOutputIndex[i],
				script: inputTransaction.outputs[rawUtxosOutputIndex[i]].script,
				satoshis: inputTransaction.outputs[rawUtxosOutputIndex[i]].satoshis
			};
      //console.log("utxo %O", utxo);
      transaction.from(utxo);
    }
    // Just copy outputs over, they have been already calculated and have the correct fee, etc.
    var rawTransaction = new bitcore.Transaction(rawTx);
    //console.log("rawTransaction %O", rawTransaction);
		for (var i = 0; i < rawTransaction.outputs.length; i++) {
			//console.log("output %O", rawTransaction.outputs[i]);
			transaction.addOutput(rawTransaction.outputs[i]);
		}
		// And we are done, sign raw transaction with the given keystore private key
    transaction = transaction.sign(bitcore.PrivateKey(key));
    // If anything went wrong, return that error to user (if signed tx starts with "Error: " it
		// didn't work out, otherwise we have the signed tx ready to broadcast).
    if (transaction.getSerializationError())
			return "Error: "+ transaction.getSerializationError().message;
		return transaction.toString();
  }
  catch (e) {
    return "Error: "+ e.toString();
  }
}