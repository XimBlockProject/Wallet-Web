using System;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace myximblockwallet.org.Models
{
	/// <summary>
	/// Tons of features for the Currency enum, converting from strings, checking for valid addresses,
	/// converting milli values to full values and back, and outputting dollar or euro values.
	/// All operations assume amounts and currencies in milli (mBTC, mDash)
	/// </summary>
	public static class CurrencyExtensions
	{
		public static string ToCurrencyString(this Currency currency, decimal milliCoinAmount,
			string format = "#0.0####")
		{
			switch (currency)
			{
			case Currency.USD:
				return "$" + milliCoinAmount.ToString("#0.00", CultureInfo.InvariantCulture);
			case Currency.EUR:
				return milliCoinAmount.ToString("#0.00", CultureInfo.InvariantCulture) + " €";
			default:
				return milliCoinAmount.ToString(format, CultureInfo.InvariantCulture) + " " + currency;
			}
		}
		
		public static decimal ConvertFromMilliToFullCoinValue(decimal milliCoinAmount)
			=> milliCoinAmount / 1000.0m;

		public static decimal ConvertFromFullCoinToMilliValue(decimal fullCoinAmount)
			=> fullCoinAmount * 1000.0m;

		public static async Task<string> ToCurrencyStringWithDollarAndEuro(this Currency currency,
			decimal milliCoinAmount)
			=> currency.ToCurrencyString(milliCoinAmount) + " (" +
				await currency.ToDollarString(milliCoinAmount) + " = " +
				await currency.ToEuroString(milliCoinAmount) + ")";
		public static async Task<string> ToCurrencyStringWithDollarEuroAndBtc(this Currency currency,
			decimal milliCoinAmount)
			=> currency.ToCurrencyString(milliCoinAmount) + " (" +
				await currency.ToDollarEuroAndBtcString(milliCoinAmount) + ")";

		public static async Task<string>
			ToDollarEuroAndBtcString(this Currency currency, decimal milliCoinAmount)
			=> await currency.ToDollarString(milliCoinAmount) + " = " +
				await currency.ToEuroString(milliCoinAmount) + " = " +
				await currency.ToBitcoinString(milliCoinAmount);

		public static async Task<string> ToDollarString(this Currency currency, decimal milliCoinAmount)
		{
			decimal amount = currency == Currency.XIM ? milliCoinAmount
				: ConvertFromMilliToFullCoinValue(milliCoinAmount);
			var ticker = await GetTicker(currency);
			return "$" + FormattedPrice(ticker.price_usd, amount);
		}

		private static string FormattedPrice(decimal tickerPrice, decimal amount)
		{
			var price = (tickerPrice * amount).ToString("#0.00", CultureInfo.InvariantCulture);
			if (price != "0.00")
				return price;
			price = (tickerPrice * amount).ToString("#0.000", CultureInfo.InvariantCulture);
			if (price == "0.000" || price == "0.001")
				price = (tickerPrice * amount).ToString("#0.0000", CultureInfo.InvariantCulture);
			return price;
		}

		public static async Task<string> ToEuroString(this Currency currency, decimal milliCoinAmount)
		{
			decimal amount = currency == Currency.XIM ? milliCoinAmount
				: ConvertFromMilliToFullCoinValue(milliCoinAmount);
			var ticker = await GetTicker(currency);
			return FormattedPrice(ticker.price_eur, amount) + " €";
		}

		public static async Task<string> ToBitcoinString(this Currency currency, decimal milliCoinAmount)
		{
			decimal amount = currency == Currency.XIM ? milliCoinAmount
				: ConvertFromMilliToFullCoinValue(milliCoinAmount);
			var ticker = await GetTicker(currency);
			var showMBtc = ticker.price_btc * amount < 0.01m;
			if (showMBtc)
				amount = ConvertFromFullCoinToMilliValue(amount);
			var btcPrice = (ticker.price_btc * amount).ToString("#0.0####", CultureInfo.InvariantCulture);
			return btcPrice + (showMBtc ? " mBTC" : " BTC");
		}
		
		public static async Task<decimal> FiatToCoinAmount(this Currency coinCurrency, decimal fiatAmount, Currency fiatCurrency)
		{
			var ticker = await GetTicker(coinCurrency);
			decimal milliCoinAmount;
			if (fiatCurrency == Currency.USD)
				milliCoinAmount = ConvertFromFullCoinToMilliValue(fiatAmount / ticker.price_usd);
			else if (fiatCurrency == Currency.EUR)
				milliCoinAmount = ConvertFromFullCoinToMilliValue(fiatAmount / ticker.price_eur);
			else
				throw new NotSupportedException("Invaild currency = " + fiatCurrency);
			return milliCoinAmount;
		}

		public static async Task<CoinMarketCapCurrencyTicker> GetTicker(Currency currency)
		{
			if ((int)currency < lastTimeUpdatedTicker.Length &&
			    DateTime.UtcNow.AddMinutes(-1) < lastTimeUpdatedTicker[(int)currency])
				return fallbackValues[(int)currency];
			try
			{
				var json = await GetHttpResponse("https://api.coinmarketcap.com/v1/ticker/" +
					GetTickerCurrencyName(currency) + "/?convert=EUR");
				try
				{
					lastTimeUpdatedTicker[(int)currency] = DateTime.UtcNow;
					fallbackValues[(int)currency] =
						JsonConvert.DeserializeObject<CoinMarketCapCurrencyTicker[]>(json)[0];
				}
				catch
				{
					// ignored if fallback storage fails, we can still return the retried value
					return JsonConvert.DeserializeObject<CoinMarketCapCurrencyTicker[]>(json)[0];
				}
			}
			catch
			{
				// ignored
			}
			if ((int)currency < lastTimeUpdatedTicker.Length)
				return fallbackValues[(int)currency];
			return new CoinMarketCapCurrencyTicker();
		}
		
		private static string GetTickerCurrencyName(Currency currency)
		{
			switch (currency)
			{
			case Currency.mBTC:
				return "bitcoin";
			case Currency.mLTC:
				return "litecoin";
			case Currency.mETH:
				return "ethereum";
			case Currency.mBCH:
				return "bitcoin-cash";
			case Currency.mDASH:
				return "dash";
			case Currency.XIM:
				return "colossusxt";
			}
			return currency.ToString();
		}

		public static string GetCurrencyLongName(Currency currency)
		{
			switch (currency)
			{
			case Currency.mBTC:
				return "Bitcoin";
			case Currency.mLTC:
				return "Litecoin";
			case Currency.mETH:
				return "Ethereum";
			case Currency.mBCH:
				return "Bitcoin Cash";
			case Currency.mDASH:
				return "Dash";
			case Currency.XIM:
				return "ColossusCoinXT";
			}
			return currency.ToString();
		}
		
		/// <summary>
		/// <see cref="Currency"/> for ordering.
		/// </summary>
		private static readonly CoinMarketCapCurrencyTicker[] fallbackValues =
		{
			new CoinMarketCapCurrencyTicker { price_usd = 10993.23m },
			new CoinMarketCapCurrencyTicker { price_usd = 333.881m },
			new CoinMarketCapCurrencyTicker { price_usd = 68.3853m },
			new CoinMarketCapCurrencyTicker { price_usd = 990.14m },
			new CoinMarketCapCurrencyTicker { price_usd = 426.83m },
			new CoinMarketCapCurrencyTicker { price_usd = 0.002m }
		};

		private static readonly DateTime[] lastTimeUpdatedTicker = new DateTime[6];

		private static async Task<string> GetHttpResponse(string url)
			=> await (await new HttpClient(AutoDecompression).GetAsync(url)).Content.ReadAsStringAsync();

		private static HttpMessageHandler AutoDecompression
			=> new HttpClientHandler
			{
				AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
			};
	}
}