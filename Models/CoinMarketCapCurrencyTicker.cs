namespace myximblockwallet.org.Models
{
	/// <summary>
	/// Based on https://coinmarketcap.com/api/ e.g.: https://api.coinmarketcap.com/v1/ticker/bitcoin
	/// <see cref="CurrencyExtensions.ToDollarString"/>, <see cref="CurrencyExtensions.ToEuroString"/>
	/// </summary>
	public class CoinMarketCapCurrencyTicker
	{
#pragma warning disable 649
		public string id;
		public string name;
		public string symbol;
		public int rank;
		public decimal price_usd;
		public decimal price_btc;
		public decimal price_eur;
		// We don't care about the rest of the fields
	}
}