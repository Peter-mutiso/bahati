# 🚀 Deployment Guide

## Quick Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env`
5. Deploy

## Environment Variables

Add these in Vercel dashboard:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

## Build Command
```bash
npm run build
```

## Output Directory
```
dist
```

## Other Platforms

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`

### Cloudflare Pages
- Build command: `npm run build`
- Build output directory: `dist`

## Post-Deployment

1. Update Supabase Auth redirect URLs
2. Configure custom domain
3. Enable SSL/HTTPS
4. Test all payment gateways
5. Monitor error logs

For detailed instructions, see [INSTALLATION.md](../INSTALLATION.md).
