# Stock Terminal

A desktop and web app for fundamental stock analysis, built with Tauri + React + TypeScript (frontend) and Rust + Axum (backend).

## Data Sources

Financial data is sourced from **SEC EDGAR** (fundamental filings) and **Yahoo Finance** (prices and search). No API key required — both are free public sources.

## Features

- Fundamental analysis — Revenue, EPS, Book Value, FCF, ROIC with CAGR trends
- Intrinsic value estimates — DCF, Graham Number, PEG Ratio
- Piotroski F-Score, Quality Score, Momentum vs S&P 500
- Sector Screener — ranked large-cap stocks by composite score
- Portfolio tracker — holdings, realized gains, public sharing
- Community — leaderboard of public portfolios

## Desktop App

Download the latest release from the [Releases](https://github.com/wilbertsky/stock-terminal/releases) page.

- **macOS** — download the `.dmg` matching your chip (Apple Silicon or Intel)
- **Windows** — download the `.msi` installer
- **Linux** — download the `.AppImage`

## Web App

Available at the hosted URL. Same features, same data, invite-only access.

## Development

### Prerequisites

- Node.js 20+
- Rust (stable)
- System WebKit libraries (Linux only): `libwebkit2gtk-4.1-dev`

### Run locally

```bash
npm install
npm run tauri dev      # desktop app
npm run dev            # web browser only (http://localhost:1420)
```

Set `VITE_API_URL` in `.env.local` to point at the API:

```
VITE_API_URL=http://localhost:8080
```

## Disclaimer

For educational and informational purposes only. Not investment advice.
