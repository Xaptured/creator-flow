import { auth } from "../../../auth"
import { redirect } from "next/navigation"
import LogoutButton from "../components/LogoutButton"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user?.name}</h1>
      <p className="text-gray-500">{session.user?.email}</p>
      <p className="mt-2 text-sm">
        Access token ready for Spring Boot calls ✓
          </p>
           <LogoutButton />
    </div>
  )
}