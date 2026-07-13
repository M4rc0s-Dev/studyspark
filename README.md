# Flashcard Web Application

A modern web application that interfaces with the n8n flashcard workflow to generate, study, and manage interactive flashcards from study notes.

## Overview

This application provides a complete study experience with:

- **AI-powered flashcard generation** using your n8n workflow
- **Multiple study modes** (basic, timed, spaced repetition)
- **File upload support** (PDF, TXT, DOCX)
- **Real-time processing progress**
- **Interactive flashcards** with click-to-reveal functionality
- **Export capabilities** (CSV, JSON)
- **Shareable study links**
- **Gumroad payment integration**

## Features

### 🎯 Core Features

1. **Smart Upload Interface**
   - Drag & drop file upload
   - Text input alternative
   - Real-time progress indicators
   - Error handling and validation

2. **Interactive Study Experience**
   - Click-to-reveal flashcards
   - Multiple study modes
   - Progress tracking
   - Time spent tracking
   - Performance analytics

3. **Export & Sharing**
   - CSV export for spreadsheet import
   - JSON export for backup/transfer
   - Shareable study links
   - QR code generation

4. **Modern UI/UX**
   - Responsive design (mobile + desktop)
   - Smooth animations and transitions
   - Accessibility focused
   - Clean, educational interface

### 🔧 Technical Features

- **React.js** with TypeScript
- **Vite** for rapid development
- **Tailwind CSS** for styling
- **n8n Workflow Integration**
- **WebSocket support** for real-time updates
- **File processing** utilities
- **Responsive design**
- **Comprehensive testing**

## Getting Started

### Prerequisites

- Node.js 18+ (with npm or yarn)
- Git
- n8n instance with flashcard workflow
- Gumroad account for payments

### Installation

```bash
# Clone this repository

git clone <repository-url>
cd flashcard-app

# Install dependencies

npm install # or yarn install

# Configure environment variables

Copy .env.example to .env
Edit .env with your configuration:

VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/flashcard-generate
VITE_GUMROAD_API_KEY=your_gumroad_api_key
VITE_GUMROAD_PRODUCT_ID=your_product_id
VITE_API_BASE_URL=/api (relative URL for client-server communication)

# Start development server

npm run dev

# The application will be available at http://localhost:5173
```

### Development Workflow

1. **Start n8n Flashcard Workflow**
   - Ensure your n8n instance is running
   - Activate the "Flashcard Generator - Working Version" workflow
   - Configure webhook URL to match VITE_N8N_WEBHOOK_URL

2. **Server Setup**
   - Create a simple Express server or use Vercel/Netlify functions
   - The server should forward requests to your n8n webhook
   - Implement authentication and rate limiting
   - Set up CORS headers appropriately

3. **Client Development**
   - Make changes to React components
   - Test file uploads and flashcard generation
   - Verify study modes functionality
   - Test export features

## Project Structure

```
.
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Layout/          # Page layouts and navigation
│   │   ├── Features/        # Main feature components
│   │   ├── Study/           # Study-specific components
│   │   └── UI/              # Atomic UI elements
│   ├── context/             # React context providers
│   ├── pages/               # Page components
│   ├── services/            # API service layer
│   ├── store/              # Application state management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Build configuration
├── tsconfig.json           # TypeScript configuration
├── README.md               # Project documentation
└── web-app-structure.md    # Detailed project structure
```

## Key Components

### 1. UploadArea (`components/Features/UploadArea.tsx`)

The main interface for uploading study materials. Supports:
- File drag & drop
- Direct text input
- File preview and validation
- Progress indicators

### 2. Flashcard (`components/Features/Flashcard.tsx`)

Interactive flashcard component with:
- Question/answer toggle functionality
- Difficulty indicators
- Concept categorization
- Smooth animations
- Responsive design

### 3. StudyPage (`pages/StudyPage.tsx`)

Main study interface featuring:
- Interactive card navigation
- Multiple study modes
- Progress tracking
- Performance analytics
- Time management

### 4. API Service (`services/apiService.ts`)

Integration layer for n8n workflow:
- Flashcard generation
- Session management
- File upload handling
- Export functionality
- Error handling

## Configuration

### n8n Workflow Integration

Your n8n workflow "Flashcard Generator - Working Version" should have:

1. **Form Trigger Node**: Accept study notes input
2. **AI Agent Node**: Generate flashcards from notes
3. **Structured Output Parser**: Parse flashcard data
4. **Code Node**: Process and format flashcards
5. **Convert to File Node**: Export to CSV format
6. **Form/Completion Node**: Return results to user

### Environment Variables

```env
# Required for production
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/flashcard-generate
VITE_GUMROAD_API_KEY=your_gumroad_api_key
VITE_GUMROAD_PRODUCT_ID=your_product_id
VITE_APP_URL=https://your-domain.com

# Optional
VITE_API_BASE_URL=/api
VITE_ENABLE_ANALYTICS=true
VITE_MAX_FILE_SIZE=10485760
VITE_SUPPORTED_FILE_TYPES=pdf,txt,docx
```

## Development Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit"
  }
}
```

### Available Commands

- **`npm run dev`** - Start development server
- **`npm run build`** - Build for production
- **`npm run lint`** - Code linting
- **`npm run preview`** - Preview production build
- **`npm run test`** - Run tests
- **`npm run format`** - Format code
- **`npm run type-check`** - TypeScript type checking

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch
```

### Test Coverage

- **Component Tests**: React component rendering and interactions
- **Integration Tests**: API calls and workflow integration
- **Accessibility Tests**: WCAG compliance
- **Performance Tests**: Bundle size and load times

## Deployment

### Local Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Hosting Options

1. **Netlify**
   - Drag & drop build folder
   - Connect Git repository
   - Set build command: `npm run build`
   - Set output directory: `dist`

2. **Vercel**
   - Import Git repository
   - Automatic builds and deployments
   - Configurable environment variables

3. **Docker**
   ```dockerfile
   # Backend service (Express.js)
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

4. **Nginx + PM2**
   - Use PM2 for process management
   - Configure nginx for reverse proxy
   - SSL termination at nginx level

## Auth Setup (Supabase + Resend + Google)

StudySpark uses Supabase Auth (email/password, password reset and Google OAuth).
The frontend needs only the public anon key — Supabase does the rest server-side.

### 1. Supabase project

1. Create a project at <https://supabase.com> (StudySpark's project id is
   `nhxkubdzpnceyoemtliu`, region `eu-central-1`).
2. Copy **Project Settings → API → Project URL** and the **anon/public key**
   into `.env`:

   ```bash
   VITE_SUPABASE_URL=https://nhxkubdzpnceyoemtliu.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Apply the database schema (the `profiles` table already exists; this adds the
   `avatar` column used by the avatar picker):

   ```sql
   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar text NULL;
   ```

4. **Row Level Security** — confirm these policies exist on `profiles`
   (owner-only access):

   ```sql
   CREATE POLICY "Profiles are viewable by owner"
     ON public.profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Profiles are editable by owner"
     ON public.profiles FOR UPDATE USING (auth.uid() = id);
   CREATE POLICY "Profiles are insertable by owner"
     ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
   ```

### 2. Resend (transactional email for password reset)

The "¿Olvidaste tu contraseña?" flow sends a reset link through Supabase
Auth, but Supabase needs an email provider to actually deliver it.

1. Create an account at <https://resend.com> and verify your domain
   (StudySpark uses `studyspark.pp.ua`).
2. In Resend → **API Keys**, generate a key.
3. In Supabase → **Authentication → Providers → Email**, pick **Resend** as the
   provider and paste the Resend API key.
4. Set the **Redirect URLs** (Supabase → Authentication → URL Configuration):
   - Site URL: `https://your-domain` (e.g. `https://studyspark.pp.ua`)
   - Redirect URLs (add both):
     - `https://your-domain/auth/confirm`
     - `http://localhost:5173/auth/confirm` (local dev)
5. (Optional) Customize the email template under **Authentication →
   Email Templates → Reset Password** so the link points to
   `/auth/confirm?token_hash=...&type=recovery`. StudySpark reads that page,
   verifies the OTP and shows a "set new password" form.

> Without a provider (step 2–3) Supabase still works locally but the reset
> email is never sent, so the "forgot password" button appears to do nothing.

### 3. Google OAuth (sign in with Google)

1. Google Cloud Console → **APIs & Services → Credentials → OAuth 2.0 Client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: `https://nhxkubdzpnceyoemtliu.supabase.co/auth/v1/callback`.
2. Supabase → **Authentication → Providers → Google**: enable it and paste the
   Google **Client ID** and **Client Secret**.
3. The "Continuar con Google" button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
   After the redirect back, `onAuthStateChange` recreates the `profiles` row if
   needed (reading the name from `user_metadata`), so Google users get an avatar
   and profile automatically.

### How the code wires it

- `src/lib/supabase.ts` — creates the client from the `VITE_*` env vars.
- `src/context/AuthContext.tsx` — `signIn`, `signUp`, `signInWithGoogle`,
  `updatePassword`, `resetPassword`, `ensureProfile`.
- `src/pages/AuthPage.tsx` — login/register form, Google button, forgot-password.
- `src/pages/ConfirmPage.tsx` — handles `type=signup` (email confirmation)
  and `type=recovery` (password reset) from the email links.

## Domain Setup (nic.ua)

### Step 1: Domain Registration

1. **Register domain**: `nic.ua`
2. **Configure DNS**: 
   - A record: your server IP
   - CNAME record for www subdomain

### Step 2: SSL Certificate

1. **Let's Encrypt** (using certbot):
   ```bash
   sudo apt update
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Auto-renewal**: Set up cron job for automatic renewal

### Step 3: Server Configuration

```nginx
# /etc/nginx/sites-available/your-domain.conf
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static files
    location / {
        root /var/www/html/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if backend is on different server)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Step 4: HTTPS Configuration

1. **Install SSL certificates**
2. **Set up automatic renewal**
3. **Test configuration**: `nginx -t`
4. **Reload nginx**: `systemctl reload nginx`

## Payment Integration (Gumroad)

### Basic Setup

1. **Create Gumroad product**
2. **Get API key** from Gumroad dashboard
3. **Configure product ID** in environment variables
4. **Set up webhooks** for order notifications

### Integration Points

1. **Product Display**: Show pricing and features
2. **Checkout Process**: Redirect to Gumroad
3. **Order Confirmation**: Handle webhook callbacks
4. **Content Access**: Unlock flashcards based on payment
5. **Subscription Management**: Handle recurring payments

### Sample Gumroad Integration

```typescript
// src/services/gumroadService.ts
export class GumroadService {
  private apiKey: string
  private productId: string

  constructor(apiKey: string, productId: string) {
    this.apiKey = apiKey
    this.productId = productId
  }

  async createPaymentLink(userEmail: string, userName: string): Promise<string> {
    const response = await fetch('https://api.gumroad.com/v2/selling_products/create_payment_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: this.productId,
        customer_email: userEmail,
        customer_name: userName,
        success_url: `${window.location.origin}/study/${sessionId}`
      })
    })

    const data = await response.json()
    return data.payment_link
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Flashcard Generation Not Working

**Symptoms**: No flashcards generated or empty results

**Solutions**:
```bash
# Check n8n workflow
1. Verify workflow is active
2. Check webhook URL configuration
3. Verify API credentials
4. Test workflow manually

# Check client-side
1. Check browser console for errors
2. Verify file upload format
3. Check network requests
```

#### 2. Study Session Issues

**Symptoms**: Cannot access study page, session expired

**Solutions**:
```bash
# Check local storage
1. Verify session ID in local storage
2. Check session expiration
3. Verify session data integrity

# Check API
1. Verify API endpoint availability
2. Check CORS configuration
3. Verify session persistence
```

#### 3. Export Functionality

**Symptoms**: Download fails or incorrect format

**Solutions**:
```bash
# Check file format
1. Verify CSV/JSON structure
2. Check file size limits
3. Verify browser compatibility

# Check server-side
1. Verify export endpoint
2. Check file generation logic
3. Verify binary data handling
```

### Logging

Enable debugging by setting:
```env
VITE_DEBUG=true
```

### Error Reporting

For production environments, integrate:
- Sentry.io for error tracking
- Google Analytics for user behavior
- Custom error reporting for critical issues

## Performance Optimization

### Bundle Size

```bash
# Analyze bundle size
npm run build
npx webpack-bundle-analyzer dist/stats.json
```

### Production Builds

```bash
# Optimize for production
npm run build

# Minify CSS
npx cssnano src/index.css dist/index.css

# Compress images
npm install --save-dev imagemin imagemin-webpack-plugin
```

## Security Considerations

### Client-side Security

1. **Input Validation**: Validate all user inputs
2. **File Security**: Scan uploaded files for malicious content
3. **XSS Protection**: Sanitize user-generated content
4. **SameSite Cookies**: Configure cookies for security

### Server-side Security

1. **Authentication**: Implement user authentication
2. **Rate Limiting**: Prevent abuse and DDoS attacks
3. **HTTPS Only**: Enforce SSL for all connections
4. **API Security**: Secure API endpoints
5. **Session Management**: Secure session handling

## Contributing

### Development Guidelines

1. **Code Style**: Follow Prettier formatting
2. **Type Safety**: Use strict TypeScript checking
3. **Testing**: Write comprehensive tests
4. **Documentation**: Keep documentation updated
5. **Performance**: Optimize for speed and efficiency

### Pull Request Process

1. Create feature branch
2. Commit changes with descriptive messages
3. Include tests for new functionality
4. Update documentation if needed
5. Request code review
6. Merge after approval

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Acknowledgments

- n8n for providing the workflow automation platform
- React team for creating an amazing framework
- Tailwind CSS team for utility-first styling
- All open-source contributors who made this possible

---

*Last updated: July 10, 2026*
*Version: 1.0.0*

Feel free to reach out with questions, suggestions, or feedback! We're excited to help you create an amazing flashcard study experience.