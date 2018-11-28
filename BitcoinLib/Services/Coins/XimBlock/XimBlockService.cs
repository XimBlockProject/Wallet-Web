using BitcoinLib.CoinParameters.XimBlock;
using BitcoinLib.Services.Coins.Bitcoin;
using BitcoinLib.Services.Coins.Dash;

namespace BitcoinLib.Services.Coins.XimBlock
{
	/// <summary>
	/// Mostly the same functionality as <see cref="BitcoinService"/>.
	/// </summary>
	public class XimBlockService : DashService, IXimBlockService
	{
		public XimBlockService(bool useTestnet = false) : base(useTestnet) { }

		public XimBlockService(string daemonUrl, string rpcUsername, string rpcPassword,
			string walletPassword) : base(daemonUrl, rpcUsername, rpcPassword, walletPassword) { }

		public XimBlockService(string daemonUrl, string rpcUsername, string rpcPassword,
			string walletPassword, short rpcRequestTimeoutInSeconds) : base(daemonUrl, rpcUsername,
			rpcPassword, walletPassword, rpcRequestTimeoutInSeconds) { }
		
		public new XimBlockConstants.Constants Constants => XimBlockConstants.Constants.Instance;
	}
}