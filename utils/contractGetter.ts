import {Contract} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ContractId} from '../types';

export const getContractAt = async <T extends Contract>(
  hre: HardhatRuntimeEnvironment,
  contractId: ContractId | string,
  address: string
): Promise<T> => (await hre.ethers.getContractAt(contractId, address)) as T;
