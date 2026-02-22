"use client";

import React from 'react'
import { ActivityCalendar } from "react-activity-calendar"
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { getContributionStats } from '../actions';
// import {getContributionStats} from ""

const ContributionGraph = () => {
    console.log("[ContributionGraph] Component mounted/rendered");
    const { theme } = useTheme();
const { data, isLoading, error } = useQuery({
  queryKey: ["contribution-graph-v2"], // Changed key to force refetch
  queryFn: async () => {
    console.log("[ContributionGraph] React Query calling getContributionStats...");
    try {
      const result = await getContributionStats();
      console.log("[ContributionGraph] Result from getContributionStats:", result);
      return result;
    } catch (err: any) {
      console.error("[ContributionGraph] Error in queryFn:", err);
      throw err;
    }
  },
  staleTime: 0, // Disable cache for debugging
  retry: false,
  refetchOnMount: true,
});

console.log("[ContributionGraph] Loading:", isLoading);
console.log("[ContributionGraph] Data:", data);
console.log("[ContributionGraph] Error:", error);

if (isLoading) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8">
      <div className="animate-pulse text-muted-foreground">
        Loading contribution data...
      </div>
    </div>
  );
}

if (error) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8">
      <div className="text-red-500">
        Error loading contributions: {error.message}
      </div>
    </div>
  );
}

if (!data) {
    console.log("[ContributionGraph] Data is null or undefined:", data);
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="text-muted-foreground">
          No contribution data available (data is null)
        </div>
      </div>
    );
  }

  if (!data.contributions) {
    console.log("[ContributionGraph] No contributions property:", data);
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="text-muted-foreground">
          No contribution data available (no contributions property)
        </div>
      </div>
    );
  }

  if (!data.contributions.length) {
    console.log("[ContributionGraph] Contributions array is empty:", data);
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="text-muted-foreground">
          No contribution data available (contributions array is empty)
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 p-4">
  <div className="text-sm text-muted-foreground">
    <span className="font-semibold text-foreground">
      {data.totalContributions}
    </span>{" "}
    contributions in the last year
  </div>

  <div className="w-full overflow-x-auto">
    <div className="flex justify-center min-w-max px-4">
      <ActivityCalendar
        data={data.contributions}
        colorScheme={theme === "dark" ? "dark" : "light"}
        blockSize={11}
        blockMargin={4}
        fontSize={14}
        showWeekdayLabels
showMonthLabels
theme={{
  light: ['hsl(0, 0%, 92%)', 'hsl(142, 71%, 45%)'],
  dark: ['#161b22', 'hsl(142, 71%, 45%)'],
}}

      />
    </div>
  </div>
</div>
  );
};

export default ContributionGraph;