import Head from 'next/head'
import * as web3 from '@solana/web3.js'
import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import axios from 'axios'
import { getAllFleetsForUserPublicKey } from '@staratlas/factory'

import { avoidDust, getTokenList, returnToken } from '../utils/tokenList'
import Image from 'next/image'
import { Disclosure } from '@headlessui/react'
import { MdExpandMore } from 'react-icons/md'
import { Async, useAsync } from 'react-async'
import { token } from '@project-serum/anchor/dist/cjs/utils'

function useSolanaAccount() {
  const [account, setAccount] = useState(null)
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  const [transactions, setTransactions] = useState(null)
  const [USDPrice, setUSDPrice] = useState(null)
  const [tokens, setTokens] = useState(null)

  const [shipsList, setShipsList] = useState([])
  const [fleet, setFleet] = useState(null)
  const [fleetValue, setFleetValue] = useState(0)
  const SCORE_PROG_ID = 'FLEET1qqzpexyaDpqb2DGsSzE2sDCizewCg9WjrA6DBW'

  const init = useCallback(async () => {
    if (publicKey) {
      await connection.getAccountInfo(publicKey).then((account) => {
        setAccount(account)
      })

      await connection
        .getConfirmedSignaturesForAddress2(publicKey, {
          limit: 5,
        })
        .then((transactions) => {
          setTransactions(transactions)
        })

      await connection
        .getParsedTokenAccountsByOwner(publicKey, {
          programId: new web3.PublicKey(
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          ),
        })
        .then((tokens) => {
          setTokens(tokens.value.map((token) => token.account.data.parsed.info))
        })

      await getAllFleetsForUserPublicKey(
        connection,
        publicKey,
        new web3.PublicKey(SCORE_PROG_ID)
      ).then((fleet) => {
        const fleetData = fleet.map((ship) => {
          return shipsList.filter((e) => e.mint === ship.shipMint.toString())
        })
        setFleet(fleetData)
        setFleetValue(
          fleetData
            .map((ship) => ship[0].tradeSettings.msrp.value)
            .reduce((prev, curr) => prev + curr, 0)
        )
      })
    }
  }, [publicKey, connection])

  const getShipsList = async () => {
    await axios
      .get(`https://galaxy.staratlas.com/nfts/`)
      .then((res) => setShipsList(res.data))
      .catch((err) => {
        console.log(err)
      })
  }

  useEffect(() => {
    getTokenList()
    getShipsList()
    getUSDPrice('solana')
    if (publicKey) {
      init()
    }
  }, [init, publicKey])

  return {
    account,
    transactions,
    tokens,
    USDPrice,
    fleet,
    fleetValue,
    getUSDPrice,
  }
}

// const getUSDPrice = async (token: String) => {
//   await axios
//     .get(
//       `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`
//     )
//     .then((res) => {
//       res.data
//     })
//     .catch((err) => {
//       console.log(err)
//     })
// }

const getUSDPrice = async ({ token }) => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`
  )
  if (!response.ok) throw new Error(response.statusText)
  return response.json()
}

export default function Home() {
  const { publicKey } = useWallet()
  const {
    account,
    transactions,
    tokens,
    USDPrice,
    fleet,
    fleetValue,
    getUSDPrice,
  } = useSolanaAccount()

  const solBalance =
    account && parseFloat(account.lamports / web3.LAMPORTS_PER_SOL).toFixed(2)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black/90 py-2 text-gray-200">
      <Head>
        <title>Eclypse | Solana Wallet test page</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex max-w-6xl flex-1 flex-col items-center justify-center space-y-5 px-10 text-center">
        <div className="absolute top-0 right-0 m-5">
          <WalletMultiButton />
        </div>
        <div className="m-12 flex place-items-center space-x-5">
          <Image src="/images/logo_mobile.webp" width="137" height="97" />
          <h1 className="border-l-8 border-l-orange-600 pl-5 text-5xl font-bold">
            Solana Wallet test page
          </h1>
        </div>
        {publicKey && (
          <section className="flex w-full flex-1 flex-col space-y-5 text-center">
            <div className="my-12 border-l-8 border-l-orange-600 pl-5 text-left">
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
                {account ? (
                  <span>
                    {solBalance} SOL{' '}
                    <Async promiseFn={getUSDPrice} token={'solana'}>
                      <Async.Pending>??</Async.Pending>
                      <Async.Rejected>--</Async.Rejected>
                      <Async.Fulfilled>
                        {(data) =>
                          `(${(data['solana'].usd * solBalance).toFixed(
                            2
                          )} USD)`
                        }
                      </Async.Fulfilled>
                    </Async>
                  </span>
                ) : (
                  'Loading..'
                )}
              </p>
            </div>
            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Tokens <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              <Disclosure.Panel
                as={'ul'}
                className="space-y-2 border-l-8 border-l-orange-600 pl-5 text-left"
              >
                {tokens
                  ? tokens.map((item, i) => {
                      const token = returnToken(item.mint)
                      const tokenAmount = avoidDust(item, '4')
                      return (
                        token &&
                        tokenAmount > 0 && (
                          <li key={'transaction-' + i}>
                            <div className="flex">
                              <div className="flex-1 truncate">
                                <a
                                  href={`https://solscan.io/token/${token.address}`}
                                  target="_blank"
                                  className="flex space-x-3"
                                >
                                  {token && (
                                    <img
                                      src={token.logoURI}
                                      className="ml-1 h-6 w-6 rounded-full"
                                      alt={token.symbol}
                                      title={token.symbol}
                                    />
                                  )}
                                  <strong>{token && token.name}</strong>
                                </a>
                              </div>
                              <span className="mx-3">:</span>
                              <div className="flex w-1/4 justify-between">
                                {parseFloat(tokenAmount).toFixed(2)}{' '}
                                {token && token.symbol}
                                {token.extensions && (
                                  <Async
                                    promiseFn={getUSDPrice}
                                    token={token.extensions.coingeckoId}
                                  >
                                    <Async.Pending>??</Async.Pending>
                                    <Async.Rejected>--</Async.Rejected>
                                    <Async.Fulfilled>
                                      {(data) =>
                                        data[token.extensions.coingeckoId] &&
                                        ` (${(
                                          data[token.extensions.coingeckoId]
                                            .usd * tokenAmount
                                        ).toFixed(2)} USD)`
                                      }
                                    </Async.Fulfilled>
                                  </Async>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      )
                    })
                  : 'Loading...'}
              </Disclosure.Panel>
            </Disclosure>

            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Dernières transactions <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              <Disclosure.Panel
                as={'ul'}
                className="space-y-2 border-l-8 border-l-orange-600 pl-5 text-left"
              >
                {transactions
                  ? transactions.map((transaction, i) => (
                      <li key={'transaction-' + i}>
                        <p>
                          <strong>{i + 1} : </strong>
                          <a
                            href={`https://solscan.io/tx/${transaction.signature}`}
                            target="_blank"
                          >
                            {transaction.signature}
                          </a>
                        </p>
                      </li>
                    ))
                  : 'Loading...'}
              </Disclosure.Panel>
            </Disclosure>

            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Flotte Star Atlas <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              <Disclosure.Panel className="my-8 flex flex-col space-y-5 border-l-8 border-l-orange-600 pl-5 text-left">
                {fleet && fleet.length > 0 ? (
                  <>
                    <h4 className="text-xl">
                      <strong>Valeur totale VWAP</strong> : {fleetValue} USD
                    </h4>
                    <div className="flex space-x-8">
                      {fleet.map((ship) => {
                        ship = ship[0]
                        return (
                          <div className="rounded bg-gray-700 p-3">
                            <h3 className="mb-2 text-xl font-bold">
                              {ship.name}
                            </h3>
                            <Image src={ship.image} width={250} height={140} />
                            <p className="text-left text-gray-400">
                              VWAP : {ship.tradeSettings.msrp.value}{' '}
                              {ship.tradeSettings.msrp.currencySymbol}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  'Loading...'
                )}
              </Disclosure.Panel>
            </Disclosure>
          </section>
        )}
      </main>
    </div>
  )
}
