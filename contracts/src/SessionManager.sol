// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./AgentRegistry.sol";

contract SessionManager {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    AgentRegistry public immutable registry;

    uint256 public constant MIN_DURATION = 300;

    struct Session {
        address user;
        address agent;
        uint256 depositAmount;
        uint256 startTime;
        uint256 durationSeconds;
        bool active;
    }

    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32) public activeSession;
    mapping(address => uint256) public earnings;

    event SessionStarted(bytes32 indexed sessionId, address indexed user, address indexed agent, uint256 depositAmount, uint256 durationSeconds);
    event SessionEnded(bytes32 indexed sessionId, uint256 agentShare, uint256 userRefund);
    event EarningsClaimed(address indexed agent, uint256 amount);

    constructor(address _usdc, address _registry) {
        usdc = IERC20(_usdc);
        registry = AgentRegistry(_registry);
    }

    function startSession(
        address agentWallet,
        uint256 depositAmount,
        uint256 durationSeconds
    ) external returns (bytes32 sessionId) {
        require(registry.isRegistered(agentWallet), "Agent not registered");
        AgentRegistry.AgentProfile memory agent = registry.getAgent(agentWallet);
        require(agent.active, "Agent not active");
        require(activeSession[msg.sender] == bytes32(0), "Already in a session");
        require(durationSeconds >= MIN_DURATION, "Duration too short");
        require(depositAmount > 0, "Deposit must be > 0");

        usdc.safeTransferFrom(msg.sender, address(this), depositAmount);

        sessionId = keccak256(abi.encodePacked(msg.sender, agentWallet, block.timestamp));

        sessions[sessionId] = Session({
            user: msg.sender,
            agent: agentWallet,
            depositAmount: depositAmount,
            startTime: block.timestamp,
            durationSeconds: durationSeconds,
            active: true
        });

        activeSession[msg.sender] = sessionId;

        emit SessionStarted(sessionId, msg.sender, agentWallet, depositAmount, durationSeconds);
    }

    function endSession(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        require(session.active, "Session not active");
        require(
            msg.sender == session.user || msg.sender == session.agent,
            "Not authorized"
        );

        uint256 elapsed = block.timestamp - session.startTime;
        if (elapsed > session.durationSeconds) {
            elapsed = session.durationSeconds;
        }

        uint256 agentShare = (session.depositAmount * elapsed) / session.durationSeconds;
        uint256 userRefund = session.depositAmount - agentShare;

        earnings[session.agent] += agentShare;

        if (userRefund > 0) {
            usdc.safeTransfer(session.user, userRefund);
        }

        session.active = false;
        activeSession[session.user] = bytes32(0);

        emit SessionEnded(sessionId, agentShare, userRefund);
    }

    function claimEarnings() external {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "No earnings");

        earnings[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit EarningsClaimed(msg.sender, amount);
    }

    function isSessionActive(bytes32 sessionId) external view returns (bool) {
        Session storage session = sessions[sessionId];
        return session.active && block.timestamp < session.startTime + session.durationSeconds;
    }
}
