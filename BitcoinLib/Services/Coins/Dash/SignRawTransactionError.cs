namespace BitcoinLib.Services.Coins.Dash
{
	public class SignRawTransactionError
	{
		public string Txid { get; set; }
		public int Vout { get; set; }
		public string ScriptSig { get; set; }
		public int Sequence { get; set; }
		public string Error { get; set; }
	}
}