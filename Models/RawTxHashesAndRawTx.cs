namespace myximblockwallet.org.Models
{
	public class RawTxHashesAndRawTx
	{
		public string[] TxHashes { get; set; }
		public string RawTx { get; set; }
		public decimal UsedSendTxFee { get; set; }
	}
}