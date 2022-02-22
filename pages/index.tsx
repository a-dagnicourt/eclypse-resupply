import Head from 'next/head'
import * as web3 from '@solana/web3.js'
import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { getTokenList, returnToken } from '../utils/tokenList'

function useSolanaAccount() {
  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [walletTokenList, setWalletTokenList] = useState(null)
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  const init = useCallback(async () => {
    if (publicKey) {
      let acc = await connection.getAccountInfo(publicKey)
      setAccount(acc)

      let transactions = await connection.getConfirmedSignaturesForAddress2(
        publicKey,
        {
          limit: 10,
        }
      )
      setTransactions(transactions)

      let walletTokenList = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: new web3.PublicKey(
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          ),
        }
      )
      setWalletTokenList(walletTokenList.value)
    }
  }, [publicKey, connection])

  useEffect(() => {
    if (publicKey) {
      getTokenList()
      init()
      //   setInterval(init, 15000)
    }
  }, [init, publicKey])

  return { account, transactions, walletTokenList }
}

export default function Home() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { account, transactions, walletTokenList } = useSolanaAccount()

  const [airdropProcessing, setAirdropProcessing] = useState(false)
  const [error, setError] = useState(false)

  const getAirdrop = useCallback(async () => {
    setError(false)
    setAirdropProcessing(true)
    try {
      var airdropSignature = await connection.requestAirdrop(
        publicKey,
        web3.LAMPORTS_PER_SOL
      )
      await connection.confirmTransaction(airdropSignature)
    } catch (error) {
      console.log(error)
      setError(true)
    }
    setAirdropProcessing(false)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black/90 py-2 text-gray-200">
      <Head>
        <title>Eclypse | Solana Wallet test page</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex w-full flex-1 flex-col items-center justify-center space-y-5 px-20 text-center">
        <h1 className="mb-16 text-6xl font-bold">
          Eclypse | Solana Wallet test page
        </h1>
        <div>
          <WalletMultiButton />
        </div>
        {publicKey && (
          <div className="max-w-4xl space-y-5 text-center">
            <div>
              <p>
                <strong>Wallet Public Key</strong> :{' '}
                <a
                  href={`https://solscan.io/account/${publicKey.toBase58()}`}
                  target="_blank"
                >
                  {publicKey.toBase58()}
                </a>
              </p>
              <p>
                <strong>Balance</strong> :{' '}
                {account
                  ? account.lamports / web3.LAMPORTS_PER_SOL + ' SOL'
                  : 'Loading..'}
              </p>
              {connection._rpcEndpoint !==
                'https://api.mainnet-beta.solana.com/' && (
                <>
                  <button
                    onClick={getAirdrop}
                    isLoading={airdropProcessing}
                    className="mt-24 rounded bg-blue-500 p-3 hover:bg-blue-600"
                  >
                    Get Airdrop of 1 SOL
                  </button>
                  <p className="font-bold text-red-500">
                    {error && 'Airdrop failed'}
                  </p>
                </>
              )}
            </div>
            <div className="text-left">
              <h2 className="mb-5 text-2xl font-bold">Tokens</h2>
              {walletTokenList && (
                <ul className="space-y-2">
                  {walletTokenList.map((v, i) => {
                    const token = returnToken(v.account.data.parsed.info.mint)
                    return (
                      token && (
                        <li key={'transaction-' + i}>
                          <div className="flex">
                            <div className="flex-1 truncate">
                              <a
                                href={`https://solscan.io/token/${token.address}`}
                                target="_blank"
                              >
                                <strong>{token && token.name}</strong>
                              </a>
                            </div>
                            <span className="mx-3">:</span>
                            <div className="flex w-1/6 justify-between">
                              {
                                v.account.data.parsed.info.tokenAmount
                                  .uiAmountString
                              }
                              {token && (
                                <img
                                  src={token.logoURI}
                                  className="ml-1 h-6 rounded-full"
                                  alt={token.symbol}
                                  title={token.symbol}
                                />
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="text-left">
              <h2 className="mb-5 text-2xl font-bold">Transactions</h2>
              {transactions && (
                <ul className="space-y-2">
                  {transactions.map((v, i) => (
                    <li key={'transaction-' + i}>
                      <p>
                        <strong>Signature : </strong>
                        <a
                          href={`https://solscan.io/tx/${v.signature}`}
                          target="_blank"
                        >
                          {v.signature}
                        </a>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
