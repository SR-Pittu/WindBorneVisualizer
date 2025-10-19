## Windborne Visualizer

An interactive React + Vite dashboard for analyzing and visualizing atmospheric wind and weather data. 
It demonstrates data processing, clustering, and chart-based insights using real or mock telemetry datasets.

---

### Overview

The Windborne Visualizer presents a complete data pipeline from ingestion and transformation to visualization.

It fetches or simulates weather and balloon telemetry data, processes it into clustered datasets, and visualizes patterns such as altitude vs. wind, temperature gradients, and tailwind correlations.

---

### Key Features

- Interactive Visualizations

  - Wind speed vs. altitude scatter plot

  - Temperature gradient and layer comparison

  - Wind rose chart for directional analysis

  - Summary KPIs (average wind, tailwind delta, balloon count)
 

- Data Processing

  - Computes speed, heading, and tailwind metrics

  - Clusters samples into up to 100 groups

  - Enriches with weather data (e.g., from Open-Meteo or mock API)


- Engineering Practices

  - Modular `derive/` layer for transformations

  - Reusable `viz/` components built on Recharts

  - Type-safe data access and clean React hook patterns

  - Lint-compliant and production ready
 
---

### Tech Stack

| Area	|  Technology |
|----------|----------------|
| Frontend Framework|	React 19 + Vite|
| Visualization	|  Recharts|
| Data Fetching	|  Axios  |
| Styling	|  CSS (custom, responsive grid)|
| Code Quality |	ESLint|
| State & Hooks | 	React Hooks (useEffect, useMemo, useState)|
| Testing  | Vitest + React Testing Library |


----

### Project Structure


```
src/
├──__tests__/      # tests
├── api/           # API integration (fetchConstellation24h, etc.)
├── components/    # Shared UI components (ChartTitle, KPI cards)
├── derive/        # Data computation (speed, heading, tailwind, clusters)
├── hooks/         # Custom React hooks (useDashboardData)
├── utils/         # Helpers and math utilities
└── viz/           # Recharts-based visual components

```


----

### Setup & Run


- Install dependencies

```
 npm install
```

- Start development server

```
npm run dev
```
Access at http://localhost:5173

- Build for production

```
npm run build
```

- Preview production build

```
npm run preview
```

---

### Testing

This project includes both logic and component tests using Vitest and React Testing Library

- Test Setup

Installed dev dependencies:

```
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```


- Run all tests:

```
npx vitest
```

- Run in watch mode:

```
npx vitest --watch
```

- Run with coverage report:

```
npx vitest run --coverage
```

Generated coverage report will appear in /coverage/index.html.


---

### Core Visualizations


|   Component   |	  Purpose   |
|----------------|--------------------------------------|
| ScatterAltWind  	|   Altitude vs. Wind speed scatter plot |
| TempComparison  	|   Ground vs. altitude temperature trends |
| WindRose  	|   Wind direction distribution (30° sectors) |
| Summary  	|   Dataset KPIs — counts and averages |
| ReportTable  	|   Tabular breakdown of balloon clusters |


---

### Data Flow

- Fetch Data → `api/windborne.js`

- Process / Cluster → `derive/clusters.js`

- Attach Weather → `derive/enrichWeather.js`

- Compute Metrics → `derive/metrics.js`

- Expose Hook → `useDashboardData.jsx`

- Render Charts → `viz/*.jsx`
  
- Test & Validate   → ` __tests__/*.test.js`
