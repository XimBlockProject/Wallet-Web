using System;
using System.Collections.Generic;
using BitcoinLib.Requests.CreateRawTransaction;
using BitcoinLib.Requests.SignRawTransaction;
using BitcoinLib.Responses;
using BitcoinLib.Services.Coins.XimBlock;

namespace myximblockwallet.org.Models
{
	public class XimBlockNode
	{
		public XimBlockNode(string server = "http://localhost:42993", string user = "ytblbyousmjmidz",
			string password = "nbedhykaytaurclpuzgxtjhpbgbbeiv", short requestTimeoutInSeconds = 60)
			=> service = new XimBlockService(server, user, password, password, requestTimeoutInSeconds);

		protected readonly XimBlockService service;
		public decimal GetTotalBalance() => service.GetBalance("", -1, null);
		
		public virtual RawTxHashesAndRawTx TryGenerateRawTx(string utxos, decimal amount, string sendTo,
			decimal remainingAmount, string remainingAddress)
		{
			AdditionalErrorInformation = null;
			string[] utxoParts = utxos.Split('|', StringSplitOptions.RemoveEmptyEntries);
			var result = new RawTxHashesAndRawTx { TxHashes = new string[utxoParts.Length / 2] };
			List<TxInput> inputs = new List<TxInput>();
			for (int i = 0; i < utxoParts.Length / 2; i++)
			{
				var tx = utxoParts[i * 2];
				var outputIndex = int.Parse(utxoParts[i * 2 + 1]);
				result.TxHashes[i] = GetRawUtxo(tx);
				inputs.Add(new TxInput(tx, outputIndex, GetTxOutputAmount(tx, outputIndex)));
			}
			var totalInputAmount = 0m;
			foreach (var input in inputs)
				totalInputAmount += input.Amount;
			List<TxOutput> outputs = new List<TxOutput>();
			// The actual used tx fee is always based on the inputs, privatesend needs to modify amounts!
			bool hasRemainingOutput = remainingAmount > 0;
			// If amount+remainingAmount is inputAmount we have no fees (zero fee is enabled)
			result.UsedSendTxFee = amount + remainingAmount == totalInputAmount ? 0
				: CalculateTxFee(inputs.Count, hasRemainingOutput ? 2 : 1);
			outputs.Add(new TxOutput(sendTo, amount));
			if (hasRemainingOutput)
				outputs.Add(new TxOutput(remainingAddress, remainingAmount));
			// We can only generate the raw tx if we have valid inputs (not for Trezor)
			if (totalInputAmount == 0m)
				return result;
			ConfirmTxInputsAndTxOutputValuesWithTxFeeMatch(inputs, outputs, result.UsedSendTxFee);
			result.RawTx = GenerateRawTx(inputs, outputs);
			return result;
		}
		
		public string GetRawUtxo(string tx) => service.GetRawTransaction(tx, 0).Hex;

		public decimal GetTxOutputAmount(string tx, int outputIndex)
			=> service.GetRawTransaction(tx, 1).Vout[outputIndex].Value;

		private static void ConfirmTxInputsAndTxOutputValuesWithTxFeeMatch(List<TxInput> inputs,
			List<TxOutput> outputs, decimal txFee)
		{
			var totalInputAmount = 0.0m;
			foreach (var input in inputs)
				totalInputAmount += input.Amount;
			var totalOutputAmount = 0.0m;
			foreach (var output in outputs)
				totalOutputAmount += output.Amount;
			if (totalInputAmount != totalOutputAmount + txFee)
			{
				// If the amount is just slightly off, fix it here by adjusting the last output (change)
				// This can happen because javascript is not using decimals and we might have some tiny
				// error beyond the 8 decimals used. Also if anything is wrong with the fee, fix it here.
				if (Math.Abs(totalInputAmount - (totalOutputAmount + txFee)) < 0.00024m)
				{
					if (outputs.Count == 2)
						outputs[1].Amount =
							GetCorrectDashNumberInDuffs(totalInputAmount - (txFee + outputs[0].Amount));
					else
						// If we just have one output, spend it all
						outputs[0].Amount = GetCorrectDashNumberInDuffs(totalInputAmount - txFee);
				}
				else
					// Otherwise the problem is big, abort and report error to user
					throw new InputAmountsDoNotMatchOutputAmountsWithTxFee(totalInputAmount,
						totalOutputAmount, txFee);
			}
		}
		
		public static decimal GetCorrectDashNumberInDuffs(decimal amount)
			=> decimal.Round(amount, 8, MidpointRounding.AwayFromZero) /
				1.000000000000000000000000000000000m;

		private class InputAmountsDoNotMatchOutputAmountsWithTxFee : Exception
		{
			public InputAmountsDoNotMatchOutputAmountsWithTxFee(decimal totalInputAmount,
				decimal totalOutputAmount, decimal txFee) : base("Input amounts: " + totalInputAmount +
				" != Output amounts: " + GetCorrectDashNumberInDuffs(totalOutputAmount) + " + Tx fee: " +
				GetCorrectDashNumberInDuffs(txFee) + " (input amounts should be " +
				GetCorrectDashNumberInDuffs(totalOutputAmount + txFee) + ")") {}
		}

		public string GenerateRawTx(List<TxInput> inputs, List<TxOutput> outputs)
		{
			var request = new CreateRawTransactionRequest();
			foreach (var input in inputs)
				request.AddInput(input.Tx, input.OutputIndex);
			foreach (var output in outputs)
				request.AddOutput(output.Address, output.Amount);
			AdditionalErrorInformation = request;
			return service.CreateRawTransaction(request);
		}
		
		public object AdditionalErrorInformation { get; protected set; }

		public string SignRawTx(string rawTx)
		{
			var request = new SignRawTransactionRequest(rawTx);
			AdditionalErrorInformation = request;
			var result = service.SignRawTransactionWithErrorSupport(request);
			if (result.Complete)
				return result.Hex;
			throw new SigningRawTxFailed(result.Errors.Count > 0 ? result.Errors[0].Error : "");
		}

		public string SendRawTransaction(string signedTx)
			=> service.SendRawTransaction(signedTx, false);

		public DecodeRawTransactionResponse DecodeRawTransaction(string txHash)
			=> service.DecodeRawTransaction(txHash);

		public decimal CalculateTxFee(int numberOfInputs, int numberOfOutputs)
		{
			if (numberOfInputs < 0)
				numberOfInputs = 1;
			if (numberOfOutputs < 0)
				numberOfOutputs = 1;
			return (BaseMilliFee + MilliFeePerInput * numberOfInputs +
				MilliFeePerOutput * numberOfOutputs) / 1000m;
		}

		protected const decimal BaseMilliFee = 0.10m;
		protected const decimal MilliFeePerInput = 1.48m;
		protected const decimal MilliFeePerOutput = 0.34m;
	}
}