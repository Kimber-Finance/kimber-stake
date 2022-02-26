import {BigNumber} from 'ethers';
import {formatUnits} from 'ethers/lib/utils';
import {
  HALF_PERCENTAGE,
  HALF_RAY,
  HALF_WAD,
  PERCENTAGE,
  PERCENTAGE_DECIMALS,
  RAY,
  RAY_DECIMALS,
  WAD,
  WAD_DECIMALS,
  WAD_TO_RAY
} from '../constants';
import {Network} from '../types';

export const enumKeys = <O extends Record<string, unknown>, K extends keyof O = keyof O>(obj: O): K[] => {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
};

export const parseNetwork = (networkName: string): {network: Network} => {
  const network: Network | undefined = Network[networkName as keyof typeof Network];
  if (!network) {
    throw new Error(`unsupported network ${networkName}`);
  }

  return {
    network,
  };
};

declare module 'ethers' {
  interface BigNumber {
    wadMul: (y: BigNumber) => BigNumber;
    rayMul: (y: BigNumber) => BigNumber;
    wadDiv: (y: BigNumber) => BigNumber;
    rayDiv: (y: BigNumber) => BigNumber;
    percentMul: (y: BigNumber) => BigNumber;
    percentDiv: (y: BigNumber) => BigNumber;
    wadToRay: () => BigNumber;
    rayToWad: () => BigNumber;
    toRayUnit: () => string;
    toWadUnit: () => string;
    toPercentUnit: () => string;
    toUnit: (x: number) => string;
    convertUnits: (from: number, to: number) => BigNumber;
  }
}

BigNumber.prototype.wadMul = function (y: BigNumber): BigNumber {
  return wmul(this, y);
};

BigNumber.prototype.rayMul = function (y: BigNumber): BigNumber {
  return rmul(this, y);
};

BigNumber.prototype.percentMul = function (y: BigNumber): BigNumber {
  return pmul(this, y);
};

BigNumber.prototype.wadDiv = function (y: BigNumber): BigNumber {
  return wdiv(this, y);
};

BigNumber.prototype.rayDiv = function (y: BigNumber): BigNumber {
  return rdiv(this, y);
};

BigNumber.prototype.wadToRay = function (): BigNumber {
  return this.mul(WAD_TO_RAY);
};

BigNumber.prototype.rayToWad = function (): BigNumber {
  return this.add(WAD_TO_RAY.div(2)).div(WAD_TO_RAY);
};

BigNumber.prototype.toWadUnit = function (): string {
  return formatUnits(this, WAD_DECIMALS);
};

BigNumber.prototype.toRayUnit = function (): string {
  return formatUnits(this, RAY_DECIMALS);
};

BigNumber.prototype.toPercentUnit = function (): string {
  return formatUnits(this, PERCENTAGE_DECIMALS);
};

BigNumber.prototype.toUnit = function (x: number): string {
  return formatUnits(this, x);
};

BigNumber.prototype.convertUnits = function (from: number, to: number): BigNumber {
  if (from === to) {
    return this;
  } else if (from > to) {
    const ratio = BigNumber.from(10).pow(from - to);
    return this.add(ratio.div(2)).div(ratio);
  } else {
    const ratio = BigNumber.from(10).pow(to - from);
    return this.mul(ratio);
  }
};

const wmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_WAD).div(WAD);
};

const rmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_RAY).div(RAY);
};

const pmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_PERCENTAGE).div(PERCENTAGE);
};

const wdiv = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(WAD).add(y.div(2)).div(y);
};

const rdiv = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(RAY).add(y.div(2)).div(y);
};
