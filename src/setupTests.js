import "@testing-library/jest-dom";

// Mock ResizeObserver for Recharts ResponsiveContainer in tests
global.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
