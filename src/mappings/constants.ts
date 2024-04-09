import {
  WETH_ADDRESS as _WETH_ADDRESS,
  FACTORY_ADDRESS as _FACTORY_ADDRESS,
  USDT_ADDRESS as _USDT_ADDRESS,
  USDT_WETH_PAIR as _USDT_WETH_PAIR,
  USDT_WETH_PAIR_WETH_POS_IS_0 as _USDT_WETH_PAIR_WETH_POS_IS_0,
  USDC_ADDRESS as _USDC_ADDRESS,
  USDC_WETH_PAIR as _USDC_WETH_PAIR,
  USDC_WETH_PAIR_WETH_POS_IS_0 as _USDC_WETH_PAIR_WETH_POS_IS_0,
  DAI_ADDRESS as _DAI_ADDRESS,
  DAI_WETH_PAIR as _DAI_WETH_PAIR,
  DAI_WETH_PAIR_WETH_POS_IS_0 as _DAI_WETH_PAIR_WETH_POS_IS_0,
} from '../config';
/**
 * Constants file.
 * For zksync goerli testnet
 * Token address;
 * Pair address;
 *
 * Change this file if deploy to other chain
 * change package.json and subgraph.yaml in the meanwhile
*/

const lower = (value: string): string => {
  if (!value) return '0x0000000000000000000000000000000000000000';
  return value.toLowerCase();
}

// common
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

// tokens
export const USDC_ADDRESS = lower(_USDC_ADDRESS)

export const USDT_ADDRESS = lower(_USDT_ADDRESS);

export const DAI_ADDRESS = lower(_DAI_ADDRESS);

// pairs
export const USDC_WETH_PAIR = lower(_USDC_WETH_PAIR) // created 5145717
export const DAI_WETH_PAIR = lower(_DAI_WETH_PAIR) // created block 10042267
export const USDT_WETH_PAIR = lower(_USDT_WETH_PAIR) // created block 10093341

export const WETH_ADDRESS = lower(_WETH_ADDRESS);

export const FACTORY_ADDRESS = lower(_FACTORY_ADDRESS);

export const USDT_WETH_PAIR_WETH_POS_IS_0 = _USDT_WETH_PAIR_WETH_POS_IS_0;

export const USDC_WETH_PAIR_WETH_POS_IS_0 = _USDC_WETH_PAIR_WETH_POS_IS_0;

export const DAI_WETH_PAIR_WETH_POS_IS_0 = _DAI_WETH_PAIR_WETH_POS_IS_0;