import Head from 'next/head'
import * as web3 from '@solana/web3.js'
import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import axios from 'axios'
import { getAllFleetsForUserPublicKey } from '@staratlas/factory'

import { getTokenList, returnToken } from '../utils/tokenList'
import Image from 'next/image'
import { Disclosure, Transition } from '@headlessui/react'
import { MdExpandMore } from 'react-icons/md'

function useSolanaAccount() {
  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [solUSDPrice, setSolUSDPrice] = useState(null)
  const [walletTokenList, setWalletTokenList] = useState(null)
  const [shipsList, setShipsList] = useState([])
  const [ships, setShips] = useState(null)
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const SCORE_PROG_ID = 'FLEET1qqzpexyaDpqb2DGsSzE2sDCizewCg9WjrA6DBW'

  const init = useCallback(async () => {
    if (publicKey) {
      let acc = await connection.getAccountInfo(publicKey)
      setAccount(acc)

      let transactions = await connection.getConfirmedSignaturesForAddress2(
        publicKey,
        {
          limit: 5,
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

      let fleets = await getAllFleetsForUserPublicKey(
        connection,
        publicKey,
        new web3.PublicKey(SCORE_PROG_ID)
      )
      setShips(fleets)
    }

    let solUSD = await getUSDPrice('solana')
    setSolUSDPrice(solUSD)
  }, [publicKey, connection])

  const getShipsList = async () => {
    await axios
      .get(`https://galaxy.staratlas.com/nfts/`)
      .then((res) => setShipsList(res.data))
      .catch((err) => {
        console.log(err)
      })
  }

  const getUSDPrice = async (token: String) => {
    await axios
      .get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`
      )
      .then((res) => res.data)
      .catch((err) => {
        console.log(err)
      })
  }

  useEffect(() => {
    if (publicKey) {
      getTokenList()
      init()
      getShipsList()
      getUSDPrice('solana')
    }
  }, [init, publicKey])

  return {
    account,
    transactions,
    walletTokenList,
    ships,
    solUSDPrice,
    shipsList,
  }
}

export default function Home() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const {
    account,
    transactions,
    walletTokenList,
    ships,
    solUSDPrice,
    shipsList,
  } = useSolanaAccount()

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
                {account
                  ? `${parseFloat(
                      account.lamports / web3.LAMPORTS_PER_SOL
                    ).toFixed(2)} SOL / ${solUSDPrice} USD`
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
            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Tokens <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              {walletTokenList && (
                <Disclosure.Panel
                  as={'ul'}
                  className="space-y-2 border-l-8 border-l-orange-600 pl-5 text-left"
                >
                  {walletTokenList.map((v, i) => {
                    const token = returnToken(v.account.data.parsed.info.mint)
                    return (
                      token &&
                      v.account.data.parsed.info.tokenAmount.uiAmountString >
                        0 && (
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
                              {parseFloat(
                                v.account.data.parsed.info.tokenAmount
                                  .uiAmountString
                              ).toFixed(2)}{' '}
                              {token && token.symbol}
                            </div>
                          </div>
                        </li>
                      )
                    )
                  })}
                </Disclosure.Panel>
              )}
            </Disclosure>

            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Dernières transactions <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              {transactions && (
                <Disclosure.Panel
                  as={'ul'}
                  className="space-y-2 border-l-8 border-l-orange-600 pl-5 text-left"
                >
                  {transactions.map((transaction, i) => (
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
                  ))}
                </Disclosure.Panel>
              )}
            </Disclosure>

            <Disclosure>
              <Disclosure.Button className="mb-5 w-full rounded bg-gray-800 p-2 text-left text-2xl font-bold hover:bg-gray-700">
                <span className="flex place-items-center  justify-between">
                  Flotte Star Atlas <MdExpandMore className="mx-3" />
                </span>
              </Disclosure.Button>
              {ships && (
                <Disclosure.Panel className="my-8 flex space-x-8 border-l-8 border-l-orange-600 pl-5">
                  {ships.map((ship) => {
                    const shipData = shipsList.filter(
                      (e) => e.mint === ship.shipMint.toString()
                    )
                    return (
                      <div className="rounded bg-gray-700 p-3">
                        <h3 className="font-bol2 mb-2 text-xl">
                          {shipData[0].name}
                        </h3>
                        <Image
                          src={shipData[0].image}
                          width={250}
                          height={140}
                        />
                      </div>
                    )
                  })}
                </Disclosure.Panel>
              )}
            </Disclosure>
          </section>
        )}
      </main>
    </div>
  )
}
