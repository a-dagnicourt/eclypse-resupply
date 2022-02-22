import { TokenListProvider } from '@solana/spl-token-registry';

export let tokenList = []

export async function getTokenList(){
  const _tokens = await new TokenListProvider().resolve()
  tokenList = _tokens.filterByClusterSlug('mainnet-beta').getList()
//   console.log(tokenList)
}

export function returnToken(mintKey){
  let foundToken = tokenList.find(token => {
    return token.address === mintKey
  })
  if (foundToken){
    return foundToken
  }
  else {
    foundToken = tokenList.find(token => {
      return token.symbol === mintKey
    })
  }
  return foundToken
}