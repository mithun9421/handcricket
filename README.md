# HandCricket - Multiplayer Neon Game 🎮

A real-time multiplayer HandCricket game built with Next.js, TypeScript, Socket.io, and styled with a futuristic neon theme.

## 🎯 Game Rules

HandCricket is a simple two-player game where:

1. **Toss**: Players start with a toss to decide who bats first
2. **Batting/Bowling**: One player bats, one bowls
3. **Making Moves**: Both players simultaneously choose numbers 0-6
4. **Scoring**: 
   - If both players choose different numbers → Batsman scores runs equal to their number
   - If both players choose the same number → Wicket! Batsman is out
5. **Innings**: After the first player gets out, roles switch
6. **Winning**: The second player must chase the target score. If they get out before reaching it, the first player wins.

## 🌟 Features

- **Real-time Multiplayer**: Play with anyone around the world
- **Matchmaking Queue**: Automatic player matching
- **Neon Theme**: Dark theme with purple/pink neon effects
- **Confetti Celebration**: Winner gets animated confetti
- **Online Player Counter**: See how many players are online
- **Responsive Design**: Works on desktop and mobile

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Custom Node.js server with Socket.io
- **Styling**: Tailwind CSS with custom neon effects
- **Animations**: Framer Motion
- **Real-time Communication**: Socket.io
- **Confetti**: react-confetti

## 🎨 UI Features

- **Neon Glow Effects**: Custom CSS for glowing borders and text
- **Animated Components**: Smooth transitions and hover effects  
- **Dark Theme**: Deep purple/grey gradient background
- **Floating Animations**: Subtle floating animations for key elements
- **Responsive Design**: Optimized for all screen sizes

## 🎮 How to Play

1. **Enter Your Name**: Type your name and join the queue
2. **Wait for Match**: You'll be matched with another player
3. **Toss**: Choose heads or tails (first to choose wins)
4. **Choose Role**: Winner decides to bat or bowl first
5. **Play**: Select numbers 0-6 each round
6. **Score**: Different numbers = runs, same numbers = wicket
7. **Chase**: Second player tries to beat the target score
8. **Win**: First to complete both innings or defend target wins!

## 🔧 Development

### Running in Production

```bash
npm run build
npm start
```

### Code Formatting

```bash
npm run format  # Format code with Biome
npm run lint    # Check code quality
```

## 🌐 Deployment

This app can be deployed on any platform that supports Node.js and WebSocket connections.

**Enjoy playing HandCricket! 🏏✨**
