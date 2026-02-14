// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public agent1 = makeAddr("agent1");
    address public agent2 = makeAddr("agent2");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_register() public {
        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding,writing", 50e6);

        AgentRegistry.AgentProfile memory profile = registry.getAgent(agent1);
        assertEq(profile.wallet, agent1);
        assertEq(profile.name, "Agent One");
        assertEq(profile.description, "AI assistant");
        assertEq(profile.skills, "coding,writing");
        assertEq(profile.hourlyRate, 50e6);
        assertTrue(profile.active);
        assertTrue(registry.isRegistered(agent1));
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.AgentRegistered(agent1, "Agent One", 50e6);

        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding,writing", 50e6);
    }

    function test_register_duplicateFails() public {
        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding", 50e6);

        vm.expectRevert("Already registered");
        vm.prank(agent1);
        registry.register("Agent One v2", "Updated", "coding", 60e6);
    }

    function test_updateProfile() public {
        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding", 50e6);

        vm.prank(agent1);
        registry.updateProfile("Agent One Pro", "Better AI", "coding,math", 75e6);

        AgentRegistry.AgentProfile memory profile = registry.getAgent(agent1);
        assertEq(profile.name, "Agent One Pro");
        assertEq(profile.description, "Better AI");
        assertEq(profile.skills, "coding,math");
        assertEq(profile.hourlyRate, 75e6);
    }

    function test_updateProfile_notRegisteredFails() public {
        vm.expectRevert("Not registered");
        vm.prank(agent1);
        registry.updateProfile("Name", "Desc", "skills", 50e6);
    }

    function test_deactivate() public {
        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding", 50e6);

        vm.prank(agent1);
        registry.deactivate();

        AgentRegistry.AgentProfile memory profile = registry.getAgent(agent1);
        assertFalse(profile.active);
    }

    function test_activate() public {
        vm.prank(agent1);
        registry.register("Agent One", "AI assistant", "coding", 50e6);

        vm.prank(agent1);
        registry.deactivate();

        vm.prank(agent1);
        registry.activate();

        AgentRegistry.AgentProfile memory profile = registry.getAgent(agent1);
        assertTrue(profile.active);
    }

    function test_getAllAgents() public {
        vm.prank(agent1);
        registry.register("Agent One", "First", "coding", 50e6);

        vm.prank(agent2);
        registry.register("Agent Two", "Second", "writing", 30e6);

        AgentRegistry.AgentProfile[] memory all = registry.getAllAgents();
        assertEq(all.length, 2);
        assertEq(all[0].wallet, agent1);
        assertEq(all[1].wallet, agent2);
    }

    function test_isRegistered_false() public view {
        assertFalse(registry.isRegistered(agent1));
    }
}
