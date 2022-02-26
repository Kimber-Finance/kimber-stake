import 'dotenv/config';

const getMnemonic = (networkName?: string): string => {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== '') {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === '') {
    return 'test test test test test test test test test test test junk';
  }
  return mnemonic;
};

const getAccounts = (networkName?: string): {mnemonic: string} => {
  return {mnemonic: getMnemonic(networkName)};
};

export default getAccounts;
