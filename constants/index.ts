import {BigNumber} from 'ethers';

// ----------------
// UNIT
// ----------------
export const WAD_DECIMALS = 18;
export const RAY_DECIMALS = 27;
export const PERCENTAGE_DECIMALS = 2;
export const WAD = BigNumber.from(10).pow(WAD_DECIMALS);
export const HALF_WAD = BigNumber.from(10).pow(WAD_DECIMALS).div(2);
export const RAY = BigNumber.from(10).pow(RAY_DECIMALS);
export const HALF_RAY = BigNumber.from(10).pow(RAY_DECIMALS).div(2);
export const PERCENTAGE = BigNumber.from(100).pow(PERCENTAGE_DECIMALS); // 100.00 %
export const HALF_PERCENTAGE = BigNumber.from(100).pow(PERCENTAGE_DECIMALS).div(2);
export const WAD_TO_RAY = BigNumber.from(10).pow(RAY_DECIMALS - WAD_DECIMALS);

// ----------------
// TIME
// ----------------
export const MILISECOND = 1000;
export const SECOND = 1;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const YEAR = 365 * DAY;

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const PSM_STAKER_PREMIUM = 2; // 2 percents
