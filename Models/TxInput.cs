namespace myximblockwallet.org.Models
{
	public class TxInput
	{
		public TxInput(string tx, int outputIndex, decimal amount)
		{
			Tx = tx;
			OutputIndex = outputIndex;
			Amount = amount;
		}

		public string Tx { get; }
		public int OutputIndex { get; }
		/// <summary>
		/// The amount is not needed as an input for building the raw tx, but we use it to check if
		/// the total amount matches (all inputs must equal all outputs+tx fee).
		/// </summary>
		public decimal Amount { get; }
	}
}