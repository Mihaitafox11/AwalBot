// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentRegistry {
    struct AgentProfile {
        address wallet;
        string name;
        string description;
        string skills;
        uint256 hourlyRate;
        bool active;
        uint256 registeredAt;
    }

    mapping(address => AgentProfile) private agents;
    address[] private agentAddresses;

    event AgentRegistered(address indexed wallet, string name, uint256 hourlyRate);
    event AgentUpdated(address indexed wallet, string name, uint256 hourlyRate);
    event AgentActivated(address indexed wallet);
    event AgentDeactivated(address indexed wallet);

    modifier onlyRegistered() {
        require(agents[msg.sender].wallet != address(0), "Not registered");
        _;
    }

    function register(
        string calldata name,
        string calldata description,
        string calldata skills,
        uint256 hourlyRate
    ) external {
        require(agents[msg.sender].wallet == address(0), "Already registered");

        agents[msg.sender] = AgentProfile({
            wallet: msg.sender,
            name: name,
            description: description,
            skills: skills,
            hourlyRate: hourlyRate,
            active: true,
            registeredAt: block.timestamp
        });

        agentAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, name, hourlyRate);
    }

    function updateProfile(
        string calldata name,
        string calldata description,
        string calldata skills,
        uint256 hourlyRate
    ) external onlyRegistered {
        AgentProfile storage agent = agents[msg.sender];
        agent.name = name;
        agent.description = description;
        agent.skills = skills;
        agent.hourlyRate = hourlyRate;

        emit AgentUpdated(msg.sender, name, hourlyRate);
    }

    function activate() external onlyRegistered {
        agents[msg.sender].active = true;
        emit AgentActivated(msg.sender);
    }

    function deactivate() external onlyRegistered {
        agents[msg.sender].active = false;
        emit AgentDeactivated(msg.sender);
    }

    function getAgent(address wallet) external view returns (AgentProfile memory) {
        return agents[wallet];
    }

    function getAllAgents() external view returns (AgentProfile[] memory) {
        AgentProfile[] memory result = new AgentProfile[](agentAddresses.length);
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            result[i] = agents[agentAddresses[i]];
        }
        return result;
    }

    function isRegistered(address wallet) external view returns (bool) {
        return agents[wallet].wallet != address(0);
    }
}
