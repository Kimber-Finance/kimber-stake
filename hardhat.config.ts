import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-solhint';
import 'dotenv/config';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'hardhat-typechain';
import {HardhatUserConfig} from 'hardhat/config';
import 'solidity-coverage';
import getAccount from './utils/getAccounts';
import getNodeUrl from './utils/getNodeUrl';

const SKIP_LOAD = process.env.SKIP_LOAD === 'true';

// Prevent to load scripts before compilation and typechain
if (!SKIP_LOAD) {
  require('./tasks/index.ts');
}

// Turn off auto mining mode to add some delay to transactions
const AUTO_MINE_OFF = process.env.AUTO_MINE_OFF === 'true';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      accounts: getAccount(),
      mining: AUTO_MINE_OFF
        ? {
            auto: false,
            interval: [3000, 6000],
          }
        : undefined,
    },
    localhost: {
      url: getNodeUrl('localhost'),
      accounts: getAccount(),
    },
    mainnet: {
      url: getNodeUrl('mainnet'),
      accounts: getAccount('mainnet'),
    },
    rinkeby: {
      url: getNodeUrl('rinkeby'),
      accounts: getAccount('rinkeby'),
    },
    kovan: {
      url: getNodeUrl('kovan'),
      accounts: getAccount('kovan'),
    },
    bsctestnet: {
      url: getNodeUrl('bsctestnet'),
      accounts: getAccount('bsctestnet'),
    },
    bscmainnet: {
      url: getNodeUrl('bscmainnet'),
      accounts: getAccount('bscmainnet'),
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    admin: {
      default: 1,
    },
    distributer: {
      default: 3,
    },
    user1: {
      default: 4,
    },
    user2: {
      default: 5,
    },
    user3: {
      default: 6,
    },
    user4: {
      default: 7,
    },
    user5: {
      default: 8,
    },
    emissionManager: {
      default: 9,
    },
    rewardsVault: {
      default: 10,
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 600000,
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
  },
};

export default config;
