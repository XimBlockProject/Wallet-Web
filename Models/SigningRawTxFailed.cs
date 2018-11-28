using System;

namespace myximblockwallet.org.Models
{
	public class SigningRawTxFailed : Exception
	{
		public SigningRawTxFailed(string message) : base(message) {}
	}
}