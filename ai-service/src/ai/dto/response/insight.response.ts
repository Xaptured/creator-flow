export interface Insight {
  title: string;
  description: string;
  actionableStep: string;
}

export interface InsightsResponse {
  ownerId: string;
  insights: Insight[];
}
