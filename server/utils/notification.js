const prisma = require('./db');

const createNotification = async (userId, title, message, type = 'INFO') => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const notifyAllNGOs = async (title, message, type = 'DONATION') => {
  try {
    const ngos = await prisma.user.findMany({
      where: { role: 'NGO' }
    }) || [];
    const promises = ngos.map((ngo) => createNotification(ngo.id, title, message, type));
    await Promise.all(promises);
  } catch (error) {
    console.error('Notify all NGOs error:', error);
  }
};

const notifyAllAdmins = async (title, message, type = 'INFO') => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    }) || [];
    const promises = admins.map((admin) => createNotification(admin.id, title, message, type));
    await Promise.all(promises);
  } catch (error) {
    console.error('Notify all Admins error:', error);
  }
};

module.exports = {
  createNotification,
  notifyAllNGOs,
  notifyAllAdmins
};
