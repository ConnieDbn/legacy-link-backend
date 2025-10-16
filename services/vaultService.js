// server/services/vaultService.js
const VaultItem = require('../models/VaultItem');

// Get all vault items for a user
const getUserVaultItems = async (userId) => {
  return await VaultItem.find({ user: userId }).sort({ date: -1 });
};

// Get vault items by type
const getVaultItemsByType = async (userId, type) => {
  return await VaultItem.find({ user: userId, type }).sort({ date: -1 });
};

// Create new vault item
const createVaultItem = async (vaultData) => {
  const newVaultItem = new VaultItem(vaultData);
  return await newVaultItem.save();
};

// Update vault item
const updateVaultItem = async (id, userId, vaultData) => {
  // Make sure user owns the vault item
  const vaultItem = await VaultItem.findById(id);
  if (!vaultItem) {
    throw new Error('Vault item not found');
  }
  if (vaultItem.user.toString() !== userId) {
    throw new Error('Not authorized to update this item');
  }

  return await VaultItem.findByIdAndUpdate(
    id,
    { $set: vaultData },
    { new: true }
  );
};

// Delete vault item
const deleteVaultItem = async (id, userId) => {
  // Make sure user owns the vault item
  const vaultItem = await VaultItem.findById(id);
  if (!vaultItem) {
    throw new Error('Vault item not found');
  }
  if (vaultItem.user.toString() !== userId) {
    throw new Error('Not authorized to delete this item');
  }

  await VaultItem.findByIdAndRemove(id);
  return { success: true };
};

module.exports = {
  getUserVaultItems,
  getVaultItemsByType,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem
};