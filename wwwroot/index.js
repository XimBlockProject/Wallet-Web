function goToSendPanel(successfullyConnectedMessage) {
	$("#main-panel").hide();
	$("#send-panel").show();
	$("#title").text("Send XIM");
	$("#response").show().css("color", "yellow").html(successfullyConnectedMessage);
	$("#resultPanel").text("");
	$("#main-page-title").text("Close Wallet");
}
function showNumber(amount, decimals) {

	var result;
	if (decimals === 3) {
		result = parseFloat(Math.round(amount * 1000) / 1000).toFixed(decimals);
	}
	else if (decimals === 4) {
		result = parseFloat(Math.round(amount * 10000) / 10000).toFixed(decimals);
		// If we have more than 1 leading digits before the . remove the last digit after the dot
		if (result.length > 6)
			result = result.substring(0, result.length - 1);
	}
	else if (decimals === 5) {
		result = parseFloat(Math.round(amount * 100000) / 100000).toFixed(decimals);
		// If we have more than 1 leading digits before the . remove the last digit after the dot
		if (result.length > 7)
			result = result.substring(0, result.length - 1);
	}
	else if (decimals === 6)
		result = parseFloat(Math.round(amount * 1000000) / 1000000).toFixed(decimals);
	else if (decimals === 7)
		result = parseFloat(Math.round(amount * 10000000) / 10000000).toFixed(decimals);
	else if (decimals === 8)
		result = parseFloat(Math.round(amount * 100000000) / 100000000).toFixed(decimals);
	else
		result = parseFloat(amount).toFixed(decimals);
	// Always cut off the last bunch of zeros (except if we requested 2 decimals for currencies)
	if (decimals > 2)
		for (var i = 0; i < 9; i++) {
			var isDot = result.endsWith('.');
			if (result.endsWith('0') || isDot) {
				result = result.substring(0, result.length - 1);
				if (isDot)
					break;
			} else
				break;
		}
	if (result === "")
		return 0;
	return result;
}

var addressBalance = 0;
var autoBalanceCheck;

function isValidAddress(address) {
	return address && address.length >= 34 && (address[0] === 'X' || address[0] === 'x');
}

function updateLocalStorageBalances() {
	localStorage.setItem('address', ximblockKeystoreWallet.address);
	localStorage.setItem('addressBalance', addressBalance);
	return addressBalance;
}

// Great solution for cryptoid.info api calls (we don't need old IE compatibility), see:
// https://stackoverflow.com/questions/3362474/jquery-ajax-fails-in-ie-on-cross-domain-calls
function crossDomainAjax(url, successCallback, errorCallback) {
	if (window.navigator.userAgent.indexOf("MSIE ") > 0) {
		var xhr = new XMLHttpRequest();
		xhr.withCredentials = true;
		var method = 'GET';
		if ("withCredentials" in xhr) {
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, url);
		}
		xhr.onload = function () { successCallback(xhr.responseText); };
		xhr.onerror = function () {
			if (errorCallback)
				errorCallback(xhr.error);
		};
		xhr.send();
		return xhr;
	}
	$.support.cors = true;
	return $.ajax({
		url: url,
		cache: false,
		dataType: 'json',
		type: 'GET',
		async: false, // must be set to false
		success: function (data, success) {
			successCallback(data);
		},
		error: function (request, status, error) {
			// Try again with cors-anywhere
			$.get("https://cors-anywhere.herokuapp.com/" + url).done(function(data) {
				successCallback(data);
			}).fail(function(jqxhr) {
				if (errorCallback)
					errorCallback(jqxhr.responseText);
			});
		}
	});
}

// Loops through all known XIM addresses and checks the balance and sums up to total amount we got
function balanceCheck() {
	//keep displaying: document.getElementById("refreshing-amount-timeout").style.display = "none";
	if (isValidAddress(ximblockKeystoreWallet.address)) {
        crossDomainAjax("https://chainz.cryptoid.info/xim/api.dws?q=getbalance&a=" + ximblockKeystoreWallet.address,
			function (data, status) {
				if (data !== "ERROR: address invalid" && addressBalance !== parseFloat(data)) {
					addressBalance = parseFloat(data);
					updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses();
				}
			});
	}
}

var balanceCheckTime = 5;

function tryBalanceCheck() {
	document.getElementById("balance-check-time").innerHTML = balanceCheckTime + "s";
	if (balanceCheckTime === 0)
		balanceCheck();
	document.getElementById("refreshing-amount-timeout").style.display = "block";
	balanceCheckTime -= 1;
	if (balanceCheckTime === -1)
		balanceCheckTime = 10;
}

function updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses() {
	var totalAmount = updateLocalStorageBalances();
	document.getElementById("totalAmountXIM").innerHTML = showNumber(totalAmount, 8);
// ReSharper disable UseOfImplicitGlobalInFunctionScope
	document.getElementById("totalAmountUsd").innerHTML = showNumber(totalAmount * usdRate, 2);
	document.getElementById("totalAmountEur").innerHTML = showNumber(totalAmount * eurRate, 2);
	generateReceivingAddressList();
}

function addAddressBalance(list, address, balance, freshestAddress) {
	var qrImg = "//chart.googleapis.com/chart?cht=qr&chl=ximblock:" + address + "&choe=UTF-8&chs=140x140&chld=L|0";
    $("<li><a href='https://chainz.cryptoid.info/xim/api.dws?q=getbalance&a=" + address +
		"' target='_blank' rel='noopener noreferrer'>" +
		(address === freshestAddress
			? "<img width='140' height='140' src='" +
			qrImg +
			"' title='Your freshest XIM Address should be used for receiving XIM, if you wallet support it you will get a new one once this has been used!' /><br/>"
			: "") +
		address +
		"</a><div class='address-amount' onclick='setAmountToSend(" + balance + ")'>" +
		showNumber(balance) + " XIM</div></li>").prependTo(list);
}

function generateReceivingAddressList() {
	var list = $("#addressList");
	list.empty();
	addAddressBalance(list, ximblockKeystoreWallet.address, addressBalance, ximblockKeystoreWallet.address);
}

function setAddressAndLookForLastUsedHdWalletAddress(firstAddress) {
	addressBalance = localStorage.getItem('addressBalance');
	if (!addressBalance) {
		addressBalance = 0;
		generateReceivingAddressList();
	}
	if (!autoBalanceCheck) {
		updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses();
		balanceCheck();
		autoBalanceCheck = window.setInterval(tryBalanceCheck, 1000);
	}
	updateBalanceIfAddressIsUsed(getFreshestAddress());
}

function updateBalanceIfAddressIsUsed(newAddress) {
	crossDomainAjax("https://chainz.cryptoid.info/xim/api.dws?q=getreceivedbyaddress&a=" + newAddress,
		function (data) {
			if (data !== "ERROR: address invalid") {
				if (!addressBalance) {
					//console.log("Found new XIM Address: " + newAddress);
					addressBalance = 0;
					// Update storage to not query this next time if this is in fact the newest empty address
					updateLocalStorageBalances();
					generateReceivingAddressList();
				}
				// If there was ever anything sent to this address, continue checking for more
				if (parseFloat(data) > 0)
					checkNextLedgerAddress();
			}
		});
}

function setTotalAmountToSend() {
	setAmountToSend(parseFloat($("#totalAmountXIM").text()));
}

function setAmountToSend(amount) {
	var sendCurrency = $("#selectedSendCurrency").text();
	if (sendCurrency === "USD")
		amount *= usdRate;
	if (sendCurrency === "EUR")
		amount *= eurRate;
	$("#amount").val(amount);
	updateAmountInfo();
}

var amountToSend = 0.001;
function getPrivateSendNumberOfInputsBasedOnAmount() {
	if (amountToSend <= 0.01)
		return 1;
	var numberOfPrivateSendInputsNeeded = 1;
	var checkAmountToSend = amountToSend;
	while (checkAmountToSend > 10) {
		numberOfPrivateSendInputsNeeded++;
		checkAmountToSend -= 10;
	}
	while (checkAmountToSend > 1) {
		numberOfPrivateSendInputsNeeded++;
		checkAmountToSend -= 1;
	}
	while (checkAmountToSend > 0.1) {
		numberOfPrivateSendInputsNeeded++;
		checkAmountToSend -= 0.1;
	}
	while (checkAmountToSend > 0.01) {
		numberOfPrivateSendInputsNeeded++;
		checkAmountToSend -= 0.01;
	}
	return numberOfPrivateSendInputsNeeded;
}

var lastKnownNumberOfInputs = 1;
function updateTxFee(numberOfInputs) {
	if (numberOfInputs <= 0) {
		numberOfInputs = 1;
	}
	lastKnownNumberOfInputs = numberOfInputs;
	// XIM tx fee with 10 XIM/kb with default 226 byte tx for 1 input, 374 for 2 inputs (78+148*
	// inputs). All this is recalculated below and on the server side once number of inputs is known.
	// Note zero fee is possible too, but might take up to 5 minutes to confirm.
	var txFee = 0.78 + 1.48 * numberOfInputs;
	// Zero fee on or sending below the tx fee? Use 0 fee
	if ($("#useFreeTx").is(':checked') || amountToSend < txFee)
		txFee = 0;
	if ($("#useInstantSend").is(':checked'))
		txFee = 10 * numberOfInputs;
	// Obfuscation number of needed inputs depends on the amount, not on the inputs (fee for that
	// is already calculated above). Details on the /AboutPrivateSend help page
	if ($("#usePrivateSend").is(':checked'))
		txFee += 10 + 1 * getPrivateSendNumberOfInputsBasedOnAmount();
	$("#txFeeXIM").text(showNumber(txFee, 5));
	$("#txFeeUsd").text(showNumber(txFee * usdRate, 4));
	/*not needed
	if (amountToSend < DUST_AMOUNT_IN_SATS || amountToSend > parseFloat($("#totalAmountXIM").text()) ||
		$("#usePrivateSend").is(':checked') && amountToSend < MinimumForPrivateSend) {
		$("#generateButton").css("backgroundColor", "gray").attr("disabled", "disabled");
		amountToSend = 0;
	}
	*/
}
updateTxFee(1);

function setSendCurrency(newSendCurrency) {
	$("#selectedSendCurrency").text(newSendCurrency);
	updateAmountInfo();
}
function getChannel() {
	return $("#sendToEmail").is(":checked")
		? "Email"
		: $("#sendToTwitter").is(":checked")
		? "Twitter"
		: $("#sendToReddit").is(":checked")
		? "Reddit"
		: $("#sendToDiscord").is(":checked")
		? "Discord"
		: "Address";
}
function getChannelAddress() {
	return $("#sendToEmail").is(":checked")
		? $("#toEmail").val()
		: $("#sendToTwitter").is(":checked")
		? $("#toTwitter").val()
		: $("#sendToReddit").is(":checked")
		? $("#toReddit").val()
		: $("#sendToDiscord").is(":checked")
		? $("#toDiscord").val()
		: $("#toAddress").val();
}
function getChannelExtraText() {
	return $("#sendToEmail").is(":checked")
		? $("#toEmailExtraText").val()
		: $("#sendToTwitter").is(":checked")
		? $("#toTwitterExtraText").val()
		: $("#sendToReddit").is(":checked")
		? $("#toRedditExtraText").val()
		: $("#sendToDiscord").is(":checked")
		? $("#toDiscordExtraText").val()
		: "";
}
function isValidEmail(email) {
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}
function isValidTwitterUsername(username) {
	return /^@[a-zA-Z0-9_]{1,15}$/.test(username);
}
function isValidDiscordUsername(username) {
	return /^@(.*)#[0-9]{4}$/.test(username);
}
function isValidRedditUsername(username) {
	return username.startsWith('/u/') && username.length > 4 && username.indexOf(' ') < 0;
}
function isValidSendTo() {
	var channel = getChannel();
	var sendTo = getChannelAddress();
	if (channel === "Address")
		return isValidAddress(sendTo);
	else if (channel === "Email")
		return isValidEmail(sendTo);
	else if (channel === "Twitter")
		return isValidTwitterUsername(sendTo);
	else if (channel === "Discord")
		return isValidDiscordUsername(sendTo);
	else if (channel === "Reddit")
		return isValidRedditUsername(sendTo);
	return false;
}
// Doesn't make much sense to send less than 10 XIM for Obfuscation (as fees will be >10-20%)
var MinimumForPrivateSend = 10;
function updateAmountInfo() {
	var amount = parseFloat($("#amount").val());
	var amountIsValid = amount > 0;
	if (isNaN(amount))
		amount = 1;
	var sendCurrency = $("#selectedSendCurrency").text();
	if (sendCurrency === "USD")
		amount /= usdRate;
	if (sendCurrency === "EUR")
		amount /= eurRate;
	amountToSend = amount;
	if (//unused: amountToSend < DUST_AMOUNT_IN_SATS ||
		amountToSend > parseFloat($("#totalAmountXIM").text()) ||
		$("#usePrivateSend").is(':checked') && amountToSend < MinimumForPrivateSend)
		amountIsValid = false;
	//not longer used or shown: var btcValue = showNumber(amountToSend * btcRate, 6);
	$("#amount-info-box").text(
		showNumber(amountToSend, 8) + " XIM " +
		"= $" + showNumber(amountToSend * usdRate, 2) + " " +
		"= €" + showNumber(amountToSend * eurRate, 2) + " (1 XIM = " + btcRate + " BTC)");
	updateTxFee(0);
	if (amountIsValid && isValidSendTo()) {
		$("#generateButton").css("backgroundColor", "#1c75bc").removeAttr("disabled");
	} else {
		$("#generateButton").css("backgroundColor", "gray").attr("disabled", "disabled");
		amountToSend = 0;
	}
}
updateAmountInfo();

function copyToClipboard(element) {
	var $temp = $("<input>");
	$("body").append($temp);
	$temp.val($(element).text() === "" ? element : $(element).text()).select();
	document.execCommand("copy");
	$temp.remove();
	if (element === "XoASepVfo1cegWp52HS9gbcKuarLyqxsKT" && $("#toAddress").val() === "") {
		$("#toAddress").val(element);
		updateAmountInfo();
	}
}

function generateTransaction() {
	$("#generateButton").css("background-color", "gray").attr("disabled", "disabled");
	if (amountToSend === 0) {
		$("#transactionPanel").hide();
		$("#resultPanel").css("color", "red")
			.text(($("#usePrivateSend").is(':checked') && parseFloat($("#amount").val()) < 1 ?
				"Obfuscation transactions should be done with at least 10 XIM! " : "")+
				"Please enter an amount you have and a valid address to send to. Unable to create transaction!");
		return;
	}
	// Okay, we have all data ready, pick the oldest addresses until we have the required amount and
	// find all unspend outputs and send it all to the MyXimBlockWallet server to prepare the raw
	// transaction to sign. Doing this locally is possible too, but too much work right now.
	$("#resultPanel").css("color", "yellow").text("Waiting for raw transaction to be generated ...");
	addNextAddressWithUnspendFundsToRawTx(getAddressesWithUnspendFunds(), 0, ximblockKeystoreWallet.address, 0, [], [], [], "");
}

var rawTx = "";
var signedTx = "";
function addNextAddressWithUnspendFundsToRawTx(addressesWithUnspendInputs, addressesWithUnspendInputsIndex, remainingAddress, txAmountTotal, txToUse, txOutputIndexToUse, txAddressPathIndices, inputListText) {
	if (addressesWithUnspendInputsIndex >= addressesWithUnspendInputs.length) {
		$("#resultPanel").css("color", "red")
			.text("Failed to find more addresses with funds for creating transaction. Unable to continue!");
		return;
	}
	//Find utxo
	crossDomainAjax("https://chainz.cryptoid.info/xim/api.dws?q=unspent&key=18ad60f4febd&active=" +
		addressesWithUnspendInputs[addressesWithUnspendInputsIndex].address,
		function (data) {
			var address = addressesWithUnspendInputs[addressesWithUnspendInputsIndex].address;
			if (data === "Error getting unspent outputs" || !data["unspent_outputs"]) {
				$("#resultPanel").css("color", "red")
					.text("Failed to find any utxo (unspend transaction output) for " + address + ". Was it just spend elsewhere? Unable to create transaction, please refresh page!");
				return;
			}
			//Return format (notice the strange spelling mistake on tx_ouput_n instead of tx_output_n):
			//{"unspent_outputs":[{"tx_hash":"09f570876084b85adc85d330f4bbf6882686a6ca993660435b5369f5e77c1b20","tx_ouput_n":1,"value":"54000000000","confirmations":23,"script":"76a914c709efb02ac090b0c1e133bb68ca7027369a620188ac"}]}
			var utxos = data["unspent_outputs"];
			var thisAddressAmountToUse = 0;
			var txFee = parseFloat($("#txFeeXIM").text());
			var totalAmountNeeded = amountToSend + txFee;
			var maxAmountPossible = parseFloat($("#totalAmountXIM").text());
			// If we send everything, subtract txFee so we can actually send everything
			if (totalAmountNeeded >= maxAmountPossible)
				totalAmountNeeded = maxAmountPossible;
			for (var i = 0; i < utxos.length; i++) {
				var amount = utxos[i]["value"] / 100000000.0;
				if (amount > 0) {//DUST_AMOUNT_IN_SATS) {
					txToUse.push(utxos[i]["tx_hash"]);
					txOutputIndexToUse.push(utxos[i]["tx_ouput_n"]);
					txAddressPathIndices.push(addressesWithUnspendInputs[addressesWithUnspendInputsIndex].addressIndex);
					thisAddressAmountToUse += amount;
					txAmountTotal += amount;
					if (txAmountTotal >= totalAmountNeeded)
						break;
				}
			}
            inputListText += "<li><a href='https://chainz.cryptoid.info/xim/address.dws?" + address + "' target='_blank' rel='noopener noreferrer'><b>" + address + "</b></a> (-" + showNumber(thisAddressAmountToUse) + " XIM)</li>";
			if (txAmountTotal >= totalAmountNeeded) {
				// Recalculate txFee like code above, now we know the actual number of inputs needed
				updateTxFee(txToUse.length);
				txFee = parseFloat($("#txFeeXIM").text());
				totalAmountNeeded = amountToSend + txFee;
				if (totalAmountNeeded >= maxAmountPossible)
					totalAmountNeeded = maxAmountPossible;
				// Extra check if we are still have enough inputs to what we need
				if (txAmountTotal >= totalAmountNeeded) {
					// We have all the inputs we need, we can now create the raw tx
					$("#transactionPanel").show();
					//debug: inputListText += "<li>Done, got all inputs we need:</li>";
					var utxosTextWithOutputIndices = "";
					for (var index = 0; index < txToUse.length; index++) {
						//debug: inputListText += "<li>"+txToUse[index]+", "+txOutputIndexToUse[index]+"</li>";
						utxosTextWithOutputIndices += txToUse[index] + "|" + txOutputIndexToUse[index] + "|";
					}
					var channel = getChannel();
					var sendTo = getChannelAddress();
					var useInstantSend = $("#useInstantSend").is(':checked');
					var usePrivateSend = $("#usePrivateSend").is(':checked');
					$("#rawTransactionData").empty();
					$("#txDetailsPanel").show();
					$("#txDetailsPanel").html("Click to show transaction details for techies.");
					// Finish raw tx to sign, one final check if everything is in order will be done on server!
					$("#signButton").show();
					// Update amountToSend in case we had to reduce it a bit to allow for the txFee
					amountToSend = totalAmountNeeded - txFee;
					var remainingXIM = txAmountTotal - totalAmountNeeded;
					crossDomainAjax("/GenerateRawTx?utxos=" + utxosTextWithOutputIndices + //"&channel=" + channel +
						"&amount=" + showNumber(amountToSend, 8) + "&sendTo=" + sendTo.replace('#', '|')+"&remainingAmount="+showNumber(remainingXIM, 8)+"&remainingAddress="+remainingAddress
						//+"&SwiftTX="+useInstantSend+"&Obfuscation="+usePrivateSend+"&extraText="+getChannelExtraText()
					, function (data) {
						var txHashes = data["txHashes"];
						rawTx = data["rawTx"];
						txFee = data["usedSendTxFee"];
						//console.log("txHashes: %O", txHashes);
						//console.log("rawTx: %O", rawTx);
						var rawTxList = showRawTxPanel(sendTo, txFee,
							data["redirectedPrivateSendAddress"],
							data["redirectedPrivateSendAmount"]);
						$("<li>Using these inputs from your addresses for the required <b>" + showNumber(totalAmountNeeded, 3) + " XIM</b> (including fees):<ol>" + inputListText + "</ol></li>").appendTo(rawTxList);
						if (remainingXIM > 0)
                            $("<li>The remaining " + showNumber(remainingXIM, 3) +" XIM will be send to your own receiving address: <a href='https://chainz.cryptoid.info/address.dws?" + remainingAddress + "' target='_blank' rel='noopener noreferrer'><b>" + remainingAddress + "</b></a></li>").appendTo(rawTxList);
						signRawTxWithKeystore(txHashes, txOutputIndexToUse, rawTx, txFee);
					}, function (error) {
						$("#resultPanel").css("color", "red").text("Server Error: " + error);
					});
					return;
				}
			}
			// Not done yet, get next address
			addressesWithUnspendInputsIndex++;
			if (addressesWithUnspendInputsIndex < addressesWithUnspendInputs.length)
				addNextAddressWithUnspendFundsToRawTx(addressesWithUnspendInputs,
					addressesWithUnspendInputsIndex,
					remainingAddress,
					txAmountTotal,
					txToUse,
					txOutputIndexToUse,
					txAddressPathIndices,
					inputListText);
			else {
				$("#transactionPanel").hide();
				$("#resultPanel").css("color", "red").text("Insufficient funds, cannot send " +
					totalAmountNeeded + " XIM (including tx fee), you only have " + maxAmountPossible +
					" XIM. If you have XIM incoming, please wait until they are fully confirmed and show up on your account balance here. Unable to create transaction!");
			}
		});
}

function signRawTxWithKeystore(txHashes, txOutputIndexToUse, rawTx, txFee) {
	//console.log("rawTx %O", rawTx);
	var txFeeInDuffs = Math.round(txFee * 100000000);
	//console.log("txFeeInDuffs %O", txFeeInDuffs);
	signedTx = window.signRawTx(txHashes, txOutputIndexToUse, rawTx, txFeeInDuffs, CryptoJS.AES.decrypt(ximblockKeystoreWallet.d, ximblockKeystoreWallet.s).toString(CryptoJS.enc.Utf8));
	//console.log("signed tx %O", signedTx);
	if (signedTx.startsWith("Error")) {
		$("#resultPanel").css("color", "red").text("Signing Transaction failed. " + signedTx);
		return;
	}
	$("#signButton").css("backgroundColor", "#1c75bc").removeAttr("disabled");
	$("#resultPanel").css("color", "yellow").text("Successfully generated and signed transaction with your Keystore wallet! Send it out now.");
}

function signAndSendTransaction() {
	if (!signedTx || signedTx === "" || signedTx.startsWith("Error"))
		return;
	$("#signButton").hide().css("backgroundColor", "gray").attr("disabled", "disabled");
	$("#transactionPanel").hide();
	var useInstantSend = $("#useInstantSend").is(':checked');
	var usePrivateSend = $("#usePrivateSend").is(':checked');
	$("#resultPanel").css("color", "yellow").text("Sending signed transaction to the XIM network ..");
	crossDomainAjax("/SendSignedTx?signedTx=" + signedTx + "&SwiftTX=" + useInstantSend,
		function (finalTx) {
		$("#resultPanel").css("color", "orange").html(
			"Successfully signed transaction and broadcasted it to the XIM network. "+
			(useInstantSend ? "You used SwiftTX, the target wallet will immediately see incoming XIM." : "")+
			"You can check the transaction status in a few minutes here: <a href='https://chainz.cryptoid.info/xim/tx.dws?" + finalTx+"' target='_blank' rel='noopener noreferrer'>"+finalTx+"</a>"+(usePrivateSend?getPrivateSendFinalHelp() : ""));
	}, function (error) {
		$("#resultPanel").css("color", "red").text("Server Error: " + error);
	});
}

function getPrivateSendFinalHelp() {
	return "<br /><br/>Obfuscation transactions require mixing. Usually small amounts are available right away and will arrive on the given target address anonymously in a few minutes, but it could also take a few hours. Please be patient, if you still can't see the XIM arriving a day later please <a href='mailto:Support@MyXimBlockWallet.org'>contact support</a> with all data listed here.";
}

function showRawTxPanel(toAddress, txFee, privateSendAddress, redirectedPrivateSendAmount) {
	var rawTxList = $("#rawTransactionData");
	rawTxList.empty();
	var useInstantSend = $("#useInstantSend").is(':checked');
	var usePrivateSend = $("#usePrivateSend").is(':checked');
	if (usePrivateSend && toAddress !== privateSendAddress)
        $("<li>Sending <b>" + showNumber(redirectedPrivateSendAmount, 3) + " XIM</b> (with Obfuscation tx fees) to new autogenerated Obfuscation address <a href='https://chainz.cryptoid.info/xim/address.dws?" + privateSendAddress + "' target='_blank' rel='noopener noreferrer'><b>" + privateSendAddress + "</b></a>. When mixing is done (between right away and a few hours) <b>" + showNumber(amountToSend) + " XIM</b> will anonymously arrive at: <a href='https://chainz.cryptoid.info/xim/address.dws?" + toAddress + "' target='_blank' rel='noopener noreferrer'><b>" + toAddress + "</b></a></li>").appendTo(rawTxList);
	else if (toAddress !== privateSendAddress && privateSendAddress)
        $("<li>Sending <b>" + showNumber(amountToSend, 3) + " XIM</b> to " + getChannel() + ": " + toAddress +" via <a href='https://chainz.cryptoid.info/xim/address.dws?" + privateSendAddress + "' target='_blank' rel='noopener noreferrer'><b>" + privateSendAddress + "</b></a></li>").appendTo(rawTxList);
	else
        $("<li>Sending <b>" + showNumber(amountToSend, 3) + " XIM</b> to <a href='https://chainz.cryptoid.info/xim/address.dws?" + toAddress + "' target='_blank' rel='noopener noreferrer'><b>" + toAddress + "</b></a></li>").appendTo(rawTxList);
	//$("<li>SwiftTX: <b>" + (useInstantSend ? "Yes" : "No") + "</b>, Obfuscation: <b>" + (usePrivateSend ? "Yes" : "No") + "</b>, Tx fee"+(usePrivateSend?" (for initial send to mix)":"")+": <b>" + showNumber(txFee) + " XIM</b> ($" + showNumber(txFee * usdRate, 4) + ")</li>").appendTo(rawTxList);
	return rawTxList;
}

function showTxDetails() {
	$("#txDetailsPanel").prop('onclick',null).off('click');
	$("#txDetailsPanel").html(
		(rawTx !== "" ? "Confirm raw tx with any XIM node in the debug console:<br />decoderawtransaction " + rawTx + "<br />" : "") +
		(signedTx !== "" ? "Signed tx send into the XIM network: " + signedTx : ""));
	return false;
}

function getAddressesWithUnspendFunds() {
	var addresses = [];
	addresses.push({ addressIndex: 0, address: ximblockKeystoreWallet.address });
	return addresses;
}

function importKeystoreWallet() {
	$("#createLocalWalletPanel").hide();
	$("#unlockKeystorePanel").hide();
	$("#importKeystoreButton").hide();
	$("#importKeystorePanel").show();
	$("#hardwareWalletsPanel").hide();
}

function loadKeystoreFile() {
	if (!window.FileReader)
		showFailure("FileReader API is not supported by your browser.");
	else if (!$("#keystoreFile")[0].files || !$("#keystoreFile")[0].files[0])
		showFailure("Please select a keystore file!");
	else {
		var file = $("#keystoreFile")[0].files[0];
		var fr = new FileReader();
		fr.onload = function() {
			localStorage.setItem("keystore", fr.result);
			$("#importKeystorePanel").hide();
			$("#createLocalWalletPanel").hide();
			$("#unlockKeystorePanel").show();
			$("#resultPanel").show().css("color", "yellow").html("Imported your Keystore file into browser.");
		};
		fr.readAsText(file);
	}
}

function importPrivateKey() {
	$("#privateKeyInputPanel").show();
	$("#importPrivateKeyButton").css("background-color", "gray");
}

function importPrivateKeyToKeystore() {
	var key = $("#privateKeyInput").val();
	if (!key || key.length !== 52 && key.length !== 64) {
		$("#createPrivateKeyNotes").text("Invalid private key, it must be exactly 52 or 64 characters long!");
		return;
	}
	$("#privateKeyInputPanel").hide();
	deleteKeystore();
	createKeystoreWallet();
}

function showFailure(errorMessage) {
	$("#response").css("color", "red").html(errorMessage).show();
}

var ximblockKeystoreWallet;
function createKeystoreWallet() {
	$("#createKeystoreButton").attr("disabled", "disabled");
	$("#createKeystoreOutput").html("<b>Successfully generated keystore wallet</b>, please secure it with a password now! Write this down somewhere, if you lose this you CANNOT access your keystore file, nobody can help you if you don't have your password and file.");
	$("#createLocalWalletPanel").hide();
	$("#createKeystoreButton").hide();
	$("#hardwareWalletsPanel").hide();
	$("#importingPanel").hide();
	$("#createKeystorePasswordPanel").show();
}

function passwordChanged() {
	var password = $("#keystorePassword").val();
	var passwordRepeated = $("#keystorePasswordRepeated").val();
	if (password.length < 8)
		$("#passwordResult").text("Password is too short. Please enter at least 8 characters.");
	else if (password.length > 512)
		$("#passwordResult").text("Password is too long, use something more reasonable (max. 512 characters)");
	else if (password.search(/\d/) === -1 && password.search(/[\!\@\#\$\%\^\&\*\(\)\_\+\.\,\;\:]/) === -1)
		$("#passwordResult").text("Password should contain at least one number or symbol!");
	else if (password.search(/[a-zA-Z]/) === -1)
		$("#passwordResult").text("Password should contain at least one letter (a-z)!");
	else if (password !== passwordRepeated)
		$("#passwordResult").text("Repeated password is not the same!");
	else {
		$("#passwordResult").html("<b>Successfully secured keystore wallet</b>, click 'Download Keystore file' and keep it at a secure place!");
		$("#keystorePassword").attr("disabled", "disabled");
		$("#keystorePasswordRepeated").attr("disabled", "disabled");
		$("#generateKeystoreButton").removeAttr("disabled");
	}
}

function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function generateKeystoreFile() {
	// Use given private key or create new one if no private key import was done
	var key = $("#privateKeyInput").val();
	if (!key || key.length !== 52 && key.length !== 64)
		key = window.generatePrivateKey();
	else if (key.length === 52)
		key = window.fromWifKey(key).toString();
	$("#createKeystorePasswordPanel").hide();
	var encryptedData = CryptoJS.AES.encrypt(key, $("#keystorePassword").val());
	localStorage.setItem("keystore", encryptedData);
	var currentDate = new Date();
	download("MyXimBlockWallet"+currentDate.getFullYear()+"-"+(currentDate.getMonth()+1)+"-"+currentDate.getDate()+".KeyStore", encryptedData);
	$("#createLocalWalletPanel").hide();
	$("#importKeystorePanel").hide();
	$("#unlockKeystorePanel").show();
}

function unlockKeystore() {
	try {
		var encryptedData = localStorage.getItem("keystore");
		ximblockKeystoreWallet = { d: encryptedData, s: $("#keystorePasswordUnlock").val() };
		ximblockKeystoreWallet.address =
			window.getDecryptedAddress(CryptoJS.AES.decrypt(ximblockKeystoreWallet.d, ximblockKeystoreWallet.s)
				.toString(CryptoJS.enc.Utf8));
		if (!isValidAddress(ximblockKeystoreWallet.address))
			showFailure("Invalid XIM address from decrypted keystore file, unable to continue: " + ximblockKeystoreWallet.address);
		else {
			goToSendPanel("Successfully unlocked Keystore Wallet!");
			$("#paperWalletPanel").show();
			generateReceivingAddressList();
            crossDomainAjax("https://chainz.cryptoid.info/xim/address.dws?" + ximblockKeystoreWallet.address,
				function (data) {
					if (data !== "ERROR: address invalid") {
						//console.log("Updating balance of " + ximblockKeystoreWallet.address + ": " + data);
						addressBalance = parseFloat(data);
						updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses();
						autoBalanceCheck = window.setInterval(tryBalanceCheck, 1000);
					}
				});
		}
	} catch (e) {
		showFailure("Failed to decrypt keystore file: " + e);
	}
}

function deleteKeystore() {
	ximblockKeystoreWallet = undefined;
	localStorage.removeItem("keystore");
	$("#createLocalWalletPanel").show();
	$("#unlockKeystorePanel").hide();
	$("#importingPanel").show();
	$("#importKeystoreButton").show();
	$("#createKeystoreButton").show();
	$("#importKeystorePanel").show();
	$("#hardwareWalletsPanel").show();
}

function createPaperWallet() {
	if ($("#paperWalletPasswordUnlock").val() !== ximblockKeystoreWallet.s) {
		$("#paperWalletError").text("Invalid password, cannot unlock keystore wallet for PaperWallet!");
		return;
	}
	if ($("#paperWalletDetails").is(":visible")) {
		$("#createPaperWalletButton").text("Create PaperWallet");
		$("#paperWalletDetails").hide();
		return;
	}
	$("#createPaperWalletButton").text("Hide PaperWallet");
	$("#paperWalletError").text("");
	var hexa = CryptoJS.AES.decrypt(ximblockKeystoreWallet.d, ximblockKeystoreWallet.s).toString(CryptoJS.enc.Utf8);
	$("#privateKeyHexa").val(hexa);
	var wif = window.toWifKey(hexa);
	$("#privateKeyWif").val(wif);
	$("#privateKeyQr").attr("src", "//chart.googleapis.com/chart?cht=qr&chl=" + wif + "&choe=UTF-8&chs=160x160&chld=L|0");
	$("#paperWalletDetails").show();
}