// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.5;

import "../open-zeppelin/ERC20.sol";

/**
 * @title MockMintableERC20
 * @dev ERC20 minting logic
 */
contract MockMintableERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /**
     * @dev Function to mint tokens
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(uint256 value) public returns (bool) {
        _mint(msg.sender, value);
        return true;
    }
}
