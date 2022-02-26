// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.5;

import "../interfaces/IERC20.sol";

contract MockDoubleTransfer {
    IERC20 public immutable KIMBER;

    constructor(IERC20 kimber) {
        KIMBER = kimber;
    }

    function doubleSend(
        address to,
        uint256 amount1,
        uint256 amount2
    ) external {
        KIMBER.transfer(to, amount1);
        KIMBER.transfer(to, amount2);
    }
}
