// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SplitPay {
    struct Expense {
        address payer;
        uint256 amount;
        uint256 timestamp;
        string memo;
    }

    mapping(bytes32 => address[]) private _members;
    mapping(bytes32 => mapping(address => bool)) private _isMember;
    mapping(bytes32 => Expense[]) private _expenses;
    mapping(bytes32 => mapping(address => int256)) private _balances;

    event GroupCreated(bytes32 indexed groupId, address indexed creator, address[] members);
    event ExpenseAdded(
        bytes32 indexed groupId,
        address indexed payer,
        uint256 amount,
        address[] debtors,
        uint256[] shares,
        string memo,
        uint256 timestamp
    );
    event Settled(
        bytes32 indexed groupId,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount
    );

    error NotAMember();
    error ZeroAmount();
    error MismatchedArrays();
    error DuplicateMember();
    error CreatorNotInMembers();
    error TooFewMembers();
    error ZeroAddress();

    function createGroup(address[] calldata members) external returns (bytes32 groupId) {
        if (members.length < 2) revert TooFewMembers();

        bool creatorFound = false;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == address(0)) revert ZeroAddress();
            if (members[i] == msg.sender) creatorFound = true;
        }
        if (!creatorFound) revert CreatorNotInMembers();

        groupId = keccak256(abi.encode(members, msg.sender, block.number, block.timestamp));

        for (uint256 i = 0; i < members.length; i++) {
            if (_isMember[groupId][members[i]]) revert DuplicateMember();
            _isMember[groupId][members[i]] = true;
        }
        _members[groupId] = members;

        emit GroupCreated(groupId, msg.sender, members);
    }

    function addExpense(
        bytes32 groupId,
        uint256 amount,
        address[] calldata debtors,
        uint256[] calldata shares,
        string calldata memo
    ) external {
        if (!_isMember[groupId][msg.sender]) revert NotAMember();
        if (debtors.length == 0) revert ZeroAmount();
        if (debtors.length != shares.length) revert MismatchedArrays();

        int256 totalOwed;
        for (uint256 i = 0; i < debtors.length; i++) {
            if (!_isMember[groupId][debtors[i]]) revert NotAMember();
            if (debtors[i] == msg.sender) continue;
            _balances[groupId][debtors[i]] -= int256(shares[i]);
            totalOwed += int256(shares[i]);
        }
        _balances[groupId][msg.sender] += totalOwed;

        _expenses[groupId].push(Expense({
            payer: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            memo: memo
        }));

        emit ExpenseAdded(groupId, msg.sender, amount, debtors, shares, memo, block.timestamp);
    }

    function settle(bytes32 groupId, address to, address token, uint256 amount) external {
        if (!_isMember[groupId][msg.sender] || !_isMember[groupId][to]) revert NotAMember();
        if (amount == 0) revert ZeroAmount();

        _balances[groupId][msg.sender] += int256(amount);
        _balances[groupId][to] -= int256(amount);

        require(IERC20(token).transferFrom(msg.sender, to, amount), "transfer failed");

        emit Settled(groupId, msg.sender, to, token, amount);
    }

    function getBalance(bytes32 groupId, address member) external view returns (int256) {
        return _balances[groupId][member];
    }

    function getMembers(bytes32 groupId) external view returns (address[] memory) {
        return _members[groupId];
    }

    function getExpenseCount(bytes32 groupId) external view returns (uint256) {
        return _expenses[groupId].length;
    }

    function getExpense(bytes32 groupId, uint256 index) external view returns (Expense memory) {
        return _expenses[groupId][index];
    }
}
