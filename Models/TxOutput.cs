namespace myximblockwallet.org.Models
{
	public class TxOutput
	{
		public TxOutput(string address, decimal amount)
		{
			Address = address;
			Amount = amount;
		}

		public string Address;
		public decimal Amount;
	}
}