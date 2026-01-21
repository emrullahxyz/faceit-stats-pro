# Faceit Stats Pro - Developer Documentation

## Project Overview

A Next.js 16 application that provides advanced CS2 player statistics, match analysis, and AI-powered predictions using the Faceit API.

## Key Features

- 🎮 **Player Search & Stats** - View detailed player statistics
- ⚔️ **Match Analyzer** - Analyze ongoing/past matches with map recommendations
- 🧠 **AI Match Predictor** - Win probability predictions based on team performance
- ⭐ **Favorite Players** - Save and track favorite players
- 📤 **Share Cards** - Generate shareable match analysis images

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (server-side)
│   │   ├── map-stats/     # Player map statistics
│   │   ├── match/         # Match details
│   │   ├── proxy/         # Rate-limited API proxy
│   │   └── ...
│   ├── compare/           # Player comparison page
│   ├── match-analyzer/    # Match analysis page
│   └── player/            # Player profile page
├── components/
│   ├── features/          # Feature components
│   │   ├── AIPrediction   # AI match prediction display
│   │   ├── ShareCard      # Shareable image generator
│   │   └── ...
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
│   └── useFavorites       # Favorites management
└── lib/                   # Utilities
    ├── api.ts             # Faceit API client
    ├── api-keys.ts        # API key rotation
    ├── error-handling.ts  # Error utilities
    └── validation.ts      # Input validation
```

## Environment Variables

```env
FACEIT_API_KEY=           # Primary Faceit API key
FACEIT_API_KEY_BACKUP=    # Backup key for rate limit failover
```

## API Rate Limiting

The app handles Faceit API rate limits through:

1. **API Key Rotation** - Auto-switches to backup key on 429
2. **Sequential Requests** - Match analyzer uses 150ms delays
3. **Request Queue** - Client-side throttling (5 req/sec)
4. **Local Caching** - 1-hour cache for player stats

## Error Handling

```typescript
import { AppError, RateLimitError, getUserFriendlyMessage } from '@/lib/error-handling';

try {
    const data = await fetchData();
} catch (error) {
    const message = getUserFriendlyMessage(error);
    setError(message); // Turkish user-friendly message
}
```

## Validation

```typescript
import { isValidPlayerId, sanitizeInput } from '@/lib/validation';

if (!isValidNickname(input)) {
    throw new ValidationError('Invalid nickname');
}
```

## Key Components

### Match Analyzer (`/match-analyzer`)
- Analyzes team compositions
- Provides map pick/ban recommendations
- Shows AI win probability predictions

### AI Prediction Algorithm
Factors (weighted):
- Composite Score: 25%
- Win Rate: 20%
- K/D Ratio: 15%
- Data Quality: 15%
- Player Coverage: 10%
- Impact Score: 10%
- Momentum: 5%

## Running Locally

```bash
npm install
npm run dev
```

## Testing

```bash
npm run lint          # ESLint
npx tsc --noEmit     # TypeScript check
```

## Security Considerations

- API keys stored in environment variables only
- Input sanitization on all user inputs
- XSS prevention through React's default escaping
- Rate limiting prevents abuse
- No sensitive data stored client-side (except favorites in localStorage)
