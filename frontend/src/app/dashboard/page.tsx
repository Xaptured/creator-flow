import { auth } from "@/../auth"
import { redirect } from "next/navigation"
import LogoutButton from "@/components/LogoutButton"
import MediaUploader from "@/components/media/MediaUploader"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user?.name}</h1>
      <p className="text-gray-500">{session.user?.email}</p>
      <MediaUploader />
      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  )
}