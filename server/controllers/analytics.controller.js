const prisma = require('../utils/db');

const getWasteSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();

    const whereClause = {
      loggedAt: {
        gte: start,
        lte: end
      }
    };

    if (userRole === 'RESTAURANT') {
      whereClause.userId = userId;
    }

    const logs = await prisma.wasteLog.findMany({
      where: whereClause,
      include: {
        foodItem: true
      }
    });

    // 1. Group by category
    const categorySummary = {};
    logs.forEach(log => {
      const cat = log.foodItem.category;
      categorySummary[cat] = (categorySummary[cat] || 0) + log.quantityWasted;
    });

    const categories = Object.keys(categorySummary).map(cat => ({
      category: cat,
      totalWasted: categorySummary[cat]
    }));

    // 2. Weekly Trend (last 7 days bucketed by day of week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyLogs = logs.filter(log => new Date(log.loggedAt) >= sevenDaysAgo);
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap = {};
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = weekdays[d.getDay()];
      trendMap[dayName] = { day: dayName, quantity: 0 };
    }

    weeklyLogs.forEach(log => {
      const logDay = weekdays[new Date(log.loggedAt).getDay()];
      if (trendMap[logDay]) {
        trendMap[logDay].quantity += log.quantityWasted;
      }
    });

    const weeklyTrend = Object.values(trendMap);

    res.status(200).json({
      categories,
      weeklyTrend
    });
  } catch (error) {
    console.error('Get waste summary error:', error);
    res.status(500).json({ message: 'Server error generating waste summary' });
  }
};

const getDonationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const whereClause = {};

    if (userRole === 'RESTAURANT') {
      whereClause.donorId = userId;
    } else if (userRole === 'NGO') {
      whereClause.recipientId = userId;
    }

    const donations = await prisma.donation.findMany({
      where: whereClause
    });

    const counts = {
      PENDING: 0,
      ACCEPTED: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };

    donations.forEach(d => {
      if (counts[d.status] !== undefined) {
        counts[d.status]++;
      }
    });

    const total = donations.length;
    const completed = counts.COMPLETED;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.status(200).json({
      total,
      counts,
      completionRate
    });
  } catch (error) {
    console.error('Get donation stats error:', error);
    res.status(500).json({ message: 'Server error retrieving donation statistics' });
  }
};

const getTopWasted = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const whereClause = {};

    if (userRole === 'RESTAURANT') {
      whereClause.userId = userId;
    }

    const logs = await prisma.wasteLog.findMany({
      where: whereClause,
      include: {
        foodItem: true
      }
    });

    const foodItemMap = {};
    logs.forEach(log => {
      const name = log.foodItem.name;
      const unit = log.foodItem.unit;
      const key = `${name} (${unit})`;
      foodItemMap[key] = (foodItemMap[key] || 0) + log.quantityWasted;
    });

    const topWasted = Object.keys(foodItemMap)
      .map(key => ({
        name: key,
        quantity: foodItemMap[key]
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5

    res.status(200).json(topWasted);
  } catch (error) {
    console.error('Get top wasted error:', error);
    res.status(500).json({ message: 'Server error retrieving top wasted items' });
  }
};

module.exports = {
  getWasteSummary,
  getDonationStats,
  getTopWasted
};
