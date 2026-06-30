const prisma = require('../utils/db');

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        location: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Server error retrieving users' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'RESTAURANT', 'NGO'].includes(role.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role.toUpperCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        location: true
      }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser
};
