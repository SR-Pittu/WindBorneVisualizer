import { renderHook } from "@testing-library/react";
import useDashboardData from "../hooks/useDashboardData";
import { waitFor } from "@testing-library/react";


test("loads dashboard data without crashing", async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => {
        expect(result.current).toHaveProperty("rows");
    });
});
