# MyXimBlockWallet
Web wallet for the ColossusXT cryptocurrency (XIM) 

This project is based on MyEtherWallet and MyDashWallet, it is open-source, free to use and development was funded by XIM team :)

# Runs locally
You can simply download the website https://ximblockwallet.com and run it locally, the whole wallet functionality (including addresses, private keys and generating keystore wallets, unlocking, etc.) all runs offline and in your browser. However when you want to see the current XIM amount or send out XIM you need to be online as the website communicates with https://chainz.cryptoid.info for the XIM amount in your addresses and will communicate with the full XIM node on MyXimBlockWallet when sending out locally signed transactions.

If you have your own full node you can simply replace it by opening up the source code and either change the connection parameters in XimBlockNode.cs or simply derive from that class and enter your own rpc username, password and IP. Please note that all signing happens locally in your browser, this will not increase the security of your transaction in any way, but if it makes you happy not to rely on third parties for sending signed transactions into the XIM network, feel free to run your own. Obviously anyone can simply copy the website and host it on their own server, we cannot guarantee that such sites don't change how the service works, thus you should ONLY trust this url https://ximblockwallet.com.

If you want to host it yourself, setup a XIM node with RPC access and use those parameters in the XimBlockNode.cs (for broadcasting tx out to the XIM network).
The website can be compiled with Visual Studio 2017 and can be hosted on any IIS version compatible with ASP.NET Core 2.0.