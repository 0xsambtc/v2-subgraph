/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts'
import { ZERO_BD, factoryContract, ONE_BD, UNTRACKED_PAIRS } from './helpers'
import { log } from '@graphprotocol/graph-ts';
import {
  ADDRESS_ZERO,
  DAI_ADDRESS,
  DAI_WETH_PAIR,
  DAI_WETH_PAIR_WETH_POS_IS_0,
  USDC_ADDRESS,
  USDC_WETH_PAIR,
  USDC_WETH_PAIR_WETH_POS_IS_0,
  USDT_ADDRESS,
  USDT_WETH_PAIR,
  USDT_WETH_PAIR_WETH_POS_IS_0,
  WETH_ADDRESS
} from './constants';

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let daiPair = Pair.load(DAI_WETH_PAIR) // dai is token0
  let usdcPair = Pair.load(USDC_WETH_PAIR) // usdc is token0
  let usdtPair = Pair.load(USDT_WETH_PAIR) // usdt is token1
  //
  let usdtPairEthPrice = BigDecimal.fromString('0');
  let daiPairEthPrice = BigDecimal.fromString('0');
  let usdcPairEthPrice = BigDecimal.fromString('0');
  let usdtPairEthReserve = BigDecimal.fromString('0');
  let usdcPairEthReserve = BigDecimal.fromString('0');
  let daiPairEthReserve = BigDecimal.fromString('0');

  if (daiPair !== null) {
    daiPairEthPrice = DAI_WETH_PAIR_WETH_POS_IS_0 ? daiPair.token1Price : daiPair.token0Price;
    daiPairEthReserve = DAI_WETH_PAIR_WETH_POS_IS_0 ? daiPair.reserve0 : daiPair.reserve1;
  }
  if (usdtPair !== null) {
    usdtPairEthPrice = USDT_WETH_PAIR_WETH_POS_IS_0 ? usdtPair.token1Price : usdtPair.token0Price;
    usdtPairEthReserve = USDT_WETH_PAIR_WETH_POS_IS_0 ? usdtPair.reserve0 : usdtPair.reserve1;
  }
  if (usdcPair !== null) {
    usdcPairEthPrice = USDC_WETH_PAIR_WETH_POS_IS_0 ? usdcPair.token1Price : usdcPair.token0Price;
    usdcPairEthReserve = USDC_WETH_PAIR_WETH_POS_IS_0 ? usdcPair.reserve0 : usdcPair.reserve1;
  }

  // all 3 have been created
  if (daiPair !== null && usdcPair !== null && usdtPair !== null) {
    let totalLiquidityETH = daiPairEthReserve.plus(usdcPairEthReserve).plus(usdtPairEthReserve)
    let daiWeight = daiPairEthReserve.div(totalLiquidityETH)
    let usdcWeight = usdcPairEthReserve.div(totalLiquidityETH)
    let usdtWeight = usdtPairEthReserve.div(totalLiquidityETH)
    return daiPairEthPrice
      .times(daiWeight)
      .plus(usdcPairEthPrice.times(usdcWeight))
      .plus(usdtPairEthPrice.times(usdtWeight))
    // dai and USDC have been created
  } else if (daiPair !== null && usdcPair !== null) {
    let totalLiquidityETH = daiPairEthReserve.plus(usdcPairEthReserve)
    let daiWeight = daiPairEthReserve.div(totalLiquidityETH)
    let usdcWeight = usdcPairEthReserve.div(totalLiquidityETH)
    return daiPairEthPrice.times(daiWeight).plus(usdcPairEthPrice.times(usdcWeight))
    // USDC is the only pair so far
  } else if (usdcPair !== null) {
    return usdcPairEthPrice
  } else {
    return ZERO_BD
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DAI_ADDRESS,
  // '0x5c46bff4b38dc1eae09c5bac65872a1d8bc87378', // merl
  // '0xad6ca80fe4d3c54f6433ff725d744772aae87711', // woo
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('4')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('0.00000000000000001')

/**
 * Search through graph to find derived Eth per token.
 * todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair === null) {
        log.error('Pair is null', [pairAddress.toHexString()])
        return ZERO_BD;
      }
      if (pair.token0 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1!.derivedETH as BigDecimal) // return token1 per our token * Eth per token 1
      }
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0!.derivedETH as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  if (bundle === null) {
    throw new Error("Bundle 1 is null");
  }
  let price0 = token0.derivedETH!.times(bundle.ethPrice)
  let price1 = token1.derivedETH!.times(bundle.ethPrice)

  // dont count tracked volume on these pairs - usually rebass tokens
  if (UNTRACKED_PAIRS.includes(pair.id)) {
    return ZERO_BD
  }

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  if (bundle === null) {
    throw new Error("Bundle 1 is null");
  }
  let price0 = token0.derivedETH!.times(bundle.ethPrice)
  let price1 = token1.derivedETH!.times(bundle.ethPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
