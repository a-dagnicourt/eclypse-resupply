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

export function avoidDust(item, decimals){  
    let fucksGiven = "0"
    for (let index = 0; index < decimals; index++) {
        fucksGiven += "0"        
    }
    console.log(fucksGiven)
  return item.tokenAmount.uiAmountString > `0.${fucksGiven}1`
  ? item.tokenAmount.uiAmountString
  : null
}