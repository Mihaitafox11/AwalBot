// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC public usdc;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_name() public view {
        assertEq(usdc.name(), "Mock USDC");
    }

    function test_symbol() public view {
        assertEq(usdc.symbol(), "USDC");
    }

    function test_decimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_mint() public {
        usdc.mint(alice, 1000e6);
        assertEq(usdc.balanceOf(alice), 1000e6);
    }

    function test_transfer() public {
        usdc.mint(alice, 1000e6);
        vm.prank(alice);
        usdc.transfer(bob, 250e6);
        assertEq(usdc.balanceOf(alice), 750e6);
        assertEq(usdc.balanceOf(bob), 250e6);
    }

    function test_anyoneCanMint() public {
        vm.prank(alice);
        usdc.mint(bob, 500e6);
        assertEq(usdc.balanceOf(bob), 500e6);
    }
}
