// This route exists for deep-linking to a specific post's analytics.
// The actual UI renders as a modal in AnalyticsOverview.
// Redirect to analytics page — the modal is opened client-side.
import { redirect } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PostAnalyticsPage({ params }: { params: { postId: string } }) {
  // Deep link: redirect to analytics page; client state will open modal if needed.
  // TODO: pass postId via searchParam or state once real data wiring is done.
  redirect('/dashboard/analytics')
}
