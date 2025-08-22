# 🏈 NFL Pick'em League

A full-stack web application for managing an NFL Pick'em league with automated scoring, admin tools, and real-time updates.

## ✨ Features

### 🎯 Core Functionality
- **User Authentication**: Secure login/registration system
- **Weekly Picks**: Submit picks for individual games up to 1 hour before kickoff
- **Partial Submissions**: Submit picks for available games without waiting for all games
- **Automatic Scoring**: Real-time score updates and point calculations
- **Weekly Winners**: Track weekly champions and season standings

### 🛠️ Admin Tools
- **Admin Dashboard**: Manage users, picks, and game scores
- **Score Overrides**: Manually update game scores when needed
- **Pick Management**: Edit any user's picks with full audit logging
- **Add Picks**: Create picks on behalf of users
- **League Log**: Complete activity tracking for all actions

### 🔄 Automated Systems
- **ESPN API Integration**: Live score updates every 2 minutes
- **Point Calculation**: Automatic processing every 5 minutes
- **Weekly Winners**: Calculated every Monday at 2 AM ET
- **Tiebreakers**: Monday Night Football score predictions

## 🏗️ Architecture

- **Frontend**: React 18 with Tailwind CSS
- **Backend**: Node.js/Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens with bcrypt
- **Real-time Updates**: Automated cron jobs
- **External APIs**: ESPN API for live scores

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nfl-pickem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   npm run seed-simple
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 Available Scripts

### Development
- `npm run dev` - Start both frontend and backend
- `npm run client` - Start React frontend only
- `npm run server` - Start Node.js backend only

### Database
- `npm run seed-simple` - Seed with basic Week 1 games
- `npm run seed-real` - Seed with real NFL schedule from ESPN
- `npm run wipe-all` - Clear all data

### Testing
- `npm run test-scoring` - Test automated scoring system
- `npm run test-live` - Test live score updates
- `npm run test-override` - Test admin score overrides
- `npm run manual-score` - Manual score updates from terminal

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# ESPN API
ESPN_API_KEY=your_espn_api_key

# Scoring Updates
ENABLE_SCORE_UPDATES=true
NODE_ENV=development
```

### Admin Setup
1. Create a user account
2. Manually set `isAdmin: true` in the database
3. Access admin dashboard at `/admin`

## 📱 Usage

### For Users
1. **Register/Login** to your account
2. **Make Picks** for each week's games
3. **Submit Picks** before individual game lock times
4. **View Standings** and track your progress
5. **Check League Log** for activity updates

### For Admins
1. **Access Admin Dashboard** at `/admin`
2. **Manage Users** and their picks
3. **Override Scores** when needed
4. **Edit Picks** with full audit logging
5. **Monitor System** health and scoring

## 🧪 Testing

### Automated Scoring Test
```bash
npm run test-scoring
```
Creates test games, users, picks, and final scores to verify the scoring system.

### Live Scoring Test
```bash
npm run test-live
```
Simulates live game progression through quarters to test real-time updates.

### Score Override Test
```bash
npm run test-override
```
Tests admin score override functionality and point recalculation.

### Manual Score Updates
```bash
npm run manual-score "Eagles" "Cowboys" 24 21
```
Quick command-line score updates for emergency situations.

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt
- **Admin Authorization** middleware
- **Input Validation** with express-validator
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests

## 📈 Performance

- **Automated Jobs**: Efficient cron-based updates
- **Database Indexing**: Optimized MongoDB queries
- **Caching**: Minimal API calls to external services
- **Error Handling**: Graceful degradation when services are unavailable

## 🚨 Troubleshooting

### Common Issues

1. **ESPN API Errors**: Normal before NFL season starts
2. **Score Override Issues**: Check GameResult model imports
3. **Database Connection**: Verify MongoDB URI in .env
4. **Admin Access**: Ensure user has `isAdmin: true` flag

### Emergency Score Updates

If the automated system fails:
1. **Admin Dashboard**: Use "Override Score" button
2. **Terminal Script**: `npm run manual-score`
3. **Direct Database**: MongoDB shell access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🏆 Support

For questions or issues:
- Check the troubleshooting section
- Review the test scripts
- Check the admin dashboard logs

---

**Built with ❤️ for NFL Pick'em enthusiasts**
