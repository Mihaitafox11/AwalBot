// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/AgentRegistry.sol";
import "../src/SessionManager.sol";

contract SessionManagerTest is Test {
    MockUSDC public usdc;
    AgentRegistry public registry;
    SessionManager public manager;

    address public user = makeAddr("user");
    address public agent = makeAddr("agent");

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        manager = new SessionManager(address(usdc), address(registry));

        // Register and fund
        vm.prank(agent);
        registry.register("Test Agent", "A test agent", "coding", 50e6);

        usdc.mint(user, 10_000e6);
        vm.prank(user);
        usdc.approve(address(manager), type(uint256).max);
    }

    function test_startSession() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 100e6, 3600);

        assertTrue(sessionId != bytes32(0));
        assertEq(usdc.balanceOf(address(manager)), 100e6);
        assertEq(manager.activeSession(user), sessionId);
    }

    function test_startSession_agentNotRegistered() public {
        address unknown = makeAddr("unknown");
        vm.expectRevert("Agent not registered");
        vm.prank(user);
        manager.startSession(unknown, 100e6, 3600);
    }

    function test_startSession_agentNotActive() public {
        vm.prank(agent);
        registry.deactivate();

        vm.expectRevert("Agent not active");
        vm.prank(user);
        manager.startSession(agent, 100e6, 3600);
    }

    function test_startSession_alreadyInSession() public {
        vm.prank(user);
        manager.startSession(agent, 100e6, 3600);

        vm.expectRevert("Already in a session");
        vm.prank(user);
        manager.startSession(agent, 50e6, 600);
    }

    function test_startSession_durationTooShort() public {
        vm.expectRevert("Duration too short");
        vm.prank(user);
        manager.startSession(agent, 100e6, 299);
    }

    function test_startSession_zeroDeposit() public {
        vm.expectRevert("Deposit must be > 0");
        vm.prank(user);
        manager.startSession(agent, 0, 3600);
    }

    function test_endSession_proRate() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        // Advance 500 seconds (half the session)
        vm.warp(block.timestamp + 500);

        vm.prank(user);
        manager.endSession(sessionId);

        // Agent gets 500/1000 = 50%
        assertEq(manager.earnings(agent), 500e6);
        // User gets refund of remaining 50%
        assertEq(usdc.balanceOf(user), 9000e6 + 500e6);
    }

    function test_endSession_fullDuration() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        // Advance past full duration
        vm.warp(block.timestamp + 2000);

        vm.prank(user);
        manager.endSession(sessionId);

        // Agent gets 100%
        assertEq(manager.earnings(agent), 1000e6);
        // User gets no refund (balance = initial - deposit)
        assertEq(usdc.balanceOf(user), 9000e6);
    }

    function test_endSession_byAgent() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        vm.warp(block.timestamp + 250);

        vm.prank(agent);
        manager.endSession(sessionId);

        assertEq(manager.earnings(agent), 250e6);
    }

    function test_endSession_unauthorized() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        address stranger = makeAddr("stranger");
        vm.expectRevert("Not authorized");
        vm.prank(stranger);
        manager.endSession(sessionId);
    }

    function test_endSession_notActive() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        vm.warp(block.timestamp + 500);
        vm.prank(user);
        manager.endSession(sessionId);

        vm.expectRevert("Session not active");
        vm.prank(user);
        manager.endSession(sessionId);
    }

    function test_endSession_clearsActiveSession() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        vm.prank(user);
        manager.endSession(sessionId);

        assertEq(manager.activeSession(user), bytes32(0));
    }

    function test_claimEarnings() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        vm.warp(block.timestamp + 1000);
        vm.prank(user);
        manager.endSession(sessionId);

        uint256 balBefore = usdc.balanceOf(agent);
        vm.prank(agent);
        manager.claimEarnings();

        assertEq(usdc.balanceOf(agent), balBefore + 1000e6);
        assertEq(manager.earnings(agent), 0);
    }

    function test_claimEarnings_noEarnings() public {
        vm.expectRevert("No earnings");
        vm.prank(agent);
        manager.claimEarnings();
    }

    function test_isSessionActive() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        assertTrue(manager.isSessionActive(sessionId));

        // Advance past duration
        vm.warp(block.timestamp + 1001);
        assertFalse(manager.isSessionActive(sessionId));
    }

    function test_isSessionActive_afterEnd() public {
        vm.prank(user);
        bytes32 sessionId = manager.startSession(agent, 1000e6, 1000);

        vm.prank(user);
        manager.endSession(sessionId);

        assertFalse(manager.isSessionActive(sessionId));
    }
}
