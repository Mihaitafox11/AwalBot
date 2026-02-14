// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/AgentRegistry.sol";
import "../src/SessionManager.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        AgentRegistry agentRegistry = new AgentRegistry();
        console.log("AgentRegistry deployed at:", address(agentRegistry));

        SessionManager sessionManager = new SessionManager(
            address(mockUSDC),
            address(agentRegistry)
        );
        console.log("SessionManager deployed at:", address(sessionManager));

        vm.stopBroadcast();
    }
}
